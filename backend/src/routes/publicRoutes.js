const express = require('express');
const router = express.Router();
const adminContentController = require('../controllers/adminContentController');

/**
 * Public Content Routes
 * Use for Terms, Privacy, About and other CMS content
 */
// @route   GET /api/public/content/:type
// @desc    Get public-facing content (Terms, Privacy, About etc)
// @access  Public
router.get('/content/:type', adminContentController.getContent);

module.exports = router;
