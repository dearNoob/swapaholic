const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateNearbyQuery } = require('../middleware/validation');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const upload = require('../middleware/upload');
router.get('/nearby/search', validateNearbyQuery, productController.searchNearby);

// Special routes (must come BEFORE generic routes)
// @route   GET /api/products/filters/metadata
// @desc    Get filter options (categories, conditions, price range)
// @access  Public
router.get('/filters/metadata', productController.getFilterMetadata);

// @route   GET /api/products/search/suggestions
// @desc    Get search suggestions for autocomplete
// @access  Public
router.get('/search/suggestions', productController.getSearchSuggestions);

// @route   GET /api/products/nearby/search
// @desc    Search products nearby by geolocation
// @access  Public
// Duplicate route removed (handled with validation middleware above)

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', productController.getFeaturedProducts);

// Generic routes
// @route   GET /api/products
// @desc    Get all products with advanced filters and search
// @access  Public
// Query params: category, condition, minPrice, maxPrice, search, lat, lng, radius, sortBy, page, limit
router.get('/', productController.getProducts);

// @route   GET /api/products/:id
// @desc    Get product details
// @access  Public
router.get('/:id', productController.getProductById);

// @route   POST /api/products/analyze
// @desc    Analyze product image and generate description/score (Seller)
// @access  Private - Seller only
router.post('/analyze', authMiddleware, roleCheck(['seller', 'user']), upload.array('images'), productController.analyzeProduct);

// @route   POST /api/products
// @desc    Create new product (Seller)
// @access  Private - Seller only
router.post('/', authMiddleware, roleCheck(['seller', 'user']), upload.array('images'), productController.createProduct);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private - Seller only
router.put('/:id', authMiddleware, roleCheck(['seller', 'user']), upload.array('images'), productController.updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private - Seller/Admin
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
