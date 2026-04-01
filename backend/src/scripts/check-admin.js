
const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const targetEmail = process.env.ADMIN_EMAIL || 'mhasanshakib4@gmail.com';
        const targetPassword = process.env.ADMIN_PASSWORD || 'password123';

        if (!process.env.ADMIN_EMAIL) {
            console.log('NOTICE: ADMIN_EMAIL not set in .env, using default:', targetEmail);
        }
        if (!process.env.ADMIN_PASSWORD) {
            console.log('NOTICE: ADMIN_PASSWORD not set in .env, using default:', targetPassword);
        }

        let admin = await User.findOne({ email: targetEmail });

        if (admin) {
            console.log(`Admin user ${targetEmail} found. Updating password...`);
            admin.password = targetPassword; // Will be hashed by pre-save hook
            admin.role = 'admin'; // Ensure role is admin
            await admin.save();
            console.log('Password updated.');
        } else {
            console.log(`Admin user ${targetEmail} not found. Creating...`);
            const uniquePhone = `017${Math.floor(10000000 + Math.random() * 90000000)}`;

            const newAdmin = new User({
                firstName: 'Swapa',
                lastName: 'Admin',
                email: targetEmail,
                password: targetPassword,
                phone: uniquePhone,
                role: 'admin',
                termAccepted: true,
                isVerified: true,
                emailVerified: true
            });

            await newAdmin.save();
            console.log('Admin user created successfully.');
        }

        console.log('-----------------------------------');
        console.log('Login Credentials:');
        console.log('Email:', targetEmail);
        console.log('Password: [HIDDEN]');
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdmin();
