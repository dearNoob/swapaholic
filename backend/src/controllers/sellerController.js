const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Bid = require('../models/Bid');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const logger = require('../utils/logger');

const SELLER_ACTIVE_PRODUCT_STATUSES = ['active', 'bidden'];

const mapListingStatus = (status) => {
    if (status === 'sold') return 'sold';
    if (status === 'auction_ended') return 'ended';
    if (['qc_pending', 'qc_rejected'].includes(status)) return 'pending';
    return 'active';
};

const mapSellerDashboardOrderStatus = (status) => {
    if (['qc_pending', 'qc_approved', 'confirmed'].includes(status)) return 'paid';
    if (status === 'in_delivery') return 'shipped';
    if (['delivered', 'completed'].includes(status)) return 'delivered';
    return 'pending';
};

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
        const activeListings = products.filter(p => SELLER_ACTIVE_PRODUCT_STATUSES.includes(p.status)).length;

        // Get total sales (completed orders)
        const completedOrders = await Order.find({
            sellerId,
            status: 'completed'
        });

        const totalSales = completedOrders.length;
        const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);

        // Get pending payments from escrowed or pending payment records
        const pendingPaymentResult = await Payment.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: { $in: ['pending', 'escrowed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const pendingPayments = pendingPaymentResult[0]?.total || 0;

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
                    total: { $sum: '$finalPrice' }
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
                    total: { $sum: '$finalPrice' }
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
                    images: product.images || [],
                    price: product.basePrice || 0,
                    category: product.category,
                    condition: product.condition,
                    views: product.viewCount || 0,
                    bids: bidCount,
                    status: mapListingStatus(product.status),
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
                    revenue: { $sum: '$finalPrice' }
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
            .populate('productId', 'title images basePrice');

        const total = await Order.countDocuments(query);

        // Transform orders for frontend
        const formattedOrders = orders.map(order => ({
            id: order._id,
            product: {
                title: order.productId?.title || 'Unknown Product',
                image: order.productId?.images?.[0] || '/products/placeholder.png',
                price: order.productId?.basePrice || 0
            },
            buyer: {
                name: `${order.buyerId?.firstName || 'Unknown'} ${order.buyerId?.lastName || ''}`,
                image: order.buyerId?.profileImage || '/default-avatar.png',
                id: order.buyerId?._id
            },
            amount: order.finalPrice,
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
            productTitle: order.productId?.title || 'Unknown Product',
            buyerName: `${order.buyerId?.firstName || 'Unknown'} ${order.buyerId?.lastName || ''}`.trim(),
            amount: order.finalPrice,
            status: mapSellerDashboardOrderStatus(order.status),
            createdAt: order.createdAt,
            product: {
                title: order.productId?.title || 'Unknown Product',
                image: order.productId?.images?.[0] || '/products/placeholder.png'
            },
            buyer: {
                name: `${order.buyerId?.firstName || 'Unknown'} ${order.buyerId?.lastName || ''}`,
                image: order.buyerId?.profileImage || '/default-avatar.png'
            },
            rawStatus: order.status,
            date: order.createdAt
        }));

        res.json({ orders: formattedOrders });
    } catch (error) {
        logger.error('Error fetching recent orders:', error);
        res.status(500).json({ message: 'Server error fetching recent orders' });
    }
};

/**
 * @route   GET /api/seller/bids/recent
 * @desc    Get recent bids on seller's products (with optional pagination)
 * @access  Private - Seller only
 */
