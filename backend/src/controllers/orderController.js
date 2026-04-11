const Order = require('../models/Order');
const Bid = require('../models/Bid');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../utils/emailService');
const notificationService = require('../utils/notificationService');

const toId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

const serializeOrder = (order) => {
  const productId = order.productId && order.productId._id ? order.productId._id : order.productId;

  return {
    id: toId(order._id),
    userId: toId(order.buyerId),
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    productId: toId(productId),
    product: order.productId && typeof order.productId === 'object' ? order.productId : undefined,
    bidId: toId(order.bidId),
    products: productId ? [{ productId: toId(productId), quantity: 1 }] : [],
    totalAmount: order.finalPrice,
    finalPrice: order.finalPrice,
    platformFee: order.platformFee || 0,
    totalPayable: order.finalPrice + (order.platformFee || 0),
    status: order.status,
    escrowStatus: order.escrowStatus,
    createdAt: order.orderDate || order.createdAt,
    updatedAt: order.updatedAt,
    orderDate: order.orderDate || order.createdAt,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    actualDeliveryDate: order.actualDeliveryDate,
    notes: order.notes,
    disputeReason: order.disputeReason,
    disputeDescription: order.disputeDescription
  };
};

// Create order from an accepted bid
const createOrder = async (req, res) => {
  try {
    const { bidId } = req.body;

    if (!bidId) {
      return res.status(400).json({ message: 'Bid ID required' });
    }

    // Fetch bid and verify it's accepted
    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });
    if (bid.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted bids can create orders' });
    }

    // Only the bidder can create an order from their accepted bid
    if (bid.buyerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order already exists for this bid
    const existingOrder = await Order.findOne({ bidId });
    if (existingOrder) {
      // Return the existing order as a successful creation to keep callers idempotent
      const populatedExisting = await Order.findById(existingOrder._id)
        .populate('productId', 'title category')
        .populate('buyerId', 'firstName lastName email')
        .populate('sellerId', 'firstName lastName email');
      return res.status(201).json({
        success: true,
        message: 'Order already exists for this bid',
        data: serializeOrder(populatedExisting)
      });
    }

    // Fetch product and seller info
    const product = await Product.findById(bid.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Create order
    const order = new Order({
      productId: bid.productId,
      buyerId: bid.buyerId,
      sellerId: product.sellerId,
      bidId,
      finalPrice: bid.bidAmount,
      status: 'pending',
      escrowStatus: 'held',
      orderDate: new Date(),
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('productId', 'title category')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: serializeOrder(populatedOrder)
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's orders (buyer or seller)
const getUserOrders = async (req, res) => {
  try {
    const { status, scope, page = 1, limit = 10 } = req.query;

    let filter;
    if (scope === 'buyer') {
      filter = { buyerId: req.user.id };
    } else if (scope === 'seller') {
      filter = { sellerId: req.user.id };
    } else {
      filter = {
        $or: [
          { buyerId: req.user.id },
          { sellerId: req.user.id }
        ]
      };
    }

    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .populate('productId', 'title category')
      .populate('buyerId', 'firstName lastName')
      .populate('sellerId', 'firstName lastName')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    // Transform orders to match frontend Order interface
    const transformedOrders = orders.map(serializeOrder);

    res.json({
      success: true,
      data: {
        data: transformedOrders,
        total
      }
    });
  } catch (error) {
    logger.error('Get user orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single order details
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('productId')
      .populate('buyerId', 'firstName lastName email phone')
      .populate('sellerId', 'firstName lastName email phone')
      .populate('bidId');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only buyer, seller, or admin can view order
    if (order.buyerId._id.toString() !== req.user.id &&
      order.sellerId._id.toString() !== req.user.id &&
      req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: serializeOrder(order)
    });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'qc_pending', 'qc_approved', 'in_delivery', 'delivered', 'completed', 'disputed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only seller can move order to qc_pending or in_delivery
    // Only buyer can move order to completed or disputed
    if (status === 'in_delivery' || status === 'qc_approved') {
      if (order.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only seller can approve delivery' });
      }
    }

    if (status === 'completed') {
      if (order.buyerId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only buyer can mark as completed' });
      }
      order.actualDeliveryDate = new Date();
    }

    order.status = status;
    if (notes) order.notes = notes;
    order.updatedAt = new Date();

    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate('productId', 'title')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: serializeOrder(updatedOrder)
    });

    if (status === 'in_delivery' && updatedOrder?.buyerId) {
      setImmediate(async () => {
        try {
          const productTitle = updatedOrder.productId?.title || 'your order';
          const buyerName = `${updatedOrder.buyerId.firstName || ''} ${updatedOrder.buyerId.lastName || ''}`.trim() || 'Buyer';

          await notificationService.createAndSend({
            recipientId: updatedOrder.buyerId._id,
            type: 'delivery_started',
            title: 'Order Shipped',
            message: `Your order for "${productTitle}" is now on the way.`,
            data: {
              relatedId: updatedOrder._id,
              relatedType: 'Order',
              productTitle
            },
            priority: 'high',
            actionUrl: `/orders/${updatedOrder._id}`
          });

          if (updatedOrder.buyerId.email) {
            await emailService.sendOrderShippedEmail(
              updatedOrder.buyerId.email,
              buyerName,
              productTitle,
              updatedOrder._id.toString()
            );
          }
        } catch (shippingNotificationError) {
          logger.error('Order shipped notification error:', shippingNotificationError);
        }
      });
    }
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Confirm delivery (buyer confirms receipt)
// Note: escrow stays 'held' — the autoReleaseEscrow cron job releases it after 24 hours
const confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only buyer can confirm delivery
    if (order.buyerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only buyer can confirm delivery' });
    }

    if (order.status !== 'in_delivery' && order.status !== 'delivered') {
      return res.status(400).json({ message: 'Order must be in delivery or delivered status' });
    }

    order.status = 'completed';
    order.actualDeliveryDate = new Date();
    // Keep escrowStatus as 'held' — auto-release cron will release after 24 hours
    order.updatedAt = new Date();

    await order.save();

    const completedOrder = await Order.findById(id)
      .populate('productId', 'title')
      .populate('buyerId', 'firstName lastName')
      .populate('sellerId', 'firstName lastName');

    res.json({
      success: true,
      message: 'Delivery confirmed. Payment will be released to seller within 24 hours.',
      data: serializeOrder(completedOrder)
    });
  } catch (error) {
    logger.error('Confirm delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Raise dispute on order
const raiseDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Dispute reason required' });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only buyer or seller can raise dispute
    if (order.buyerId.toString() !== req.user.id &&
      order.sellerId.toString() !== req.user.id &&
      req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.status === 'disputed' || order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot dispute this order in its current status' });
    }

    order.status = 'disputed';
    order.disputeReason = reason;
    order.disputeDescription = description || '';
    order.disputeFiledBy = req.user.id;
    order.disputeFiledAt = new Date();

    // Append to notes for audit trail
    order.notes = (order.notes ? order.notes + ' | ' : '') + `DISPUTE (${req.user.role}): ${reason} - ${description || ''}`;
    order.updatedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: 'Dispute raised. Support will contact you.',
      data: {
        message: 'Dispute raised. Support will contact you.',
        order: serializeOrder(order)
      }
    });
  } catch (error) {
    logger.error('Raise dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel order (only before confirmation)
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only buyer or seller can cancel
    if (order.buyerId.toString() !== req.user.id &&
      order.sellerId.toString() !== req.user.id &&
      req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel this order' });
    }

    order.status = 'cancelled';
    order.escrowStatus = 'refunded';
    order.updatedAt = new Date();

    await order.save();

    // Mark bid as withdrawn (implicitly)
    if (order.bidId) {
      await Bid.findByIdAndUpdate(order.bidId, { status: 'withdrawn' });
    }

    res.json({
      success: true,
      message: 'Order cancelled',
      data: {
        message: 'Order cancelled',
        order: serializeOrder(order)
      }
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .populate('productId', 'title category')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        data: orders.map(serializeOrder),
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  confirmDelivery,
  raiseDispute,
  cancelOrder
};
