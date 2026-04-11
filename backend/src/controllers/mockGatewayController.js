const Payment = require('../models/Payment');
const User = require('../models/User');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Store active sessions in memory (or use Redis/DB for production)
// For this mock, we can use a simple Map or even better, just use the Payment ID as the session ID
// But to make it look "real", let's create a session mapping.
const paymentSessions = new Map();

const toId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value._id) return value._id.toString();
    if (typeof value.toString === 'function') return value.toString();
    return null;
};

const serializePaymentSession = (payment, extras = {}) => ({
    id: toId(payment._id),
    orderId: toId(payment.orderId),
    amount: payment.amount,
    method: payment.paymentMethod,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    sessionKey: extras.sessionKey || payment.transactionId,
    gatewayUrl: extras.gatewayUrl,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
});

const buildStatusRedirectUrl = (payment, status) => {
    const params = new URLSearchParams({
        status,
        orderId: toId(payment.orderId) || ''
    });

    if (toId(payment._id)) {
        params.set('paymentId', toId(payment._id));
    }

    if (payment.transactionId) {
        params.set('trxId', payment.transactionId);
    }

    return `/payment/status?${params.toString()}`;
};

/**
 * Initiate a payment session
 * @route POST /api/mock-payment/init
 */
const initiatePayment = async (req, res) => {
    try {
        const { orderId, amount, paymentMethod, method } = req.body;
        const userId = req.user.id;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.buyerId.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Create a pending payment record
        // Note: In a real flow, you might check if order exists, etc.
        // We'll trust the request for this simulation or you can fetch Order.

        // Generate a unique session key (mimicking SSLCommerz/Stripe session)
        const sessionKey = uuidv4();

        // Create Payment Record (Pending)
        // We might want to check if a payment already exists for this order?
        // For now, let's assume new attempt.
        const requestedMethod = paymentMethod || method || 'card';
        const paymentAmount = amount || order.finalPrice;

        let payment = await Payment.findOne({ orderId, status: 'pending' });

        if (!payment) {
            payment = new Payment({
                orderId,
                buyerId: order.buyerId,
                sellerId: order.sellerId,
                amount: paymentAmount,
                paymentMethod: requestedMethod,
                status: 'pending',
                transactionId: sessionKey
            });
        } else {
            payment.buyerId = order.buyerId;
            payment.sellerId = order.sellerId;
            payment.amount = paymentAmount;
            payment.paymentMethod = requestedMethod;
            payment.transactionId = sessionKey;
            payment.status = 'pending';
        }

        await payment.save();

        // Respond with the Redirect URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const gatewayUrl = `${frontendUrl}/payment/gateway/${sessionKey}`;

        res.json({
            success: true,
            message: 'Payment gateway session created',
            data: serializePaymentSession(payment, { sessionKey, gatewayUrl })
        });

    } catch (error) {
        logger.error('Mock Gateway Init Error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment gateway' });
    }
};

/**
 * Get Session Details
 * @route GET /api/mock-payment/session/:sessionKey
 */
const getSessionDetails = async (req, res) => {
    try {
        const { sessionKey } = req.params;
        const payment = await Payment.findOne({ transactionId: sessionKey }).populate('orderId'); // Using transactionId as temp session holder

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Invalid Session' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Session expired or completed' });
        }

        // Return generic details for the gateway UI
        res.json({
            success: true,
            amount: payment.amount,
            currency: 'BDT', // or payment.currency
            merchantName: 'Swapaholic Trusted Commerce',
            orderId: payment.orderId?._id || payment.orderId,
            buyerId: payment.buyerId
        });

    } catch (error) {
        logger.error('Get Session Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Process/Validate Payment (Simulates the "Pay Now" button action)
 * @route POST /api/mock-payment/process
 */
const processMockPayment = async (req, res) => {
    try {
        const { sessionKey, method, accountNumber, trxId, action } = req.body;
        // action: 'success' | 'fail' | 'cancel'

        const payment = await Payment.findOne({ transactionId: sessionKey });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (action === 'fail') {
            payment.status = 'failed';
            payment.updatedAt = new Date();
            await payment.save();
            return res.json({ success: true, status: 'failed', redirectUrl: buildStatusRedirectUrl(payment, 'failed') });
        }

        if (action === 'cancel') {
            payment.status = 'failed'; // Or cancelled
            payment.updatedAt = new Date();
            await payment.save();
            return res.json({ success: true, status: 'cancelled', redirectUrl: buildStatusRedirectUrl(payment, 'cancelled') });
        }

        // SUCCESS CASE
        // Generate a fake Gateway Auth Code
        const bankTranId = 'BANK-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        payment.status = 'escrowed'; // Money held in escrow
        payment.paymentMethod = method; // bkash, nagad, card
        payment.transactionId = trxId || bankTranId; // Use real TrxID if provided, else fake one
        payment.stripePaymentId = `MOCK-${sessionKey}`; // Fake Ref
        payment.updatedAt = new Date();

        await payment.save();

        // Update Order Status if needed? 
        // Usually, order status updates happen via Order Service listening to Payment Success.
        // For now, let's keep it simple.

        res.json({
            success: true,
            status: 'success',
            redirectUrl: buildStatusRedirectUrl(payment, 'success')
        });

    } catch (error) {
        logger.error('Mock Gateway Process Error:', error);
        res.status(500).json({ success: false, message: 'Payment Processing Failed' });
    }
};

module.exports = {
    initiatePayment,
    getSessionDetails,
    processMockPayment
};
