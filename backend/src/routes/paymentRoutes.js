const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// @route   POST /api/payments/initiate
// @desc    Initiate payment (Buyer)
// @access  Private - Buyer
router.post('/initiate', authMiddleware, roleCheck(['buyer']), paymentController.initiatePayment);

// @route   POST /api/payments/process
// @desc    Process payment & hold in escrow (System)
// @access  Private
router.post('/process', authMiddleware, paymentController.processPayment);

// @route   GET /api/payments/:orderId
// @desc    Get payment details
// @access  Private
router.get('/:orderId', authMiddleware, paymentController.getPayment);

// @route   POST /api/payments/:orderId/release
// @desc    Release payment from escrow to seller
// @access  Private - Admin/System
router.post('/:orderId/release', authMiddleware, roleCheck(['admin']), paymentController.releasePayment);

// @route   POST /api/payments/:orderId/refund
// @desc    Refund payment to buyer
// @access  Private - Admin
router.post('/:orderId/refund', authMiddleware, roleCheck(['admin']), paymentController.refundPayment);

// @route   POST /api/payments/webhook
// @desc    Handle payment gateway webhooks (Stripe)
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
