// src/middleware/validation.js
// Comprehensive input validation and sanitization middleware

const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    return next(new AppError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`, 400));
  }
  next();
};

/**
 * Sanitize string inputs to prevent XSS
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

/**
 * Validate and sanitize geolocation query parameters
 */
module.exports.validateNearbyQuery = [
  query('lng')
    .exists().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('lat')
    .exists().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('maxDistance')
    .optional()
    .isInt({ min: 0, max: 100000 }).withMessage('maxDistance must be between 0 and 100000 meters'),
  handleValidationErrors
];

/**
 * Validate product creation/update
 */
module.exports.validateProduct = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters')
    .customSanitizer(sanitizeString),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .customSanitizer(sanitizeString),
  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category')
    .trim()
    .isLength({ min: 1 }).withMessage('Category is required')
    .customSanitizer(sanitizeString),
  body('condition')
    .isIn(['new', 'like-new', 'good', 'fair', 'poor']).withMessage('Invalid condition value'),
  handleValidationErrors
];

/**
 * Validate user registration
 */
module.exports.validateRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name is required')
    .customSanitizer(sanitizeString),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name is required')
    .customSanitizer(sanitizeString),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .matches(/^(\+880|0)1[3-9]\d{8}$/).withMessage('Valid Bangladeshi phone number is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['buyer', 'seller', 'quality_controller', 'delivery_person']).withMessage('Invalid role'),
  handleValidationErrors
];

/**
 * Validate login credentials
 */
module.exports.validateLogin = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .exists().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validate MongoDB ObjectId parameters
 */
module.exports.validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName} ID format`),
  handleValidationErrors
];

/**
 * Validate pagination parameters
 */
module.exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Validate bid placement
 */
module.exports.validateBid = [
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Bid amount must be greater than 0'),
  body('productId')
    .isMongoId().withMessage('Valid product ID is required'),
  handleValidationErrors
];

/**
 * General input sanitization middleware
 */
module.exports.sanitizeInput = (req, res, next) => {
  // Sanitize string fields in body
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};
