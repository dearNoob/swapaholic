const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// Define route for predicting price
// Note: This is an open endpoint or you can wrap it with authentication middleware if required
router.post('/predict', predictionController.predictPrice);

module.exports = router;
