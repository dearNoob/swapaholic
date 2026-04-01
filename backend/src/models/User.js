const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    unique: true,
    required: true
  },
  loginHistory: [{
    ip: String,
    deviceFingerprint: String, // Hash of User-Agent + IP
    lastLogin: Date,
    isTrusted: { type: Boolean, default: false }
  }],
  otp: {
    code: String,
    expiresAt: Date,
    purpose: { type: String, enum: ['LOGIN_2FA', 'PASSWORD_RESET', 'PHONE_VERIFY'] }
  },
  interests: [String],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  nidNumber: { type: String, select: false },
  profileCompletionScore: { type: Number, default: 40 },
  isVerifiedUser: { type: Boolean, default: false },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'quality_controller', 'delivery_person', 'admin', 'logistics_officer'],
    default: 'user'
  },
  twoFactorSecret: { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  backupCodes: { type: [String], select: false },
  profilePicture: String,
  bio: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  location: {
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
  kycVerified: {
    type: Boolean,
    default: false
  },
  kycDocument: String,
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'deleted', 'pending_approval'],
    default: 'active'
  },
  suspensionReason: String,
  suspendedAt: Date,
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  banReason: String,
  bannedAt: Date,
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ratingAverage: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  buyerRating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  auctionNoConfirmCount: {
    type: Number,
    default: 0
  },
  paymentMethods: [{
    type: { type: String, enum: ['card', 'bkash', 'rocket', 'nagad', 'bank'] },
    details: {
      brand: String, // visa, mastercard, or bkash, etc.
      last4: String, // 4242 or 8901
      expiryMonth: Number,
      expiryYear: Number,
      accountName: String, // Account holder name
      accountNumber: String // Masked or full number for MFS
    },
    isDefault: { type: Boolean, default: false }
  }],
  totalTransactions: {
    type: Number,
    default: 0
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
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

// Create geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
