const User = require('../models/User');
const Bid = require('../models/Bid');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

const toProductSummary = (product) => ({
  id: product?._id,
  title: product?.title || 'Product',
  image: product?.images?.[0] || '/placeholder.png'
});

const toSavedProduct = (item) => ({
  id: item._id,
  productId: item.productId?._id || item.productId,
  title: item.productId?.title || 'Saved Product',
  image: item.productId?.images?.[0] || '/placeholder.png',
  currentPrice: item.productId?.highestBidAmount || item.productId?.basePrice || 0,
  originalPrice: item.productId?.basePrice || item.productId?.highestBidAmount || 0,
  priceAlert: false,
  endTime: item.productId?.bidEndDate
});

const getDeliveryStatus = (orderStatus) => {
  if (['completed', 'delivered'].includes(orderStatus)) {
    return 'delivered';
  }

  if (orderStatus === 'in_delivery') {
    return 'shipped';
  }

  return 'pending';
};

const getPaymentStatus = (paymentStatus, orderStatus) => {
  if (paymentStatus === 'released' || orderStatus === 'completed') {
    return 'completed';
  }

  if (paymentStatus === 'escrowed') {
    return 'paid';
  }

  return 'pending';
};

const getBuyerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, bids, orders, payments] = await Promise.all([
      User.findById(userId).populate({
        path: 'wishlist.productId',
        select: 'title description highestBidAmount basePrice images category condition bidEndDate status'
      }),
      Bid.find({ buyerId: userId })
        .populate({
          path: 'productId',
          select: 'title basePrice status images highestBidAmount highestBidderId sellerId bidEndDate'
        })
        .sort({ createdAt: -1 })
        .limit(50),
      Order.find({ buyerId: userId })
        .populate('productId', 'title images status')
        .sort({ orderDate: -1 })
        .limit(50),
      Payment.find({ buyerId: userId }).select('orderId status').lean()
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const paymentByOrderId = new Map(
      payments.map((payment) => [payment.orderId?.toString(), payment.status])
    );

    const activeBids = bids
      .filter((bid) => bid.status === 'active' && bid.productId && ['active', 'bidden'].includes(bid.productId.status))
      .map((bid) => ({
        id: bid._id,
        productId: bid.productId._id,
        productTitle: bid.productId.title,
        productImage: bid.productId.images?.[0] || '/placeholder.png',
        yourBid: bid.bidAmount,
        currentBid: bid.productId.highestBidAmount || bid.productId.basePrice,
        endTime: bid.productId.bidEndDate || new Date(Date.now() + 86400000).toISOString(),
        status: bid.productId.highestBidderId?.toString() === userId ? 'winning' : 'outbid'
      }));

    const wonAuctions = orders.map((order) => {
      const paymentStatus = paymentByOrderId.get(order._id.toString());

      return {
        id: order.bidId || order._id,
        productId: order.productId?._id || order.productId,
        productTitle: order.productId?.title || 'Product',
        productImage: order.productId?.images?.[0] || '/placeholder.png',
        winningBid: order.finalPrice,
        wonDate: order.orderDate || order.createdAt,
        paymentStatus: getPaymentStatus(paymentStatus, order.status),
        deliveryStatus: getDeliveryStatus(order.status),
        orderId: order._id
      };
    });

    const savedProducts = (user.wishlist || [])
      .filter((item) => item.productId)
      .map(toSavedProduct);

    const recentOrders = orders.map((order) => ({
      id: order._id,
      orderNumber: order._id.toString().substring(0, 8).toUpperCase(),
      productId: order.productId?._id || order.productId,
      productTitle: order.productId?.title || 'Product',
      productImage: order.productId?.images?.[0] || '/placeholder.png',
      amount: order.finalPrice,
      orderDate: order.orderDate || order.createdAt,
      status: order.status
    }));

    res.json({
      success: true,
      data: {
        stats: {
          activeBids: activeBids.length,
          wonAuctions: wonAuctions.length,
          totalOrders: orders.length,
          savedItems: savedProducts.length
        },
        activeBids,
        wonAuctions,
        recentOrders,
        savedProducts
      }
    });
  } catch (error) {
    logger.error('Get buyer dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBuyerDashboard
};
