const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth, roleCheck } = require('../middleware/auth');
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

// --- Post-Auction Confirmation ---

// @route   GET /api/bids/won
// @desc    Get buyer's won bids (pending confirmation)
// @access  Private
router.get('/won', authMiddleware, bidController.getWonBids);

// @route   POST /api/bids/:bidId/confirm-win
// @desc    Buyer confirms auction win (within 3-hour window)
// @access  Private
router.post('/:bidId/confirm-win', authMiddleware, bidController.confirmAuctionWin);

// @route   GET /api/bids/:productId
// @desc    Get all bids for a product
// @access  Public (Optional Auth)
router.get('/:productId', optionalAuth, bidController.getBidsForProduct);

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

// @route   DELETE /api/bids/:bidId
// @desc    Withdraw/Retract bid (Alias for frontend)
router.delete('/:bidId', authMiddleware, bidController.withdrawBid);

// --- Auto-bidding Endpoints ---

// @route   POST /api/bids/auto-bid
// @desc    Set auto-bid for a product
router.post('/auto-bid', authMiddleware, bidController.setAutoBid);

// @route   DELETE /api/bids/auto-bid/:productId
// @desc    Cancel auto-bid
router.delete('/auto-bid/:productId', authMiddleware, bidController.cancelAutoBid);

// @route   GET /api/bids/my-auto-bids
// @desc    Get user's active auto-bids
router.get('/my-auto-bids', authMiddleware, bidController.getMyAutoBids);

// --- Analytics ---

// @route   GET /api/bids/analytics
// @desc    Get bidding analytics
router.get('/analytics', authMiddleware, bidController.getBiddingAnalytics);


module.exports = router;
