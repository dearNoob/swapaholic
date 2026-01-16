const logger = require('../utils/logger');

/**
 * Enhanced Error Handler Middleware
 * Provides comprehensive error handling with proper categorization and logging
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle MongoDB/Mongoose errors
const handleMongoError = (err) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return new AppError(`Validation Error: ${errors.join('. ')}`, 400);
  }

  if (err.name === 'CastError') {
    return new AppError('Invalid data format', 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`${field} already exists`, 409);
  }

  if (err.name === 'MongoNetworkError') {
    return new AppError('Database connection failed', 503);
  }

  return new AppError('Database operation failed', 500);
};

// Handle JWT errors
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401);
  }

  return new AppError('Authentication failed', 401);
};

// Handle file upload errors
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large', 413);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field', 400);
  }

  return new AppError('File upload failed', 400);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with context
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000 || err.name === 'MongoNetworkError') {
    error = handleMongoError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'MulterError') {
    error = handleMulterError(err);
  } else if (err.code === 'EBADCSRFTOKEN') {
    error = new AppError('CSRF token validation failed', 403);
  }

  // Default error structure
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  const message = error.message || 'Internal Server Error';

  // Send error response
  res.status(statusCode).json({
    success: false,
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    }),
    timestamp: new Date().toISOString()
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', err);
  process.exit(1);
});

module.exports = {
  errorHandler,
  AppError
};
