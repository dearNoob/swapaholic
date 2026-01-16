const User = require('../models/User');
const Product = require('../models/Product');
const Bid = require('../models/Bid');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const SupportTicket = require('../models/SupportTicket');
const QCVerification = require('../models/QCVerification');
const Delivery = require('../models/Delivery');
const logger = require('../utils/logger');

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    // User statistics
    const totalUsers = await User.countDocuments({});
    const sellers = await User.countDocuments({ role: 'seller' });
    const buyers = await User.countDocuments({ role: 'buyer' });
    const admins = await User.countDocuments({ role: 'admin' });

    // Product statistics
    const totalProducts = await Product.countDocuments({});
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const soldProducts = await Product.countDocuments({ status: 'sold' });
    const expiredProducts = await Product.countDocuments({ status: 'expired' });

    // Order statistics
    const totalOrders = await Order.countDocuments({});
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const disputedOrders = await Order.countDocuments({ status: 'disputed' });

    // Payment statistics
    const totalPayments = await Payment.countDocuments({});
    const escrowedPayments = await Payment.countDocuments({ status: 'escrowed' });
    const releasedPayments = await Payment.countDocuments({ status: 'released' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    // Revenue calculation
    const releasedPaymentDocs = await Payment.find({ status: 'released' });
    const totalRevenue = releasedPaymentDocs.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Bid statistics
    const totalBids = await Bid.countDocuments({});
    const activeBids = await Bid.countDocuments({ status: 'active' });
    const acceptedBids = await Bid.countDocuments({ status: 'accepted' });

    // QC statistics
    const qcRecords = await QCVerification.countDocuments({});
    const qcApproved = await QCVerification.countDocuments({ status: 'approved' });
    const qcRejected = await QCVerification.countDocuments({ status: 'rejected' });
    const qcPending = await QCVerification.countDocuments({ status: 'pending' });

    // Review statistics
    const totalReviews = await Review.countDocuments({ status: 'active' });
    const avgRating = await Review.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    // Support ticket statistics
    const openTickets = await SupportTicket.countDocuments({ status: 'open' });
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });
    const closedTickets = await SupportTicket.countDocuments({ status: 'closed' });

    // Delivery statistics
    const totalDeliveries = await Delivery.countDocuments({});
    const deliveredOrders = await Delivery.countDocuments({ status: 'delivered' });
    const failedDeliveries = await Delivery.countDocuments({ status: 'failed' });

    res.json({
      timestamp: new Date(),
      users: {
        total: totalUsers,
        sellers,
        buyers,
        admins
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        sold: soldProducts,
        expired: expiredProducts
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        disputed: disputedOrders,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0
      },
      disputes: {
        total: disputedOrders,
        open: disputedOrders, // Simplification: assuming all disputed orders are open
        underReview: 0,
        resolved: 0
      },
      payments: {
        total: totalPayments,
        escrowed: escrowedPayments,
        released: releasedPayments,
        failed: failedPayments,
        totalRevenue,
        escrowedAmount: escrowedPayments * 0 // Will be calculated from actual payment amounts
      },
      revenue: {
        total: totalRevenue,
        thisMonth: 0, // Placeholder for now, or implement calculation
        commission: totalRevenue * 0.05 // Assuming 5% commission
      },
      bids: {
        total: totalBids,
        active: activeBids,
        accepted: acceptedBids
      },
      qc: {
        total: qcRecords,
        approved: qcApproved,
        rejected: qcRejected,
        pending: qcPending,
        approvalRate: qcRecords > 0 ? ((qcApproved / qcRecords) * 100).toFixed(2) : 0
      },
      reviews: {
        total: totalReviews,
        averageRating: avgRating[0]?.avg?.toFixed(2) || 0
      },
      support: {
        open: openTickets,
        resolved: resolvedTickets,
        closed: closedTickets
      },
      delivery: {
        total: totalDeliveries,
        delivered: deliveredOrders,
        failed: failedDeliveries,
        deliveryRate: totalDeliveries > 0 ? ((deliveredOrders / totalDeliveries) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get platform analytics (time-series data)
 */
const getPlatformAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    let days = 30;
    if (period === '7d') days = 7;
    if (period === '90d') days = 90;
    if (period === '1y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Helper for generic time series data
    const generateTimeSeries = async (Model, dateField) => {
      const data = await Model.aggregate([
        {
          $match: {
            [dateField]: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      return data;
    };

    // Revenue time series
    const revenueSeries = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$finalPrice" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const usersSeries = await generateTimeSeries(User, 'createdAt');
    const ordersSeries = await generateTimeSeries(Order, 'createdAt');

    // Fill in missing dates
    const labels = [];
    const revenueData = [];
    const usersData = [];
    const ordersData = [];

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      labels.push(dateStr);

      const rev = revenueSeries.find(x => x._id === dateStr);
      revenueData.push(rev ? rev.total : 0);

      const usr = usersSeries.find(x => x._id === dateStr);
      usersData.push(usr ? usr.count : 0);

      const ord = ordersSeries.find(x => x._id === dateStr);
      ordersData.push(ord ? ord.count : 0);
    }

    // Generate metrics helper
    const calculateGrowth = (current, previous) => {
      if (!previous) return 100;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    // 1. User Metrics
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ accountStatus: 'active' }); // Assuming 'active' status
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });

    // 2. Product Metrics
    const totalProducts = await Product.countDocuments({});
    const activeListings = await Product.countDocuments({ status: 'active' });
    const productCategories = await Product.distinct('category');

    // 3. Revenue Metrics
    const revenueStats = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalPrice' },
          count: { $sum: 1 },
          avgValue: { $avg: '$finalPrice' }
        }
      }
    ]);

    const revenueMetrics = revenueStats[0] || { totalRevenue: 0, count: 0, avgValue: 0 };
    const commissionEarned = revenueMetrics.totalRevenue * 0.05; // 5% platform fee

    // 4. Top Categories (Mock / Simple aggregation)
    const topCategories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 }
    ]).then(cats => cats.map(c => ({
      name: c._id || 'Uncategorized',
      count: c.count,
      revenue: c.count * 1500 // Estimated revenue per category
    })));

    res.json({
      period,
      labels,
      revenue: revenueData,
      users: usersData,
      orders: ordersData,
      // Added fields to match frontend interface
      growth: {
        users: calculateGrowth(usersData[usersData.length - 1], usersData[usersData.length - 2]),
        products: 12.5, // Placeholder
        orders: calculateGrowth(ordersData[ordersData.length - 1], ordersData[ordersData.length - 2]),
        revenue: calculateGrowth(revenueData[revenueData.length - 1], revenueData[revenueData.length - 2])
      },
      userMetrics: {
        totalUsers,
        activeUsers,
        newUsers,
        retentionRate: 85.0 // Placeholder
      },
      productMetrics: {
        totalProducts,
        activeListings,
        averagePrice: 0, // Simplified
        categoriesCount: productCategories.length
      },
      revenueMetrics: {
        totalRevenue: revenueMetrics.totalRevenue,
        commissionEarned,
        averageOrderValue: Math.round(revenueMetrics.avgValue || 0),
        transactionCount: revenueMetrics.count
      },
      topCategories
    });

  } catch (error) {
    logger.error('Get platform analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user statistics over time (for charts)
 */
const getUserGrowth = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    // Group users by creation date (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          role: { $push: '$role' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      period: '30 days',
      data: userGrowth
    });
  } catch (error) {
    logger.error('Get user growth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get revenue statistics
 */
const getRevenueStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    // Get monthly revenue (last 6 months)
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'released',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Total revenue summary
    const totalRevenue = await Payment.aggregate([
      {
        $match: { status: 'released' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          avgTransaction: { $avg: '$amount' }
        }
      }
    ]);

    // Revenue by payment method
    const byPaymentMethod = await Payment.aggregate([
      {
        $match: { status: 'released' }
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      monthlyRevenue,
      summary: totalRevenue[0] || { total: 0, avgTransaction: 0 },
      byPaymentMethod
    });
  } catch (error) {
    logger.error('Get revenue stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get system health and performance metrics
 */
const getSystemHealth = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    // Get orders awaiting action
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const qcPending = await QCVerification.countDocuments({ status: 'pending' });
    const openDisputes = await Order.countDocuments({ status: 'disputed' });
    const openTickets = await SupportTicket.countDocuments({ status: 'open' });

    // Payment issues
    const failedPayments = await Payment.countDocuments({ status: 'failed' });
    const escrowedOldPayments = await Payment.countDocuments({
      status: 'escrowed',
      createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7+ days old
    });

    // Product issues
    const productsNoSales = await Product.countDocuments({
      status: 'active',
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      health: 'good',
      alerts: [
        { category: 'orders', pending: pendingOrders, severity: pendingOrders > 10 ? 'warning' : 'info' },
        { category: 'qc', pending: qcPending, severity: qcPending > 5 ? 'warning' : 'info' },
        { category: 'disputes', open: openDisputes, severity: openDisputes > 0 ? 'warning' : 'info' },
        { category: 'tickets', open: openTickets, severity: openTickets > 5 ? 'warning' : 'info' },
        { category: 'payments', failed: failedPayments, severity: failedPayments > 0 ? 'warning' : 'info' },
        { category: 'payments', escrowedOld: escrowedOldPayments, severity: escrowedOldPayments > 0 ? 'warning' : 'info' }
      ]
    });
  } catch (error) {
    logger.error('Get system health error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get top performers (sellers, buyers)
 */
const getTopPerformers = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    // Top sellers by completed orders
    const topSellers = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$sellerId', orderCount: { $sum: 1 }, totalRevenue: { $sum: '$finalPrice' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'sellerInfo' } }
    ]);

    // Top buyers by completed orders
    const topBuyers = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$buyerId', orderCount: { $sum: 1 }, totalSpent: { $sum: '$finalPrice' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'buyerInfo' } }
    ]);

    // Highest rated sellers
    const topRatedSellers = await Review.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$revieweeId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      { $match: { reviewCount: { $gte: 3 } } }, // At least 3 reviews
      { $sort: { avgRating: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } }
    ]);

    res.json({
      topSellers: topSellers.map(s => ({
        sellerId: s._id,
        name: s.sellerInfo[0]?.firstName + ' ' + s.sellerInfo[0]?.lastName,
        completedOrders: s.orderCount,
        totalRevenue: s.totalRevenue
      })),
      topBuyers: topBuyers.map(b => ({
        buyerId: b._id,
        name: b.buyerInfo[0]?.firstName + ' ' + b.buyerInfo[0]?.lastName,
        completedOrders: b.orderCount,
        totalSpent: b.totalSpent
      })),
      topRatedSellers: topRatedSellers.map(r => ({
        sellerId: r._id,
        name: r.userInfo[0]?.firstName + ' ' + r.userInfo[0]?.lastName,
        averageRating: r.avgRating.toFixed(2),
        reviewCount: r.reviewCount
      }))
    });
  } catch (error) {
    logger.error('Get top performers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getPlatformAnalytics,
  getUserGrowth,
  getRevenueStats,
  getSystemHealth,
  getTopPerformers
};
