const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/auth');

/**
 * Public/User Reporting Routes
 */

// Get report reasons
router.get('/reasons/:type', reportController.getReportReasons);

// Create report (protected)
router.post('/product', authMiddleware, (req, res, next) => {
    req.params.type = 'product';
    reportController.createReport(req, res, next);
});

router.post('/user', authMiddleware, (req, res, next) => {
    req.params.type = 'user';
    reportController.createReport(req, res, next);
});

router.post('/review', authMiddleware, (req, res, next) => {
    req.params.type = 'review';
    reportController.createReport(req, res, next);
});

router.post('/flag', authMiddleware, (req, res, next) => {
    req.params.type = 'content';
    reportController.createReport(req, res, next);
});

module.exports = router;
