const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

const generateToken = (user) => {
    const payload = { id: user._id, role: user.role, email: user.email, isLogistics: true };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

/**
 * Logistics Officer Registration
 * Creates account with role 'logistics_officer' and accountStatus 'pending_approval'
 * Account must be approved by admin before login is allowed
 */
const logisticsRegister = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { firstName, lastName, email, password, phone, address } = req.body;

    try {
        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        // Check if phone already exists
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(409).json({ message: 'Phone already in use' });
        }

        // Create logistics officer account with pending_approval status
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            phone,
            address,
            role: 'logistics_officer',
            accountStatus: 'pending_approval',
            emailVerified: true,
            phoneVerified: true
        });

        await user.save();

        logger.info(`New logistics officer registered (pending approval): ${email}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful! Your account is pending admin approval. You will be able to login once approved.',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    accountStatus: user.accountStatus
                }
            }
        });
    } catch (error) {
        logger.error('Logistics officer registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Logistics Officer Login
 * Only allows users with 'logistics_officer' role and 'active' accountStatus
 */
const logisticsLogin = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            logger.warn(`Logistics login attempt failed: User not found - ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is a logistics officer
        if (user.role !== 'logistics_officer') {
            logger.warn(`Logistics login attempt by non-logistics user: ${email}`);
            return res.status(403).json({ message: 'Access denied. Logistics officer credentials required.' });
        }

        // Check account status - must be approved by admin
        if (user.accountStatus === 'pending_approval') {
            logger.warn(`Logistics login attempt by pending account: ${email}`);
            return res.status(403).json({
                message: 'Your account is pending admin approval. Please wait for approval before logging in.',
                accountStatus: 'pending_approval'
            });
        }

        if (user.accountStatus !== 'active') {
            logger.warn(`Logistics login attempt by inactive account: ${email}`);
            return res.status(403).json({ message: `Account is ${user.accountStatus}` });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Logistics login failed: Invalid password for ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate logistics-specific token
        const token = generateToken(user);

        logger.info(`Logistics officer login successful: ${email}`);

        res.json({
            success: true,
            data: {
                accessToken: token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    profilePicture: user.profilePicture,
                    phone: user.phone,
                    address: user.address
                }
            }
        });
    } catch (error) {
        logger.error('Logistics login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    logisticsRegister,
    logisticsLogin
};
