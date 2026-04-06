const axios = require('axios');
const logger = require('../utils/logger');

exports.predictPrice = async (req, res, next) => {
  try {
    const { category, brand, model, condition, location, original_price, product_age, warranty_months } = req.body;
    
    // Basic validation
    if (!category || !brand || !model || !original_price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for price prediction. Required: category, brand, model, original_price'
      });
    }

    try {
      // Connect specifically ONLY to your Flask Machine Learning Model API
      const mlUrl = process.env.ML_API_URL || 'http://localhost:5000/predict';
      
      // Shape the payload precisely for your Flask API
      const payload = {
        brand,
        model,
        category,
        condition: condition || 'Used',
        location: location || 'Dhaka',
        original_price: Number(original_price),
        product_age: product_age ? String(product_age) : "1",
        warranty_months: warranty_months ? Number(warranty_months) : 0,
        popularity_score: 50 // Standard static baseline score
      };

      const response = await axios.post(mlUrl, payload, { timeout: 15000 });
      
      // Extract price based on API response format (Handles both dictionary formats you programmed)
      let priceBdt;
      if (response.data && response.data.predicted_price_bdt) {
         priceBdt = response.data.predicted_price_bdt;
      } else if (response.data && response.data.price) { 
         priceBdt = parseFloat(response.data.price.replace(/[^\d.-]/g, ''));
      }

      if (priceBdt) {
        return res.status(200).json({
          success: true,
          suggestedPrice: Math.round(priceBdt),
          message: 'Price predicted successfully by ML Model.'
        });
      } else {
         return res.status(500).json({
             success: false,
             message: 'Ensure the ML model is returning a valid price element.'
         });
      }
    } catch (mlError) {
      logger.error(`Swapaholic ML API Error for ${brand} ${model}: ${mlError.message}`);
      return res.status(503).json({
          success: false,
          error: "Model Failed",
          message: 'The Prediction Model is currently unreachable or could not generate a price for this category.'
      });
    }

  } catch (error) {
    logger.error('Error in predictPrice Endpoint:', error);
    next(error);
  }
};
