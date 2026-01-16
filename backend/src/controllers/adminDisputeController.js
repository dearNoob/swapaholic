const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * List all disputes
 */
const listDisputes = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { status = 'disputed', page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const disputes = await Order.find({ status })
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .populate('productId', 'title category')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({ status });

    res.json({
      disputes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('List disputes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get detailed dispute information
 */
const getDisputeDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const order = await Order.findById(orderId)
      .populate('buyerId', 'firstName lastName email phone')
      .populate('sellerId', 'firstName lastName email phone')
      .populate('productId', 'title category description basePrice condition')
      .populate('bidId', 'bidAmount');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ message: 'Order is not disputed' });
    }

    res.json({
      order,
      disputeInfo: {
        createdAt: order.updatedAt,
        reason: order.notes || 'No specific reason provided'
      }
    });
  } catch (error) {
    logger.error('Get dispute details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Resolve dispute by releasing payment to seller
 */
const resolveDisputeToSeller = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolution, notes } = req.body;
    const adminId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    if (!resolution) {
      return res.status(400).json({ message: 'Resolution decision required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ message: 'Order is not disputed' });
    }

    order.status = 'completed';
    order.escrowStatus = 'released';
    order.notes = (order.notes ? order.notes + ' | ' : '') + `ADMIN RESOLUTION: Payment released to seller. ${notes || 'Seller decision favored.'}`;
    order.updatedAt = new Date();

    await order.save();

    logger.info(`Dispute resolved (seller favor): ${orderId}, admin: ${adminId}`);

    res.json({ 
      message: 'Dispute resolved - Payment released to seller',
      order 
    });
  } catch (error) {
    logger.error('Resolve dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Resolve dispute by refunding buyer
 */
const resolveDisputeToBuyer = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolution, notes } = req.body;
    const adminId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    if (!resolution) {
      return res.status(400).json({ message: 'Resolution decision required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ message: 'Order is not disputed' });
    }

    order.status = 'cancelled';
    order.escrowStatus = 'refunded';
    order.notes = (order.notes ? order.notes + ' | ' : '') + `ADMIN RESOLUTION: Refund issued to buyer. ${notes || 'Buyer decision favored.'}`;
    order.updatedAt = new Date();

    await order.save();

    logger.info(`Dispute resolved (buyer favor): ${orderId}, admin: ${adminId}`);

    res.json({ 
      message: 'Dispute resolved - Refund issued to buyer',
      order 
    });
  } catch (error) {
    logger.error('Resolve dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Split payment in dispute (50/50 compromise)
 */
const splitPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ message: 'Order is not disputed' });
    }

    // Half to seller, half refunded to buyer
    const splitAmount = (order.finalPrice / 2).toFixed(2);

    order.status = 'completed';
    order.escrowStatus = 'released';
    order.notes = (order.notes ? order.notes + ' | ' : '') + `ADMIN RESOLUTION: Payment split 50/50. Seller gets ${splitAmount}, Buyer refunded ${splitAmount}. ${notes || 'Compromise resolution.'}`;
    order.updatedAt = new Date();

    await order.save();

    logger.info(`Dispute resolved (split payment): ${orderId}, each gets ${splitAmount}, admin: ${adminId}`);

    res.json({ 
      message: 'Dispute resolved - Payment split 50/50',
      order,
      split: {
        sellerAmount: splitAmount,
        buyerRefund: splitAmount
      }
    });
  } catch (error) {
    logger.error('Split payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Assign dispute to specific admin for investigation
 */
const assignDispute = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { assignedAdminId } = req.body;
    const currentAdminId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    if (!assignedAdminId) {
      return res.status(400).json({ message: 'Assigned admin ID required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ message: 'Order is not disputed' });
    }

    // Verify admin exists
    const assignedAdmin = await User.findById(assignedAdminId);
    if (!assignedAdmin || assignedAdmin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }

    order.disputeAssignedTo = assignedAdminId;
    order.disputeAssignedAt = new Date();
    order.notes = (order.notes ? order.notes + ' | ' : '') + `Dispute assigned to ${assignedAdmin.firstName} ${assignedAdmin.lastName}`;
    order.updatedAt = new Date();

    await order.save();

    logger.info(`Dispute assigned: ${orderId} to admin ${assignedAdminId}`);

    res.json({ 
      message: 'Dispute assigned successfully',
      order 
    });
  } catch (error) {
    logger.error('Assign dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add investigation notes to dispute
 */
const addInvestigationNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    if (!notes) {
      return res.status(400).json({ message: 'Notes required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ message: 'Order is not disputed' });
    }

    order.notes = (order.notes ? order.notes + ' | ' : '') + `INVESTIGATION NOTE: ${notes}`;
    order.updatedAt = new Date();

    await order.save();

    logger.info(`Investigation notes added to dispute: ${orderId}`);

    res.json({ 
      message: 'Investigation notes added',
      order 
    });
  } catch (error) {
    logger.error('Add investigation notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get dispute statistics
 */
const getDisputeStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const totalDisputes = await Order.countDocuments({ status: 'disputed' });
    const openDisputes = await Order.countDocuments({ status: 'disputed', disputeAssignedTo: null });
    const assignedDisputes = await Order.countDocuments({ status: 'disputed', disputeAssignedTo: { $ne: null } });

    // Average resolution time (for resolved disputes)
    const resolvedDisputes = await Order.find({ status: { $in: ['completed', 'cancelled'] }, notes: /ADMIN RESOLUTION/ })
      .select('createdAt updatedAt')
      .limit(100);

    const avgResolutionTime = resolvedDisputes.length > 0
      ? (resolvedDisputes.reduce((sum, d) => sum + (d.updatedAt - d.createdAt), 0) / resolvedDisputes.length / (1000 * 60 * 60)).toFixed(2)
      : 0;

    res.json({
      totalDisputes,
      openDisputes,
      assignedDisputes,
      averageResolutionTimeHours: avgResolutionTime
    });
  } catch (error) {
    logger.error('Get dispute stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  listDisputes,
  getDisputeDetails,
  resolveDisputeToSeller,
  resolveDisputeToBuyer,
  splitPayment,
  assignDispute,
  addInvestigationNotes,
  getDisputeStats
};
