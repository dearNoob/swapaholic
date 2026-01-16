const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
require('dotenv').config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swapaholic_db');
        console.log('Connected to MongoDB');

        // Clear existing data (optional, be careful in production!)
        // await User.deleteMany({});
        // await Product.deleteMany({});

        // Create Admin User if not exists
        const adminEmail = 'admin@swapaholic.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Admin',
                role: 'admin',
                emailVerified: true
            });
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }

        // Add more seed data here...

        console.log('Seeding completed');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
