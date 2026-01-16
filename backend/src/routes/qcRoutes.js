const express = require('express');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const qcController = require('../controllers/qcController');

const router = express.Router();

/**
 * QC Verification Routes
 * - Sellers initiate QC with inspection notes and images
 * - Admins review, approve, or reject QC
 * - Payment release blocked until QC approved
 */

// Seller initiates QC for an order
router.post('/initiate', authMiddleware, qcController.initiateQC);

// Get QC status for an order
router.get('/:orderId/status', authMiddleware, qcController.getQCStatus);

// Admin reviews QC (transitions to in_review)
router.put('/:qcId/review', authMiddleware, roleCheck(['admin']), qcController.reviewQC);

// Admin approves QC
router.put('/:qcId/approve', authMiddleware, roleCheck(['admin']), qcController.approveQC);

// Admin rejects QC
router.put('/:qcId/reject', authMiddleware, roleCheck(['admin']), qcController.rejectQC);

// Upload/add images to QC
router.post('/:qcId/images', authMiddleware, qcController.uploadImages);

// Get all QC records (admin only)
router.get('/all/list', authMiddleware, roleCheck(['admin']), qcController.getAllQC);

// Get QC statistics (admin only)
router.get('/stats/overview', authMiddleware, roleCheck(['admin']), qcController.getQCStats);

module.exports = router;
