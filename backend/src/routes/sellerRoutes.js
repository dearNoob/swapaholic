const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const sellerController = require('../controllers/sellerController');

// All seller routes require authentication and seller role
router.use(authMiddleware);
router.use(roleCheck(['seller']));

// @route   GET /api/seller/dashboard
// @desc    Get comprehensive dashboard stats (revenue, listings, sales, trends)
// @access  Private - Seller only
router.get('/dashboard', sellerController.getDashboardStats);

// @route   GET /api/seller/listings
// @desc    Get all seller's product listings with views and bid counts
// @access  Private - Seller only
router.get('/listings', sellerController.getSellerListings);

// @route   GET /api/seller/analytics
// @desc    Get sales analytics data (revenue by date)
// @access  Private - Seller only
// @query   period: '7d' | '30d' | '90d'
router.get('/analytics', sellerController.getSalesAnalytics);

// @route   GET /api/seller/orders
// @desc    Get all orders for seller with filtering
// @access  Private - Seller only
router.get('/orders', sellerController.getSellerOrders);

// @route   GET /api/seller/orders/recent
// @desc    Get recent orders for seller
// @access  Private - Seller only
router.get('/orders/recent', sellerController.getRecentOrders);

// @route   GET /api/seller/bids/recent
// @desc    Get recent bids on seller's products
// @access  Private - Seller only
router.get('/bids/recent', sellerController.getRecentBids);

// @route   GET /api/seller/performance
// @desc    Get seller performance metrics
// @access  Private - Seller only
router.get('/performance', sellerController.getPerformanceMetrics);

// @route   GET /api/seller/earnings
// @desc    Get seller earnings summary
// @access  Private - Seller only
router.get('/earnings', sellerController.getEarningsSummary);

// @route   GET /api/seller/analytics/comprehensive
// @desc    Get comprehensive analytics
// @access  Private - Seller only
router.get('/analytics/comprehensive', sellerController.getComprehensiveAnalytics);

// @route   GET /api/seller/analytics/export
// @desc    Export analytics
// @access  Private - Seller only
router.get('/analytics/export', sellerController.exportAnalytics);

module.exports = router;
