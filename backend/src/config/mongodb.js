const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Note: Do NOT disable SSL certificate validation in production.
// Ensure your environment trusts MongoDB Atlas certificates. If you see
// TLS validation errors locally, fix the host trust or use a properly
// configured Node environment rather than disabling validation.

const connectDB = async (retries = 3) => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swapaholic_db';
    
    logger.info('Attempting MongoDB connection...');
    logger.info(`Connecting to: ${mongoUri.split('@')[0]}@cluster...`);
    
    const options = {
      // Mongoose v7+ uses good defaults; include explicit timeouts and pool options.
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      // Keep retry settings enabled
      retryWrites: true,
      retryReads: true,
      // Do not disable TLS validation here. Trust the system CA store for Atlas.
      // If you must configure TLS options (corporate proxies, custom CAs),
      // set them explicitly in a secure manner.
    };
    
    await mongoose.connect(mongoUri, options);

    logger.info('✅ MongoDB connected successfully!');
    logger.info(`Connected to database: ${mongoose.connection.name}`);
    logger.info(`Connection host: ${mongoose.connection.host}`);
    
    return mongoose.connection;
  } catch (error) {
    logger.error('❌ MongoDB connection failed!');
    logger.error('Error message:', error.message);
    logger.error('Error code:', error.code);
    
    // Log specific issues
    if (error.message.includes('authentication')) {
      logger.error('⚠️  Authentication failed - check username/password in MONGODB_URI');
    }
    if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      logger.error('⚠️  Cannot reach MongoDB server - check connection string');
    }
    if (error.message.includes('IP') || error.message.includes('SSL')) {
      logger.error('⚠️  IP address not whitelisted - add your IP to MongoDB Atlas Security → Network Access');
      logger.error('    OR allow 0.0.0.0/0 for development (NOT recommended for production)');
    }
    
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
