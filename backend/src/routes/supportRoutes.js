const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const supportController = require('../controllers/supportController');

// @route   POST /api/support
// @desc    Create new support ticket
// @access  Private - Buyer/Seller
router.post('/', authMiddleware, supportController.createTicket);

// @route   GET /api/support/stats
// @desc    Get ticket statistics (admin only)
// @access  Private - Admin
router.get('/stats', authMiddleware, roleCheck(['admin']), supportController.getTicketStats);

// @route   GET /api/support
// @desc    Get user's support tickets (admin sees all)
// @access  Private
router.get('/', authMiddleware, supportController.getTickets);

// @route   GET /api/support/:ticketId
// @desc    Get support ticket details
// @access  Private
router.get('/:ticketId', authMiddleware, supportController.getTicket);

// @route   POST /api/support/:ticketId/message
// @desc    Add message to ticket
// @access  Private
router.post('/:ticketId/message', authMiddleware, supportController.addMessage);

// @route   PUT /api/support/:ticketId/status
// @desc    Update ticket status (admin only)
// @access  Private - Admin
router.put('/:ticketId/status', authMiddleware, roleCheck(['admin']), supportController.updateTicketStatus);

// @route   PUT /api/support/:ticketId/assign
// @desc    Assign ticket to admin (admin only)
// @access  Private - Admin
router.put('/:ticketId/assign', authMiddleware, roleCheck(['admin']), supportController.assignTicket);

// @route   POST /api/support/:ticketId/close
// @desc    Close ticket
// @access  Private
router.post('/:ticketId/close', authMiddleware, supportController.closeTicket);

module.exports = router;
