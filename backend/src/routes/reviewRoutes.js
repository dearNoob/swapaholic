const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// @route   POST /api/reviews
// @desc    Create a review for an order
// @access  Private - Buyer/Seller
router.post('/', authMiddleware, reviewController.createReview);

// @route   GET /api/reviews/user/:userId/summary
// @desc    Get user rating summary (average, distribution)
// @access  Public
router.get('/user/:userId/summary', reviewController.getUserRatingSummary);

// @route   GET /api/reviews/user/:userId/received
// @desc    Get reviews received by user (reviews about them)
// @access  Public
router.get('/user/:userId/received', reviewController.getReviewsForUser);

// @route   GET /api/reviews/user/:userId/given
// @desc    Get reviews given by user
// @access  Public
router.get('/user/:userId/given', reviewController.getReviewsByReviewer);

// @route   GET /api/reviews/:reviewId
// @desc    Get single review
// @access  Public
router.get('/:reviewId', reviewController.getReview);

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review
// @access  Private - Review owner
router.put('/:reviewId', authMiddleware, reviewController.updateReview);

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
// @access  Private - Review owner or Admin
router.delete('/:reviewId', authMiddleware, reviewController.deleteReview);

// @route   POST /api/reviews/:reviewId/flag
// @desc    Flag review as inappropriate
// @access  Private
router.post('/:reviewId/flag', authMiddleware, reviewController.flagReview);

module.exports = router;
