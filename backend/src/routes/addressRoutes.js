const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const shippingController = require('../controllers/shippingController');

router.use(authMiddleware);

router.get('/', shippingController.getAddresses);
router.get('/:id', shippingController.getAddressById);
router.post('/', shippingController.addAddress);
router.put('/:id', shippingController.updateAddress);
router.delete('/:id', shippingController.deleteAddress);
router.put('/:id/default', shippingController.setDefaultAddress);

module.exports = router;
