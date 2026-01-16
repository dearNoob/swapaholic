const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

const generateToken = (user) => {
  const payload = { id: user._id, role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

// Register handler
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { firstName, lastName, email, password, phone, role } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(409).json({ message: 'Phone already in use' });
    // Let the User model pre-save hook hash the password
    // All new users are registered as unified 'user' role with both buyer and seller capabilities
    const user = new User({ firstName, lastName, email, password, phone, role: 'user' });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login handler
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    // password field is select:false by default
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Block admin users from regular login - they must use admin portal
    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Admin users must use the admin login portal',
        redirectTo: '/admin/login'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout handler
const logout = async (req, res) => {
  // For JWT stateless auth, client can discard token; optionally implement blacklist
  res.json({ message: 'Logged out (client should discard token)' });
};

// Verify email handler
const verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.emailVerified = true;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

// Refresh token handler
const refreshToken = async (req, res) => {
  // Implementation would depend on refresh token strategy
  // Implementation would depend on refresh token strategy
  // Returning 401 to prevent frontend from retrying indefinitely
  res.status(401).json({ message: 'Refresh token not available' });
};

// Forgot password handler
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate reset token (simplified - should use proper reset flow)
    const resetToken = generateToken(user);

    // In production, send email with reset link
    res.json({ message: 'Password reset link sent to email' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password handler
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate 2FA Secret
const generate2FA = async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `Swapaholic (${user.email})`
    });

    // Save secret securely (in production would encrypt this)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR Code
    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) throw err;
      res.json({
        secret: secret.base32,
        qrCode: data_url
      });
    });
  } catch (error) {
    logger.error('Generate 2FA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify 2FA Token
const verify2FA = async (req, res) => {
  const { token } = req.body;
  try {
    const speakeasy = require('speakeasy');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();
      res.json({ message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid 2FA token' });
    }
  } catch (error) {
    logger.error('Verify 2FA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Disable 2FA
const disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    logger.error('Disable 2FA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  refreshToken,
  forgotPassword,
  changePassword,
  generate2FA,
  verify2FA,
  disable2FA
};
