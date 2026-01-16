/**
 * User Migration Script
 * Converts existing 'buyer' and 'seller' roles to unified 'user' role
 * 
 * Run this script once after deploying the unified account system:
 * node src/scripts/migrate-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const migrateUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Count users to migrate
        const buyerCount = await User.countDocuments({ role: 'buyer' });
        const sellerCount = await User.countDocuments({ role: 'seller' });

        console.log(`Found ${buyerCount} buyers and ${sellerCount} sellers to migrate`);

        if (buyerCount === 0 && sellerCount === 0) {
            console.log('No users to migrate. Exiting.');
            process.exit(0);
        }

        // Migrate buyers to user
        const buyerResult = await User.updateMany(
            { role: 'buyer' },
            { $set: { role: 'user' } }
        );
        console.log(`Migrated ${buyerResult.modifiedCount} buyers to 'user' role`);

        // Migrate sellers to user
        const sellerResult = await User.updateMany(
            { role: 'seller' },
            { $set: { role: 'user' } }
        );
        console.log(`Migrated ${sellerResult.modifiedCount} sellers to 'user' role`);

        // Verify migration
        const remainingBuyers = await User.countDocuments({ role: 'buyer' });
        const remainingSellers = await User.countDocuments({ role: 'seller' });
        const totalUsers = await User.countDocuments({ role: 'user' });

        console.log('\n=== Migration Complete ===');
        console.log(`Remaining buyers: ${remainingBuyers}`);
        console.log(`Remaining sellers: ${remainingSellers}`);
        console.log(`Total unified users: ${totalUsers}`);

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateUsers();
