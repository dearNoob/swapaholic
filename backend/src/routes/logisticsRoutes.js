const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const logisticsAuthController = require('../controllers/logisticsAuthController');
const logisticsController = require('../controllers/logisticsController');
const qcController = require('../controllers/qcController');
const deliveryController = require('../controllers/deliveryController');

/**
 * Logistics Officer Auth Routes (Public)
 */

// Register as logistics officer (pending admin approval)
router.post(
    '/register',
    [
        body('firstName').isLength({ min: 1 }).withMessage('First name is required'),
        body('lastName').isLength({ min: 1 }).withMessage('Last name is required'),
        body('phone').isLength({ min: 6 }).withMessage('Phone is required'),
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
    ],
    logisticsAuthController.logisticsRegister
);

// Login as logistics officer
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').exists().withMessage('Password required'),
    ],
    logisticsAuthController.logisticsLogin
);

/**
 * Dashboard Routes (Protected - logistics_officer only)
 */

// Get combined dashboard stats
router.get('/dashboard/stats', authMiddleware, roleCheck(['logistics_officer']), logisticsController.getDashboardStats);

// Get my active tasks (QC + delivery combined)
router.get('/tasks', authMiddleware, roleCheck(['logistics_officer']), logisticsController.getMyTasks);

// Get task history (completed tasks)
router.get('/tasks/history', authMiddleware, roleCheck(['logistics_officer']), logisticsController.getTaskHistory);

// Pickup an order (auto-assign QC + delivery to self)
router.post('/tasks/:orderId/pickup', authMiddleware, roleCheck(['logistics_officer']), logisticsController.pickupOrder);

/**
 * QC Routes (Proxied for logistics officer)
 */

// Get all QC records
router.get('/qc/list', authMiddleware, roleCheck(['logistics_officer']), qcController.getAllQC);

// Get QC stats
router.get('/qc/stats', authMiddleware, roleCheck(['logistics_officer']), qcController.getQCStats);

// Get QC status for an order
router.get('/qc/:orderId/status', authMiddleware, roleCheck(['logistics_officer']), qcController.getQCStatus);

// Initiate QC for an order
router.post('/qc/initiate', authMiddleware, roleCheck(['logistics_officer']), qcController.initiateQC);

// Review QC
router.put('/qc/:qcId/review', authMiddleware, roleCheck(['logistics_officer']), qcController.reviewQC);

// Approve QC
router.put('/qc/:qcId/approve', authMiddleware, roleCheck(['logistics_officer']), qcController.approveQC);

// Reject QC
router.put('/qc/:qcId/reject', authMiddleware, roleCheck(['logistics_officer']), qcController.rejectQC);

// Upload QC images
router.post('/qc/:qcId/images', authMiddleware, roleCheck(['logistics_officer']), qcController.uploadImages);

/**
 * Delivery Routes (Proxied for logistics officer)
 */

// Get active deliveries
router.get('/delivery/active', authMiddleware, roleCheck(['logistics_officer']), deliveryController.getActiveDeliveries);

// Get delivery stats
router.get('/delivery/stats', authMiddleware, roleCheck(['logistics_officer']), deliveryController.getDeliveryStats);

// Track delivery
router.get('/delivery/:orderId/track', authMiddleware, roleCheck(['logistics_officer']), deliveryController.trackDelivery);

// Get delivery history
router.get('/delivery/:orderId/history', authMiddleware, roleCheck(['logistics_officer']), deliveryController.getDeliveryHistory);

// Update delivery status
router.put('/delivery/:orderId/status', authMiddleware, roleCheck(['logistics_officer']), deliveryController.updateDeliveryStatus);

// Assign delivery (self-assign)
router.put('/delivery/:orderId/assign', authMiddleware, roleCheck(['logistics_officer']), deliveryController.assignDelivery);

/**
 * Profile Routes
 */
// Get own profile
router.get('/profile', authMiddleware, roleCheck(['logistics_officer']), logisticsController.getMyProfile);

// Update own profile
router.put('/profile', authMiddleware, roleCheck(['logistics_officer']), logisticsController.updateMyProfile);

module.exports = router;
