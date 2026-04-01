const Bid = require('../models/Bid');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const logger = require('../utils/logger');
const notificationService = require('../utils/notificationService');
const AutoBid = require('../models/AutoBid');
const emailService = require('../utils/emailService');

const PLATFORM_FEE = 30;

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

    // Trigger Auto-bidding process
    await triggerAutoBidding(productId, bid.buyerId);


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

    res.json({
      status: 'success',
      data: bids
    });
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
      // Trigger auto-bid when a bid is updated
      await triggerAutoBidding(bid.productId, req.user.id);
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

// Set or update auto-bid
const setAutoBid = async (req, res) => {
  try {
    const { productId, maxAmount, incrementAmount } = req.body;
    const buyerId = req.user.id;

    if (!productId || !maxAmount) {
      return res.status(400).json({ message: 'Product ID and max amount required' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Ensure it's active
    if (!['active', 'bidden'].includes(product.status)) {
      return res.status(400).json({ message: 'Product is not available for auto-bidding' });
    }

    // Check if maxAmount is already beaten by current highest bid
    const currentPrice = product.highestBidAmount || product.basePrice;
    if (maxAmount <= currentPrice) {
      return res.status(400).json({ message: `Max amount must be higher than current price ৳${currentPrice}` });
    }

    const autoBid = await AutoBid.findOneAndUpdate(
      { productId, buyerId },
      { maxAmount, incrementAmount: incrementAmount || 10, isActive: true },
      { upsert: true, new: true }
    );

    // After setting, trigger it immediately to see if we can win right now
    await triggerAutoBidding(productId, null);

    res.json({ success: true, message: 'Auto-bid set successfully', data: autoBid });
  } catch (error) {
    logger.error('Set auto-bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel auto-bid
const cancelAutoBid = async (req, res) => {
  try {
    const { productId } = req.params;
    const buyerId = req.user.id;

    await AutoBid.findOneAndUpdate(
      { productId, buyerId },
      { isActive: false }
    );

    res.json({ success: true, message: 'Auto-bid cancelled' });
  } catch (error) {
    logger.error('Cancel auto-bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user's auto-bids
const getMyAutoBids = async (req, res) => {
  try {
    const autoBids = await AutoBid.find({ buyerId: req.user.id, isActive: true })
      .populate('productId', 'title highestBidAmount basePrice');
    
    const transformed = autoBids.map(ab => ({
      productId: ab.productId._id,
      title: ab.productId.title,
      maxAmount: ab.maxAmount,
      currentBid: ab.productId.highestBidAmount || ab.productId.basePrice
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    logger.error('Get my auto-bids error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bidding Analytics
const getBiddingAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    const stats = await Bid.aggregate([
      { $match: { buyerId: userId } },
      {
        $group: {
          _id: null,
          totalBids: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, '$bidAmount', 0] } },
          avgBid: { $avg: '$bidAmount' }
        }
      }
    ]);

    const activeAuctions = await Bid.countDocuments({ buyerId: userId, status: 'active' });
    
    // We can't easily calculate "lost" without knowing if the auction is finished.
    // Let's approximate: auctions where they are NOT winning and status is active (still competing)
    // or status is rejected (lost).
    const lost = await Bid.countDocuments({ buyerId: userId, status: 'rejected' });

    const result = stats[0] || { totalBids: 0, won: 0, totalSpent: 0, avgBid: 0 };

    res.json({
      success: true,
      data: {
        totalBids: result.totalBids,
        auctionsWon: result.won,
        auctionsLost: lost,
        activeAuctions: activeAuctions,
        averageBid: Math.round(result.avgBid),
        totalSpent: result.totalSpent
      }
    });
  } catch (error) {
    logger.error('Get bidding analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Internal Helper: Trigger Auto-bidding logic
async function triggerAutoBidding(productId, lastBidderId) {
    try {
        const product = await Product.findById(productId);
        if (!product || !['active', 'bidden'].includes(product.status)) return;

        // Find all active auto-bids for this product, sorted by maxAmount desc
        // We exlude the person who just bid to avoid infinite loop
        const activeAutoBids = await AutoBid.find({ 
            productId, 
            isActive: true,
            buyerId: { $ne: lastBidderId } 
        }).sort({ maxAmount: -1 });

        if (activeAutoBids.length === 0) return;

        const currentHighest = product.highestBidAmount || product.basePrice;
        const topAutoBid = activeAutoBids[0];

        // If the top auto-bid can beat the current price
        if (topAutoBid.maxAmount > currentHighest) {
            let nextBidAmount = currentHighest + (topAutoBid.incrementAmount || 10);
            
            // Don't exceed max
            if (nextBidAmount > topAutoBid.maxAmount) {
                nextBidAmount = topAutoBid.maxAmount;
            }

            // Place the automatic bid
            const newBid = new Bid({
                productId,
                buyerId: topAutoBid.buyerId,
                bidAmount: nextBidAmount,
                status: 'active'
            });
            await newBid.save();

            // Update product
            await Product.findByIdAndUpdate(productId, {
                highestBidAmount: nextBidAmount,
                highestBidderId: topAutoBid.buyerId,
                status: 'bidden'
            });

            // Notify old bidder they were outbid by an auto-bid
            try {
                if (lastBidderId) {
                    await notificationService.notifyOutbid(
                        newBid._id,
                        productId,
                        product.title,
                        currentHighest,
                        nextBidAmount,
                        lastBidderId
                    );
                }
            } catch (e) {}

            // Recursively trigger to handle competing auto-bids
            // Note: This is safe because maxAmount eventually ends the chain.
            await triggerAutoBidding(productId, topAutoBid.buyerId);
        }
    } catch (err) {
        logger.error('Auto-bidding trigger error:', err);
    }
}

// ═══════════════════════════════════════════════
// POST-AUCTION WORKFLOW
// ═══════════════════════════════════════════════

// Buyer confirms auction win (within 3-hour window)
const confirmAuctionWin = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Only the winning bidder can confirm
    if (bid.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the winning bidder can confirm' });
    }

    // Must be in pending_confirmation status
    if (bid.status !== 'pending_confirmation') {
      return res.status(400).json({ message: `Cannot confirm a bid with status: ${bid.status}` });
    }

    // Check if within 3-hour confirmation window
    if (bid.confirmationDeadline && new Date() > bid.confirmationDeadline) {
      return res.status(400).json({ message: 'Confirmation window has expired. Your buyer rating has been affected.' });
    }

    const product = await Product.findById(bid.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Accept the bid
    bid.status = 'accepted';
    bid.updatedAt = new Date();
    await bid.save();

    // Reject all other active bids for this product
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

    // Create order with platform fee
    const order = new Order({
      productId: bid.productId,
      buyerId: bid.buyerId,
      sellerId: product.sellerId,
      bidId: bid._id,
      finalPrice: bid.bidAmount,
      platformFee: PLATFORM_FEE,
      status: 'pending',
      buyerConfirmed: true,
      confirmedAt: new Date(),
      orderDate: new Date(),
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await order.save();

    // Notify seller about the accepted bid
    try {
      await notificationService.notifyBidAccepted(
        bid._id,
        product.title,
        bid.bidAmount,
        bid.buyerId
      );
      await notificationService.notifyOrderCreated(
        order._id,
        bid.buyerId,
        product.sellerId,
        product.title
      );
    } catch (notifError) {
      logger.error('Error sending confirmation notifications:', notifError);
    }

    // Get buyer info for response
    const buyer = await User.findById(bid.buyerId);

    res.json({
      message: 'Purchase confirmed! Please proceed to payment.',
      bid: {
        id: bid._id,
        status: bid.status,
        bidAmount: bid.bidAmount
      },
      order: {
        id: order._id,
        finalPrice: order.finalPrice,
        platformFee: PLATFORM_FEE,
        totalPayable: order.finalPrice + PLATFORM_FEE,
        status: order.status
      }
    });
  } catch (error) {
    logger.error('Confirm auction win error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get buyer's won bids (pending confirmation)
const getWonBids = async (req, res) => {
  try {
    const userId = req.user.id;

    const wonBids = await Bid.find({
      buyerId: userId,
      status: 'pending_confirmation'
    })
      .populate({
        path: 'productId',
        select: 'title basePrice images category sellerId bidEndDate'
      })
      .sort({ auctionWonAt: -1 });

    const transformedBids = wonBids.map(bid => {
      const now = new Date();
      const deadline = bid.confirmationDeadline;
      const timeLeftMs = deadline ? deadline.getTime() - now.getTime() : 0;
      const timeLeftMinutes = Math.max(0, Math.floor(timeLeftMs / 60000));
      const hours = Math.floor(timeLeftMinutes / 60);
      const minutes = timeLeftMinutes % 60;

      return {
        id: bid._id,
        bidAmount: bid.bidAmount,
        platformFee: PLATFORM_FEE,
        totalPayable: bid.bidAmount + PLATFORM_FEE,
        auctionWonAt: bid.auctionWonAt,
        confirmationDeadline: bid.confirmationDeadline,
        timeLeft: timeLeftMs > 0 ? `${hours}h ${minutes}m` : 'Expired',
        timeLeftMs: Math.max(0, timeLeftMs),
        isExpired: timeLeftMs <= 0,
        product: bid.productId ? {
          id: bid.productId._id,
          title: bid.productId.title,
          basePrice: bid.productId.basePrice,
          images: bid.productId.images || [],
          category: bid.productId.category,
          sellerId: bid.productId.sellerId
        } : null
      };
    });

    res.json({
      success: true,
      data: transformedBids
    });
  } catch (error) {
    logger.error('Get won bids error:', error);
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
  withdrawBid,
  setAutoBid,
  cancelAutoBid,
  getMyAutoBids,
  getBiddingAnalytics,
  confirmAuctionWin,
  getWonBids
};
