const mongoose = require('mongoose');

const qcVerificationSchema = new mongoose.Schema({
  // Core references
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // QC Status workflow: pending -> in_review -> approved/rejected
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected'],
    default: 'pending'
  },

  // Inspection details
  inspectionNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },

  // Image uploads (base64 or URLs)
  images: [
    {
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // Admin review info
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,

  // QC criteria checklist
  qualityChecklist: {
    productCondition: {
      passed: Boolean,
      notes: String
    },
    functionality: {
      passed: Boolean,
      notes: String
    },
    packaging: {
      passed: Boolean,
      notes: String
    },
    documentation: {
      passed: Boolean,
      notes: String
    }
  },

  // Quality score (0-100)
  qualityValidation: {
    type: Number,
    min: 0,
    max: 100
  },

  // Legacy field support
  remarks: String,
  verificationPhotos: [String],
  verificationDate: Date,
  qcPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
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
qcVerificationSchema.index({ orderId: 1 });
qcVerificationSchema.index({ status: 1 });
qcVerificationSchema.index({ sellerId: 1 });
qcVerificationSchema.index({ reviewedBy: 1 });
qcVerificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QCVerification', qcVerificationSchema);
