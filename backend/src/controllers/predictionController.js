const axios = require('axios');
const logger = require('../utils/logger');

// ─── Smart Depreciation-Based Price Calculator (Fallback) ────────────────────
// This acts as a reliable fallback when the external ML API is unreachable.
// It uses category-specific depreciation curves, condition multipliers,
// and location premiums to estimate a resale price.

const DEPRECIATION_CURVES = {
  // Electronics depreciate steeply in year 1, then moderate
  Smartphone:   { year1: 0.35, yearlyAfter: 0.15, floor: 0.10 },
  Laptop:       { year1: 0.30, yearlyAfter: 0.12, floor: 0.12 },
  Tablet:       { year1: 0.32, yearlyAfter: 0.14, floor: 0.10 },
  Camera:       { year1: 0.25, yearlyAfter: 0.10, floor: 0.15 },
  TV:           { year1: 0.28, yearlyAfter: 0.12, floor: 0.10 },
  Smartwatch:   { year1: 0.35, yearlyAfter: 0.18, floor: 0.08 },
  Headphones:   { year1: 0.30, yearlyAfter: 0.15, floor: 0.10 },
  Gaming:       { year1: 0.25, yearlyAfter: 0.10, floor: 0.15 },
  // Non-electronics
  Fashion:      { year1: 0.40, yearlyAfter: 0.20, floor: 0.05 },
  'Home & Garden': { year1: 0.25, yearlyAfter: 0.10, floor: 0.15 },
  Sports:       { year1: 0.25, yearlyAfter: 0.12, floor: 0.10 },
  Vehicles:     { year1: 0.20, yearlyAfter: 0.10, floor: 0.15 },
  Collectibles: { year1: 0.05, yearlyAfter: 0.02, floor: 0.50 }, // Collectibles hold value
  Toys:         { year1: 0.35, yearlyAfter: 0.15, floor: 0.05 },
  // Default for unknown categories
  Default:      { year1: 0.25, yearlyAfter: 0.12, floor: 0.10 },
};

const CONDITION_MULTIPLIERS = {
  'new':      1.00,
  'like-new': 0.92,
  'good':     0.82,
  'fair':     0.68,
  'used':     0.75,  // Generic "used"
  'poor':     0.50,
};

const LOCATION_PREMIUMS = {
  'dhaka':       1.05,
  'chittagong':  1.03,
  'chattogram':  1.03,
  'sylhet':      1.01,
  'rajshahi':    1.00,
  'khulna':      1.00,
};

// Map frontend category IDs to ML model / depreciation curve keys
const CATEGORY_MAP = {
  'electronics':   'Smartphone',    // Default subcategory for electronics
  'fashion':       'Fashion',
  'home':          'Home & Garden',
  'sports':        'Sports',
  'toys':          'Toys',
  'vehicles':      'Vehicles',
  'collectibles':  'Collectibles',
  'other':         'Default',
};

// Detect subcategory from brand/model keywords
function detectSubcategory(brand, model, category) {
  const combined = `${brand} ${model}`.toLowerCase();

  if (category === 'electronics' || category === 'Smartphone') {
    if (/laptop|macbook|thinkpad|ideapad|pavilion|inspiron|vivobook|zenbook|xps|vostro|latitude|elitebook|aspire|chromebook|surface/i.test(combined)) return 'Laptop';
    if (/ipad|tab|tablet|galaxy tab/i.test(combined)) return 'Tablet';
    if (/camera|eos|nikon|canon|fujifilm|lumix|alpha|dslr|mirrorless/i.test(combined)) return 'Camera';
    if (/tv|television|bravia|oled|qled|smart tv|roku/i.test(combined)) return 'TV';
    if (/watch|band|fitbit|amazfit|garmin/i.test(combined)) return 'Smartwatch';
    if (/headphone|earphone|earbud|airpod|buds|speaker|soundbar/i.test(combined)) return 'Headphones';
    if (/playstation|xbox|nintendo|switch|ps5|ps4|gaming/i.test(combined)) return 'Gaming';
    return 'Smartphone'; // Default for electronics
  }

  return CATEGORY_MAP[category] || 'Default';
}

