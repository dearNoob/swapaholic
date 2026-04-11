const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');
const { createUpload } = require('../middleware/upload');

const upload = createUpload({
    allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedMimePrefixes: ['image/'],
    errorMessage: 'Invalid attachment type'
});

// All routes require authentication
router.use(authMiddleware);

// Get all conversations
router.get('/conversations', messageController.getConversations);

// Get unread count
router.get('/unread-count', messageController.getUnreadCount);

// Search conversations
router.get('/search', messageController.searchConversations);

// Get blocked users
router.get('/blocked', messageController.getBlockedUsers);

// Start a new conversation
router.post('/conversations/start', messageController.startConversation);

// Get messages for a specific conversation
router.get('/conversations/:conversationId', messageController.getMessages);

// Send a message in a conversation
router.post('/conversations/:conversationId/send', upload.array('attachments', 5), messageController.sendMessage);

// Mark conversation as read
router.put('/conversations/:conversationId/read', messageController.markAsRead);

// React to a message
router.post('/:messageId/react', messageController.reactToMessage);

// Block a user
router.post('/block/:userId', messageController.blockUser);

// Unblock a user
router.delete('/block/:userId', messageController.unblockUser);

// Report a user
router.post('/report/:userId', messageController.reportUser);

module.exports = router;
