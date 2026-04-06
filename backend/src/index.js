const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();
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

// CORS configuration - moved to top to ensure headers are set correctly
const corsOptions = {
  origin: true, // Reflects the request origin
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
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Request Logger
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.originalUrl}`);
  next();
});

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
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Input sanitization
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
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

const PORT = process.env.PORT || 5001;

// Start server only when this file is executed directly
if (require.main === module) {
  connectDB()
    .then(() => {
      const server = http.createServer(app);
      const io = socketIO(server, {
        cors: {
          origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://192.168.0.104:3000',
            'http://192.168.56.1:3000'
          ],
          methods: ['GET', 'POST'],
          credentials: true,
        },
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
