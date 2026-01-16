const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'],
    default: 'assigned'
  },
  pickupLocation: String,
  deliveryLocation: String,
  currentLocation: {
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
  estimatedArrival: Date,
  pickupTime: Date,
  deliveryTime: Date,
  proofOfDelivery: String,
  buyerSignature: String,
  buyerOTP: String,
  geoTag: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  deliveryRoute: [{
    timestamp: Date,
    latitude: Number,
    longitude: Number
  }],
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

// Geospatial index for tracking
deliverySchema.index({ currentLocation: '2dsphere' });
deliverySchema.index({ orderId: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ deliveryPersonId: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
