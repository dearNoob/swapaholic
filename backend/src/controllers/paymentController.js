const mongoose = require('mongoose');
const stripe = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_')
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

// Generate unique transaction ID
const generateTransactionId = () => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

const serializePayment = (payment, extras = {}) => {
  const orderId = payment.orderId && payment.orderId._id ? payment.orderId._id : payment.orderId;

  return {
    id: toId(payment._id),
    orderId: toId(orderId),
    amount: payment.amount,
    method: payment.paymentMethod,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    transactionId: payment.transactionId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    clientSecret: extras.clientSecret,
    gatewayUrl: extras.gatewayUrl,
    sessionKey: extras.sessionKey,
    releaseDate: payment.escrowReleaseDate,
    refundDate: payment.refundDate,
    refundReason: payment.refundReason,
    order: payment.orderId && payment.orderId._id ? payment.orderId : undefined,
    buyerId: payment.buyerId,
    sellerId: payment.sellerId
  };
};

const serializePaymentMethod = (paymentMethod) => ({
  id: toId(paymentMethod._id),
  type: paymentMethod.type,
  brand: paymentMethod.details?.brand || paymentMethod.type,
  last4: paymentMethod.details?.last4 || paymentMethod.details?.accountNumber?.slice(-4),
  expiryMonth: paymentMethod.details?.expiryMonth,
  expiryYear: paymentMethod.details?.expiryYear,
  isDefault: Boolean(paymentMethod.isDefault)
});

const withPaymentRelations = (query) => query
  .populate('orderId', 'status finalPrice')
  .populate('buyerId', 'firstName lastName email')
  .populate('sellerId', 'firstName lastName email');

const findPaymentByIdentifier = async (identifier, includeRelations = false) => {
  const queryBuilder = includeRelations ? withPaymentRelations : (query) => query;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const paymentById = await queryBuilder(Payment.findById(identifier));
    if (paymentById) {
      return paymentById;
    }
  }

  return queryBuilder(Payment.findOne({ orderId: identifier }));
};

const mockGatewayController = require('./mockGatewayController');

// Initiate payment - create Stripe payment intent or Mock Gateway session
const initiatePayment = async (req, res) => {
  try {
    const { orderId, method } = req.body; // Added method from request

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID required' });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only buyer can initiate payment
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment && existingPayment.status !== 'failed' && existingPayment.status !== 'pending') {
      // Allow re-initiation if pending (to get new session link) or failed
      return res.status(400).json({ message: 'Payment already initiated for this order' });
    }

    // --- MOCK GATEWAY REDIRECTION ---
    // If method is mobile banking or we want to force mock gateway
    if (['bkash', 'rocket', 'nagad', 'card'].includes(method) || (method === 'stripe' && !stripe)) { // Including card for mock demo
      // Delegate to Mock Gateway
      // We need to adapt the request object or call the function logic directly.
      // calling logic directly is cleaner to avoid request/response stubbing.

      return mockGatewayController.initiatePayment(req, res);
    }

    // ... (Keep existing Stripe logic as fallback or specific 'stripe' method)

    // Create or update payment record
    let payment = existingPayment || new Payment({
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      amount: order.finalPrice,
      paymentMethod: method || 'card',
      transactionId: generateTransactionId()
    });

    payment.amount = order.finalPrice;
    payment.paymentMethod = method || payment.paymentMethod || 'card';

    // Only create Stripe intent if Stripe key is configured AND method is stripe
    if (stripe && method === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(order.finalPrice * 100), // Convert to cents
          currency: 'usd',
          payment_method_types: ['card'],
          metadata: {
            orderId: orderId.toString(),
            buyerId: order.buyerId.toString(),
            sellerId: order.sellerId.toString()
          }
        },
        { idempotencyKey: payment.transactionId }
      );

      payment.stripePaymentId = paymentIntent.id;
    }

    payment.status = 'pending';
    await payment.save();

    const clientSecret = stripe && payment.stripePaymentId
      ? `${payment.stripePaymentId}_secret_test`
      : 'test_secret_no_stripe_configured';

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: serializePayment(payment, {
        clientSecret
      })
    });
  } catch (error) {
    logger.error('Initiate payment error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    res.status(500).json({
      message: 'Payment initiation failed',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Confirm payment - mark as escrowed after Stripe confirmation
const processPayment = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const stripePaymentIntentId = req.body.stripePaymentIntentId || req.body.details?.stripePaymentIntentId;

    if (!paymentId || !stripePaymentIntentId) {
      return res.status(400).json({ message: 'Payment ID and Stripe intent ID required' });
    }

    if (!stripe) {
      return res.status(503).json({ message: 'Stripe is not configured for payment processing' });
    }

    // Fetch payment
    const payment = await findPaymentByIdentifier(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Verify Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ message: 'Payment not confirmed by Stripe' });
    }

    // Store charge ID
    if (paymentIntent.charges.data.length > 0) {
      payment.stripeChargeId = paymentIntent.charges.data[0].id;
    }

    // Update payment status to escrowed
    payment.status = 'escrowed';
    payment.updatedAt = new Date();
    await payment.save();

    // Update order escrow status
    await Order.findByIdAndUpdate(payment.orderId, { escrowStatus: 'held' });

    logger.info(`Payment escrowed: ${payment._id}`);

    res.json({
      success: true,
      message: 'Payment escrowed successfully',
      data: serializePayment(payment)
    });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({ message: 'Payment processing failed' });
  }
};

