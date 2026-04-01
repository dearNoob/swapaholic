const QCVerification = require('../models/QCVerification');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Get combined dashboard stats for logistics officer
 */
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // QC Stats
        const qcTotal = await QCVerification.countDocuments({});
        const qcPending = await QCVerification.countDocuments({ status: 'pending' });
        const qcInReview = await QCVerification.countDocuments({ status: 'in_review', reviewedBy: userId });
        const qcApproved = await QCVerification.countDocuments({ status: 'approved', reviewedBy: userId });
        const qcRejected = await QCVerification.countDocuments({ status: 'rejected', reviewedBy: userId });

        // Delivery Stats
        const deliveryTotal = await Delivery.countDocuments({ deliveryPersonId: userId });
        const deliveryActive = await Delivery.countDocuments({
            deliveryPersonId: userId,
            status: { $in: ['assigned', 'picked_up', 'in_transit'] }
        });
        const deliveryCompleted = await Delivery.countDocuments({
            deliveryPersonId: userId,
            status: 'delivered'
        });
        const deliveryFailed = await Delivery.countDocuments({
            deliveryPersonId: userId,
            status: 'failed'
        });

        // Today's tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = await Delivery.countDocuments({
            deliveryPersonId: userId,
            status: 'delivered',
            deliveryTime: { $gte: today }
        });

        const qcCompletedToday = await QCVerification.countDocuments({
            reviewedBy: userId,
            status: { $in: ['approved', 'rejected'] },
            reviewedAt: { $gte: today }
        });

        res.json({
            qc: {
                total: qcTotal,
                pending: qcPending,
                myInReview: qcInReview,
                myApproved: qcApproved,
                myRejected: qcRejected
            },
            delivery: {
                total: deliveryTotal,
                active: deliveryActive,
                completed: deliveryCompleted,
                failed: deliveryFailed
            },
            today: {
                deliveriesCompleted: completedToday,
                qcCompleted: qcCompletedToday,
                totalCompleted: completedToday + qcCompletedToday
            }
        });
    } catch (error) {
        logger.error('Logistics dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get my tasks — combined QC + Delivery tasks for this officer
 */
const getMyTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, status, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        let tasks = [];

        // Get QC tasks
        if (!type || type === 'qc') {
            const qcFilter = {};
            if (status) qcFilter.status = status;
            else qcFilter.status = { $in: ['pending', 'in_review'] };

            const qcTasks = await QCVerification.find(qcFilter)
                .populate('orderId', 'status finalPrice buyerId sellerId')
                .populate('productId', 'title images category')
                .populate('sellerId', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .lean();

            tasks.push(...qcTasks.map(qc => ({
                _id: qc._id,
                type: 'qc',
                orderId: qc.orderId,
                product: qc.productId,
                seller: qc.sellerId,
                status: qc.status,
                createdAt: qc.createdAt,
                reviewedAt: qc.reviewedAt
            })));
        }

        // Get Delivery tasks
        if (!type || type === 'delivery') {
            const deliveryFilter = { deliveryPersonId: userId };
            if (status) deliveryFilter.status = status;
            else deliveryFilter.status = { $in: ['assigned', 'picked_up', 'in_transit'] };

            const deliveryTasks = await Delivery.find(deliveryFilter)
                .populate('orderId', 'status finalPrice buyerId sellerId productId')
                .populate('deliveryPersonId', 'firstName lastName phone')
                .sort({ createdAt: -1 })
                .lean();

            tasks.push(...deliveryTasks.map(d => ({
                _id: d._id,
                type: 'delivery',
                orderId: d.orderId,
                status: d.status,
                pickupLocation: d.pickupLocation,
                deliveryLocation: d.deliveryLocation,
                estimatedArrival: d.estimatedArrival,
                createdAt: d.createdAt,
                pickupTime: d.pickupTime,
                deliveryTime: d.deliveryTime
            })));
        }

        // Sort combined by createdAt desc
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Paginate
        const total = tasks.length;
        const paginatedTasks = tasks.slice(skip, skip + limitNum);

        res.json({
            tasks: paginatedTasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Get logistics tasks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Pickup an order — auto-assign QC review + delivery to this logistics officer
 */
const pickupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if a QC record exists for this order
        let qc = await QCVerification.findOne({ orderId });

        // Auto-assign QC review if pending
        if (qc && qc.status === 'pending') {
            qc.status = 'in_review';
            qc.reviewedBy = userId;
            qc.reviewedAt = new Date();
            await qc.save();
        }

        // Auto-assign delivery to this officer if exists
        let delivery = await Delivery.findOne({ orderId });
        if (delivery && !delivery.deliveryPersonId) {
            delivery.deliveryPersonId = userId;
            delivery.updatedAt = new Date();
            await delivery.save();
        } else if (delivery) {
            // If delivery exists but assigned to someone else, update to this officer
            delivery.deliveryPersonId = userId;
            delivery.updatedAt = new Date();
            await delivery.save();
        }

        // If no delivery record exists, create one
        if (!delivery) {
            delivery = new Delivery({
                orderId,
                deliveryPersonId: userId,
                status: 'assigned',
                pickupLocation: order.notes || '',
                deliveryLocation: ''
            });
            await delivery.save();
        }

        logger.info(`Logistics officer ${userId} picked up order ${orderId}`);

        res.json({
            message: 'Order picked up successfully. QC review and delivery assigned.',
            qc: qc ? { id: qc._id, status: qc.status } : null,
            delivery: { id: delivery._id, status: delivery.status }
        });
    } catch (error) {
        logger.error('Pickup order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get task history — completed QC + delivery tasks
 */
const getTaskHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        // Completed QC tasks
        const completedQC = await QCVerification.find({
            reviewedBy: userId,
            status: { $in: ['approved', 'rejected'] }
        })
            .populate('orderId', 'status finalPrice')
            .populate('productId', 'title')
            .sort({ reviewedAt: -1 })
            .lean();

        // Completed deliveries
        const completedDeliveries = await Delivery.find({
            deliveryPersonId: userId,
            status: { $in: ['delivered', 'failed', 'returned'] }
        })
            .populate('orderId', 'status finalPrice productId')
            .sort({ deliveryTime: -1 })
            .lean();

        let history = [
            ...completedQC.map(qc => ({
                _id: qc._id,
                type: 'qc',
                status: qc.status,
                orderId: qc.orderId,
                product: qc.productId,
                completedAt: qc.reviewedAt,
                qualityScore: qc.qualityValidation
            })),
            ...completedDeliveries.map(d => ({
                _id: d._id,
                type: 'delivery',
                status: d.status,
                orderId: d.orderId,
                completedAt: d.deliveryTime || d.updatedAt
            }))
        ];

        // Sort by completion date desc
        history.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        const total = history.length;
        const paginatedHistory = history.slice(skip, skip + limitNum);

        res.json({
            history: paginatedHistory,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Get task history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get my profile (authenticated logistics officer)
 */
const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (error) {
        logger.error('Get logistics profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Update my profile (firstName, lastName, phone, address only)
 */
const updateMyProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, address, bio } = req.body;
        const allowedUpdates = {};
        if (firstName) allowedUpdates.firstName = firstName.trim();
        if (lastName)  allowedUpdates.lastName  = lastName.trim();
        if (phone)     allowedUpdates.phone      = phone.trim();
        if (address)   allowedUpdates.address    = address;
        if (bio !== undefined) allowedUpdates.bio = bio;
        allowedUpdates.updatedAt = new Date();

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });
        logger.info(`Logistics officer profile updated: ${req.user.id}`);
        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        logger.error('Update logistics profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboardStats,
    getMyTasks,
    pickupOrder,
    getTaskHistory,
    getMyProfile,
    updateMyProfile,
};
