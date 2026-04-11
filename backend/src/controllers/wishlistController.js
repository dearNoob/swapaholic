const User = require('../models/User');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const serializeWishlistProduct = (product) => ({
  id: product._id,
  title: product.title,
  description: product.description,
  currentBid: product.highestBidAmount || product.basePrice,
  startingPrice: product.basePrice,
  images: product.images || [],
  category: product.category,
  condition: product.condition,
  endTime: product.bidEndDate,
  status: ['sold', 'auction_ended', 'removed'].includes(product.status) ? 'ended' : 'active'
});

const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist.productId',
      select: 'title description highestBidAmount basePrice images category condition bidEndDate status'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const items = (user.wishlist || [])
      .filter((item) => item.productId)
      .map((item) => ({
        id: item._id,
        productId: item.productId._id,
        product: serializeWishlistProduct(item.productId),
        addedAt: item.addedAt
      }));

    res.json({ items });
  } catch (error) {
    logger.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const product = await Product.findById(productId).select('_id title');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingItem = user.wishlist.find(
      (item) => item.productId && item.productId.toString() === productId
    );

    if (!existingItem) {
      user.wishlist.push({ productId });
      await user.save();
    }

    res.status(existingItem ? 200 : 201).json({
      message: existingItem ? 'Product is already in wishlist' : 'Added to wishlist successfully',
      productId
    });
  } catch (error) {
    logger.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const initialCount = user.wishlist.length;
    user.wishlist = user.wishlist.filter(
      (item) => !item.productId || item.productId.toString() !== productId
    );

    if (user.wishlist.length === initialCount) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    await user.save();

    res.json({ message: 'Removed from wishlist successfully', productId });
  } catch (error) {
    logger.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const clearWishlist = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { wishlist: [] } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Wishlist cleared successfully' });
  } catch (error) {
    logger.error('Clear wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkWishlistItem = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id).select('wishlist.productId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isInWishlist = user.wishlist.some(
      (item) => item.productId && item.productId.toString() === productId
    );

    res.json({ isInWishlist });
  } catch (error) {
    logger.error('Check wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlistItem
};
