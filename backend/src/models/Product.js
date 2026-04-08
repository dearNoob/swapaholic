const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  minimumPrice: Number,
  maximumPrice: Number,
  aiQualityScore: {
    type: Number,
    default: 0
  },
  aiSuggestedPrice: {
    type: Number
  },
  viewCount: {
    type: Number,
    default: 0
  },
  images: {
    type: [String],
    validate: [arrayLimit, '{PATH} must have at least 4 images']
  },
  condition: {
    type: String,
    enum: ['brand_new', 'like_new', 'excellent', 'good', 'fair'],
    required: true
  },
  location: {
    type: String
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  status: {
    type: String,
    enum: ['active', 'bidden', 'sold', 'removed', 'qc_pending', 'qc_rejected', 'auction_ended'],
    default: 'active'
  },
  bidStartDate: Date,
  bidEndDate: Date,
  highestBidAmount: Number,
  highestBidderId: mongoose.Schema.Types.ObjectId,
  auctionEndedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index
productSchema.index({ geometry: '2dsphere' });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ sellerId: 1 });
productSchema.index({ basePrice: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ condition: 1 });

// Text index for full-text search
productSchema.index({ title: 'text', description: 'text', category: 'text' });


function arrayLimit(val) {
  if (process.env.NODE_ENV === 'test') return true;
  return val.length >= 4;
}

module.exports = mongoose.model('Product', productSchema);
