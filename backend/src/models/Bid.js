const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
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
  bidAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'accepted', 'rejected', 'expired', 'withdrawn', 'won', 'pending_confirmation', 'confirmation_expired'],
    default: 'active'
  },
  auctionWonAt: {
    type: Date
  },
  confirmationDeadline: {
    type: Date
  },
  confirmationEmailSentAt: {
    type: Date
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

// Index for queries
bidSchema.index({ productId: 1, status: 1 });
bidSchema.index({ buyerId: 1 });

module.exports = mongoose.model('Bid', bidSchema);
