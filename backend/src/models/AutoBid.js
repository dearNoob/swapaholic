const mongoose = require('mongoose');

const autoBidSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxAmount: {
    type: Number,
    required: true
  },
  incrementAmount: {
    type: Number,
    default: 10 // Default minimum increment
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one auto-bid per user per product
autoBidSchema.index({ productId: 1, buyerId: 1 }, { unique: true });

module.exports = mongoose.model('AutoBid', autoBidSchema);
