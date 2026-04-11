const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const BlockedUser = require('../models/BlockedUser');
const User = require('../models/User');
const logger = require('../utils/logger');
const storageService = require('../services/storageService');

// Get all conversations for the current user
const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await Conversation.find({
            participants: userId,
            isActive: true
        })
            .populate('participants', 'firstName lastName profilePicture')
            .populate('lastMessage.sender', 'firstName lastName')
            .populate('orderId', 'orderNumber')
            .populate('productId', 'title images')
            .sort({ updatedAt: -1 });

        // Get blocked users to filter
        const blockedUsers = await BlockedUser.find({ blocker: userId }).select('blocked');
        const blockedIds = blockedUsers.map(b => b.blocked.toString());

        // Format response
        const formattedConversations = conversations
            .filter(conv => {
                // Filter out conversations with blocked users
                const otherParticipants = conv.participants.filter(p => p._id.toString() !== userId);
                return !otherParticipants.some(p => blockedIds.includes(p._id.toString()));
            })
            .map(conv => {
                const otherParticipant = conv.participants.find(p => p._id.toString() !== userId);
                return {
                    id: conv._id,
                    otherUser: otherParticipant ? {
                        id: otherParticipant._id,
                        name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
                        avatar: otherParticipant.profilePicture
                    } : null,
                    lastMessage: conv.lastMessage,
                    unreadCount: conv.getUnreadCountForUser(userId),
                    orderId: conv.orderId,
                    productId: conv.productId,
                    updatedAt: conv.updatedAt
                };
            });

        res.json({
            success: true,
            data: formattedConversations
        });
    } catch (error) {
        logger.error('Get conversations error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get messages for a specific conversation
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Verify user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Not authorized to view this conversation' });
        }

        const messages = await Message.find({
            conversationId,
            isDeleted: false
        })
            .populate('sender', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Message.countDocuments({ conversationId, isDeleted: false });

        res.json({
            success: true,
            data: {
                messages: messages.reverse(),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // Verify conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Not authorized to send to this conversation' });
        }

        // Check if blocked
        const otherParticipant = conversation.participants.find(p => p.toString() !== userId);
        const isBlocked = await BlockedUser.findOne({
            $or: [
                { blocker: userId, blocked: otherParticipant },
                { blocker: otherParticipant, blocked: userId }
            ]
        });

        if (isBlocked) {
            return res.status(403).json({ message: 'Cannot send message - user is blocked' });
        }

        // Handle attachments (if using multer)
        const attachments = [];
        if (req.files && req.files.length > 0) {
            const uploadedUrls = await storageService.uploadFiles(req.files, {
                folder: 'messages',
                resourceType: 'auto'
            });

            for (const [index, file] of req.files.entries()) {
                attachments.push({
                    url: uploadedUrls[index],
                    type: file.mimetype.startsWith('image/')
                        ? 'image'
                        : file.mimetype.startsWith('video/')
                            ? 'video'
                            : 'file',
                    name: file.originalname,
                    size: file.size
                });
            }
        }

        // Create message
        const message = new Message({
            conversationId,
            sender: userId,
            content,
            attachments,
            readBy: [{ user: userId }]
        });
        await message.save();

        // Update conversation
        conversation.lastMessage = {
            content,
            sender: userId,
            createdAt: new Date()
        };
        conversation.updatedAt = new Date();

        // Increment unread for other participants
        for (const participant of conversation.participants) {
            if (participant.toString() !== userId) {
                conversation.incrementUnread(participant);
            }
        }
        await conversation.save();

        // Populate sender info before returning
        await message.populate('sender', 'firstName lastName profilePicture');

        // Notify recipient via Socket.io
        // otherParticipant is already defined above
        if (otherParticipant) {
            const notificationService = require('../utils/notificationService');
            // Format message for client
            const messageData = {
                _id: message._id,
                conversationId: message.conversationId,
                sender: {
                    _id: message.sender._id,
                    firstName: message.sender.firstName,
                    lastName: message.sender.lastName,
                    profilePicture: message.sender.profilePicture
                },
                content: message.content,
                attachments: message.attachments,
                createdAt: message.createdAt,
                senderName: `${message.sender.firstName} ${message.sender.lastName}`
            };
            notificationService.notifyNewMessage(otherParticipant._id, messageData);
        }

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        logger.error('Send message error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Start a new conversation
const startConversation = async (req, res) => {
    try {
        const { recipientId, orderId, productId } = req.body;
        const userId = req.user.id;

        if (userId === recipientId) {
            return res.status(400).json({ message: 'Cannot start conversation with yourself' });
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Check if blocked
        const isBlocked = await BlockedUser.findOne({
            $or: [
                { blocker: userId, blocked: recipientId },
                { blocker: recipientId, blocked: userId }
            ]
        });

        if (isBlocked) {
            return res.status(403).json({ message: 'Cannot start conversation - user is blocked' });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, recipientId] },
            ...(orderId && { orderId }),
            ...(productId && { productId })
        });

        if (conversation) {
            return res.json({
                success: true,
                data: { conversationId: conversation._id, existing: true }
            });
        }

        // Create new conversation
        conversation = new Conversation({
            participants: [userId, recipientId],
            orderId: orderId || null,
            productId: productId || null,
            unreadCount: new Map()
        });
        await conversation.save();

        res.status(201).json({
            success: true,
            data: { conversationId: conversation._id, existing: false }
        });
    } catch (error) {
        logger.error('Start conversation error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark conversation as read
const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Reset unread count
        conversation.resetUnread(userId);
        await conversation.save();

        // Mark all messages as read
        await Message.updateMany(
            {
                conversationId,
                'readBy.user': { $ne: userId }
            },
            {
                $push: { readBy: { user: userId, readAt: new Date() } }
            }
        );

        // Notify other participants that messages were read globally and locally
        const notificationService = require('../utils/notificationService');
        for (const participant of conversation.participants) {
            if (participant.toString() !== userId) {
                // To the global inbox listener
                notificationService.sendToUser(participant.toString(), 'message-read', { conversationId });
                // To the active chat window listener
                notificationService.sendToUser(participant.toString(), `read:${conversationId}`, { messageId: 'all' });
            }
        }

        res.json({
            success: true,
            message: 'Conversation marked as read'
        });
    } catch (error) {
        logger.error('Mark as read error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await Conversation.find({
            participants: userId,
            isActive: true
        });

        let totalUnread = 0;
        for (const conv of conversations) {
            totalUnread += conv.getUnreadCountForUser(userId);
        }

        res.json({
            success: true,
            data: { unreadCount: totalUnread }
        });
    } catch (error) {
        logger.error('Get unread count error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Search conversations
const searchConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters' });
        }

        // Search users by name
        const users = await User.find({
            $or: [
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } }
            ]
        }).select('_id');

        const userIds = users.map(u => u._id);

        // Find conversations with matching users
        const conversations = await Conversation.find({
            participants: { $all: [userId], $in: userIds },
            isActive: true
        })
            .populate('participants', 'firstName lastName profilePicture')
            .sort({ updatedAt: -1 });

        const formattedConversations = conversations.map(conv => {
            const otherParticipant = conv.participants.find(p => p._id.toString() !== userId);
            return {
                id: conv._id,
                otherUser: otherParticipant ? {
                    id: otherParticipant._id,
                    name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
                    avatar: otherParticipant.profilePicture
                } : null,
                lastMessage: conv.lastMessage,
                unreadCount: conv.getUnreadCountForUser(userId)
            };
        });

        res.json({
            success: true,
            data: formattedConversations
        });
    } catch (error) {
        logger.error('Search conversations error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Block user
const blockUser = async (req, res) => {
    try {
        const { userId: blockedId } = req.params;
        const blockerId = req.user.id;

        if (blockerId === blockedId) {
            return res.status(400).json({ message: 'Cannot block yourself' });
        }

        // Check if already blocked
        const existing = await BlockedUser.findOne({ blocker: blockerId, blocked: blockedId });
        if (existing) {
            return res.status(400).json({ message: 'User is already blocked' });
        }

        const block = new BlockedUser({
            blocker: blockerId,
            blocked: blockedId
        });
        await block.save();

        res.json({
            success: true,
            message: 'User blocked successfully'
        });
    } catch (error) {
        logger.error('Block user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Unblock user
const unblockUser = async (req, res) => {
    try {
        const { userId: blockedId } = req.params;
        const blockerId = req.user.id;

        const result = await BlockedUser.findOneAndDelete({
            blocker: blockerId,
            blocked: blockedId
        });

        if (!result) {
            return res.status(404).json({ message: 'Block not found' });
        }

        res.json({
            success: true,
            message: 'User unblocked successfully'
        });
    } catch (error) {
        logger.error('Unblock user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// React to message
const reactToMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Verify user is participant of conversation
        const conversation = await Conversation.findById(message.conversationId);
        const isParticipant = conversation.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if already reacted with same emoji
        const existingReaction = message.reactions.find(
            r => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingReaction) {
            // Remove reaction
            message.reactions = message.reactions.filter(
                r => !(r.user.toString() === userId && r.emoji === emoji)
            );
        } else {
            // Add reaction
            message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        res.json({
            success: true,
            data: message.reactions
        });
    } catch (error) {
        logger.error('React to message error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Report user
const reportUser = async (req, res) => {
    try {
        const { userId: reportedId } = req.params;
        const { reason } = req.body;
        const reporterId = req.user.id;

        // In a real app, you'd save this to a reports collection
        // For now, just log it
        logger.info(`User ${reporterId} reported user ${reportedId}. Reason: ${reason}`);

        res.json({
            success: true,
            message: 'Report submitted successfully'
        });
    } catch (error) {
        logger.error('Report user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get blocked users
const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        const blocked = await BlockedUser.find({ blocker: userId })
            .populate('blocked', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 });

        const formattedBlocked = blocked.map(b => ({
            id: b.blocked._id,
            name: `${b.blocked.firstName} ${b.blocked.lastName}`,
            avatar: b.blocked.profilePicture,
            blockedAt: b.createdAt
        }));

        res.json({
            success: true,
            data: formattedBlocked
        });
    } catch (error) {
        logger.error('Get blocked users error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getConversations,
    getMessages,
    sendMessage,
    startConversation,
    markAsRead,
    getUnreadCount,
    searchConversations,
    blockUser,
    unblockUser,
    reactToMessage,
    reportUser,
    getBlockedUsers
};
