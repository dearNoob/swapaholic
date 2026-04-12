const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
const backendPackage = require('../package.json');
require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 to fix ENETUNREACH on Render
const { validateEnvironment } = require('./config/validateEnv');
const logger = require('./utils/logger');
const { connectDB } = require('./config/mongodb');
const notificationService = require('./utils/notificationService');
const { startAuctionScheduler } = require('./utils/auctionScheduler');

// Validate environment configuration
validateEnvironment();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const bidRoutes = require('./routes/bidRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const addressRoutes = require('./routes/addressRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const supportRoutes = require('./routes/supportRoutes');
const qcRoutes = require('./routes/qcRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const publicRoutes = require('./routes/publicRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');
const cookieParser = require('cookie-parser');

const app = express();

// Trust proxy for Render/reverse proxy environments
app.set('trust proxy', 1);

const normalizeOrigin = (origin) => {
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch (error) {
    return String(origin).trim().replace(/\/$/, '');
  }
};

const buildAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000'
  ];

  return new Set(
    configuredOrigins
      .map(normalizeOrigin)
      .filter(Boolean)
  );
};

const allowedOrigins = buildAllowedOrigins();

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.has(normalizedOrigin)) return true;
  
  if (normalizedOrigin && normalizedOrigin.endsWith('.vercel.app')) {
    return true;
  }

  return false;
};

// CORS configuration - moved to top to ensure headers are set correctly
const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(cookieParser());

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,

// Rate limiting for all routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for development to prevent 429 errors from Next.js fast refresh
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', (req, res, next) => {
  logger.info(`Static file request: ${req.url}`);
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// Input sanitization
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'API is running',
    service: 'swapaholic-backend',
    environment: process.env.NODE_ENV || 'development',
    version: backendPackage.version,
    storageProvider: process.env.FILE_STORAGE_PROVIDER || 'local',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/products/price', predictionRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 'fail',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server only when this file is executed directly
if (require.main === module) {
  connectDB()
    .then(() => {
      const server = http.createServer(app);
      const io = socketIO(server, {
        cors: {
          origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
              return callback(null, true);
            }

            logger.warn(`Blocked Socket.IO connection from origin: ${origin}`);
            return callback(new Error('Origin not allowed'));
          },
          methods: ['GET', 'POST'],
          credentials: true,
        },
      });

      io.use((socket, next) => {
        const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        const token = rawToken ? String(rawToken).replace(/^Bearer\s+/i, '') : null;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.data.user = decoded;
          return next();
        } catch (error) {
          logger.warn(`Rejected Socket.IO connection for socket ${socket.id}: invalid token`);
          return next(new Error('Invalid token'));
        }
      });

      notificationService.init(io);
      io.on('connection', (socket) => {
        logger.info(`New socket connection: ${socket.id}`);
        notificationService.handleConnection(socket);
      });
      server.listen(PORT, () => {
        logger.info(`Swapaholic Backend Server running on port ${PORT}`);
        logger.info('MongoDB connection established');
        logger.info('Socket.io server initialized');

        // Start auction scheduler (cron jobs)
        startAuctionScheduler();
      });
    })
    .catch((err) => {
      logger.error('Failed to connect to MongoDB:', err);
      process.exit(1);
    });
}

module.exports = app;
