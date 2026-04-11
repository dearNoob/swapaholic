const QCVerification = require('../models/QCVerification');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

const ACTIVE_DELIVERY_STATUSES = ['assigned', 'picked_up', 'in_transit'];
const COMPLETED_DELIVERY_STATUSES = ['delivered', 'failed', 'returned'];

const toId = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        return value;
    }

    if (value._id) {
        return value._id.toString();
    }

    if (typeof value.toString === 'function') {
        return value.toString();
    }

    return null;
};

const buildUserName = (user) => {
    if (!user) {
        return '';
    }

    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
};

const buildAddressString = (user) => {
    if (!user) {
        return '';
    }

    return [
        user.address,
        user.city,
        user.state,
        user.zipCode,
    ]
        .filter(Boolean)
        .join(', ');
};

const toOrderRef = (order) => {
    if (!order) {
        return null;
    }

    return {
        _id: toId(order._id),
        status: order.status,
        finalPrice: order.finalPrice,
        buyerId: toId(order.buyerId),
        sellerId: toId(order.sellerId),
        productId: toId(order.productId),
    };
};

const toProductSummary = (product) => {
    if (!product) {
        return null;
    }

    return {
        title: product.title,
        images: product.images || [],
        category: product.category,
    };
};

const toUserSummary = (user) => {
    if (!user) {
        return null;
    }

    return {
        id: toId(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
    };
};

const toQCTask = (qc) => {
    const order = qc.orderId;
    const product = qc.productId || order?.productId;
    const seller = qc.sellerId || order?.sellerId;
    const buyer = order?.buyerId;

    return {
        _id: qc._id,
        type: 'qc',
        orderId: toOrderRef(order),
        product: toProductSummary(product),
        seller: toUserSummary(seller),
        buyer: toUserSummary(buyer),
        status: qc.status,
        createdAt: qc.createdAt,
        reviewedAt: qc.reviewedAt,
        pickupLocation: buildAddressString(seller),
        deliveryLocation: buildAddressString(buyer),
        amount: order?.finalPrice || 0,
        qualityScore: qc.qualityValidation,
        inspectionNotes: qc.inspectionNotes,
    };
};

const toDeliveryTask = (delivery) => {
    const order = delivery.orderId;
    const product = order?.productId;
    const seller = order?.sellerId;
    const buyer = order?.buyerId;

    return {
        _id: delivery._id,
        type: 'delivery',
        orderId: toOrderRef(order),
        product: toProductSummary(product),
        seller: toUserSummary(seller),
        buyer: toUserSummary(buyer),
        status: delivery.status,
        createdAt: delivery.createdAt,
        pickupLocation: delivery.pickupLocation || buildAddressString(seller),
        deliveryLocation: delivery.deliveryLocation || buildAddressString(buyer),
        estimatedArrival: delivery.estimatedArrival,
        pickupTime: delivery.pickupTime,
        deliveryTime: delivery.deliveryTime,
        amount: order?.finalPrice || 0,
        notes: delivery.notes,
    };
};

/**
 * Get combined dashboard stats for logistics officer
 */
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            qcTotal,
            qcPending,
            qcInReview,
            qcApproved,
            qcRejected,
            deliveryTotal,
            deliveryActive,
            deliveryCompleted,
            deliveryFailed,
            completedToday,
            qcCompletedToday,
        ] = await Promise.all([
            QCVerification.countDocuments({}),
            QCVerification.countDocuments({ status: 'pending' }),
            QCVerification.countDocuments({ status: 'in_review', reviewedBy: userId }),
            QCVerification.countDocuments({ status: 'approved', reviewedBy: userId }),
            QCVerification.countDocuments({ status: 'rejected', reviewedBy: userId }),
            Delivery.countDocuments({ deliveryPersonId: userId }),
            Delivery.countDocuments({
                deliveryPersonId: userId,
                status: { $in: ACTIVE_DELIVERY_STATUSES },
            }),
            Delivery.countDocuments({
                deliveryPersonId: userId,
                status: 'delivered',
            }),
            Delivery.countDocuments({
                deliveryPersonId: userId,
                status: 'failed',
            }),
            Delivery.countDocuments({
                deliveryPersonId: userId,
                status: 'delivered',
                deliveryTime: { $gte: today },
            }),
            QCVerification.countDocuments({
                reviewedBy: userId,
                status: { $in: ['approved', 'rejected'] },
                reviewedAt: { $gte: today },
            }),
        ]);

        res.json({
            qc: {
                total: qcTotal,
                pending: qcPending,
                myInReview: qcInReview,
                myApproved: qcApproved,
                myRejected: qcRejected,
            },
            delivery: {
                total: deliveryTotal,
                active: deliveryActive,
                completed: deliveryCompleted,
                failed: deliveryFailed,
            },
            today: {
                deliveriesCompleted: completedToday,
                qcCompleted: qcCompletedToday,
                totalCompleted: completedToday + qcCompletedToday,
            },
        });
    } catch (error) {
        logger.error('Logistics dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get my tasks - combined QC + delivery tasks for this officer
 */
const getMyTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, status, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const tasks = [];

        if (!type || type === 'qc') {
            const qcFilter = {};

            if (status) {
                qcFilter.status = status;

                if (['in_review', 'approved', 'rejected'].includes(status)) {
                    qcFilter.reviewedBy = userId;
                }
            } else {
                qcFilter.$or = [
                    { status: 'pending' },
                    { status: 'in_review', reviewedBy: userId },
                ];
            }

            const qcTasks = await QCVerification.find(qcFilter)
                .populate({
                    path: 'orderId',
                    select: 'status finalPrice buyerId sellerId productId',
                    populate: [
                        { path: 'buyerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'sellerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'productId', select: 'title images category' },
                    ],
                })
                .populate('productId', 'title images category')
                .populate('sellerId', 'firstName lastName email phone address city state zipCode')
                .sort({ createdAt: -1 })
                .lean();

            tasks.push(...qcTasks.map(toQCTask));
        }

        if (!type || type === 'delivery') {
            const deliveryFilter = { deliveryPersonId: userId };
            deliveryFilter.status = status || { $in: ACTIVE_DELIVERY_STATUSES };

            const deliveryTasks = await Delivery.find(deliveryFilter)
                .populate({
                    path: 'orderId',
                    select: 'status finalPrice buyerId sellerId productId',
                    populate: [
                        { path: 'buyerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'sellerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'productId', select: 'title images category' },
                    ],
                })
                .populate('deliveryPersonId', 'firstName lastName phone')
                .sort({ createdAt: -1 })
                .lean();

            tasks.push(...deliveryTasks.map(toDeliveryTask));
        }

        tasks.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

        const total = tasks.length;
        const paginatedTasks = tasks.slice(skip, skip + limitNum);

        res.json({
            tasks: paginatedTasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        logger.error('Get logistics tasks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Pickup an order - auto-assign QC review + delivery to this logistics officer
 */
const pickupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findById(orderId)
            .populate('sellerId', 'firstName lastName email phone address city state zipCode')
            .populate('buyerId', 'firstName lastName email phone address city state zipCode');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        let qc = await QCVerification.findOne({ orderId });

        if (!qc) {
            qc = new QCVerification({
                orderId,
                productId: order.productId,
                sellerId: order.sellerId._id || order.sellerId,
                status: 'pending',
            });
        }

        if (qc.status === 'in_review' && qc.reviewedBy && qc.reviewedBy.toString() !== userId) {
            return res.status(409).json({ message: 'QC is already being reviewed by another logistics officer' });
        }

        if (qc.status === 'pending') {
            qc.status = 'in_review';
            qc.reviewedBy = userId;
            qc.reviewedAt = new Date();
            await qc.save();
        }

        let delivery = await Delivery.findOne({ orderId });

        if (delivery && delivery.deliveryPersonId && delivery.deliveryPersonId.toString() !== userId && ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) {
            return res.status(409).json({ message: 'Delivery is already assigned to another logistics officer' });
        }

        const pickupLocation = buildAddressString(order.sellerId);
        const deliveryLocation = buildAddressString(order.buyerId);

        if (!delivery) {
            delivery = new Delivery({
                orderId,
                deliveryPersonId: userId,
                status: 'assigned',
                pickupLocation,
                deliveryLocation,
                estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            });
        } else {
            delivery.deliveryPersonId = userId;
            delivery.status = delivery.status || 'assigned';
            delivery.pickupLocation = delivery.pickupLocation || pickupLocation;
            delivery.deliveryLocation = delivery.deliveryLocation || deliveryLocation;
            delivery.estimatedArrival = delivery.estimatedArrival || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
            delivery.updatedAt = new Date();
        }

        await delivery.save();

        logger.info(`Logistics officer ${userId} picked up order ${orderId}`);

        res.json({
            message: 'Order picked up successfully. QC review and delivery assigned.',
            qc: qc ? { id: qc._id, status: qc.status } : null,
            delivery: { id: delivery._id, status: delivery.status },
        });
    } catch (error) {
        logger.error('Pickup order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get task history - completed QC + delivery tasks
 */
const getTaskHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [completedQC, completedDeliveries] = await Promise.all([
            QCVerification.find({
                reviewedBy: userId,
                status: { $in: ['approved', 'rejected'] },
            })
                .populate({
                    path: 'orderId',
                    select: 'status finalPrice buyerId sellerId productId',
                    populate: [
                        { path: 'buyerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'sellerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'productId', select: 'title images category' },
                    ],
                })
                .populate('productId', 'title images category')
                .populate('sellerId', 'firstName lastName email phone address city state zipCode')
                .sort({ reviewedAt: -1 })
                .lean(),
            Delivery.find({
                deliveryPersonId: userId,
                status: { $in: COMPLETED_DELIVERY_STATUSES },
            })
                .populate({
                    path: 'orderId',
                    select: 'status finalPrice buyerId sellerId productId',
                    populate: [
                        { path: 'buyerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'sellerId', select: 'firstName lastName email phone address city state zipCode' },
                        { path: 'productId', select: 'title images category' },
                    ],
                })
                .sort({ deliveryTime: -1, updatedAt: -1 })
                .lean(),
        ]);

        const history = [
            ...completedQC.map((qc) => ({
                ...toQCTask(qc),
                completedAt: qc.reviewedAt,
                qualityScore: qc.qualityValidation,
            })),
            ...completedDeliveries.map((delivery) => ({
                ...toDeliveryTask(delivery),
                completedAt: delivery.deliveryTime || delivery.updatedAt,
            })),
        ];

        history.sort((left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0));

        const total = history.length;
        const paginatedHistory = history.slice(skip, skip + limitNum);

        res.json({
            history: paginatedHistory,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
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
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

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

        if (firstName) {
            allowedUpdates.firstName = firstName.trim();
        }

        if (lastName) {
            allowedUpdates.lastName = lastName.trim();
        }

        if (phone) {
            allowedUpdates.phone = phone.trim();
        }

        if (address) {
            allowedUpdates.address = address;
        }

        if (bio !== undefined) {
            allowedUpdates.bio = bio;
        }

        allowedUpdates.updatedAt = new Date();

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

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
