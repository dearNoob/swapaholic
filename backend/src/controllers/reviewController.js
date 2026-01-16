const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

// Create a review
const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    // Validation - check for undefined/null, not falsy (0 is valid falsy but invalid rating)
    if (!orderId || rating === undefined || rating === null || !comment) {
      return res.status(400).json({ message: 'Order ID, rating, and comment required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({ message: 'Comment must be at least 10 characters' });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Determine review type and reviewee
    let reviewType, revieweeId;
    if (order.buyerId.toString() === reviewerId) {
      // Buyer is reviewing seller
      reviewType = 'buyer_to_seller';
      revieweeId = order.sellerId;
    } else if (order.sellerId.toString() === reviewerId) {
      // Seller is reviewing buyer
      reviewType = 'seller_to_buyer';
      revieweeId = order.buyerId;
    } else {
      return res.status(403).json({ message: 'Only order participants can review' });
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Order must be completed before review' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      orderId,
      reviewerId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this order' });
    }

    // Create review
    const review = new Review({
      orderId,
      reviewerId,
      revieweeId,
      reviewType,
      rating,
      comment
    });

    await review.save();

    // Populate references for response
    await review.populate('reviewerId', 'firstName lastName');
    await review.populate('revieweeId', 'firstName lastName');

    logger.info(`Review created: ${review._id}`);

    res.status(201).json(review);
  } catch (error) {
    logger.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get reviews for a user (reviews they received)
const getReviewsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status = 'active' } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {
      revieweeId: userId,
      status: status || 'active'
    };

    // Fetch reviews
    const reviews = await Review.find(query)
      .populate('reviewerId', 'firstName lastName phone')
      .populate('orderId', 'finalPrice status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get reviews for user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get reviews given by a user
const getReviewsByReviewer = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Fetch reviews
    const reviews = await Review.find({ reviewerId: userId, status: 'active' })
      .populate('revieweeId', 'firstName lastName phone')
      .populate('orderId', 'finalPrice status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Review.countDocuments({ reviewerId: userId, status: 'active' });

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get reviews by reviewer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single review
const getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate('reviewerId', 'firstName lastName phone email')
      .populate('revieweeId', 'firstName lastName phone')
      .populate('orderId', 'status finalPrice buyerId sellerId');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    logger.error('Get review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Fetch review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only reviewer can update
    if (review.reviewerId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate new values
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (comment && comment.trim().length < 10) {
      return res.status(400).json({ message: 'Comment must be at least 10 characters' });
    }

    // Update
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    review.updatedAt = new Date();

    await review.save();

    // Populate for response
    await review.populate('reviewerId', 'firstName lastName');
    await review.populate('revieweeId', 'firstName lastName');

    logger.info(`Review updated: ${review._id}`);

    res.json(review);
  } catch (error) {
    logger.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only reviewer or admin can delete
    if (review.reviewerId.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete by marking as deleted
    review.status = 'deleted';
    review.updatedAt = new Date();
    await review.save();

    logger.info(`Review deleted: ${review._id}`);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    logger.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user rating summary
const getUserRatingSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all active reviews for user
    const reviews = await Review.find({
      revieweeId: userId,
      status: 'active'
    });

    if (reviews.length === 0) {
      return res.json({
        userId,
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    // Calculate stats
    const totalReviews = reviews.length;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach(review => {
      totalRating += review.rating;
      ratingDistribution[review.rating]++;
    });

    const averageRating = (totalRating / totalReviews).toFixed(2);

    res.json({
      userId,
      totalReviews,
      averageRating: parseFloat(averageRating),
      ratingDistribution
    });
  } catch (error) {
    logger.error('Get user rating summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Flag review as inappropriate
const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Fetch review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Increment report count
    review.reportCount = (review.reportCount || 0) + 1;

    // Auto-flag if too many reports
    if (review.reportCount >= 3) {
      review.status = 'flagged';
    }

    await review.save();

    logger.info(`Review flagged: ${review._id}, reports: ${review.reportCount}`);

    res.json({
      message: 'Review flagged for review',
      reportCount: review.reportCount,
      status: review.status
    });
  } catch (error) {
    logger.error('Flag review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createReview,
  getReviewsForUser,
  getReviewsByReviewer,
  getReview,
  updateReview,
  deleteReview,
  getUserRatingSummary,
  flagReview
};