exports.getRecentBids = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        // 1. Find all products by this seller
        const products = await Product.find({ sellerId }).select('_id');
        const productIds = products.map(p => p._id);

        // 2. Find bids on these products
        const query = { productId: { $in: productIds } };
        
        const bids = await Bid.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('buyerId', 'firstName lastName profileImage')
            .populate('productId', 'title images basePrice');

        const total = await Bid.countDocuments(query);

        // 3. Format response
        const formattedBids = bids.map(bid => ({
            id: bid._id,
            product: {
                id: bid.productId?._id,
                title: bid.productId?.title || 'Unknown Product',
                image: bid.productId?.images?.[0] || '/products/placeholder.png'
            },
            bidder: {
                name: `${bid.buyerId?.firstName || 'Unknown'} ${bid.buyerId?.lastName || ''}`,
                image: bid.buyerId?.profileImage || '/default-avatar.png',
                id: bid.buyerId?._id
            },
            amount: bid.bidAmount,
            time: bid.createdAt,
            status: bid.status
        }));

        res.json({ 
            bids: formattedBids,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching recent bids:', error);
        res.status(500).json({ message: 'Server error fetching recent bids' });
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
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

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
        const products = await Product.find({ sellerId, status: { $ne: 'removed' } });
        const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);

        const productIds = products.map(p => p._id);
        const totalBids = await Bid.countDocuments({ productId: { $in: productIds } });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const recentBids = await Bid.countDocuments({
            productId: { $in: productIds },
            createdAt: { $gte: thirtyDaysAgo }
        });
        const previousBids = await Bid.countDocuments({
            productId: { $in: productIds },
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        });

        const recentOrders = await Order.countDocuments({
            sellerId: sellerObjectId,
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
        });
        const previousOrders = await Order.countDocuments({
            sellerId: sellerObjectId,
            status: 'completed',
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        });

        const recentProducts = await Product.find({
            sellerId,
            createdAt: { $gte: thirtyDaysAgo }
        }).select('viewCount');
        const previousProducts = await Product.find({
            sellerId,
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        }).select('viewCount');

        const recentViews = recentProducts.reduce((sum, product) => sum + (product.viewCount || 0), 0);
        const previousViews = previousProducts.reduce((sum, product) => sum + (product.viewCount || 0), 0);

        const recentConversion = recentBids > 0 ? (recentOrders / recentBids) * 100 : 0;
        const previousConversion = previousBids > 0 ? (previousOrders / previousBids) * 100 : 0;

        const calculateTrend = (current, previous) => {
            if (!previous) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        res.json({
            averageRating: parseFloat(averageRating),
            totalViews,
            totalBids,
            conversionRate: parseFloat(conversionRate),
            totalReviews,
            viewsTrend: parseFloat(calculateTrend(recentViews, previousViews).toFixed(1)),
            bidsTrend: parseFloat(calculateTrend(recentBids, previousBids).toFixed(1)),
            conversionTrend: parseFloat(calculateTrend(recentConversion, previousConversion).toFixed(1))
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
                        total: { $sum: '$finalPrice' }
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
 * @desc    Get comprehensive analytics including revenue, products, traffic, and conversion
 * @access  Private - Seller only
 */
exports.getComprehensiveAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
        const period = req.query.period || '30d';

        // 1. Calculate date range
        const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        const days = daysMap[period] || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 2. Revenue Data (Daily, Weekly, Monthly)
        const orders = await Order.find({
            sellerId,
            status: 'completed',
            createdAt: { $gte: startDate }
        });

        // Daily Revenue
        const dailyMap = {};
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyMap[dateStr] = 0;
        }

        orders.forEach(order => {
            const dateStr = order.createdAt.toISOString().split('T')[0];
            if (dailyMap[dateStr] !== undefined) {
                dailyMap[dateStr] += order.finalPrice;
            }
        });

        const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));

        // Weekly Revenue (last 12 weeks)
        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);
        
        const weeklyData = await Order.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: 'completed',
                    createdAt: { $gte: twelveWeeksAgo }
                }
            },
            {
                $group: {
                    _id: { $week: '$createdAt' },
                    amount: { $sum: '$finalPrice' },
                    year: { $first: { $year: '$createdAt' } }
                }
            },
            { $sort: { year: 1, _id: 1 } }
        ]);
        const weeklyRevenue = weeklyData.map(d => ({ week: `Week ${d._id}`, amount: d.amount }));

        // Monthly Revenue (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        const monthlyData = await Order.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: 'completed',
                    createdAt: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    amount: { $sum: '$finalPrice' },
                    year: { $first: { $year: '$createdAt' } }
                }
            },
            { $sort: { year: 1, _id: 1 } }
        ]);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyRevenue = monthlyData.map(d => ({ 
            month: `${months[d._id - 1]} ${d.year}`, 
            amount: d.amount 
        }));

        // 3. Best Selling Products
        const products = await Product.find({ sellerId, status: { $ne: 'removed' } });
        const productIds = products.map(p => p._id);

        const salesByProduct = await Order.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: 'completed',
                    productId: { $in: productIds }
                }
            },
            {
                $group: {
                    _id: '$productId',
                    sales: { $sum: 1 },
                    revenue: { $sum: '$finalPrice' }
                }
            },
            { $sort: { sales: -1 } },
            { $limit: 10 }
        ]);

        const bestSelling = await Promise.all(salesByProduct.map(async (item) => {
            const product = products.find(p => p._id.toString() === item._id.toString());
            return {
                id: item._id,
                title: product?.title || 'Unknown Product',
                image: product?.images?.[0] || '/placeholder-product.jpg',
                sales: item.sales,
                revenue: item.revenue,
                views: product?.viewCount || 0
            };
        }));

        // 4. Traffic Analytics
        const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        const uniqueVisitors = Math.floor(totalViews * 0.7); // Mock factor for now

        // Mock traffic sources and device breakdown
        const traffic = {
            totalViews,
            uniqueVisitors,
            avgTimeOnPage: 245,
            bounceRate: 32.5,
            viewsBySource: {
                direct: Math.floor(totalViews * 0.3),
                search: Math.floor(totalViews * 0.4),
                social: Math.floor(totalViews * 0.2),
                referral: Math.floor(totalViews * 0.1)
            },
            viewsByDevice: {
                desktop: Math.floor(totalViews * 0.55),
                mobile: Math.floor(totalViews * 0.35),
                tablet: Math.floor(totalViews * 0.10)
            }
        };

        // 5. Conversion Metrics
        const totalBids = await Bid.countDocuments({ productId: { $in: productIds } });
        const totalSales = orders.length;

        const viewToBid = totalViews > 0 ? (totalBids / totalViews) * 100 : 0;
        const bidToSale = totalBids > 0 ? (totalSales / totalBids) * 100 : 0;
        const overallConversion = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
        const avgBidsPerListing = products.length > 0 ? totalBids / products.length : 0;

        res.json({
            revenue: {
                daily: dailyRevenue,
                weekly: weeklyRevenue,
                monthly: monthlyRevenue
            },
            bestSelling,
            traffic,
            conversion: {
                viewToBid,
                bidToSale,
                overallConversion,
                avgBidsPerListing
            }
        });

    } catch (error) {
        logger.error('Error fetching comprehensive analytics:', error);
        res.status(500).json({ message: 'Server error fetching comprehensive analytics' });
    }
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
