const User = require('../models/User');
const logger = require('../utils/logger');

// Get current user's profile (from JWT token)
const getCurrentUserProfile = async (req, res) => {
  try {
    console.log('[userController] Getting profile for user ID:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('[userController] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('[userController] Profile retrieved successfully:', user.email);
    res.json(user);
  } catch (error) {
    console.error('[userController] Get current user profile error:', error.message);
    logger.error('Get current user profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only allow users to view their own full profile unless they're admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    // Only allow updating own profile unless admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowed = ['firstName', 'lastName', 'bio', 'profilePicture', 'address', 'city', 'state', 'zipCode', 'location'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user ratings
const getUserRatings = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('ratingAverage totalTransactions');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ ratingAverage: user.ratingAverage, totalTransactions: user.totalTransactions });
  } catch (error) {
    logger.error('Get user ratings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user account
const deleteUserAccount = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: 'deleted' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Account deleted', user });
  } catch (error) {
    logger.error('Delete user account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCurrentUserProfile,
  getUserProfile,
  updateUserProfile,
  getUserRatings,
  deleteUserAccount
};
