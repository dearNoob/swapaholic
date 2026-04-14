const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

/**
 * Notification Routes
 * All routes require authentication
 */

// @route   GET /api/notifications
// @desc    Get user notifications with pagination
// @access  Private
// Query params: page, limit, read (true/false), type (notification type)
router.get('/', authMiddleware, notificationController.getNotifications);

// @route   GET /api/notifications/unread/count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread/count', authMiddleware, notificationController.getUnreadCount);

// @route   GET /api/notifications/type/:type
// @desc    Get notifications filtered by type
// @access  Private
router.get('/type/:type', authMiddleware, notificationController.getNotificationsByType);

// @route   GET /api/notifications/preferences
// @desc    Get notification preferences (future feature)
// @access  Private
router.get('/preferences', authMiddleware, notificationController.getPreferences);

// @route   GET /api/notifications/:notificationId
// @desc    Get specific notification and mark as read
// @access  Private
router.get('/:notificationId', authMiddleware, notificationController.getNotification);

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);

// @route   PUT /api/notifications/read/all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read/all', authMiddleware, notificationController.markAllAsRead);

// Backward-compatible alias used by older frontend builds
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

// @route   POST /api/notifications/read/batch
// @desc    Mark multiple notifications as read
// @access  Private
// Body: { notificationIds: [...] }
router.post('/read/batch', authMiddleware, notificationController.markManyAsRead);

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete notification
// @access  Private
router.delete('/:notificationId', authMiddleware, notificationController.deleteNotification);

// @route   POST /api/notifications/delete/batch
// @desc    Delete multiple notifications
// @access  Private
// Body: { notificationIds: [...] }
router.post('/delete/batch', authMiddleware, notificationController.deleteMany);

module.exports = router;
