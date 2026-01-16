const Notification = require('../models/Notification');
const logger = require('./logger');

/**
 * Socket.io event handlers for real-time notifications
 * This module handles WebSocket connections and real-time notification delivery
 */

class NotificationService {
  constructor() {
    this.io = null;
    this.userConnections = {}; // Map of userId -> socketId
  }

  /**
   * Initialize Socket.io
   */
  init(io) {
    this.io = io;
    logger.info('NotificationService initialized with Socket.io');
  }

  /**
   * Handle user connection
   */
  handleConnection(socket) {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;

    if (!userId) {
      logger.warn('Connection attempt without userId');
      socket.disconnect();
      return;
    }

    // Store user connection
    this.userConnections[userId] = socket.id;
    logger.info(`User connected: ${userId} (socket: ${socket.id})`);

    // Emit connection confirmation
    socket.emit('connected', { userId, socketId: socket.id });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(userId);
    });

    // Handle test notification (for development)
    socket.on('test_notification', () => {
      this.sendToUser(userId, 'test', {
        title: 'Test Notification',
        message: 'This is a test notification from the server'
      });
    });
  }

  /**
   * Handle user disconnection
   */
  handleDisconnection(userId) {
    delete this.userConnections[userId];
    logger.info(`User disconnected: ${userId}`);
  }

  /**
   * Send notification to specific user via Socket.io
   */
  sendToUser(userId, eventType, data) {
    if (!this.io) {
      logger.warn('Socket.io not initialized');
      return false;
    }

    const socketId = this.userConnections[userId];
    if (!socketId) {
      logger.debug(`User ${userId} not connected (offline notification will be stored in DB)`);
      return false;
    }

    try {
      // Send generic notification event
      this.io.to(socketId).emit('notification', {
        type: eventType,
        data,
        timestamp: new Date()
      });
      
      // Also emit specific event for better client handling
      this.io.to(socketId).emit(eventType, {
        data,
        timestamp: new Date()
      });
      
      logger.info(`Notification sent to user ${userId}: ${eventType}`);
      return true;
    } catch (error) {
      logger.error(`Error sending notification to ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  sendToMultiple(userIds, eventType, data) {
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    const results = {};
    for (const userId of userIds) {
      results[userId] = this.sendToUser(userId, eventType, data);
    }
    return results;
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastToAll(eventType, data) {
    if (!this.io) {
      logger.warn('Socket.io not initialized');
      return;
    }

    try {
      this.io.emit('notification', {
        type: eventType,
        data,
        timestamp: new Date()
      });
      logger.info(`Broadcast notification to all users: ${eventType}`);
    } catch (error) {
      logger.error('Error broadcasting notification:', error);
    }
  }

  /**
   * Create notification in database and send to user
   */
  async createAndSend(notificationData) {
    try {
      // Save to database
      const notification = await Notification.create(notificationData);
      logger.info(`Notification created: ${notification._id}`);

      // Send via Socket.io if user is online
      const sent = this.sendToUser(notification.recipientId.toString(), notification.type, {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data,
        priority: notification.priority,
        actionUrl: notification.actionUrl
      });

      if (!sent) {
        logger.info(`Notification stored in DB for offline delivery: ${notification._id}`);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating and sending notification:', error);
      throw error;
    }
  }

  /**
   * Notification helper: Order created
   */
  async notifyOrderCreated(orderId, buyerId, sellerId, productTitle) {
    await this.createAndSend({
      recipientId: sellerId,
      type: 'order_created',
      title: 'New Order Received',
      message: `You received a new order for "${productTitle}"`,
      data: {
        relatedId: orderId,
        relatedType: 'Order',
        productTitle
      },
      priority: 'high',
      actionUrl: `/orders/${orderId}`
    });
  }

  /**
   * Notification helper: Bid received
   */
  async notifyBidReceived(bidId, productId, productTitle, bidAmount, buyerId, sellerId) {
    await this.createAndSend({
      recipientId: sellerId,
      type: 'bid_received',
      title: 'New Bid Received',
      message: `New bid of $${bidAmount} on "${productTitle}"`,
      data: {
        relatedId: bidId,
        relatedType: 'Bid',
        productTitle,
        bidAmount,
        userId: buyerId
      },
      priority: 'high',
      actionUrl: `/products/${productId}/bids`
    });
  }

  /**
   * Notification helper: Bid accepted
   */
  async notifyBidAccepted(bidId, productTitle, acceptedAmount, buyerId) {
    await this.createAndSend({
      recipientId: buyerId,
      type: 'bid_accepted',
      title: 'Bid Accepted!',
      message: `Your bid of $${acceptedAmount} on "${productTitle}" has been accepted`,
      data: {
        relatedId: bidId,
        relatedType: 'Bid',
        productTitle,
        amount: acceptedAmount
      },
      priority: 'high',
      actionUrl: `/orders`
    });
  }

  /**
   * Notification helper: Bid rejected
   */
  async notifyBidRejected(bidId, productTitle, bidAmount, buyerId) {
    await this.createAndSend({
      recipientId: buyerId,
      type: 'bid_rejected',
      title: 'Bid Rejected',
      message: `Your bid of $${bidAmount} on "${productTitle}" was rejected`,
      data: {
        relatedId: bidId,
        relatedType: 'Bid',
        productTitle,
        bidAmount
      },
      priority: 'normal',
      actionUrl: `/products`
    });
  }

  /**
   * Notification helper: User outbid
   */
  async notifyOutbid(bidId, productId, productTitle, previousBidAmount, newBidAmount, buyerId) {
    await this.createAndSend({
      recipientId: buyerId,
      type: 'outbid',
      title: 'You Have Been Outbid',
      message: `Your bid of $${previousBidAmount} on "${productTitle}" has been outbid. Current highest bid: $${newBidAmount}`,
      data: {
        relatedId: bidId,
        relatedType: 'Bid',
        productId,
        productTitle,
        previousBidAmount,
        newBidAmount
      },
      priority: 'high',
      actionUrl: `/products/${productId}/bids`
    });
  }

  /**
   * Notification helper: Payment released
   */
  async notifyPaymentReleased(orderId, sellerId, amount) {
    await this.createAndSend({
      recipientId: sellerId,
      type: 'payment_released',
      title: 'Payment Released',
      message: `Payment of $${amount} has been released to your account`,
      data: {
        relatedId: orderId,
        relatedType: 'Order',
        amount
      },
      priority: 'high',
      actionUrl: `/orders/${orderId}`
    });
  }

  /**
   * Notification helper: Delivery completed
   */
  async notifyDeliveryCompleted(orderId, buyerId, productTitle) {
    await this.createAndSend({
      recipientId: buyerId,
      type: 'delivery_completed',
      title: 'Delivery Completed',
      message: `Your order for "${productTitle}" has been delivered`,
      data: {
        relatedId: orderId,
        relatedType: 'Order',
        productTitle
      },
      priority: 'high',
      actionUrl: `/orders/${orderId}`
    });
  }

  /**
   * Notification helper: Review received
   */
  async notifyReviewReceived(reviewId, revieweeId, reviewerName, rating) {
    await this.createAndSend({
      recipientId: revieweeId,
      type: 'review_received',
      title: `${reviewerName} left a ${rating}★ review`,
      message: `You received a new review from ${reviewerName}`,
      data: {
        relatedId: reviewId,
        relatedType: 'Review',
        reviewerName,
        rating
      },
      priority: 'normal',
      actionUrl: `/reviews`
    });
  }

  /**
   * Notification helper: Dispute opened
   */
  async notifyDisputeOpened(orderId, userId, productTitle) {
    await this.createAndSend({
      recipientId: userId,
      type: 'dispute_opened',
      title: 'Dispute Opened',
      message: `A dispute has been opened on your order for "${productTitle}"`,
      data: {
        relatedId: orderId,
        relatedType: 'Order',
        productTitle
      },
      priority: 'urgent',
      actionUrl: `/orders/${orderId}/dispute`
    });
  }

  /**
   * Notification helper: Dispute resolved
   */
  async notifyDisputeResolved(orderId, userId, resolution) {
    await this.createAndSend({
      recipientId: userId,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `Your dispute has been resolved. Resolution: ${resolution}`,
      data: {
        relatedId: orderId,
        relatedType: 'Order',
        resolution
      },
      priority: 'high',
      actionUrl: `/orders/${orderId}`
    });
  }

  /**
   * Notification helper: QC passed
   */
  async notifyQCPassed(productId, sellerId, productTitle) {
    await this.createAndSend({
      recipientId: sellerId,
      type: 'qc_passed',
      title: 'QC Verification Passed',
      message: `Your product "${productTitle}" passed quality control verification`,
      data: {
        relatedId: productId,
        relatedType: 'Product',
        productTitle
      },
      priority: 'normal',
      actionUrl: `/products/${productId}`
    });
  }

  /**
   * Notification helper: QC failed
   */
  async notifyQCFailed(productId, sellerId, productTitle, reason) {
    await this.createAndSend({
      recipientId: sellerId,
      type: 'qc_failed',
      title: 'QC Verification Failed',
      message: `Your product "${productTitle}" did not pass QC. Reason: ${reason}`,
      data: {
        relatedId: productId,
        relatedType: 'Product',
        productTitle,
        reason
      },
      priority: 'urgent',
      actionUrl: `/products/${productId}`
    });
  }

  /**
   * Notification helper: Support ticket resolved
   */
  async notifyTicketResolved(ticketId, userId, ticketTitle) {
    await this.createAndSend({
      recipientId: userId,
      type: 'ticket_resolved',
      title: 'Support Ticket Resolved',
      message: `Your support ticket "${ticketTitle}" has been resolved`,
      data: {
        relatedId: ticketId,
        relatedType: 'SupportTicket',
        ticketTitle
      },
      priority: 'normal',
      actionUrl: `/support/${ticketId}`
    });
  }

  /**
   * Get connected users count (for admin monitoring)
   */
  getConnectedUsersCount() {
    return Object.keys(this.userConnections).length;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers() {
    return Object.keys(this.userConnections);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return userId.toString() in this.userConnections;
  }
}

// Export singleton instance
module.exports = new NotificationService();
