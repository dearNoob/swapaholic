const User = require('../models/User');
const logger = require('../utils/logger');

// Get current user's profile (from JWT token)
const getCurrentUserProfile = async (req, res) => {
  try {
    console.log('[userController] Getting profile for user ID:', req.user.id);
    const user = await User.findById(req.user.id).select('+nidNumber');

    if (!user) {
      console.log('[userController] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    // console.log('[userController] Profile retrieved:', user.email, 'NID:', user.nidNumber);
    res.json({ success: true, data: user });
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

    // Identify if the request is from the owner or admin
    const isOwnerOrAdmin = req.user && (req.user.id === req.params.id || req.user.role === 'admin');

    if (!isOwnerOrAdmin) {
      // Strip sensitive information for public viewing
      const publicProfile = user.toObject();
      delete publicProfile.nidNumber;
      delete publicProfile.phone;
      delete publicProfile.address;
      delete publicProfile.loginHistory;
      delete publicProfile.password; // Just in case, already excluded by select
      return res.json({ success: true, data: publicProfile });
    }

    res.json({ success: true, data: user });
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

    const allowed = [
      'firstName', 'lastName', 'bio', 'profilePicture',
      'address', 'city', 'state', 'zipCode', 'location',
      'phone', 'nidNumber', 'interests'
    ];

    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Calculate Profile Completion Score
    let score = 40; // Base score for registration

    // Check fields for score calculation
    const checkFields = { ...req.body, ...updates }; // Merge existing (if we fetched it) or just use updates + what's in DB (needs fetch first for perfect accuracy, but let's approximate or fetch)

    // Better approach: Fetch current user to merge with updates for accurate score calculation
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const updatedProfile = { ...currentUser.toObject(), ...updates };

    if (updatedProfile.bio) score += 10;
    if (updatedProfile.interests && updatedProfile.interests.length > 0) score += 10;
    if (updatedProfile.nidNumber) score += 10;
    if (updatedProfile.address) score += 10;
    if (updatedProfile.phone) score += 10; // Extra points for phone
    if (updatedProfile.profilePicture) score += 10;

    // Cap score at 100
    if (score > 100) score = 100;

    updates.profileCompletionScore = score;

    // Auto-verify if score >= 70
    if (score >= 70) {
      updates.isVerifiedUser = true;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password +nidNumber');

    res.json({ success: true, data: user });
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

// Follow a user
const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Add current user to target user's followers
    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentUserId }
    });

    // Add target user to current user's following
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId }
    });

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    logger.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    // Remove current user from target user's followers
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId }
    });

    // Remove target user from current user's following
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId }
    });

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    logger.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCurrentUserProfile,
  getUserProfile,
  updateUserProfile,
  getUserRatings,
  deleteUserAccount,
  followUser,
  unfollowUser
};
