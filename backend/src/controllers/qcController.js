const QCVerification = require('../models/QCVerification');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Initiate QC for an order (seller initiates)
 */
const initiateQC = async (req, res) => {
  try {
    const { orderId, inspectionNotes, images } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID required' });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only seller of the product can initiate QC, or admin
    if (order.sellerId.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if QC already exists for this order
    const existingQC = await QCVerification.findOne({ orderId });
    if (existingQC) {
      return res.status(400).json({ message: 'QC already initiated for this order' });
    }

    // Fetch product for sellerId confirmation
    const product = await Product.findById(order.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create QC record
    const qc = new QCVerification({
      orderId,
      productId: order.productId,
      sellerId: order.sellerId,
      status: 'pending',
      inspectionNotes: inspectionNotes || '',
      images: images ? images.map(url => ({ url })) : []
    });

    await qc.save();
    await qc.populate('orderId', 'status finalPrice');
    await qc.populate('productId', 'title category');

    logger.info(`QC initiated for order ${orderId}: ${qc._id}`);

    res.status(201).json(qc);
  } catch (error) {
    logger.error('Initiate QC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get QC status for an order
 */
const getQCStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const qc = await QCVerification.findOne({ orderId })
      .populate('orderId', 'buyerId sellerId status finalPrice')
      .populate('productId', 'title category')
      .populate('sellerId', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');

    if (!qc) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    // Access control: order participant, admin, or QC reviewer
    if (
      qc.orderId.buyerId.toString() !== userId &&
      qc.orderId.sellerId.toString() !== userId &&
      qc.reviewedBy?._id?.toString() !== userId &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(qc);
  } catch (error) {
    logger.error('Get QC status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admin reviews QC (transitions from pending to in_review)
 */
const reviewQC = async (req, res) => {
  try {
    const { qcId } = req.params;
    const { qualityChecklist } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admin can review
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can review QC' });
    }

    const qc = await QCVerification.findById(qcId);
    if (!qc) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qc.status !== 'pending') {
      return res.status(400).json({ message: 'QC must be in pending status to review' });
    }

    // Update status and checklist
    qc.status = 'in_review';
    if (qualityChecklist) {
      qc.qualityChecklist = qualityChecklist;
    }
    qc.reviewedBy = userId;
    qc.reviewedAt = new Date();

    await qc.save();

    logger.info(`QC moved to in_review: ${qcId}`);

    res.json(qc);
  } catch (error) {
    logger.error('Review QC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admin approves QC
 */
const approveQC = async (req, res) => {
  try {
    const { qcId } = req.params;
    const { qualityValidation, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admin can approve
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can approve QC' });
    }

    const qc = await QCVerification.findById(qcId);
    if (!qc) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qc.status === 'approved' || qc.status === 'rejected') {
      return res.status(400).json({ message: 'QC already finalized' });
    }

    // Update QC record
    qc.status = 'approved';
    qc.qualityValidation = qualityValidation || 100;
    qc.remarks = notes || '';
    qc.reviewedBy = userId;
    qc.reviewedAt = new Date();

    await qc.save();

    // Release escrowed payment (mark as eligible for release)
    const order = await Order.findById(qc.orderId);
    if (order) {
      order.qcApproved = true;
      order.qcApprovedAt = new Date();
      await order.save();

      // Update payment if it exists
      const payment = await Payment.findOne({ orderId: qc.orderId });
      if (payment && payment.status === 'escrowed') {
        payment.escrowReleaseEligible = true;
        await payment.save();
      }
    }

    logger.info(`QC approved: ${qcId}, order ${qc.orderId}`);

    res.json({ message: 'QC approved. Payment release enabled.', qc });
  } catch (error) {
    logger.error('Approve QC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admin rejects QC with reason
 */
const rejectQC = async (req, res) => {
  try {
    const { qcId } = req.params;
    const { rejectionReason, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admin can reject
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reject QC' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason required' });
    }

    const qc = await QCVerification.findById(qcId);
    if (!qc) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qc.status === 'approved' || qc.status === 'rejected') {
      return res.status(400).json({ message: 'QC already finalized' });
    }

    // Update QC record
    qc.status = 'rejected';
    qc.rejectionReason = rejectionReason;
    qc.remarks = notes || '';
    qc.reviewedBy = userId;
    qc.reviewedAt = new Date();

    await qc.save();

    // Block payment release and notify seller
    const order = await Order.findById(qc.orderId);
    if (order) {
      order.qcApproved = false;
      order.qcRejectedAt = new Date();
      order.notes = (order.notes ? order.notes + ' | ' : '') + `QC REJECTED: ${rejectionReason}`;
      await order.save();

      // Refund escrow if payment exists
      const payment = await Payment.findOne({ orderId: qc.orderId });
      if (payment && payment.status === 'escrowed') {
        payment.escrowReleaseEligible = false;
        await payment.save();
      }
    }

    logger.info(`QC rejected: ${qcId}, reason: ${rejectionReason}`);

    res.json({ message: 'QC rejected. Seller notified.', qc });
  } catch (error) {
    logger.error('Reject QC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Upload images for QC
 */
const uploadImages = async (req, res) => {
  try {
    const { qcId } = req.params;
    const { images } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'Images array required' });
    }

    const qc = await QCVerification.findById(qcId);
    if (!qc) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    // Seller can upload images until QC is approved/rejected
    if (qc.sellerId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (qc.status === 'approved' || qc.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot upload images after QC is finalized' });
    }

    // Add images to QC
    images.forEach(url => {
      qc.images.push({ url, uploadedAt: new Date() });
    });

    await qc.save();

    logger.info(`${images.length} images uploaded to QC: ${qcId}`);

    res.json({ message: `${images.length} images uploaded`, qc });
  } catch (error) {
    logger.error('Upload images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all QC records (admin only)
 */
const getAllQC = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;

    // Only admin
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const qcRecords = await QCVerification.find(filter)
      .populate('orderId', 'status finalPrice')
      .populate('productId', 'title')
      .populate('sellerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QCVerification.countDocuments(filter);

    res.json({
      qcRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get all QC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get QC statistics (admin only)
 */
const getQCStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only admin
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const total = await QCVerification.countDocuments({});
    const pending = await QCVerification.countDocuments({ status: 'pending' });
    const inReview = await QCVerification.countDocuments({ status: 'in_review' });
    const approved = await QCVerification.countDocuments({ status: 'approved' });
    const rejected = await QCVerification.countDocuments({ status: 'rejected' });

    // Average quality validation
    const avgQuality = await QCVerification.aggregate([
      { $group: { _id: null, avg: { $avg: '$qualityValidation' } } }
    ]);

    res.json({
      total,
      pending,
      inReview,
      approved,
      rejected,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0,
      averageQualityScore: avgQuality[0]?.avg?.toFixed(2) || 0
    });
  } catch (error) {
    logger.error('Get QC stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  initiateQC,
  getQCStatus,
  reviewQC,
  approveQC,
  rejectQC,
  uploadImages,
  getAllQC,
  getQCStats
};
