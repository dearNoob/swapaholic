const SupportTicket = require('../models/SupportTicket');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

// Create a support ticket
const createTicket = async (req, res) => {
  try {
    const { orderId, subject, description, category } = req.body;
    const userId = req.user.id;

    // Validation
    if (!orderId || !subject || !description || !category) {
      return res.status(400).json({ message: 'Order ID, subject, description, and category required' });
    }

    if (subject.trim().length < 5) {
      return res.status(400).json({ message: 'Subject must be at least 5 characters' });
    }

    if (description.trim().length < 20) {
      return res.status(400).json({ message: 'Description must be at least 20 characters' });
    }

    const validCategories = ['product_quality', 'delivery_issue', 'payment_issue', 'dispute', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: `Category must be one of: ${validCategories.join(', ')}` });
    }

    // Verify order exists and user is involved
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isParticipant = order.buyerId.toString() === userId || order.sellerId.toString() === userId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Only order participants can create tickets' });
    }

    // Create ticket
    const ticket = new SupportTicket({
      orderId,
      userId,
      subject,
      description,
      category,
      messages: [
        {
          userId,
          message: description,
          timestamp: new Date()
        }
      ]
    });

    await ticket.save();
    await ticket.populate('userId', 'firstName lastName email');
    await ticket.populate('orderId', 'buyerId sellerId finalPrice status');

    logger.info(`Support ticket created: ${ticket._id}`);

    res.status(201).json(ticket);
  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all tickets (admin) or user's tickets
const getTickets = async (req, res) => {
  try {
    const { status = 'open', page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    // Admins see all tickets, others see only their own
    if (userRole !== 'admin') {
      query.userId = userId;
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Fetch tickets
    const tickets = await SupportTicket.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'buyerId sellerId finalPrice status')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await SupportTicket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single ticket with all messages
const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await SupportTicket.findById(ticketId)
      .populate('userId', 'firstName lastName email phone')
      .populate('orderId', 'buyerId sellerId finalPrice status');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only ticket creator, order participants, or admin can view
    const order = await Order.findById(ticket.orderId);
    const isParticipant = ticket.userId.toString() === userId ||
                         order.buyerId.toString() === userId ||
                         order.sellerId.toString() === userId ||
                         userRole === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    logger.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add message to ticket
const addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ message: 'Message must be at least 5 characters' });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only ticket creator, order participants, or admin can add messages
    const order = await Order.findById(ticket.orderId);
    const isParticipant = ticket.userId.toString() === userId ||
                         order.buyerId.toString() === userId ||
                         order.sellerId.toString() === userId ||
                         userRole === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add message
    ticket.messages.push({
      userId,
      message: message.trim(),
      timestamp: new Date()
    });

    ticket.updatedAt = new Date();
    await ticket.save();

    // Populate for response
    await ticket.populate('userId', 'firstName lastName email');

    logger.info(`Message added to ticket: ${ticket._id}`);

    res.json(ticket);
  } catch (error) {
    logger.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, resolution } = req.body;
    const userRole = req.user.role;

    // Only admins can update status
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update ticket status' });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = status;
    if (resolution) {
      ticket.resolution = resolution;
    }
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }
    ticket.updatedAt = new Date();

    await ticket.save();
    await ticket.populate('userId', 'firstName lastName email');

    logger.info(`Ticket status updated: ${ticket._id} -> ${status}`);

    res.json(ticket);
  } catch (error) {
    logger.error('Update ticket status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign ticket to admin
const assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assignedToId } = req.body;
    const userRole = req.user.role;

    // Only admins can assign
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign tickets' });
    }

    if (!assignedToId) {
      return res.status(400).json({ message: 'Assigned to ID required' });
    }

    // Verify assignee is admin
    const assignee = await User.findById(assignedToId);
    if (!assignee || assignee.role !== 'admin') {
      return res.status(400).json({ message: 'Assigned user must be an admin' });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.assignedTo = assignedToId;
    ticket.updatedAt = new Date();
    await ticket.save();

    await ticket.populate('userId', 'firstName lastName email');
    await ticket.populate('assignedTo', 'firstName lastName email');

    logger.info(`Ticket assigned: ${ticket._id} to ${assignedToId}`);

    res.json(ticket);
  } catch (error) {
    logger.error('Assign ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get ticket statistics (admin only)
const getTicketStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view statistics' });
    }

    const stats = {
      total: await SupportTicket.countDocuments(),
      open: await SupportTicket.countDocuments({ status: 'open' }),
      inProgress: await SupportTicket.countDocuments({ status: 'in_progress' }),
      resolved: await SupportTicket.countDocuments({ status: 'resolved' }),
      closed: await SupportTicket.countDocuments({ status: 'closed' }),
      byCategory: {}
    };

    // Category breakdown
    const categories = ['product_quality', 'delivery_issue', 'payment_issue', 'dispute', 'other'];
    for (const category of categories) {
      stats.byCategory[category] = await SupportTicket.countDocuments({ category });
    }

    // Average resolution time (for resolved tickets)
    const resolvedTickets = await SupportTicket.find({ status: 'resolved' })
      .select('createdAt resolvedAt');

    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        return sum + (ticket.resolvedAt - ticket.createdAt);
      }, 0);
      stats.avgResolutionTimeHours = (totalTime / resolvedTickets.length / (1000 * 60 * 60)).toFixed(2);
    } else {
      stats.avgResolutionTimeHours = 0;
    }

    res.json(stats);
  } catch (error) {
    logger.error('Get ticket stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Close ticket
const closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { feedback } = req.body;
    const userId = req.user.id;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only ticket creator or admin can close
    if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    ticket.status = 'closed';
    if (feedback) {
      ticket.feedback = feedback;
    }
    ticket.closedAt = new Date();
    ticket.updatedAt = new Date();

    await ticket.save();
    await ticket.populate('userId', 'firstName lastName email');

    logger.info(`Ticket closed: ${ticket._id}`);

    res.json(ticket);
  } catch (error) {
    logger.error('Close ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
  assignTicket,
  getTicketStats,
  closeTicket
};
