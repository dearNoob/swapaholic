const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Get user notifications with pagination
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, read, type } = req.query;

    const filter = { recipientId: userId };
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get notification by ID
 */
const getNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark as read if not already
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json(notification);
  } catch (error) {
    logger.error('Get notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await notification.markAsRead();
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark multiple notifications as read
 */
const markManyAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Invalid notification IDs' });
    }

    // Verify all notifications belong to user
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
      recipientId: userId
    });

    if (notifications.length !== notificationIds.length) {
      return res.status(403).json({ message: 'Some notifications do not belong to user' });
    }

    await Notification.markManyAsRead(notificationIds);
    res.json({ message: 'Notifications marked as read', count: notificationIds.length });
  } catch (error) {
    logger.error('Mark many as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { recipientId: userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read', count: result.modifiedCount });
  } catch (error) {
    logger.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Notification.findByIdAndDelete(notificationId);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete multiple notifications
 */
const deleteMany = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Invalid notification IDs' });
    }

    // Verify all notifications belong to user
    const count = await Notification.countDocuments({
      _id: { $in: notificationIds },
      recipientId: userId
    });

    if (count !== notificationIds.length) {
      return res.status(403).json({ message: 'Some notifications do not belong to user' });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      recipientId: userId
    });

    res.json({ message: 'Notifications deleted', count: result.deletedCount });
  } catch (error) {
    logger.error('Delete many error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);
    res.json({ unreadCount: count, count: count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get notifications by type (for filtering)
 */
const getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const validTypes = [
      'order_created', 'bid_received', 'bid_accepted', 'bid_rejected',
      'order_confirmed', 'payment_released', 'payment_received',
      'delivery_started', 'delivery_completed', 'order_completed', 'review_received',
      'review_posted', 'dispute_opened', 'dispute_resolved',
      'message_received', 'qc_passed', 'qc_failed', 'new_product_match',
      'ticket_resolved', 'ticket_updated', 'account_approved',
      'account_rejected', 'seller_suspended',
      'seller_banned', 'product_listed', 'product_sold', 'support_notice',
      'auction_won', 'auction_confirmation_reminder',
      'auction_confirmation_expired', 'auction_second_chance',
      'seller_payout', 'outbid',
      'auction_ended_seller', 'auction_ended_no_bids'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      recipientId: userId,
      type
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({
      recipientId: userId,
      type
    });

    res.json({
      notifications,
      type,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get notifications by type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get notification preferences (for future use)
 */
const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // TODO: Store preferences in User model
    // For now, return default preferences
    res.json({
      userId,
      preferences: {
        orderNotifications: true,
        bidNotifications: true,
        paymentNotifications: true,
        deliveryNotifications: true,
        reviewNotifications: true,
        supportNotifications: true,
        emailNotifications: true,
        pushNotifications: true
      }
    });
  } catch (error) {
    logger.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  getNotification,
  markAsRead,
  markManyAsRead,
  markAllAsRead,
  deleteNotification,
  deleteMany,
  getUnreadCount,
  getNotificationsByType,
  getPreferences
};
