const Bid = require('../models/Bid');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const logger = require('../utils/logger');
const notificationService = require('../utils/notificationService');

// Place a bid on a product
const placeBid = async (req, res) => {
  try {
    const { productId, bidAmount } = req.body;

    if (!productId || !bidAmount || bidAmount <= 0) {
      return res.status(400).json({ message: 'Product ID and valid bid amount required' });
    }

    // Verify product exists and is active or bidden (actively accepting bids)
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!['active', 'bidden'].includes(product.status)) {
      return res.status(400).json({ message: 'Product is not available for bidding' });
    }

    // Prevent seller from bidding on their own product
    if (product.sellerId.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot bid on your own product' });
    }

    // Check bid amount is at least 15% of base price
    const minBidAmount = product.basePrice * 0.15;
    if (bidAmount < minBidAmount) {
      return res.status(400).json({
        message: `Bid must be at least ৳${minBidAmount.toFixed(2)} (15% of base price ৳${product.basePrice})`
      });
    }

    // Check if buyer already has an active bid on this product
    const existingBid = await Bid.findOne({ productId, buyerId: req.user.id, status: 'active' });
    if (existingBid) {
      return res.status(400).json({ message: 'You already have an active bid on this product' });
    }

    // Get the previous highest bid if it exists
    const previousHighestBid = await Bid.findOne({ productId, status: 'active' })
      .sort({ bidAmount: -1 });

    // Create new bid
    const bid = new Bid({
      productId,
      buyerId: req.user.id,
      bidAmount,
      status: 'active'
    });

    await bid.save();

    // Update product's highest bid if this is the first or highest bid
    const allBids = await Bid.find({ productId, status: 'active' }).sort({ bidAmount: -1 });
    if (allBids.length > 0) {
      const highestBid = allBids[0];
      await Product.findByIdAndUpdate(productId, {
        highestBidAmount: highestBid.bidAmount,
        highestBidderId: highestBid.buyerId,
        status: 'bidden'
      });
    }

    // Notify the previous bidder that they've been outbid
    if (previousHighestBid && previousHighestBid.buyerId.toString() !== req.user.id) {
      try {
        await notificationService.notifyOutbid(
          bid._id,
          productId,
          product.title,
          previousHighestBid.bidAmount,
          bidAmount,
          previousHighestBid.buyerId
        );
      } catch (notifError) {
        logger.error('Error sending outbid notification:', notifError);
        // Continue even if notification fails
      }
    }

    const populatedBid = await Bid.findById(bid._id)
      .populate('productId', 'title basePrice')
      .populate('buyerId', 'firstName lastName email');

    res.status(201).json(populatedBid);
  } catch (error) {
    logger.error('Place bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bids for a product
const getBidsForProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Only seller or admin can view all bids for a product
    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bids = await Bid.find({ productId })
      .populate('buyerId', 'firstName lastName email ratingAverage')
      .sort({ bidAmount: -1, createdAt: -1 });

    res.json(bids);
  } catch (error) {
    logger.error('Get bids for product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's bid history
const getUserBids = async (req, res) => {
  try {
    // If userId is provided in params (from /user/:userId route), use that
    // Otherwise, use the authenticated user's ID from token
    const userId = req.params.userId || req.user.id;

    // Only allow users to view their own bids unless admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bids = await Bid.find({ buyerId: userId })
      .populate('productId', 'title basePrice status')
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    logger.error('Get user bids error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's bid history (paginated, with product details for frontend)
const getMyBids = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Bid.countDocuments({ buyerId: userId });

    // Get paginated bids with full product details
    const bids = await Bid.find({ buyerId: userId })
      .populate({
        path: 'productId',
        select: 'title basePrice status images currentBid highestBidAmount sellerId'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Transform bids to match frontend BidHistory interface
    const transformedBids = bids.map(bid => {
      const product = bid.productId;
      const highestBid = product?.highestBidAmount || product?.currentBid || product?.basePrice;

      return {
        id: bid._id,
        productId: product?._id,
        userId: bid.buyerId,
        amount: bid.bidAmount,
        isAutoBid: false,
        createdAt: bid.createdAt,
        product: product ? {
          id: product._id,
          title: product.title,
          basePrice: product.basePrice,
          status: product.status,
          images: product.images || [],
          currentBid: highestBid
        } : null,
        isWinning: product?.highestBidderId?.toString() === userId || bid.status === 'accepted',
        isOutbid: product?.highestBidderId?.toString() !== userId && bid.status === 'active'
      };
    });

    res.json({
      success: true,
      data: {
        data: transformedBids,
        total
      }
    });
  } catch (error) {
    logger.error('Get my bids error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update bid amount (only if bid is still active and before acceptance)
const updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { bidAmount } = req.body;

    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({ message: 'Valid bid amount required' });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Only bidder can update their own bid
    if (bid.buyerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only update active bids
    if (bid.status !== 'active') {
      return res.status(400).json({ message: `Cannot update a ${bid.status} bid` });
    }

    const product = await Product.findById(bid.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // New bid must be higher than current bid and >= 15% of base price
    const minBidAmount = product.basePrice * 0.15;
    if (bidAmount <= bid.bidAmount || bidAmount < minBidAmount) {
      return res.status(400).json({
        message: `New bid must be higher than current bid (৳${bid.bidAmount}) and at least ৳${minBidAmount.toFixed(2)} (15% of base price)`
      });
    }

    bid.bidAmount = bidAmount;
    bid.updatedAt = new Date();
    await bid.save();

    // Update product's highest bid if this bid is now highest
    const allBids = await Bid.find({ productId: bid.productId, status: 'active' }).sort({ bidAmount: -1 });
    if (allBids.length > 0 && allBids[0]._id.toString() === bidId) {
      await Product.findByIdAndUpdate(bid.productId, {
        highestBidAmount: bidAmount,
        highestBidderId: req.user.id
      });
    }

    const updatedBid = await Bid.findById(bidId)
      .populate('productId', 'title basePrice')
      .populate('buyerId', 'firstName lastName email');

    res.json(updatedBid);
  } catch (error) {
    logger.error('Update bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept highest bid (seller only, closes auction)
const acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const product = await Product.findById(bid.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Only seller can accept bids on their product
    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only accept active bids
    if (bid.status !== 'active') {
      return res.status(400).json({ message: `Cannot accept a ${bid.status} bid` });
    }

    // Accept this bid
    bid.status = 'accepted';
    bid.updatedAt = new Date();
    await bid.save();

    // Get all other active bids to reject them
    const otherActiveBids = await Bid.find(
      { productId: bid.productId, _id: { $ne: bidId }, status: 'active' },
      'buyerId'
    );

    // Reject all other bids for this product
    await Bid.updateMany(
      { productId: bid.productId, _id: { $ne: bidId }, status: 'active' },
      { status: 'rejected' }
    );

    // Update product status to sold
    await Product.findByIdAndUpdate(bid.productId, {
      status: 'sold',
      highestBidAmount: bid.bidAmount,
      highestBidderId: bid.buyerId
    });

    // Create an order for the accepted bid
    const order = new Order({
      productId: bid.productId,
      buyerId: bid.buyerId,
      sellerId: product.sellerId,
      bidId: bid._id,
      finalPrice: bid.bidAmount,
      status: 'pending'
    });
    await order.save();

    // Send notification to accepted bidder
    try {
      await notificationService.notifyBidAccepted(
        bid._id,
        product.title,
        bid.bidAmount,
        bid.buyerId
      );
    } catch (notifError) {
      logger.error('Error sending bid accepted notification:', notifError);
    }

    // Send rejection notifications to other bidders
    for (const otherBid of otherActiveBids) {
      try {
        await notificationService.notifyBidRejected(
          otherBid._id,
          product.title,
          otherBid.bidAmount,
          otherBid.buyerId
        );
      } catch (notifError) {
        logger.error('Error sending bid rejected notification:', notifError);
      }
    }

    const acceptedBid = await Bid.findById(bidId)
      .populate('productId', 'title basePrice')
      .populate('buyerId', 'firstName lastName email');

    res.json({ message: 'Bid accepted. Product sold.', bid: acceptedBid, order });
  } catch (error) {
    logger.error('Accept bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a bid (seller only)
const rejectBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const product = await Product.findById(bid.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Only seller can reject bids
    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only reject active bids
    if (bid.status !== 'active') {
      return res.status(400).json({ message: `Cannot reject a ${bid.status} bid` });
    }

    bid.status = 'rejected';
    bid.updatedAt = new Date();
    await bid.save();

    // Send rejection notification
    try {
      await notificationService.notifyBidRejected(
        bid._id,
        product.title,
        bid.bidAmount,
        bid.buyerId
      );
    } catch (notifError) {
      logger.error('Error sending bid rejected notification:', notifError);
    }

    res.json({ message: 'Bid rejected', bid });
  } catch (error) {
    logger.error('Reject bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Withdraw a bid (buyer only)
const withdrawBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Only bidder can withdraw
    if (bid.buyerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only withdraw active or rejected bids
    if (!['active', 'rejected'].includes(bid.status)) {
      return res.status(400).json({ message: `Cannot withdraw a ${bid.status} bid` });
    }

    bid.status = 'withdrawn';
    bid.updatedAt = new Date();
    await bid.save();

    res.json({ message: 'Bid withdrawn', bid });
  } catch (error) {
    logger.error('Withdraw bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  placeBid,
  getBidsForProduct,
  getUserBids,
  getMyBids,
  updateBid,
  acceptBid,
  rejectBid,
  withdrawBid
};
