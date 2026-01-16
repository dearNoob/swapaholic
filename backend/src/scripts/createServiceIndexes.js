/**
 * MongoDB Index Creation Script for Service Collection
 * Improves query performance for search, filtering, and location-based queries
 * 
 * Usage: node backend/src/scripts/createServiceIndexes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Service = require('../models/Service');

async function createIndex(indexSpec, indexOptions) {
  try {
    // Check if an equivalent index already exists
    const existingIndexes = await Service.collection.getIndexes();
    const specKeys = Object.keys(indexSpec).sort();
    
    // For compound indexes, check if the same fields are already indexed
    for (const [indexName, indexInfo] of Object.entries(existingIndexes)) {
      if (!indexInfo || !indexInfo.key) continue; // Skip invalid index entries
      
      const existingKeys = Object.keys(indexInfo.key)
        .filter(k => k !== '_id' && k !== '_fts' && k !== '_ftsx')
        .sort();
      
      if (specKeys.length > 0 && JSON.stringify(specKeys) === JSON.stringify(existingKeys)) {
        return { exists: true, message: `Index already exists: ${indexName}` };
      }
    }
    
    // If no equivalent index found, create it
    await Service.collection.createIndex(indexSpec, indexOptions);
    return { success: true };
  } catch (error) {
    if (error.message.includes('already exists')) {
      return { exists: true, message: error.message };
    }
    throw error;
  }
}

async function createIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swapaholic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const indexConfigs = [
      {
        spec: { category: 1, status: 1, createdAt: -1 },
        options: { name: 'category_status_index' },
        desc: '🏷️  category/status filtering'
      },
      {
        spec: { savedBy: 1, createdAt: -1 },
        options: { name: 'saved_services_index' },
        desc: '💾 saved services'
      },
      {
        spec: { providerId: 1, status: 1, createdAt: -1 },
        options: { name: 'provider_services_index' },
        desc: '👤 provider services'
      },
      {
        spec: { averageRating: -1, totalReviews: -1 },
        options: { name: 'rating_index' },
        desc: '⭐ ratings'
      },
      {
        spec: { status: 1, createdAt: -1 },
        options: { name: 'active_services_index' },
        desc: '🟢 active services'
      },
      {
        spec: { pricePerHour: 1, createdAt: -1 },
        options: { name: 'price_index' },
        desc: '💰 price queries'
      },
      {
        spec: { availableFrom: 1, availableTo: 1 },
        options: { name: 'availability_index' },
        desc: '📅 availability'
      },
      {
        spec: { 'bookings.status': 1, 'bookings.bookedDate': -1 },
        options: { name: 'booking_status_index' },
        desc: '📋 booking status'
      },
    ];
    
    // Try to create geospatial index separately (may already exist with different name)
    console.log('📍 Checking geospatial index for location...');
    try {
      await Service.collection.createIndex(
        { serviceLocation: '2dsphere' },
        { name: 'location_index' }
      );
      console.log('✅ Geospatial index created successfully');
    } catch (error) {
      if (error.message.includes('equivalent index already exists')) {
        console.log('✅ Geospatial index already exists');
      } else {
        console.log('⚠️  Geospatial index: ' + error.message);
      }
    }
    
    // Create other indexes
    for (const config of indexConfigs) {
      console.log(`\nCreating index for ${config.desc}...`);
      const result = await createIndex(config.spec, config.options);
      if (result.success) {
        console.log(`✅ Index created: ${config.options.name}`);
      } else if (result.exists) {
        console.log(`✅ ${result.message}`);
      }
    }
    
    // Get all indexes
    console.log('\n📊 All indexes for Service collection:');
    const indexes = await Service.collection.getIndexes();
    Object.keys(indexes).forEach(indexName => {
      console.log(`  • ${indexName}`);
    });
    
    console.log('\n🎉 Index creation completed!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
createIndexes();
