const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');
const notificationService = require('../utils/notificationService');

// Track delivery - get delivery details and location
const trackDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only order participants or admin can track
    const isParticipant = order.buyerId.toString() === userId ||
                         order.sellerId.toString() === userId ||
                         userRole === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const delivery = await Delivery.findOne({ orderId })
      .populate('deliveryPersonId', 'firstName lastName phone email')
      .populate('orderId', 'buyerId sellerId productId finalPrice');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    res.json(delivery);
  } catch (error) {
    logger.error('Track delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update delivery status
const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, pickupTime, deliveryTime, currentLocation, notes, proofOfDelivery, buyerOTP } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Only delivery person, order participants, or admin can update status
    const order = await Order.findById(delivery.orderId);
    const isDeliveryPerson = delivery.deliveryPersonId && delivery.deliveryPersonId.toString() === userId;
    const isOrderParticipant = order && (order.buyerId.toString() === userId || order.sellerId.toString() === userId);
    if (!isDeliveryPerson && !isOrderParticipant && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate status
    const validStatuses = ['assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    // Update fields
    if (status) {
      delivery.status = status;

      // Set timestamps based on status
      if (status === 'picked_up' && !delivery.pickupTime) {
        delivery.pickupTime = pickupTime || new Date();
      }
      if ((status === 'delivered' || status === 'failed' || status === 'returned') && !delivery.deliveryTime) {
        delivery.deliveryTime = deliveryTime || new Date();
      }
    }

    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      delivery.currentLocation = {
        type: 'Point',
        coordinates: [currentLocation.longitude, currentLocation.latitude]
      };

      // Add to route history
      delivery.deliveryRoute.push({
        timestamp: new Date(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });

      // Store as geoTag
      delivery.geoTag = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        timestamp: new Date()
      };
    }

    if (notes) {
      delivery.notes = notes;
    }

    if (proofOfDelivery) {
      delivery.proofOfDelivery = proofOfDelivery;
    }

    if (buyerOTP) {
      delivery.buyerOTP = buyerOTP;
    }

    delivery.updatedAt = new Date();
    await delivery.save();

    await delivery.populate('deliveryPersonId', 'firstName lastName phone email');

    // When delivery is marked as 'delivered' → auto-complete the order and notify buyer
    if (status === 'delivered') {
      try {
        const completedOrder = await Order.findById(orderId)
          .populate('buyerId', 'firstName lastName')
          .populate('productId', 'title');
        if (completedOrder) {
          completedOrder.status = 'completed';
          completedOrder.actualDeliveryDate = new Date();
          await completedOrder.save();

          const productTitle = completedOrder.productId?.title || 'your item';
          await notificationService.notifyDeliveryCompleted(
            orderId,
            completedOrder.buyerId._id,
            productTitle
          );
          // Notify seller too
          await notificationService.createAndSend({
            recipientId: completedOrder.sellerId,
            type: 'order_completed',
            title: 'Order Completed — Payment Released',
            message: `Your order for "${productTitle}" has been delivered successfully. Payment will be released shortly.`,
            data: { relatedId: orderId, relatedType: 'Order', productTitle },
            priority: 'high',
            actionUrl: `/orders/${orderId}`
          });
          logger.info(`Order ${orderId} auto-completed after delivery`);
        }
      } catch (completionErr) {
        logger.warn('Failed to auto-complete order after delivery:', completionErr);
      }
    }

    logger.info(`Delivery status updated for order ${orderId}: ${status}`);

    res.json(delivery);
  } catch (error) {
    logger.error('Update delivery status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get delivery history for an order
const getDeliveryHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only order participants or admin can view history
    const isParticipant = order.buyerId.toString() === userId ||
                         order.sellerId.toString() === userId ||
                         userRole === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const delivery = await Delivery.findOne({ orderId })
      .populate('deliveryPersonId', 'firstName lastName phone email');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Format response with key milestones
    const history = {
      orderId,
      deliveryPerson: delivery.deliveryPersonId,
      currentStatus: delivery.status,
      milestones: [
        {
          status: 'assigned',
          timestamp: delivery.createdAt,
          completed: true
        },
        {
          status: 'picked_up',
          timestamp: delivery.pickupTime,
          completed: !!delivery.pickupTime
        },
        {
          status: 'in_transit',
          timestamp: delivery.pickupTime,
          completed: ['in_transit', 'delivered', 'failed', 'returned'].includes(delivery.status)
        },
        {
          status: 'delivered',
          timestamp: delivery.deliveryTime,
          completed: delivery.status === 'delivered'
        }
      ],
      route: delivery.deliveryRoute,
      currentLocation: delivery.currentLocation,
      estimatedArrival: delivery.estimatedArrival,
      deliveryTime: delivery.deliveryTime,
      proofOfDelivery: delivery.proofOfDelivery,
      notes: delivery.notes
    };

    res.json(history);
  } catch (error) {
    logger.error('Get delivery history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign delivery to delivery person (admin only)
const assignDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryPersonId, estimatedArrival } = req.body;
    const userRole = req.user.role;

    if (!['admin', 'logistics_officer'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (!deliveryPersonId) {
      return res.status(400).json({ message: 'Delivery person ID required' });
    }

    // Verify delivery person exists
    const deliveryPerson = await User.findById(deliveryPersonId);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    const delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    delivery.deliveryPersonId = deliveryPersonId;
    if (estimatedArrival) {
      delivery.estimatedArrival = new Date(estimatedArrival);
    }
    delivery.updatedAt = new Date();

    await delivery.save();
    await delivery.populate('deliveryPersonId', 'firstName lastName phone email');

    logger.info(`Delivery assigned for order ${orderId} to ${deliveryPersonId}`);

    res.json(delivery);
  } catch (error) {
    logger.error('Assign delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active deliveries for delivery person
const getActiveDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only delivery persons can get their deliveries
    // Admins can see all
    let query = {};
    if (!['admin', 'logistics_officer'].includes(userRole)) {
      query.deliveryPersonId = userId;
    } else if (userRole === 'logistics_officer') {
      // Logistics officers see their own deliveries by default
      query.deliveryPersonId = userId;
    }

    // Include only active deliveries
    query.status = { $in: ['assigned', 'picked_up', 'in_transit'] };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const deliveries = await Delivery.find(query)
      .populate('orderId', 'buyerId sellerId productId finalPrice status')
      .populate('deliveryPersonId', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Delivery.countDocuments(query);

    res.json({
      deliveries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get active deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get delivery statistics (admin only)
const getDeliveryStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (!['admin', 'logistics_officer'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const stats = {
      total: await Delivery.countDocuments(),
      assigned: await Delivery.countDocuments({ status: 'assigned' }),
      pickedUp: await Delivery.countDocuments({ status: 'picked_up' }),
      inTransit: await Delivery.countDocuments({ status: 'in_transit' }),
      delivered: await Delivery.countDocuments({ status: 'delivered' }),
      failed: await Delivery.countDocuments({ status: 'failed' }),
      returned: await Delivery.countDocuments({ status: 'returned' })
    };

    // Average delivery time (for completed deliveries)
    const completedDeliveries = await Delivery.find({
      status: 'delivered',
      pickupTime: { $exists: true },
      deliveryTime: { $exists: true }
    }).select('pickupTime deliveryTime');

    if (completedDeliveries.length > 0) {
      const totalTime = completedDeliveries.reduce((sum, delivery) => {
        return sum + (delivery.deliveryTime - delivery.pickupTime);
      }, 0);
      stats.avgDeliveryTimeHours = (totalTime / completedDeliveries.length / (1000 * 60 * 60)).toFixed(2);
    } else {
      stats.avgDeliveryTimeHours = 0;
    }

    res.json(stats);
  } catch (error) {
    logger.error('Get delivery stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  trackDelivery,
  updateDeliveryStatus,
  getDeliveryHistory,
  assignDelivery,
  getActiveDeliveries,
  getDeliveryStats
};
