const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Bid = require('../models/Bid');
const Review = require('../models/Review');
const logger = require('../utils/logger');

/**
 * Seller Dashboard Controller
 * Handles seller-specific endpoints for dashboard, analytics, and listings
 */

/**
 * @route   GET /api/seller/dashboard
 * @desc    Get comprehensive seller dashboard data
 * @access  Private - Seller only
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

        // Get all seller's products
        const products = await Product.find({ sellerId, status: { $ne: 'removed' } });
        const productIds = products.map(p => p._id);

        // Get active listings count
        const activeListings = products.filter(p => p.status === 'active').length;

        // Get total sales (completed orders)
        const completedOrders = await Order.find({
            sellerId,
            status: 'completed'
        });

        const totalSales = completedOrders.length;
        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Get pending payments (orders that are delivered but payment not released)
        const pendingOrders = await Order.find({
            sellerId,
            status: { $in: ['paid', 'in_transit', 'delivered'] }
        });

        const pendingPayments = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Calculate trends (last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const recentRevenue = await Order.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: 'completed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const previousRevenue = await Order.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: 'completed',
                    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const recentTotal = recentRevenue[0]?.total || 0;
        const previousTotal = previousRevenue[0]?.total || 1;
        const revenueTrend = previousTotal > 0
            ? ((recentTotal - previousTotal) / previousTotal * 100).toFixed(1)
            : 0;

        const recentSalesCount = await Order.countDocuments({
            sellerId,
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
        });

        const previousSalesCount = await Order.countDocuments({
            sellerId,
            status: 'completed',
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        });

        const salesTrend = previousSalesCount > 0
            ? ((recentSalesCount - previousSalesCount) / previousSalesCount * 100).toFixed(1)
            : 0;

        res.json({
            revenue: {
                totalRevenue,
                pendingPayments,
                activeListings,
                totalSales,
                revenueTrend: parseFloat(revenueTrend),
                salesTrend: parseFloat(salesTrend)
            }
        });
    } catch (error) {
        logger.error('Error fetching seller dashboard stats:', error);
        res.status(500).json({ message: 'Server error fetching dashboard data' });
    }
};

/**
 * @route   GET /api/seller/listings
 * @desc    Get all seller's product listings with stats
 * @access  Private - Seller only
 */
exports.getSellerListings = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const products = await Product.find({
            sellerId,
            status: { $ne: 'removed' }
        }).sort({ createdAt: -1 });

        // Enhance each product with bid count
        const listingsWithStats = await Promise.all(
            products.map(async (product) => {
                const bidCount = await Bid.countDocuments({ productId: product._id });

                return {
                    id: product._id,
                    title: product.title,
                    image: product.images?.[0] || '/products/placeholder.png',
                    price: product.basePrice || 0,
                    views: product.viewCount || 0,
                    bids: bidCount,
                    status: product.status,
                    createdAt: product.createdAt
                };
            })
        );

        res.json({ listings: listingsWithStats });
    } catch (error) {
        logger.error('Error fetching seller listings:', error);
        res.status(500).json({ message: 'Server error fetching listings' });
    }
};

/**
 * @route   GET /api/seller/analytics
 * @desc    Get sales analytics data for charts
 * @access  Private - Seller only
 * @query   period: '7d' | '30d' | '90d'
 */
exports.getSalesAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
        const period = req.query.period || '30d';

        // Calculate date range
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[period] || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get daily revenue data
        const salesData = await Order.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: 'completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill in missing dates with 0 revenue
        const dataMap = {};
        salesData.forEach(item => {
            dataMap[item._id] = item.revenue;
        });

        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            result.push({
                date: dateStr,
                revenue: dataMap[dateStr] || 0
            });
        }

        res.json({ salesData: result });
    } catch (error) {
        logger.error('Error fetching sales analytics:', error);
        res.status(500).json({ message: 'Server error fetching analytics' });
    }
};

/**
 * @route   GET /api/seller/orders
 * @desc    Get all seller orders with filtering and pagination
 * @access  Private - Seller only
 */
