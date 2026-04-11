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

const ACTIVE_PRODUCT_STATUSES = ['active', 'bidden'];
const ACTIVE_ORDER_STATUSES = ['pending', 'awaiting_confirmation', 'confirmed', 'qc_pending', 'qc_approved', 'in_delivery'];

const toPercent = (numerator, denominator) => (
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0
);

const calculateGrowth = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const startOfToday = () => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
};

const startOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const getPeriodDays = (period) => {
  if (period === '7d') return 7;
  if (period === '90d') return 90;
  if (period === '1y') return 365;
  return 30;
};

const buildDailyLabels = (days) => {
  const labels = [];
  const today = startOfToday();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    labels.push(date.toISOString().split('T')[0]);
  }

  return labels;
};

const buildSeriesFromDocs = (labels, docs, valueField) => {
  const valueByDate = new Map(docs.map((doc) => [doc._id, doc[valueField] || 0]));
  return labels.map((label) => valueByDate.get(label) || 0);
};

const sumPaymentField = async (match, field = 'amount') => {
  const result = await Payment.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);

  return result[0]?.total || 0;
};

const ensureAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin only' });
    return false;
  }

  return true;
};

const getDashboardStats = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const monthStart = startOfMonth();

    const [
      totalUsers,
      sellers,
      buyers,
      admins,
      totalProducts,
      activeProducts,
      soldProducts,
      endedProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      disputedOrders,
      totalPayments,
      escrowedPayments,
      releasedPayments,
      failedPayments,
      totalRevenue,
      escrowedAmount,
      thisMonthRevenue,
      commissionEarned,
      totalBids,
      activeBids,
      acceptedBids,
      totalQC,
      approvedQC,
      rejectedQC,
      pendingQC,
      reviewAggregation,
      totalReviews,
      openSupport,
      resolvedSupport,
      closedSupport,
      totalDeliveries,
      deliveredDeliveries,
      failedDeliveries,
      openDisputes,
      underReviewDisputes,
      resolvedDisputes,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: { $in: ['buyer', 'user'] } }),
      User.countDocuments({ role: 'admin' }),

      Product.countDocuments({ status: { $ne: 'removed' } }),
      Product.countDocuments({ status: { $in: ACTIVE_PRODUCT_STATUSES } }),
      Product.countDocuments({ status: 'sold' }),
      Product.countDocuments({ status: 'auction_ended' }),

      Order.countDocuments({}),
      Order.countDocuments({ status: { $in: ACTIVE_ORDER_STATUSES } }),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'disputed' }),

      Payment.countDocuments({}),
      Payment.countDocuments({ status: 'escrowed' }),
      Payment.countDocuments({ status: 'released' }),
      Payment.countDocuments({ status: 'failed' }),
      sumPaymentField({ status: 'released' }),
      sumPaymentField({ status: 'escrowed' }),
      sumPaymentField({ status: 'released', createdAt: { $gte: monthStart } }),
      sumPaymentField({ status: 'released' }, 'platformFeeAmount'),

      Bid.countDocuments({}),
      Bid.countDocuments({ status: 'active' }),
      Bid.countDocuments({ status: { $in: ['accepted', 'pending_confirmation'] } }),

      QCVerification.countDocuments({}),
      QCVerification.countDocuments({ status: 'approved' }),
      QCVerification.countDocuments({ status: 'rejected' }),
      QCVerification.countDocuments({ status: 'pending' }),

      Review.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, averageRating: { $avg: '$rating' } } },
      ]),
      Review.countDocuments({ status: 'active' }),

      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),

      Delivery.countDocuments({}),
      Delivery.countDocuments({ status: 'delivered' }),
      Delivery.countDocuments({ status: 'failed' }),

      Order.countDocuments({ status: 'disputed', disputeAssignedTo: { $exists: false } }),
      Order.countDocuments({ status: 'disputed', disputeAssignedTo: { $exists: true, $ne: null } }),
      Order.countDocuments({ disputeFiledAt: { $exists: true, $ne: null }, status: { $ne: 'disputed' } }),
    ]);

    res.json({
      timestamp: new Date(),
      users: {
        total: totalUsers,
        sellers,
        buyers,
        admins,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        sold: soldProducts,
        expired: endedProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        disputed: disputedOrders,
        completionRate: toPercent(completedOrders, totalOrders),
      },
      disputes: {
        total: openDisputes + underReviewDisputes + resolvedDisputes,
        open: openDisputes,
        underReview: underReviewDisputes,
        resolved: resolvedDisputes,
      },
      payments: {
        total: totalPayments,
        escrowed: escrowedPayments,
        released: releasedPayments,
        failed: failedPayments,
        totalRevenue,
        escrowedAmount,
      },
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        commission: commissionEarned,
      },
      bids: {
        total: totalBids,
        active: activeBids,
        accepted: acceptedBids,
      },
      qc: {
        total: totalQC,
        approved: approvedQC,
        rejected: rejectedQC,
        pending: pendingQC,
        approvalRate: toPercent(approvedQC, totalQC),
      },
      reviews: {
        total: totalReviews,
        averageRating: Number((reviewAggregation[0]?.averageRating || 0).toFixed(2)),
      },
      support: {
        open: openSupport,
        resolved: resolvedSupport,
        closed: closedSupport,
      },
      delivery: {
        total: totalDeliveries,
        delivered: deliveredDeliveries,
        failed: failedDeliveries,
        deliveryRate: toPercent(deliveredDeliveries, totalDeliveries),
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPlatformAnalytics = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const { period = '30d' } = req.query;
    const days = getPeriodDays(period);
    const labels = buildDailyLabels(days);
    const startDate = new Date(labels[0]);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const [
      revenueDocs,
      userDocs,
      orderDocs,
      totalUsers,
      activeUsers,
      newUsersCurrent,
      newUsersPrevious,
      retainedUsers,
      eligibleUsers,
      totalProducts,
      activeListings,
      averagePriceAggregation,
      categories,
      newProductsCurrent,
      newProductsPrevious,
      revenueAggregation,
      revenueCurrent,
      revenuePrevious,
      currentOrders,
      previousOrders,
      topCategories,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'released', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      User.countDocuments({}),
      User.countDocuments({ accountStatus: 'active' }),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
      User.countDocuments({
        createdAt: { $lt: startDate },
        'loginHistory.lastLogin': { $gte: startDate },
      }),
      User.countDocuments({ createdAt: { $lt: startDate } }),

      Product.countDocuments({ status: { $ne: 'removed' } }),
      Product.countDocuments({ status: { $in: ACTIVE_PRODUCT_STATUSES } }),
      Product.aggregate([
        { $match: { status: { $ne: 'removed' } } },
        { $group: { _id: null, averagePrice: { $avg: '$basePrice' } } },
      ]),
      Product.distinct('category', { status: { $ne: 'removed' } }),
      Product.countDocuments({ createdAt: { $gte: startDate }, status: { $ne: 'removed' } }),
      Product.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate }, status: { $ne: 'removed' } }),

      Payment.aggregate([
        { $match: { status: 'released' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            averageOrderValue: { $avg: '$amount' },
            commissionEarned: { $sum: '$platformFeeAmount' },
          },
        },
      ]),
      sumPaymentField({ status: 'released', createdAt: { $gte: startDate } }),
      sumPaymentField({ status: 'released', createdAt: { $gte: previousStartDate, $lt: startDate } }),
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),

      Order.aggregate([
        { $match: { status: 'completed' } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$product.category',
            count: { $sum: 1 },
            revenue: { $sum: '$finalPrice' },
          },
        },
        { $sort: { revenue: -1, count: -1 } },
        { $limit: 4 },
      ]),
    ]);

    const analyticsRevenue = buildSeriesFromDocs(labels, revenueDocs, 'total');
    const analyticsUsers = buildSeriesFromDocs(labels, userDocs, 'count');
    const analyticsOrders = buildSeriesFromDocs(labels, orderDocs, 'count');

    const revenueMetrics = revenueAggregation[0] || {
      totalRevenue: 0,
      transactionCount: 0,
      averageOrderValue: 0,
      commissionEarned: 0,
    };

    res.json({
      period,
      labels,
      revenue: analyticsRevenue,
      users: analyticsUsers,
      orders: analyticsOrders,
      growth: {
        users: calculateGrowth(newUsersCurrent, newUsersPrevious),
        products: calculateGrowth(newProductsCurrent, newProductsPrevious),
        orders: calculateGrowth(currentOrders, previousOrders),
        revenue: calculateGrowth(revenueCurrent, revenuePrevious),
      },
      userMetrics: {
        totalUsers,
        activeUsers,
        newUsers: newUsersCurrent,
        retentionRate: toPercent(retainedUsers, eligibleUsers),
      },
      productMetrics: {
        totalProducts,
        activeListings,
        averagePrice: Number((averagePriceAggregation[0]?.averagePrice || 0).toFixed(2)),
        categoriesCount: categories.length,
      },
      revenueMetrics: {
        totalRevenue: revenueMetrics.totalRevenue,
        commissionEarned: revenueMetrics.commissionEarned,
        averageOrderValue: Number((revenueMetrics.averageOrderValue || 0).toFixed(2)),
        transactionCount: revenueMetrics.transactionCount,
      },
      topCategories: topCategories.map((category) => ({
        name: category._id || 'Uncategorized',
        count: category.count,
        revenue: category.revenue,
      })),
    });
  } catch (error) {
    logger.error('Get platform analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserGrowth = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          role: { $push: '$role' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      period: '30 days',
      data: userGrowth,
    });
  } catch (error) {
    logger.error('Get user growth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRevenueStats = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    const [monthlyRevenue, totalRevenue, byPaymentMethod] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            status: 'released',
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      Payment.aggregate([
        {
          $match: { status: 'released' },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            avgTransaction: { $avg: '$amount' },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: { status: 'released' },
        },
        {
          $group: {
            _id: '$paymentMethod',
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      monthlyRevenue,
      summary: totalRevenue[0] || { total: 0, avgTransaction: 0 },
      byPaymentMethod,
    });
  } catch (error) {
    logger.error('Get revenue stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSystemHealth = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      pendingOrders,
      qcPending,
      openDisputes,
      openTickets,
      failedPayments,
      staleEscrowPayments,
    ] = await Promise.all([
      Order.countDocuments({ status: { $in: ACTIVE_ORDER_STATUSES } }),
      QCVerification.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'disputed' }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Payment.countDocuments({ status: 'failed' }),
      Payment.countDocuments({ status: 'escrowed', createdAt: { $lt: sevenDaysAgo } }),
    ]);

    const getSeverity = (count, warningThreshold, criticalThreshold) => {
      if (count >= criticalThreshold) return 'critical';
      if (count >= warningThreshold) return 'warning';
      return 'info';
    };

    const alerts = [
      {
        category: 'orders',
        pending: pendingOrders,
        severity: getSeverity(pendingOrders, 10, 25),
      },
      {
        category: 'qc',
        pending: qcPending,
        severity: getSeverity(qcPending, 5, 12),
      },
      {
        category: 'disputes',
        open: openDisputes,
        severity: getSeverity(openDisputes, 1, 5),
      },
      {
        category: 'tickets',
        open: openTickets,
        severity: getSeverity(openTickets, 5, 15),
      },
      {
        category: 'payments',
        failed: failedPayments,
        severity: getSeverity(failedPayments, 1, 5),
      },
      {
        category: 'payments',
        escrowedOld: staleEscrowPayments,
        severity: getSeverity(staleEscrowPayments, 1, 4),
      },
    ];

    const health = alerts.some((alert) => alert.severity === 'critical')
      ? 'critical'
      : alerts.some((alert) => alert.severity === 'warning')
        ? 'warning'
        : 'good';

    res.json({
      health,
      alerts,
    });
  } catch (error) {
    logger.error('Get system health error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTopPerformers = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const [topSellers, topBuyers, topRatedSellers] = await Promise.all([
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$sellerId', orderCount: { $sum: 1 }, totalRevenue: { $sum: '$finalPrice' } } },
        { $sort: { orderCount: -1, totalRevenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'sellerInfo' } },
      ]),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$buyerId', orderCount: { $sum: 1 }, totalSpent: { $sum: '$finalPrice' } } },
        { $sort: { orderCount: -1, totalSpent: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'buyerInfo' } },
      ]),
      Review.aggregate([
        { $match: { status: 'active', reviewType: 'buyer_to_seller' } },
        { $group: { _id: '$revieweeId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
        { $match: { reviewCount: { $gte: 3 } } },
        { $sort: { avgRating: -1, reviewCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      ]),
    ]);

    res.json({
      topSellers: topSellers.map((seller) => ({
        sellerId: seller._id,
        name: `${seller.sellerInfo[0]?.firstName || ''} ${seller.sellerInfo[0]?.lastName || ''}`.trim() || 'Unknown Seller',
        completedOrders: seller.orderCount,
        totalRevenue: seller.totalRevenue,
      })),
      topBuyers: topBuyers.map((buyer) => ({
        buyerId: buyer._id,
        name: `${buyer.buyerInfo[0]?.firstName || ''} ${buyer.buyerInfo[0]?.lastName || ''}`.trim() || 'Unknown Buyer',
        completedOrders: buyer.orderCount,
        totalSpent: buyer.totalSpent,
      })),
      topRatedSellers: topRatedSellers.map((seller) => ({
        sellerId: seller._id,
        name: `${seller.userInfo[0]?.firstName || ''} ${seller.userInfo[0]?.lastName || ''}`.trim() || 'Unknown Seller',
        completedOrders: seller.reviewCount,
        averageRating: Number((seller.avgRating || 0).toFixed(2)),
        reviewCount: seller.reviewCount,
      })),
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
  getTopPerformers,
};
