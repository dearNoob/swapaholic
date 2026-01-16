
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

        const targetEmail = 'admin@swapaholic.com';
        const targetPassword = 'password123';

        let admin = await User.findOne({ email: targetEmail });

        if (admin) {
            console.log(`Admin user ${targetEmail} found. Updating password...`);
            admin.password = targetPassword; // Will be hashed by pre-save hook
            admin.role = 'admin'; // Ensure role is admin
            await admin.save();
            console.log('Password updated to:', targetPassword);
        } else {
            console.log(`Admin user ${targetEmail} not found. Creating...`);
            const newAdmin = new User({
                firstName: 'Swapa',
                lastName: 'Admin',
                email: targetEmail,
                password: targetPassword,
                phone: '01700000099',
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
        console.log('Password:', targetPassword);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdmin();
