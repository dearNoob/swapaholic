const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const bidController = require('../controllers/bidController');

// @route   GET /api/bids
// @desc    Get current user's bids
// @access  Private
router.get('/', authMiddleware, bidController.getUserBids);

// @route   GET /api/bids/my-bids
// @desc    Get current user's bids (alias for frontend)
// @access  Private
router.get('/my-bids', authMiddleware, bidController.getMyBids);

// @route   POST /api/bids
// @desc    Place a bid on product
// @access  Private
router.post('/', authMiddleware, bidController.placeBid);

// @route   GET /api/bids/user/:userId
// @desc    Get user's bid history
// @access  Private
router.get('/user/:userId', authMiddleware, bidController.getUserBids);

// @route   GET /api/bids/:productId
// @desc    Get all bids for a product
// @access  Private
router.get('/:productId', authMiddleware, bidController.getBidsForProduct);

// @route   PUT /api/bids/:bidId
// @desc    Update bid amount (before acceptance)
// @access  Private - Buyer only
router.put('/:bidId', authMiddleware, roleCheck(['buyer']), bidController.updateBid);

// @route   POST /api/bids/:bidId/accept
// @desc    Accept highest bid (Seller)
// @access  Private - Seller only
router.post('/:bidId/accept', authMiddleware, roleCheck(['seller']), bidController.acceptBid);

// @route   POST /api/bids/:bidId/reject
// @desc    Reject bid (Seller)
// @access  Private - Seller only
router.post('/:bidId/reject', authMiddleware, roleCheck(['seller']), bidController.rejectBid);

// @route   POST /api/bids/:bidId/withdraw
// @desc    Withdraw bid (Buyer)
// @access  Private - Buyer only
router.post('/:bidId/withdraw', authMiddleware, roleCheck(['buyer']), bidController.withdrawBid);

module.exports = router;