// Get payment details
const getPayment = async (req, res) => {
  try {
    const { orderId: paymentIdentifier } = req.params;

    const payment = await findPaymentByIdentifier(paymentIdentifier, true);

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Only buyer, seller, or admin can view payment
    if (payment.buyerId._id.toString() !== req.user.id &&
      payment.sellerId._id.toString() !== req.user.id &&
      req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: serializePayment(payment)
    });
  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate a lightweight HTML invoice/receipt
const generateInvoice = async (req, res) => {
  try {
    const { orderId: paymentIdentifier } = req.params;

    const payment = await Payment.findById(paymentIdentifier)
      .populate({
        path: 'orderId',
        populate: [
          { path: 'productId', select: 'title category' },
          { path: 'buyerId', select: 'firstName lastName email' },
          { path: 'sellerId', select: 'firstName lastName email' }
        ]
      })
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    const resolvedPayment = payment || await findPaymentByIdentifier(paymentIdentifier, true);
    if (!resolvedPayment) return res.status(404).json({ message: 'Payment not found' });

    const buyerId = resolvedPayment.buyerId?._id ? resolvedPayment.buyerId._id.toString() : toId(resolvedPayment.buyerId);
    const sellerId = resolvedPayment.sellerId?._id ? resolvedPayment.sellerId._id.toString() : toId(resolvedPayment.sellerId);

    if (buyerId !== req.user.id && sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const order = resolvedPayment.orderId && resolvedPayment.orderId._id ? resolvedPayment.orderId : null;
    const product = order?.productId && typeof order.productId === 'object' ? order.productId : null;
    const invoiceNumber = `INV-${toId(resolvedPayment._id).slice(-8).toUpperCase()}`;
    const buyerName = resolvedPayment.buyerId?.firstName
      ? `${resolvedPayment.buyerId.firstName} ${resolvedPayment.buyerId.lastName || ''}`.trim()
      : 'Buyer';
    const sellerName = resolvedPayment.sellerId?.firstName
      ? `${resolvedPayment.sellerId.firstName} ${resolvedPayment.sellerId.lastName || ''}`.trim()
      : 'Seller';
    const totalAmount = Number(resolvedPayment.amount || 0);

    const invoiceHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { font-size: 24px; font-weight: bold; color: #312e81; }
    .muted { color: #6b7280; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .total { font-size: 20px; font-weight: bold; color: #111827; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #e5e7eb; }
    th { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Swapaholic</div>
      <div class="muted">Payment receipt / invoice</div>
    </div>
    <div>
      <div><strong>${escapeHtml(invoiceNumber)}</strong></div>
      <div class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</div>
    </div>
  </div>

  <div class="card">
    <div class="row"><span>Order ID</span><strong>${escapeHtml(toId(order?._id || resolvedPayment.orderId))}</strong></div>
    <div class="row"><span>Payment ID</span><strong>${escapeHtml(toId(resolvedPayment._id))}</strong></div>
    <div class="row"><span>Transaction ID</span><strong>${escapeHtml(resolvedPayment.transactionId || 'Pending')}</strong></div>
    <div class="row"><span>Payment Method</span><strong>${escapeHtml(resolvedPayment.paymentMethod || 'N/A')}</strong></div>
    <div class="row"><span>Status</span><strong>${escapeHtml(resolvedPayment.status || 'N/A')}</strong></div>
    <div class="row"><span>Created At</span><strong>${escapeHtml(new Date(resolvedPayment.createdAt).toLocaleString())}</strong></div>
  </div>

  <div class="card">
    <div class="row"><span>Buyer</span><strong>${escapeHtml(buyerName)}</strong></div>
    <div class="row"><span>Buyer Email</span><strong>${escapeHtml(resolvedPayment.buyerId?.email || '')}</strong></div>
    <div class="row"><span>Seller</span><strong>${escapeHtml(sellerName)}</strong></div>
    <div class="row"><span>Seller Email</span><strong>${escapeHtml(resolvedPayment.sellerId?.email || '')}</strong></div>
  </div>

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(product?.title || 'Order payment')}</td>
          <td>${escapeHtml(product?.category || 'General')}</td>
          <td>${escapeHtml(totalAmount.toFixed(2))}</td>
        </tr>
      </tbody>
    </table>
    <div class="row total"><span>Total Paid</span><span>${escapeHtml(totalAmount.toFixed(2))}</span></div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${invoiceNumber}.html"`);
    res.send(invoiceHtml);
  } catch (error) {
    logger.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
};

// Release payment from escrow to seller (after order delivery confirmed)
const releasePayment = async (req, res) => {
  try {
    const { orderId: paymentIdentifier } = req.params;

    // Fetch payment
    const payment = await findPaymentByIdentifier(paymentIdentifier);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status !== 'escrowed') {
      return res.status(400).json({ message: 'Payment is not in escrow' });
    }

    const resolvedOrderId = toId(payment.orderId);

    // Fetch order to verify status
    const order = await Order.findById(resolvedOrderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Order must be completed before releasing payment' });
    }

    // Release payment (in real scenario, transfer to seller's bank account via Stripe Connect)
    payment.status = 'released';
    payment.escrowReleaseDate = new Date();
    payment.updatedAt = new Date();
    await payment.save();

    // Update order escrow status
    await Order.findByIdAndUpdate(resolvedOrderId, { escrowStatus: 'released' });

    // In a real implementation, you would transfer funds to seller's Stripe Connect account
    // For now, we'll just mark it as released
    logger.info(`Payment released: ${payment._id}, amount: ${payment.amount}`);

    res.json({
      success: true,
      message: 'Payment released to seller',
      data: {
        message: 'Payment released to seller',
        payment: serializePayment(payment)
      }
    });
  } catch (error) {
    logger.error('Release payment error:', error);
    res.status(500).json({ message: 'Payment release failed' });
  }
};

// Refund payment (in case of dispute or cancellation)
const refundPayment = async (req, res) => {
  try {
    const { orderId: paymentIdentifier } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Refund reason required' });
    }

    // Fetch payment
    const payment = await findPaymentByIdentifier(paymentIdentifier);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (!['escrowed', 'released'].includes(payment.status)) {
      return res.status(400).json({ message: 'Payment cannot be refunded in current status' });
    }

    const resolvedOrderId = toId(payment.orderId);

    // Refund via Stripe
    if (payment.stripeChargeId) {
      try {
        const refund = await stripe.refunds.create({
          charge: payment.stripeChargeId,
          metadata: { orderId: resolvedOrderId, reason }
        });

        logger.info(`Stripe refund created: ${refund.id}`);
      } catch (stripeError) {
        logger.error('Stripe refund error:', stripeError);
        return res.status(500).json({ message: 'Stripe refund failed' });
      }
    }

    // Update payment record
    payment.status = 'refunded';
    payment.refundDate = new Date();
    payment.refundReason = reason;
    payment.updatedAt = new Date();
    await payment.save();

    // Update order escrow status
    await Order.findByIdAndUpdate(resolvedOrderId, { escrowStatus: 'refunded' });

    logger.info(`Payment refunded: ${payment._id}, reason: ${reason}`);

    res.json({
      success: true,
      message: 'Payment refunded to buyer',
      data: {
        message: 'Payment refunded to buyer',
        payment: serializePayment(payment)
      }
    });
  } catch (error) {
    logger.error('Refund payment error:', error);
    res.status(500).json({ message: 'Payment refund failed' });
  }
};

// Stripe webhook handler
const handleWebhook = async (req, res) => {
  if (!stripe) {
    logger.warn('Stripe not configured, webhook ignored');
    return res.json({ received: true });
  }

  const sig = req.headers['stripe-signature'];

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    logger.info(`Webhook event received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Handle payment intent succeeded event
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  try {
    const { orderId } = paymentIntent.metadata;

    const payment = await Payment.findOne({ stripePaymentId: paymentIntent.id });
    if (!payment) {
      logger.warn(`Payment not found for Stripe intent: ${paymentIntent.id}`);
      return;
    }

    if (payment.status === 'escrowed') {
      logger.info(`Payment already escrowed: ${payment._id}`);
      return;
    }

    payment.status = 'escrowed';
    if (paymentIntent.charges.data.length > 0) {
      payment.stripeChargeId = paymentIntent.charges.data[0].id;
    }
    await payment.save();

    logger.info(`Payment escrowed via webhook: ${payment._id}`);
  } catch (error) {
    logger.error('Handle payment intent succeeded error:', error);
  }
};

// Handle payment intent failed event
const handlePaymentIntentFailed = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({ stripePaymentId: paymentIntent.id });
    if (!payment) return;

    payment.status = 'failed';
    await payment.save();

    logger.info(`Payment failed via webhook: ${payment._id}`);
  } catch (error) {
    logger.error('Handle payment intent failed error:', error);
  }
};

// Handle charge refunded event
const handleChargeRefunded = async (charge) => {
  try {
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    if (!payment) return;

    payment.status = 'refunded';
    payment.refundDate = new Date();
    await payment.save();

    logger.info(`Charge refunded via webhook: ${payment._id}`);
  } catch (error) {
    logger.error('Handle charge refunded error:', error);
  }
};

// Get all payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('paymentMethods');
    const methods = (user?.paymentMethods || []).map(serializePaymentMethod);

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
};

// Add payment method
const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, cardNumber, expiryMonth, expiryYear, cvv, cardholderName, mobileNumber } = req.body;

    // Basic Validation
    if (!type) return res.status(400).json({ success: false, message: 'Payment Method Type required' });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newMethod = {
      type,
      details: {},
      isDefault: user.paymentMethods.length === 0 || !user.paymentMethods.some((method) => method.isDefault)
    };

    if (type === 'card') {
      if (!cardNumber || !expiryMonth || !expiryYear || !cardholderName || !cvv) {
        return res.status(400).json({ success: false, message: 'Complete card details are required' });
      }

      newMethod.details = {
        brand: 'Unknown', // In real app, detect from number
        last4: String(cardNumber).slice(-4),
        expiryMonth: Number(expiryMonth),
        expiryYear: Number(expiryYear),
        accountName: cardholderName
      };
    } else if (['bkash', 'rocket', 'nagad'].includes(type)) {
      const accountNumber = mobileNumber || cardNumber;
      if (!accountNumber) {
        return res.status(400).json({ success: false, message: 'Account number is required for mobile wallet methods' });
      }

      newMethod.details = {
        brand: type,
        accountNumber: String(accountNumber),
        accountName: cardholderName || 'Mobile Wallet'
      };
    } else if (type === 'bank') {
      if (!cardholderName || !cardNumber) {
        return res.status(400).json({ success: false, message: 'Bank account details are required' });
      }

      newMethod.details = {
        brand: 'bank',
        accountNumber: String(cardNumber),
        accountName: cardholderName
      };
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported payment method type' });
    }

    user.paymentMethods.push(newMethod);
    user.updatedAt = new Date();
    await user.save();

    // Return the newly added method
    const added = user.paymentMethods[user.paymentMethods.length - 1];

    res.json({
      success: true,
      data: serializePaymentMethod(added)
    });

  } catch (error) {
    logger.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment method'
    });
  }
};

const removePaymentMethod = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('paymentMethods updatedAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { id } = req.params;
    const method = user.paymentMethods.id(id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }

    const wasDefault = Boolean(method.isDefault);
    method.deleteOne();

    if (wasDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        message: 'Payment method removed'
      }
    });
  } catch (error) {
    logger.error('Remove payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove payment method'
    });
  }
};

const setDefaultPaymentMethod = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('paymentMethods updatedAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { id } = req.params;
    const method = user.paymentMethods.id(id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }

    user.paymentMethods.forEach((paymentMethod) => {
      paymentMethod.isDefault = paymentMethod._id.toString() === id;
    });

    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        message: 'Default payment method updated'
      }
    });
  } catch (error) {
    logger.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default payment method'
    });
  }
};

// Get user's transaction history
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find payments where user is buyer OR seller
    const transactions = await Payment.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('orderId', 'status finalPrice');

    // Format for frontend
    const formattedTransactions = transactions.map(txn => {
      const isPayment = txn.buyerId.toString() === userId;
      return {
        id: txn.transactionId || txn._id,
        date: txn.createdAt,
        description: isPayment
          ? `Payment for Order #${txn.orderId?._id?.toString().slice(-6) || 'N/A'}`
          : `Payout for Order #${txn.orderId?._id?.toString().slice(-6) || 'N/A'}`,
        amount: txn.amount,
        type: isPayment ? 'payment' : 'payout',
        status: txn.status
      };
    });

    res.json({
      success: true,
      data: formattedTransactions
    });
  } catch (error) {
    logger.error('Get user transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch transaction history' });
  }
};

