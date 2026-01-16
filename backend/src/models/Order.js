const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  },
  finalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'qc_pending', 'qc_approved', 'in_delivery', 'delivered', 'completed', 'disputed', 'cancelled'],
    default: 'pending'
  },
  escrowStatus: {
    type: String,
    enum: ['held', 'released', 'refunded'],
    default: 'held'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,

  // QC Verification flags
  qcApproved: {
    type: Boolean,
    default: false
  },
  qcApprovedAt: Date,
  qcRejectedAt: Date,

  // Dispute tracking
  disputeAssignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  disputeAssignedAt: Date,

  notes: String,
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
orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ sellerId: 1, status: 1 });
orderSchema.index({ productId: 1 });
orderSchema.index({ qcApproved: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ disputeAssignedTo: 1 });

module.exports = mongoose.model('Order', orderSchema);
