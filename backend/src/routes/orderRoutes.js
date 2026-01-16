const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', authMiddleware, orderController.getUserOrders);

// @route   GET /api/orders/:id
// @desc    Get order details
// @access  Private
router.get('/:id', authMiddleware, orderController.getOrderById);

// @route   POST /api/orders
// @desc    Create new order (after bid acceptance)
// @access  Private - Buyer
router.post('/', authMiddleware, roleCheck(['buyer']), orderController.createOrder);

// @route   PUT /api/orders/:id
// @desc    Update order status
// @access  Private
router.put('/:id', authMiddleware, orderController.updateOrderStatus);

// @route   PUT /api/orders/:id/confirm-delivery
// @desc    Confirm product delivery (Buyer)
// @access  Private - Buyer
router.put('/:id/confirm-delivery', authMiddleware, roleCheck(['buyer']), orderController.confirmDelivery);

// @route   PUT /api/orders/:id/dispute
// @desc    Raise dispute on order
// @access  Private
router.put('/:id/dispute', authMiddleware, orderController.raiseDispute);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

module.exports = router;