// Smart depreciation calculator
function calculateSmartPrice(originalPrice, productAgeYears, condition, category, brand, model, location) {
  const subcategory = detectSubcategory(brand, model, category);
  const curve = DEPRECIATION_CURVES[subcategory] || DEPRECIATION_CURVES.Default;

  // Calculate depreciation
  let retainedValue = 1.0;

  if (productAgeYears <= 1) {
    // Within first year: linear interpolation
    retainedValue = 1.0 - (curve.year1 * productAgeYears);
  } else {
    // Year 1 depreciation fully applied, then yearly after
    retainedValue = 1.0 - curve.year1;
    const additionalYears = productAgeYears - 1;
    retainedValue *= Math.pow(1 - curve.yearlyAfter, additionalYears);
  }

  // Apply floor
  retainedValue = Math.max(retainedValue, curve.floor);

  // Base resale price
  let resalePrice = originalPrice * retainedValue;

  // Apply condition multiplier
  const conditionKey = (condition || 'used').toLowerCase();
  const conditionMult = CONDITION_MULTIPLIERS[conditionKey] || CONDITION_MULTIPLIERS['used'];
  resalePrice *= conditionMult;

  // Apply location premium
  if (location) {
    const locationKey = location.toLowerCase().trim().split(',')[0].trim();
    const locationMult = LOCATION_PREMIUMS[locationKey] || 1.0;
    resalePrice *= locationMult;
  }

  // Brand premium adjustments (popular brands hold value better)
  const premiumBrands = ['apple', 'samsung', 'sony', 'canon', 'nikon', 'dell', 'hp', 'lenovo', 'asus', 'google'];
  if (brand && premiumBrands.includes(brand.toLowerCase())) {
    resalePrice *= 1.05; // 5% brand premium
  }

  // Round to nearest 100
  resalePrice = Math.round(resalePrice / 100) * 100;

  // Minimum price guard
  resalePrice = Math.max(resalePrice, 500);

  return {
    price: resalePrice,
    subcategory,
    retainedPercent: Math.round(retainedValue * 100),
  };
}


// ─── Main Prediction Controller ──────────────────────────────────────────────

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

    const mlUrl = process.env.ML_API_URL || 'http://localhost:5000/predict';
    
    // Shape the payload for the Flask ML API
    const payload = {
      brand,
      model,
      category: detectSubcategory(brand, model, category),
      condition: condition || 'Used',
      location: location || 'Dhaka',
      original_price: Number(original_price),
      product_age: product_age ? String(product_age) : "1",
      warranty_months: warranty_months ? Number(warranty_months) : 0,
      popularity_score: 50
    };

    // ─── Try ML Model First (with retry) ───────────────────────────

    let mlSuccess = false;
    let priceBdt = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        logger.info(`ML API attempt ${attempt}: Sending prediction request for ${brand} ${model}`);
        const response = await axios.post(mlUrl, payload, { timeout: 25000 });
        
        if (response.data && response.data.predicted_price_bdt) {
          priceBdt = response.data.predicted_price_bdt;
          mlSuccess = true;
        } else if (response.data && response.data.price) {
          priceBdt = parseFloat(response.data.price.replace(/[^\d.-]/g, ''));
          mlSuccess = true;
        }

        if (mlSuccess) break;
      } catch (mlError) {
        logger.warn(`ML API attempt ${attempt} failed for ${brand} ${model}: ${mlError.message}`);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }
    }

    if (mlSuccess && priceBdt) {
      return res.status(200).json({
        success: true,
        suggestedPrice: Math.round(priceBdt),
        source: 'ml_model',
        message: 'Price predicted successfully by AI Model.'
      });
    }

    // ─── Fallback: Smart Depreciation Calculator ───────────────────

    logger.info(`Using smart fallback for ${brand} ${model} (ML API unreachable)`);

    const productAgeYears = product_age ? parseFloat(product_age) : 1;
    const fallbackResult = calculateSmartPrice(
      Number(original_price),
      productAgeYears,
      condition || 'used',
      category,
      brand,
      model,
      location
    );

    return res.status(200).json({
      success: true,
      suggestedPrice: fallbackResult.price,
      source: 'smart_estimate',
      message: `Smart price estimate based on ${fallbackResult.subcategory} depreciation (${fallbackResult.retainedPercent}% value retained).`
    });

  } catch (error) {
    logger.error('Error in predictPrice Endpoint:', error);
    next(error);
  }
};
