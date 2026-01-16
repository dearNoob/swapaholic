const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const adminAuthController = require('../controllers/adminAuthController');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Register
router.post(
  '/register',
  [
    body('firstName').isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').isLength({ min: 1 }).withMessage('Last name is required'),
    body('phone').isLength({ min: 6 }).withMessage('Phone is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  ],
  authController.register
);

// Login (for regular users - unified buyer/seller)
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').exists().withMessage('Password required'),
  ],
  authController.login
);

// Admin Login (separate portal for admins)
router.post(
  '/admin/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').exists().withMessage('Password required'),
  ],
  adminAuthController.adminLogin
);

// Create Admin User (admin-only)
router.post(
  '/admin/create',
  authMiddleware,
  roleCheck(['admin']),
  [
    body('firstName').isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').isLength({ min: 1 }).withMessage('Last name is required'),
    body('phone').isLength({ min: 6 }).withMessage('Phone is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  ],
  adminAuthController.createAdminUser
);

// Logout
router.post('/logout', authController.logout);

// Verify email
router.post('/verify-email', authController.verifyEmail);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Change password (protected route)
router.post('/change-password', authMiddleware, authController.changePassword);

// 2FA Routes
router.post('/2fa/generate', authMiddleware, authController.generate2FA);
router.post('/2fa/verify', authMiddleware, authController.verify2FA);
router.post('/2fa/disable', authMiddleware, authController.disable2FA);

module.exports = router;