const PLATFORM_FEE = 30;
const notificationService = require('../utils/notificationService');
const emailService = require('../utils/emailService');

// ═══════════════════════════════════════════════
// ADMIN PAYOUT MANAGEMENT
// ═══════════════════════════════════════════════

// Admin manually releases escrowed payment to seller
const adminReleasePayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const order = await Order.findById(orderId)
      .populate('productId', 'title')
      .populate('sellerId', 'firstName lastName email paymentMethods');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Order must be completed before releasing payment' });
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found for this order' });

    if (payment.status !== 'escrowed') {
      return res.status(400).json({ message: `Payment is not in escrow (current: ${payment.status})` });
    }

    // Release payment
    payment.status = 'released';
    payment.sellerPayoutStatus = 'completed';
    payment.sellerPayoutDate = new Date();
    payment.escrowReleaseDate = new Date();
    payment.adminReleasedBy = req.user.id;
    payment.platformFeeAmount = PLATFORM_FEE;
    payment.updatedAt = new Date();
    await payment.save();

    // Update order
    order.escrowStatus = 'released';
    order.sellerPaidAt = new Date();
    order.paymentReleasedBy = req.user.id;
    order.updatedAt = new Date();
    await order.save();

    const seller = order.sellerId;
    const defaultPM = seller.paymentMethods?.find(pm => pm.isDefault);
    const pmLabel = defaultPM
      ? `${defaultPM.type} (${defaultPM.details?.accountNumber?.slice(-4) || defaultPM.details?.last4 || '****'})`
      : 'registered account';

    // Send payout email
    try {
      await emailService.sendPayoutReceiptEmail(
        seller.email,
        seller.firstName,
        order.productId?.title || 'Product',
        payment.amount,
        PLATFORM_FEE,
        pmLabel
      );
    } catch (e) {
      logger.error('Error sending payout email:', e);
    }

    // Send notification
    try {
      await notificationService.notifySellerPayout(
        order._id,
        seller._id,
        payment.amount,
        PLATFORM_FEE
      );
    } catch (e) {
      logger.error('Error sending payout notification:', e);
    }

    const netAmount = payment.amount - PLATFORM_FEE;
    logger.info(`Admin ${req.user.id} released payment for order ${orderId}. Seller: ${seller.email}, Net: ৳${netAmount}`);

    res.json({
      message: `Payment of ৳${netAmount} released to seller (৳${PLATFORM_FEE} platform fee deducted)`,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        platformFee: PLATFORM_FEE,
        netAmount,
        releaseDate: payment.sellerPayoutDate,
        releasedBy: req.user.id
      }
    });
  } catch (error) {
    logger.error('Admin release payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin gets all pending payouts (completed orders with held escrow)
const getPendingPayouts = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const pendingOrders = await Order.find({
      status: 'completed',
      escrowStatus: 'held'
    })
      .populate('productId', 'title images category')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .sort({ actualDeliveryDate: 1 });

    const results = [];
    for (const order of pendingOrders) {
      const payment = await Payment.findOne({ orderId: order._id, status: 'escrowed' });
      if (!payment) continue;

      const hoursSinceDelivery = order.actualDeliveryDate
        ? Math.floor((Date.now() - order.actualDeliveryDate.getTime()) / (1000 * 60 * 60))
        : 0;

      results.push({
        orderId: order._id,
        product: order.productId ? {
          id: order.productId._id,
          title: order.productId.title,
          images: order.productId.images
        } : null,
        buyer: order.buyerId ? {
          id: order.buyerId._id,
          name: `${order.buyerId.firstName} ${order.buyerId.lastName}`,
          email: order.buyerId.email
        } : null,
        seller: order.sellerId ? {
          id: order.sellerId._id,
          name: `${order.sellerId.firstName} ${order.sellerId.lastName}`,
          email: order.sellerId.email
        } : null,
        amount: payment.amount,
        platformFee: PLATFORM_FEE,
        netAmount: payment.amount - PLATFORM_FEE,
        deliveredAt: order.actualDeliveryDate,
        hoursSinceDelivery,
        autoReleaseEligible: hoursSinceDelivery >= 24
      });
    }

    res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    logger.error('Get pending payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  initiatePayment,
  processPayment,
  getPayment,
  generateInvoice,
  releasePayment,
  refundPayment,
  handleWebhook,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  getUserTransactions,
  adminReleasePayment,
  getPendingPayouts
};
