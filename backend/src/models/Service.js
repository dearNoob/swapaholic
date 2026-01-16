const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: [100, 'Service title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      maxlength: [2000, 'Service description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Repair & Maintenance',
        'Cleaning',
        'Delivery & Moving',
        'Home Services',
        'Personal Services',
        'Tech Support',
        'Consulting',
        'Tutoring',
        'Photography',
        'Event Services',
        'Landscaping',
        'Other',
      ],
    },
    subcategory: {
      type: String,
      required: false,
    },

    // Provider Info
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerName: String,
    providerRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    providerReviews: {
      type: Number,
      default: 0,
    },

    // Pricing
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative'],
    },
    priceType: {
      type: String,
      enum: ['fixed', 'hourly', 'project'],
      default: 'fixed',
    },
    estimatedDuration: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        default: 'hours',
      },
    },

    // Service Details
    serviceImages: [
      {
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [String],
    availability: {
      available: {
        type: Boolean,
        default: true,
      },
      schedule: {
        monday: { start: String, end: String },
        tuesday: { start: String, end: String },
        wednesday: { start: String, end: String },
        thursday: { start: String, end: String },
        friday: { start: String, end: String },
        saturday: { start: String, end: String },
        sunday: { start: String, end: String },
      },
      responseTime: {
        type: String,
        enum: ['within-1-hour', 'within-4-hours', 'within-24-hours', 'flexible'],
        default: 'within-24-hours',
      },
    },

    // Service Location
    serviceLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false,
      },
      address: String,
      city: String,
      state: String,
      zipCode: String,
      serviceRadius: Number, // in miles/km
    },

    // Verification & Certification
    certifications: [
      {
        name: String,
        issuer: String,
        expiryDate: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
    ],
    qualifications: [String],
    backgroundChecked: {
      type: Boolean,
      default: false,
    },

    // Statistics
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    bookingCount: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Status & Verification
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'pending'],
      default: 'pending',
    },
    verificationNotes: String,

    // Featured
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: Date,

    // Reviews & Ratings
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    reviewBreakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
    },

    // Additional Info
    policies: {
      cancellationPolicy: String,
      paymentTerms: String,
      warrantyInfo: String,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create geospatial index for location-based queries
serviceSchema.index({ 'serviceLocation.coordinates': '2dsphere' });

// Create text index for search
serviceSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  category: 'text',
  subcategory: 'text',
});

// Create compound indexes
serviceSchema.index({ category: 1, status: 1, createdAt: -1 });
serviceSchema.index({ providerId: 1, status: 1 });
serviceSchema.index({ isFeatured: 1, createdAt: -1 });
serviceSchema.index({ averageRating: -1, totalReviews: -1 });

// Exclude soft-deleted services
serviceSchema.query.active = function () {
  return this.where({ isDeleted: false });
};

// Pre-save middleware
serviceSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Method to soft delete
serviceSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Method to restore
serviceSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

// Method to increment views
serviceSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Method to toggle like
serviceSchema.methods.toggleLike = function (userId) {
  const index = this.savedBy.indexOf(userId);
  if (index > -1) {
    this.savedBy.splice(index, 1);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    this.savedBy.push(userId);
    this.likes += 1;
  }
  return this.save();
};

// Method to update rating
serviceSchema.methods.updateRating = function (rating) {
  const stars = Math.round(rating);
  if (stars >= 1 && stars <= 5) {
    this.reviewBreakdown[stars] += 1;
    this.totalReviews += 1;

    // Recalculate average
    const totalStars = Object.keys(this.reviewBreakdown).reduce((sum, key) => {
      return sum + key * this.reviewBreakdown[key];
    }, 0);

    this.averageRating = totalStars / this.totalReviews;
    this.providerRating = this.averageRating;
  }
  return this.save();
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
