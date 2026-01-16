const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const userController = require('../controllers/userController');

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authMiddleware, userController.getCurrentUserProfile);

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Private
router.get('/:id', authMiddleware, userController.getUserProfile);

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private
router.put('/:id', authMiddleware, userController.updateUserProfile);

// @route   GET /api/users/:id/ratings
// @desc    Get user ratings
// @access  Public
router.get('/:id/ratings', userController.getUserRatings);

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Private
router.delete('/:id', authMiddleware, userController.deleteUserAccount);

module.exports = router;
