const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const shippingController = require('../controllers/shippingController');

router.use(authMiddleware);

router.post('/options', shippingController.getShippingOptions);
router.post('/calculate', shippingController.calculateShippingCost);

module.exports = router;
