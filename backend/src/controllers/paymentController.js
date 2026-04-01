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
    if (['bkash', 'rocket', 'nagad', 'card'].includes(method)) { // Including card for mock demo
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
      clientSecret,
      paymentId: payment._id,
      amount: order.finalPrice
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
    const { paymentId, stripePaymentIntentId } = req.body;

    if (!paymentId || !stripePaymentIntentId) {
      return res.status(400).json({ message: 'Payment ID and Stripe intent ID required' });
    }

    // Fetch payment
    const payment = await Payment.findById(paymentId);
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
      message: 'Payment escrowed successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount
      }
    });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({ message: 'Payment processing failed' });
  }
};

// Get payment details
const getPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId })
      .populate('orderId', 'status finalPrice')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Only buyer, seller, or admin can view payment
    if (payment.buyerId._id.toString() !== req.user.id &&
      payment.sellerId._id.toString() !== req.user.id &&
      req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Release payment from escrow to seller (after order delivery confirmed)
const releasePayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch payment
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status !== 'escrowed') {
      return res.status(400).json({ message: 'Payment is not in escrow' });
    }

    // Fetch order to verify status
    const order = await Order.findById(orderId);
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
    await Order.findByIdAndUpdate(orderId, { escrowStatus: 'released' });

    // In a real implementation, you would transfer funds to seller's Stripe Connect account
    // For now, we'll just mark it as released
    logger.info(`Payment released: ${payment._id}, amount: ${payment.amount}`);

    res.json({
      message: 'Payment released to seller',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        releaseDate: payment.escrowReleaseDate
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
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Refund reason required' });
    }

    // Fetch payment
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (!['escrowed', 'released'].includes(payment.status)) {
      return res.status(400).json({ message: 'Payment cannot be refunded in current status' });
    }

    // Refund via Stripe
    if (payment.stripeChargeId) {
      try {
        const refund = await stripe.refunds.create({
          charge: payment.stripeChargeId,
          metadata: { orderId: orderId.toString(), reason }
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
    await Order.findByIdAndUpdate(orderId, { escrowStatus: 'refunded' });

    logger.info(`Payment refunded: ${payment._id}, reason: ${reason}`);

    res.json({
      message: 'Payment refunded to buyer',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        refundDate: payment.refundDate,
        reason: payment.refundReason
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

    // Map to frontend structure
    const methods = user.paymentMethods.map(pm => ({
      id: pm._id,
      type: pm.type,
      brand: pm.details?.brand || pm.type,
      last4: pm.details?.last4 || pm.details?.accountNumber?.slice(-4),
      isDefault: pm.isDefault
    }));

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

    const newMethod = {
      type,
      details: {},
      isDefault: user.paymentMethods.length === 0 // Make default if first one
    };

    if (type === 'card') {
      newMethod.details = {
        brand: 'Unknown', // In real app, detect from number
        last4: cardNumber.slice(-4),
        expiryMonth,
        expiryYear,
        accountName: cardholderName
      };
    } else if (['bkash', 'rocket', 'nagad'].includes(type)) {
      newMethod.details = {
        brand: type,
        accountNumber: mobileNumber || cardNumber, // Frontend might send as mobileNumber
        accountName: cardholderName || 'Mobile Wallet'
      };
    }

    user.paymentMethods.push(newMethod);
    await user.save();

    // Return the newly added method
    const added = user.paymentMethods[user.paymentMethods.length - 1];

    res.json({
      success: true,
      data: {
        id: added._id,
        type: added.type,
        brand: added.details.brand,
        last4: added.details.last4 || added.details.accountNumber?.slice(-4),
        isDefault: added.isDefault
      }
    });

  } catch (error) {
    logger.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment method'
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
  releasePayment,
  refundPayment,
  handleWebhook,
  getPaymentMethods,
  addPaymentMethod,
  getUserTransactions,
  adminReleasePayment,
  getPendingPayouts
};
