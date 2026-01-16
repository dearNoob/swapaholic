const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

// Public routes
router.get('/categories', serviceController.getServiceCategories);
router.get('/featured', serviceController.getFeaturedServices);
router.get('/search', serviceController.searchServices);
router.get('/', serviceController.getAllServices);
router.get('/provider/:providerId', serviceController.getProviderServices);
router.get('/:serviceId', serviceController.getServiceById);

// Protected routes (authenticated users)
router.use(authMiddleware);

router.post('/', serviceController.createService);
router.put('/:serviceId', serviceController.updateService);
router.delete('/:serviceId', serviceController.deleteService);

router.post('/:serviceId/toggle-save', serviceController.toggleServiceSave);
router.get('/saved/all', serviceController.getSavedServices);

// Admin routes
router.post('/:serviceId/approve', roleCheck(['admin']), serviceController.approveService);
router.post('/:serviceId/reject', roleCheck(['admin']), serviceController.rejectService);

module.exports = router;
