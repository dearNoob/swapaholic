const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

const generateToken = (user) => {
    const payload = { id: user._id, role: user.role, email: user.email, isAdmin: true };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

/**
 * Admin Login Handler
 * Only allows users with 'admin' role to authenticate
 */
const adminLogin = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
        // Find user with password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            logger.warn(`Admin login attempt failed: User not found - ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is an admin
        if (user.role !== 'admin') {
            logger.warn(`Admin login attempt by non-admin user: ${email}`);
            return res.status(403).json({ message: 'Access denied. Admin credentials required.' });
        }

        // Check account status
        if (user.accountStatus !== 'active') {
            logger.warn(`Admin login attempt by inactive account: ${email}`);
            return res.status(403).json({ message: `Account is ${user.accountStatus}` });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Admin login failed: Invalid password for ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate admin-specific token
        const token = generateToken(user);

        logger.info(`Admin login successful: ${email}`);

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
        logger.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Create Admin User
 * Only existing admins can create new admin accounts
 */
const createAdminUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { firstName, lastName, email, password, phone } = req.body;

    try {
        // Check if requester is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create admin accounts' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        // Check if phone already exists
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(409).json({ message: 'Phone already in use' });
        }

        // Create admin user
        const adminUser = new User({
            firstName,
            lastName,
            email,
            password,
            phone,
            role: 'admin',
            emailVerified: true // Auto-verify admin accounts
        });

        await adminUser.save();

        logger.info(`New admin created by ${req.user.email}: ${email}`);

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: adminUser._id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    role: adminUser.role
                }
            },
            message: 'Admin user created successfully'
        });
    } catch (error) {
        logger.error('Create admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    adminLogin,
    createAdminUser
};
