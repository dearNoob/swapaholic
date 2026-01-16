const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const SupportTicket = require('../models/SupportTicket');
const logger = require('../utils/logger');

/**
 * Get list of all users with filters and pagination
 */
const listUsers = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { role, status, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.accountStatus = status;

    // Search by name or email
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get detailed user profile (admin only)
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    let stats = {};

    if (user.role === 'seller') {
      const completedOrders = await Order.countDocuments({ sellerId: userId, status: 'completed' });
      const totalRevenue = await Order.aggregate([
        { $match: { sellerId: userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalPrice' } } }
      ]);
      const avgRating = await Review.aggregate([
        { $match: { revieweeId: userId, status: 'active' } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]);

      stats = {
        completedOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        averageRating: avgRating[0]?.avg?.toFixed(2) || 0,
        reviewCount: await Review.countDocuments({ revieweeId: userId, status: 'active' })
      };
    } else if (user.role === 'buyer') {
      const completedOrders = await Order.countDocuments({ buyerId: userId, status: 'completed' });
      const totalSpent = await Order.aggregate([
        { $match: { buyerId: userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalPrice' } } }
      ]);

      stats = {
        completedOrders,
        totalSpent: totalSpent[0]?.total || 0
      };
    }

    res.json({
      user,
      stats,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user dashboard data for admin viewing (buyer or seller perspective)
 */
const getUserDashboard = async (req, res) => {
  try {
    const { userId } = req.params;
    const { viewAs = 'buyer' } = req.query; // 'buyer' or 'seller'
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let dashboardData = {};

    if (viewAs === 'buyer') {
      // Fetch buyer-related data
      const Bid = require('../models/Bid');
      const Product = require('../models/Product');

      // Get user's bids
      const bids = await Bid.find({ buyerId: userId })
        .populate('productId', 'title basePrice status highestBidAmount')
        .sort({ createdAt: -1 })
        .limit(20);

      // Get orders as buyer
      const orders = await Order.find({ buyerId: userId })
        .populate('productId', 'title')
        .populate('sellerId', 'firstName lastName')
        .sort({ orderDate: -1 })
        .limit(20);

      // Get won auctions (accepted bids)
      const wonAuctions = await Bid.find({ buyerId: userId, status: 'accepted' })
        .populate('productId', 'title basePrice')
        .sort({ updatedAt: -1 });

      // Calculate stats
      const totalBids = await Bid.countDocuments({ buyerId: userId });
      const activeBids = await Bid.countDocuments({ buyerId: userId, status: 'active' });
      const wonBids = await Bid.countDocuments({ buyerId: userId, status: 'accepted' });
      const totalOrders = await Order.countDocuments({ buyerId: userId });
      const completedOrders = await Order.countDocuments({ buyerId: userId, status: 'completed' });
      const totalSpent = await Order.aggregate([
        { $match: { buyerId: user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalPrice' } } }
      ]);

      dashboardData = {
        viewAs: 'buyer',
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role
        },
        stats: {
          totalBids,
          activeBids,
          wonBids,
          totalOrders,
          completedOrders,
          totalSpent: totalSpent[0]?.total || 0
        },
        recentBids: bids.map(bid => ({
          id: bid._id,
          productTitle: bid.productId?.title || 'Product Deleted',
          bidAmount: bid.bidAmount,
          status: bid.status,
          isWinning: bid.productId?.highestBidAmount === bid.bidAmount,
          createdAt: bid.createdAt
        })),
        recentOrders: orders.map(order => ({
          id: order._id,
          productTitle: order.productId?.title || 'Product Deleted',
          sellerName: order.sellerId ? `${order.sellerId.firstName} ${order.sellerId.lastName}` : 'Unknown',
          amount: order.finalPrice,
          status: order.status,
          date: order.orderDate
        })),
        wonAuctions: wonAuctions.map(bid => ({
          id: bid._id,
          productTitle: bid.productId?.title || 'Product Deleted',
          winningBid: bid.bidAmount,
          wonAt: bid.updatedAt
        }))
      };
    } else if (viewAs === 'seller') {
      // Fetch seller-related data
      const Product = require('../models/Product');

      // Get user's listings
      const products = await Product.find({ sellerId: userId })
        .sort({ createdAt: -1 })
        .limit(20);

      // Get orders as seller
      const orders = await Order.find({ sellerId: userId })
        .populate('productId', 'title')
        .populate('buyerId', 'firstName lastName')
        .sort({ orderDate: -1 })
        .limit(20);

      // Calculate stats
      const totalListings = await Product.countDocuments({ sellerId: userId });
      const activeListings = await Product.countDocuments({ sellerId: userId, status: { $in: ['active', 'bidden'] } });
      const soldListings = await Product.countDocuments({ sellerId: userId, status: 'sold' });
      const totalOrders = await Order.countDocuments({ sellerId: userId });
      const completedOrders = await Order.countDocuments({ sellerId: userId, status: 'completed' });
      const totalRevenue = await Order.aggregate([
        { $match: { sellerId: user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalPrice' } } }
      ]);
      const avgRating = await Review.aggregate([
        { $match: { revieweeId: user._id, status: 'active' } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]);

      dashboardData = {
        viewAs: 'seller',
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role
        },
        stats: {
          totalListings,
          activeListings,
          soldListings,
          totalOrders,
          completedOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          averageRating: avgRating[0]?.avg?.toFixed(2) || 'N/A'
        },
        recentListings: products.map(product => ({
          id: product._id,
          title: product.title,
          basePrice: product.basePrice,
          currentBid: product.highestBidAmount || product.basePrice,
          status: product.status,
          createdAt: product.createdAt
        })),
        recentOrders: orders.map(order => ({
          id: order._id,
          productTitle: order.productId?.title || 'Product Deleted',
          buyerName: order.buyerId ? `${order.buyerId.firstName} ${order.buyerId.lastName}` : 'Unknown',
          amount: order.finalPrice,
          status: order.status,
          date: order.orderDate
        }))
      };
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Get user dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Suspend a user account
 */
const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Suspension reason required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === adminId) {
      return res.status(400).json({ message: 'Cannot suspend yourself' });
    }

    user.accountStatus = 'suspended';
    user.suspensionReason = reason;
    user.suspendedAt = new Date();
    user.suspendedBy = adminId;

    await user.save();

    logger.info(`User suspended: ${userId}, reason: ${reason}`);

    res.json({ message: 'User suspended successfully', user });
  } catch (error) {
    logger.error('Suspend user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Ban a user account permanently
 */
const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const userRole = req.user.role;

    logger.info(`Attempting to ban user: ${userId} by admin: ${adminId}`);
    logger.info(`Reason provided: ${JSON.stringify(req.body)}`);

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    if (!reason) {
      logger.warn('Ban failed: No reason provided');
      return res.status(400).json({ message: 'Ban reason required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === adminId) {
      logger.warn('Ban failed: Cannot ban self');
      return res.status(400).json({ message: 'Cannot ban yourself' });
    }

    user.accountStatus = 'banned';
    user.banReason = reason;
    user.bannedAt = new Date();
    user.bannedBy = adminId;

    await user.save();

    logger.info(`User banned: ${userId}, reason: ${reason}`);

    res.json({ message: 'User banned successfully', user });
  } catch (error) {
    logger.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Unsuspend a user account
 */
const unsuspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.accountStatus !== 'suspended') {
      return res.status(400).json({ message: 'User is not suspended' });
    }

    user.accountStatus = 'active';
    user.suspensionReason = null;
    user.suspendedAt = null;
    user.suspendedBy = null;

    await user.save();

    logger.info(`User unsuspended: ${userId}`);

    res.json({ message: 'User unsuspended successfully', user });
  } catch (error) {
    logger.error('Unsuspend user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user transaction history
 */
const getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const skip = (page - 1) * limit;

    let orders = [];
    if (user.role === 'seller') {
      orders = await Order.find({ sellerId: userId })
        .populate('productId', 'title')
        .populate('buyerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else if (user.role === 'buyer') {
      orders = await Order.find({ buyerId: userId })
        .populate('productId', 'title')
        .populate('sellerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = user.role === 'seller'
      ? await Order.countDocuments({ sellerId: userId })
      : await Order.countDocuments({ buyerId: userId });

    res.json({
      user: { id: user._id, name: `${user.firstName} ${user.lastName}`, role: user.role },
      transactions: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get user transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user's support tickets
 */
const getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const skip = (page - 1) * limit;

    const tickets = await SupportTicket.find({
      $or: [
        { reporterId: userId },
        { assignedTo: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments({
      $or: [
        { reporterId: userId },
        { assignedTo: userId }
      ]
    });

    res.json({
      user: { id: user._id, name: `${user.firstName} ${user.lastName}` },
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get user tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify a user
 */
const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    logger.info(`User verified: ${userId}`);
    res.json({ message: 'User verified successfully', user });
  } catch (error) {
    logger.error('Verify user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Unban a user (alias for unsuspend/reactivate)
 */
const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reset status to active regardless of previous state (banned or suspended)
    user.accountStatus = 'active';
    user.suspensionReason = null;
    user.suspendedAt = null;
    user.suspendedBy = null;
    user.banReason = null;
    user.bannedAt = null;
    user.bannedBy = null;

    await user.save();

    logger.info(`User unbanned/unsuspended: ${userId}`);
    res.json({ message: 'User unbanned successfully', user });
  } catch (error) {
    logger.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  listUsers,
  getUserProfile,
  getUserDashboard,
  suspendUser,
  banUser,
  unsuspendUser,
  verifyUser,
  unbanUser,
  getUserTransactions,
  getUserTickets
};
