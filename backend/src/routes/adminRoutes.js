const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const adminDashboardController = require('../controllers/adminDashboardController');
const adminUserController = require('../controllers/adminUserController');
const adminDisputeController = require('../controllers/adminDisputeController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController');
const adminContentController = require('../controllers/adminContentController');

/**
 * Admin Dashboard Routes
 */

// Dashboard - Main statistics
router.get('/dashboard/stats', authMiddleware, roleCheck(['admin']), adminDashboardController.getDashboardStats);

// @route   GET /api/admin/analytics
// @desc    Get platform analytics data
// @access  Private - Admin
router.get('/analytics', authMiddleware, roleCheck(['admin']), adminDashboardController.getPlatformAnalytics);

// Dashboard - User growth over time
router.get('/dashboard/user-growth', authMiddleware, roleCheck(['admin']), adminDashboardController.getUserGrowth);

// Dashboard - Revenue statistics
router.get('/dashboard/revenue', authMiddleware, roleCheck(['admin']), adminDashboardController.getRevenueStats);

// Dashboard - System health
router.get('/dashboard/health', authMiddleware, roleCheck(['admin']), adminDashboardController.getSystemHealth);

// Dashboard - Top performers
router.get('/dashboard/top-performers', authMiddleware, roleCheck(['admin']), adminDashboardController.getTopPerformers);

/**
 * User Management Routes
 */

// List all users with filters
router.get('/users', authMiddleware, roleCheck(['admin']), adminUserController.listUsers);

// Get user profile with statistics
router.get('/users/:userId', authMiddleware, roleCheck(['admin']), adminUserController.getUserProfile);

// Suspend user account
router.put('/users/:userId/suspend', authMiddleware, roleCheck(['admin']), adminUserController.suspendUser);

// Ban user account
router.put('/users/:userId/ban', authMiddleware, roleCheck(['admin']), adminUserController.banUser);

// Unban user account
router.put('/users/:userId/unban', authMiddleware, roleCheck(['admin']), adminUserController.unbanUser);

// Unsuspend user account
router.put('/users/:userId/unsuspend', authMiddleware, roleCheck(['admin']), adminUserController.unsuspendUser);

// Verify user account
router.put('/users/:userId/verify', authMiddleware, roleCheck(['admin']), adminUserController.verifyUser);

// Get user transaction history
router.get('/users/:userId/transactions', authMiddleware, roleCheck(['admin']), adminUserController.getUserTransactions);

// Get user support tickets
router.get('/users/:userId/tickets', authMiddleware, roleCheck(['admin']), adminUserController.getUserTickets);

// View user dashboard (buyer or seller view)
router.get('/users/:userId/dashboard', authMiddleware, roleCheck(['admin']), adminUserController.getUserDashboard);

/**
 * Dispute Management Routes
 */

// List all disputes
router.get('/disputes', authMiddleware, roleCheck(['admin']), adminDisputeController.listDisputes);

// Get dispute details
router.get('/disputes/:orderId', authMiddleware, roleCheck(['admin']), adminDisputeController.getDisputeDetails);

// Resolve dispute (payment to seller)
router.put('/disputes/:orderId/resolve-seller', authMiddleware, roleCheck(['admin']), adminDisputeController.resolveDisputeToSeller);

// Resolve dispute (refund to buyer)
router.put('/disputes/:orderId/resolve-buyer', authMiddleware, roleCheck(['admin']), adminDisputeController.resolveDisputeToBuyer);

// Split payment (50/50 compromise)
router.put('/disputes/:orderId/split-payment', authMiddleware, roleCheck(['admin']), adminDisputeController.splitPayment);

// Assign dispute to admin
router.put('/disputes/:orderId/assign', authMiddleware, roleCheck(['admin']), adminDisputeController.assignDispute);

// Add investigation notes
router.post('/disputes/:orderId/notes', authMiddleware, roleCheck(['admin']), adminDisputeController.addInvestigationNotes);

// Get dispute statistics
router.get('/disputes/stats/overview', authMiddleware, roleCheck(['admin']), adminDisputeController.getDisputeStats);

// Generic resolve dispute (maps to specific handlers)
router.put('/disputes/:orderId/resolve', authMiddleware, roleCheck(['admin']), (req, res) => {
  const { decision } = req.body;
  if (decision === 'seller') return adminDisputeController.resolveDisputeToSeller(req, res);
  if (decision === 'buyer') return adminDisputeController.resolveDisputeToBuyer(req, res);
  if (decision === 'split') return adminDisputeController.splitPayment(req, res);
  return res.status(400).json({ message: 'Invalid decision' });
});

/**
 * Order Management Routes
 */
router.get('/orders', authMiddleware, roleCheck(['admin']), orderController.getAllOrders);

/**
 * Legacy Routes (for backward compatibility)
 */

// @route   GET /api/admin/products
// @desc    Monitor all product listings
// @access  Private - Admin
router.get('/products', authMiddleware, roleCheck(['admin']), (req, res) => {
  // Force status filter if not provided, or handle legacy
  req.query.limit = req.query.limit || 10;
  productController.getProducts(req, res);
});

// Pending products (specific route)
router.get('/products/pending', authMiddleware, roleCheck(['admin']), (req, res) => {
  req.query.status = 'pending';
  req.query.limit = req.query.limit || 10;
  productController.getProducts(req, res);
});

// @route   PUT /api/admin/products/:productId/approve
// @desc    Approve product after QC
// @access  Private - Admin
router.put('/products/:productId/approve', authMiddleware, roleCheck(['admin']), (req, res) => {
  res.json({ message: 'Approve product' });
});

// @route   DELETE /api/admin/products/:productId
// @desc    Remove product
// @access  Private - Admin
router.delete('/products/:productId', authMiddleware, roleCheck(['admin']), (req, res) => {
  res.json({ message: 'Remove product' });
});

// @route   GET /api/admin/transactions
// @desc    Oversee payment releases and transaction logs
// @access  Private - Admin
router.get('/transactions', authMiddleware, roleCheck(['admin']), (req, res) => {
  res.json({ message: 'Get transactions' });
});

/**
 * Content Management Routes
 */
router.get('/content/:type', authMiddleware, roleCheck(['admin']), adminContentController.getContent);
router.put('/content/:type', authMiddleware, roleCheck(['admin']), adminContentController.updateContent);

module.exports = router;
