const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');

// @route   GET /api/delivery/stats
// @desc    Get delivery statistics
// @access  Private - Admin
router.get('/stats', authMiddleware, roleCheck(['admin']), deliveryController.getDeliveryStats);

// @route   GET /api/delivery/active
// @desc    Get active deliveries for delivery person
// @access  Private
router.get('/active', authMiddleware, deliveryController.getActiveDeliveries);

// @route   GET /api/delivery/:orderId/track
// @desc    Track delivery by order ID
// @access  Private
router.get('/:orderId/track', authMiddleware, deliveryController.trackDelivery);

// @route   GET /api/delivery/:orderId/history
// @desc    Get delivery history for order
// @access  Private
router.get('/:orderId/history', authMiddleware, deliveryController.getDeliveryHistory);

// @route   PUT /api/delivery/:orderId/status
// @desc    Update delivery status
// @access  Private - Delivery Person/Admin
router.put('/:orderId/status', authMiddleware, deliveryController.updateDeliveryStatus);

// @route   PUT /api/delivery/:orderId/assign
// @desc    Assign delivery to delivery person
// @access  Private - Admin
router.put('/:orderId/assign', authMiddleware, roleCheck(['admin']), deliveryController.assignDelivery);

module.exports = router;
