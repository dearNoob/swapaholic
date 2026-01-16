# Swapaholic - Backend Setup & Development Guide

## Quick Start

### 1. Prerequisites
- Node.js v16+
- MongoDB 5.0+ (Local or MongoDB Atlas cloud)
- npm or yarn

### 2. Installation

```bash
cd backend
npm install
cp .env.example .env
```

### 3. Database Setup

**Option A: Local MongoDB**

```bash
# Install MongoDB Community Edition
# Windows: Download from https://www.mongodb.com/try/download/community
# macOS: brew install mongodb-community
# Linux: https://docs.mongodb.com/manual/installation/

# Start MongoDB service
# Windows: mongod --dbpath "C:\data\db"
# macOS/Linux: mongod

# Seed sample data (optional)
npm run seed
```

**Option B: MongoDB Atlas (Cloud)**

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/swapaholic_db`
4. Update `.env` with your connection string

### 4. Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# Environment
NODE_ENV=development

# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/swapaholic_db
# OR for production: mongodb+srv://username:password@cluster.mongodb.net/swapaholic_db

# JWT Security (IMPORTANT: Change these in production!)
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secure-refresh-token-secret-key-change-this-too

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Service (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Redis (for caching and sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# File Upload Settings
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Security Settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

#### Security Notes for Production:

1. **JWT Secrets**: Use cryptographically secure random strings (minimum 32 characters)
2. **Database**: Use MongoDB Atlas with authentication enabled
3. **HTTPS**: Always use HTTPS in production
4. **Environment Variables**: Never commit `.env` files to version control
5. **Firewall**: Restrict database access to application servers only

### 5. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will be available at: `http://localhost:5000`

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   └── mongodb.js   # MongoDB Mongoose connection
│   │
│   ├── models/          # Mongoose models
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Bid.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── QCVerification.js
│   │   ├── Delivery.js
│   │   ├── Review.js
│   │   └── SupportTicket.js
│   │
│   ├── routes/          # API routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── bidRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── deliveryRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── supportRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── controllers/     # Business logic (TO IMPLEMENT)
│   │
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # JWT authentication
│   │   └── errorHandler.js
│   │
│   ├── utils/          # Utility functions
│   │   └── logger.js
│   │
│   ├── db/             # Database seeds & utilities
│   │   ├── seed.js     # Seed sample data
│   │   └── migrations/ # (MongoDB is schema-less, minimal migrations needed)
│   │
│   └── index.js        # Server entry point
│
├── package.json
├── .env.example
└── README.md
```

---

## Database Overview

Swapaholic uses **MongoDB** with **Mongoose ORM** for data persistence.

### Models

#### User Model
- Role: Buyer, Seller, QC, Delivery Person, Admin
- KYC verification tracking
- Geospatial location for local search
- Rating system (0-5 scale)
- Password hashing with bcryptjs

#### Product Model  
- Seller listings with multiple images
- AI quality scoring
- Condition tracking
- Geospatial location-based queries
- Highest bid tracking
- Auction period management

#### Bid Model
- Buyer auction bids
- Status: active, accepted, rejected, expired, withdrawn
- Tracks bidding history

#### Order Model
- Confirmed transactions
- Status flow: pending → confirmed → qc_pending → qc_approved → delivery_assigned → delivered → completed
- Escrow management (held, released, refunded)
- Delivery date tracking

#### Payment Model
- Payment processing
- Stripe integration with secure tokens
- Escrow release scheduling
- Status: pending, escrowed, released, refunded, failed

#### QCVerification Model
- Quality control validation
- Status: pending, approved, rejected
- Quality scoring and photo evidence
- Rejection reason tracking

#### Delivery Model
- Real-time delivery tracking with geospatial queries
- Route history with timestamps
- Pickup and delivery location coordinates
- Current location updates
- Proof of delivery (photos)
- Buyer authentication (OTP, signature)

#### Review Model
- Buyer-to-Seller and Seller-to-Buyer reviews
- 1-5 star ratings
- Auto-moderation with report tracking
- Status: active, hidden, deleted, flagged

#### SupportTicket Model
- Issue categorization (payment, delivery, quality, account, fraud)
- Multi-message conversation threads
- Priority-based routing (low, medium, high, critical)
- Admin assignment and resolution tracking

---

## MongoDB Features Used

### Indexing
All models include optimal indexes for fast queries:
- Compound indexes for common query patterns
- Geospatial 2dsphere indexes for location-based searches
- Unique indexes on email/phone (User model)

### Geospatial Queries
Location-based features using GeoJSON:
```javascript
// Example: Find products near buyer
Product.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [lat, lng] },
      $maxDistance: 50000 // 50km radius
    }
  }
});
```

### Pre-save Hooks
- User password hashing automatically on save
- Timestamps auto-updated

### Virtual Fields
- User fullName virtual field (firstName + lastName)

---

## Common Commands

```bash
# Development server with hot-reload
npm run dev

# Production server
npm start

# Seed database with sample data
npm run seed

# Tests
npm test

# Lint code
npm run lint
```

---

## API Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "API is running",
  "timestamp": "2025-11-12T10:00:00.000Z"
}
```

---

## Troubleshooting

### MongoDB Connection Failed

**Local MongoDB:**
```bash
# Windows: Start MongoDB
mongod --dbpath "C:\data\db"

# macOS/Linux: Check if running
ps aux | grep mongod

# Start MongoDB
brew services start mongodb-community
```

**MongoDB Atlas (Cloud):**
- Verify connection string has username:password
- Check IP whitelist in Atlas console (allow 0.0.0.0/0 for development)
- Ensure .env has correct MONGODB_URI

### Port Already in Use

```bash
# Windows: Find process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5000
kill -9 <PID>
```

### Module/Dependency Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Mongoose Schema Errors

- Models import from `../models/ModelName`
- All model exports use `mongoose.model('ModelName', schema)`
- ObjectId references: `ref: 'ModelName'`

---

## Next Steps

### 1. Implement Controllers
Create files in `src/controllers/`:
- authController.js
- userController.js  
- productController.js
- bidController.js
- orderController.js
- paymentController.js
- deliveryController.js
- reviewController.js
- supportController.js
- adminController.js

### 2. Wire Controllers to Routes
Connect model operations to API endpoints

### 3. Implement Services
Create `src/services/` for:
- PaymentService (Stripe integration)
- EmailService (Notifications)
- GeolocationService (Maps/tracking)
- NotificationService (Real-time updates)

### 4. Add Authentication
- JWT middleware validation
- Role-based authorization
- Permission checks per endpoint

---

## Architecture Documentation

For detailed architecture and API specifications, see:
- `docs/ARCHITECTURE.md` - System design
- `docs/API_DOCUMENTATION.md` - API endpoints
- `docs/DB_SCHEMA.md` - MongoDB schema reference

---

*For frontend setup, see ../frontend/README.md*