exports.getSellerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;

        const query = { sellerId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('buyerId', 'firstName lastName profileImage')
            .populate('productId', 'title images price');

        const total = await Order.countDocuments(query);

        // Transform orders for frontend
        const formattedOrders = orders.map(order => ({
            id: order._id,
            product: {
                title: order.productId?.title || 'Unknown Product',
                image: order.productId?.images?.[0] || '/products/placeholder.png',
                price: order.productId?.price || 0
            },
            buyer: {
                name: `${order.buyerId?.firstName || 'Unknown'} ${order.buyerId?.lastName || ''}`,
                image: order.buyerId?.profileImage || '/default-avatar.png',
                id: order.buyerId?._id
            },
            amount: order.totalAmount,
            status: order.status,
            date: order.createdAt,
            shippingAddress: order.shippingAddress
        }));

        res.json({
            orders: formattedOrders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching seller orders:', error);
        res.status(500).json({ message: 'Server error fetching orders' });
    }
};

/**
 * @route   GET /api/seller/orders/recent
 * @desc    Get recent orders for seller
 * @access  Private - Seller only
 */
exports.getRecentOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;

        const orders = await Order.find({ sellerId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('buyerId', 'firstName lastName profileImage')
            .populate('productId', 'title images');

        const formattedOrders = orders.map(order => ({
            id: order._id,
            product: {
                title: order.productId?.title || 'Unknown Product',
                image: order.productId?.images?.[0] || '/products/placeholder.png'
            },
            buyer: {
                name: `${order.buyerId?.firstName || 'Unknown'} ${order.buyerId?.lastName || ''}`,
                image: order.buyerId?.profileImage || '/default-avatar.png'
            },
            amount: order.totalAmount,
            status: order.status,
            date: order.createdAt
        }));

        res.json({ orders: formattedOrders });
    } catch (error) {
        logger.error('Error fetching recent orders:', error);
        res.status(500).json({ message: 'Server error fetching recent orders' });
    }
};

/**
 * @route   GET /api/seller/performance
 * @desc    Get seller performance metrics
 * @access  Private - Seller only
 */
exports.getPerformanceMetrics = async (req, res) => {
    try {
        const sellerId = req.user.id;

        // Calculate average rating
        const reviews = await Review.find({ revieweeId: sellerId, reviewType: 'buyer_to_seller' });
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
            : 0;

        // Calculate order completion rate (using as conversion rate for now)
        const totalOrders = await Order.countDocuments({ sellerId });
        const completedOrders = await Order.countDocuments({ sellerId, status: 'completed' });

        const conversionRate = totalOrders > 0
            ? ((completedOrders / totalOrders) * 100).toFixed(1)
            : 0;

        // Get total views and bids
        const products = await Product.find({ sellerId, isDeleted: false });
        const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);

        const productIds = products.map(p => p._id);
        const totalBids = await Bid.countDocuments({ productId: { $in: productIds } });

        // Mock response time (in hours)
        const responseTime = 2.5;

        res.json({
            averageRating: parseFloat(averageRating),
            totalViews,
            totalBids,
            conversionRate: parseFloat(conversionRate),
            totalReviews,
            responseTime,
            sellerLevel: 'Gold'
        });
    } catch (error) {
        logger.error('Error fetching performance metrics:', error);
        res.status(500).json({ message: 'Server error fetching performance metrics' });
    }
};

/**
 * @route   GET /api/seller/earnings
 * @desc    Get seller earnings summary broken down by time periods
 * @access  Private - Seller only
 */
exports.getEarningsSummary = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
        const now = new Date();

        // Helper to get start of day/week/month/year
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Helper to calculate earnings for a period
        const calculateEarnings = async (startDate, endDate = new Date()) => {
            const result = await Order.aggregate([
                {
                    $match: {
                        sellerId: sellerObjectId,
                        status: 'completed',
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]);
            return result[0]?.total || 0;
        };

        // Calculate current period earnings
        const todayEarnings = await calculateEarnings(startOfDay);
        const weekEarnings = await calculateEarnings(startOfWeek);
        const monthEarnings = await calculateEarnings(startOfMonth);
        const yearEarnings = await calculateEarnings(startOfYear);

        // Calculate trends (comparing to previous equivalent period)
        const yesterdayStart = new Date(startOfDay);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(startOfDay); // End of yesterday is start of today
        const yesterdayEarnings = await calculateEarnings(yesterdayStart, yesterdayEnd);

        const lastWeekStart = new Date(startOfWeek);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(startOfWeek);
        const lastWeekEarnings = await calculateEarnings(lastWeekStart, lastWeekEnd);

        const lastMonthStart = new Date(startOfMonth);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const lastMonthEnd = new Date(startOfMonth);
        const lastMonthEarnings = await calculateEarnings(lastMonthStart, lastMonthEnd);

        const calculateTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous * 100);
        };

        res.json({
            todayEarnings,
            weekEarnings,
            monthEarnings,
            yearEarnings,
            todayTrend: parseFloat(calculateTrend(todayEarnings, yesterdayEarnings).toFixed(1)),
            weekTrend: parseFloat(calculateTrend(weekEarnings, lastWeekEarnings).toFixed(1)),
            monthTrend: parseFloat(calculateTrend(monthEarnings, lastMonthEarnings).toFixed(1)),
        });
    } catch (error) {
        logger.error('Error fetching earnings summary:', error);
        res.status(500).json({ message: 'Server error fetching earnings summary' });
    }
};

/**
 * @route   GET /api/seller/analytics/comprehensive
 * @desc    Get comprehensive analytics
 * @access  Private - Seller only
 */
exports.getComprehensiveAnalytics = async (req, res) => {
    // Reuse getSalesAnalytics logic or expand it
    return exports.getSalesAnalytics(req, res);
};

/**
 * @route   GET /api/seller/analytics/export
 * @desc    Export analytics
 * @access  Private - Seller only
 */
exports.exportAnalytics = async (req, res) => {
    try {
        const format = req.query.format || 'csv';
        // Mock export functionality
        const csvContent = "Date,Revenue\n2023-01-01,100\n2023-01-02,200";

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.attachment('analytics.csv');
            return res.send(csvContent);
        }

        res.status(400).json({ message: 'Unsupported format' });
    } catch (error) {
        logger.error('Error exporting analytics:', error);
        res.status(500).json({ message: 'Server error exporting analytics' });
    }
};
