const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores all notifications for users
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'order_created',      // New order received
        'bid_received',       // New bid on product
        'bid_accepted',       // Your bid was accepted
        'bid_rejected',       // Your bid was rejected
        'order_confirmed',    // Order confirmed by both parties
        'payment_released',   // Payment released to seller
        'payment_received',   // Payment received (for buyer)
        'delivery_started',   // Delivery started
        'delivery_completed', // Delivery completed
        'review_received',    // Received a review
        'review_posted',      // You posted a review
        'dispute_opened',     // Dispute opened on your order
        'dispute_resolved',   // Dispute resolved
        'message_received',   // New message received
        'qc_passed',          // QC verification passed
        'qc_failed',          // QC verification failed
        'ticket_resolved',    // Support ticket resolved
        'ticket_updated',     // Support ticket updated
        'seller_suspended',   // Seller account suspended
        'seller_banned',      // Seller account banned
        'product_listed',     // Product listed (for seller)
        'product_sold',       // Product sold (for seller)
        'support_notice',     // General support/admin notice
        'auction_won',        // Buyer won auction
        'auction_confirmation_reminder', // Reminder to confirm
        'auction_confirmation_expired',  // Confirmation time expired
        'auction_second_chance',         // 2nd/3rd bidder selected
        'seller_payout',      // Seller payout completed
        'outbid'              // User outbid on auction
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    data: {
      // Contextual data about the notification
      relatedId: mongoose.Schema.Types.ObjectId, // Order ID, Product ID, Bid ID, etc.
      relatedType: String, // 'Order', 'Bid', 'Product', 'Message', 'Review', etc.
      userId: mongoose.Schema.Types.ObjectId, // Who triggered this notification
      userName: String
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: Date,
    actionUrl: String, // URL for user to take action
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    metadata: mongoose.Schema.Types.Mixed, // Additional flexible data
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      // Auto-delete notifications after 90 days
      expires: 90 * 24 * 60 * 60
    }
  },
  { timestamps: true }
);

// Index for efficient queries
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });

/**
 * Static method to create and send notification
 */
notificationSchema.statics.createAndSend = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Instance method to mark as read
 */
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

/**
 * Static method to mark multiple as read
 */
notificationSchema.statics.markManyAsRead = async function(notificationIds) {
  try {
    return await this.updateMany(
      { _id: { $in: notificationIds } },
      { read: true, readAt: new Date() }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

/**
 * Static method to get unread count
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    return await this.countDocuments({ recipientId: userId, read: false });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
