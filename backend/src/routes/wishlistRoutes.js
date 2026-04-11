const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const wishlistController = require('../controllers/wishlistController');

router.use(authMiddleware);

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.get('/check/:productId', wishlistController.checkWishlistItem);
router.delete('/clear', wishlistController.clearWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;
