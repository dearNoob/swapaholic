const Payment = require('../models/Payment');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Store active sessions in memory (or use Redis/DB for production)
// For this mock, we can use a simple Map or even better, just use the Payment ID as the session ID
// But to make it look "real", let's create a session mapping.
const paymentSessions = new Map();

/**
 * Initiate a payment session
 * @route POST /api/mock-payment/init
 */
const initiatePayment = async (req, res) => {
    try {
        const { orderId, amount, paymentMethod } = req.body;
        const userId = req.user.id;

        // Create a pending payment record
        // Note: In a real flow, you might check if order exists, etc.
        // We'll trust the request for this simulation or you can fetch Order.

        // Generate a unique session key (mimicking SSLCommerz/Stripe session)
        const sessionKey = uuidv4();

        // Create Payment Record (Pending)
        // We might want to check if a payment already exists for this order?
        // For now, let's assume new attempt.
        const payment = new Payment({
            orderId,
            buyerId: userId,
            sellerId: req.body.sellerId, // Should be passed from frontend or derived from Order
            amount,
            currency: 'BDT', // Default
            paymentMethod: paymentMethod || 'n/a', // Will be updated in gateway
            status: 'pending',
            transactionId: sessionKey, // Use session key as temp transaction ID
            gatewaySessionKey: sessionKey
        });

        await payment.save();

        // Respond with the Redirect URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const gatewayUrl = `${frontendUrl}/payment/gateway/${sessionKey}`;

        res.json({
            success: true,
            status: 'initiated',
            sessionKey,
            gatewayUrl
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
            await payment.save();
            return res.json({ success: true, status: 'failed', redirectUrl: `/payment/status?status=failed` });
        }

        if (action === 'cancel') {
            payment.status = 'failed'; // Or cancelled
            await payment.save();
            return res.json({ success: true, status: 'cancelled', redirectUrl: `/payment/status?status=cancelled` });
        }

        // SUCCESS CASE
        // Generate a fake Gateway Auth Code
        const bankTranId = 'BANK-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        payment.status = 'escrowed'; // Money held in escrow
        payment.paymentMethod = method; // bkash, nagad, card
        payment.transactionId = trxId || bankTranId; // Use real TrxID if provided, else fake one
        payment.stripePaymentId = `MOCK-${sessionKey}`; // Fake Ref

        await payment.save();

        // Update Order Status if needed? 
        // Usually, order status updates happen via Order Service listening to Payment Success.
        // For now, let's keep it simple.

        res.json({
            success: true,
            status: 'success',
            redirectUrl: `/payment/status?status=success&trxId=${payment.transactionId}`
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
