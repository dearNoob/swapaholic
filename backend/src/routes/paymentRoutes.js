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

// @route   GET /api/payments/history
// @desc    Get user's transaction history
// @access  Private
router.get('/history', authMiddleware, paymentController.getUserTransactions);

// @route   GET /api/payments/methods
// @desc    Get user's saved payment methods
// @access  Private
router.get('/methods', authMiddleware, paymentController.getPaymentMethods);

// @route   POST /api/payments/methods
// @desc    Add a new payment method
// @access  Private
router.post('/methods', authMiddleware, paymentController.addPaymentMethod);

// @route   DELETE /api/payments/methods/:id
// @desc    Remove a saved payment method
// @access  Private
router.delete('/methods/:id', authMiddleware, paymentController.removePaymentMethod);

// @route   PUT /api/payments/methods/:id/default
// @desc    Set a saved payment method as default
// @access  Private
router.put('/methods/:id/default', authMiddleware, paymentController.setDefaultPaymentMethod);

// --- Mock Gateway Routes ---
const mockGatewayController = require('../controllers/mockGatewayController');
router.post('/mock/init', authMiddleware, mockGatewayController.initiatePayment);
router.get('/mock/session/:sessionKey', mockGatewayController.getSessionDetails);
router.post('/mock/process', mockGatewayController.processMockPayment);

// @route   GET /api/payments/:orderId
// @desc    Get payment details
// @access  Private
router.get('/:orderId/invoice', authMiddleware, paymentController.generateInvoice);

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

// --- Admin Payout Management ---

// @route   GET /api/payments/admin/pending-payouts
// @desc    Get all pending payouts (admin)
// @access  Private - Admin
router.get('/admin/pending-payouts', authMiddleware, roleCheck(['admin']), paymentController.getPendingPayouts);

// @route   POST /api/payments/admin/release/:orderId
// @desc    Admin manually releases escrowed payment to seller
// @access  Private - Admin
router.post('/admin/release/:orderId', authMiddleware, roleCheck(['admin']), paymentController.adminReleasePayment);

module.exports = router;
