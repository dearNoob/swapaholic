const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'escrowed', 'released', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'bank_transfer', 'wallet'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripePaymentId: String,
  stripeChargeId: String,

  // QC-related fields: payment blocked until QC approved
  escrowReleaseEligible: {
    type: Boolean,
    default: false
  },

  escrowReleaseDate: Date,
  refundDate: Date,
  refundReason: String,
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
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ escrowReleaseEligible: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
