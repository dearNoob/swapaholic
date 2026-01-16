// const vision = require('@google-cloud/vision'); // Vision API replaced by Gemini
// const OpenAI = require('openai'); // OpenAI replaced by Gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require('../models/Product');
const logger = require('../utils/logger');
const path = require('path');

// Initialize Google Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Initialize Google Vision API client (Kept commented out/unused or for SafeSearch if wanted later)
// const visionClient = new vision.ImageAnnotatorClient({ ... });

// Analyze product images and generate description (Seller only)
const analyzeProduct = async (req, res) => {
  try {
    const { title, category, condition } = req.body;
    const files = req.files;

    let imageParts = [];
    if (files && files.length > 0) {
      // Convert first image to base64 for Gemini
      imageParts = [{
        inlineData: {
          data: files[0].buffer.toString("base64"),
          mimeType: files[0].mimetype
        }
      }];
    }

    const prompt = `
      You are an expert product copywriter. Generate a compelling and detailed product description for a listing.
      
      Product Details:
      - Title: ${title}
      - Category: ${category}
      - Condition: ${condition}
      
      Key Requirements:
      1. Analyze the provided image (if any) and the details to generate the description.
      2. If it's an electronics item, infer specifications visible in the image or typical for the model.
      3. Tone: Professional, persuasive, and informative.
      4. Calculate a "Quality Score" (0-100) based on the condition and visual appearance (New=100, Like New=90, Good=75, Fair=60, Poor=40).
      
      Output strictly in JSON format:
      {
        "description": "...",
        "score": 85,
        "detectedLabels": ["label1", "label2"]
      }
      Do not add any markdown formatting (like \`\`\`json). Just the raw JSON string.
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    // Clean up if Gemini adds markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const content = JSON.parse(text);

    res.json({
      description: content.description,
      score: content.score,
      detectedLabels: content.detectedLabels || []
    });

  } catch (error) {
    logger.error('Analyze product error:', error);
    console.error('Full Analyze Error:', JSON.stringify(error, null, 2));

    // Check for quota exceeded (429)
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({
        message: 'AI quota exceeded. Please wait a minute and try again.',
        error: 'QUOTA_EXCEEDED',
        retryAfter: 60
      });
    }

    // Check for API key issues
    if (error.message?.includes('API key')) {
      logger.error('Gemini API Key missing or invalid');
      return res.status(500).json({
        message: 'AI service configuration error',
        error: 'API_KEY_ERROR'
      });
    }

    res.status(500).json({
      message: 'Failed to analyze product. Please try again.',
      error: error.message || 'Unknown error'
    });
  }
};

// Create product (seller only)
const createProduct = async (req, res) => {
  try {
    let { title, description, category, basePrice, price, condition, geometry, location, images, aiQualityScore } = req.body;

    // Handle mismatched field name from frontend
    if (!basePrice && price) {
      basePrice = price;
    }

    if (!title || !description || !category || !basePrice || !condition) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = new Product({
      sellerId: req.user.id,
      title,
      description, // User can edit this after generation
      category,
      basePrice,
      condition,
      geometry: typeof geometry === 'string' ? JSON.parse(geometry) : (geometry || { type: 'Point', coordinates: [0, 0] }),
      location,
      images: images || [],
      status: 'active',
      bidStartDate: new Date(),
      aiQualityScore: aiQualityScore || 0
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {

    logger.error('Create product error:', error);
    console.error('Full Create Product Error:', JSON.stringify(error, null, 2));
    res.status(500).json({ message: 'Failed to create product', error: error.message, details: error.toString() });
  }
};

// Get all products with advanced filters and pagination
const getProducts = async (req, res) => {
  try {
    const {
      category,
      condition,
      status = 'active',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      minPrice,
      maxPrice,
      search,
      lat,
      lng,
      radius
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Strategy: If both text search and geospatial are provided, we can't use aggregation properly
    // So we'll use different approaches based on what's requested

    // Case 1: Geospatial search only (use $geoNear as first stage)
    if (lat && lng && radius && !search) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      const pipeline = [];

      // $geoNear MUST be first
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { status }
        }
      });

      // Then apply other filters
      const matchStage = {};
      if (category) matchStage.category = category;
      if (condition) matchStage.condition = condition;
      if (minPrice || maxPrice) {
        matchStage.basePrice = {};
        if (minPrice) matchStage.basePrice.$gte = parseFloat(minPrice);
        if (maxPrice) matchStage.basePrice.$lte = parseFloat(maxPrice);
      }

      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      // Sort
      const sortStage = {};
      if (sortBy === 'price_asc' || sortBy === 'price-low') {
        sortStage.basePrice = 1;
      } else if (sortBy === 'price_desc' || sortBy === 'price-high') {
        sortStage.basePrice = -1;
      } else if (sortBy === 'newest') {
        sortStage.createdAt = -1;
      } else if (sortBy === 'oldest') {
        sortStage.createdAt = 1;
      } else if (sortBy === 'ending-soon') {
        sortStage.bidEndDate = 1;
      } else if (sortBy === 'most-bids') {
        sortStage.highestBidAmount = -1;
      } else {
        sortStage.distance = 1; // Default: sort by distance for geospatial
      }
      pipeline.push({ $sort: sortStage });

      // Pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });

      // Lookup seller info
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      });
      pipeline.push({ $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } });
      pipeline.push({
        $addFields: {
          'sellerId': {
            _id: '$seller._id',
            firstName: '$seller.firstName',
            lastName: '$seller.lastName',
            ratingAverage: '$seller.ratingAverage'
          }
        }
      });
      pipeline.push({ $project: { seller: 0 } });

      const products = await Product.aggregate(pipeline);

      // Count: Use same pipeline but without pagination
      const countPipeline = [];
      countPipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { status }
        }
      });
      if (Object.keys(matchStage).length > 0) {
        countPipeline.push({ $match: matchStage });
      }
      countPipeline.push({ $count: 'total' });
      const countResult = await Product.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;
      // Map _id to id for frontend compatibility
      const mappedProducts = products.map(p => ({
        ...p,
        id: p._id,
        price: p.basePrice || 0,
        currentBid: p.highestBidAmount || p.basePrice || 0,
        auctionEndTime: p.bidEndDate,
        images: p.images || [],
        bidCount: p.bidCount || 0,
        seller: p.sellerId // Already unwound and projected above
      }));

      return res.json({
        success: true,
        data: {
          data: mappedProducts,
          total,
          pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
          filters: { category, condition, minPrice, maxPrice, search, sortBy }
        }
      });
    }

    // Case 2: Text search only (use $match with $text as first stage)
    if (search && !lat && !lng && !radius) {
      const pipeline = [];

      // $text search MUST be in first $match
      const firstMatch = { status, $text: { $search: search } };
      pipeline.push({ $match: firstMatch });
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });

      // Then apply other filters
      const secondMatch = {};
      if (category) secondMatch.category = category;
      if (condition) secondMatch.condition = condition;
      if (minPrice || maxPrice) {
        secondMatch.basePrice = {};
        if (minPrice) secondMatch.basePrice.$gte = parseFloat(minPrice);
        if (maxPrice) secondMatch.basePrice.$lte = parseFloat(maxPrice);
      }

      if (Object.keys(secondMatch).length > 0) {
        pipeline.push({ $match: secondMatch });
      }

      // Sort by relevance first
      const sortStage = { score: -1 };
      if (sortBy === 'price_asc' || sortBy === 'price-low') {
        sortStage.basePrice = 1;
      } else if (sortBy === 'price_desc' || sortBy === 'price-high') {
        sortStage.basePrice = -1;
      } else if (sortBy === 'newest') {
        sortStage.createdAt = -1;
      } else if (sortBy === 'oldest') {
        sortStage.createdAt = 1;
      } else if (sortBy === 'ending-soon') {
        sortStage.bidEndDate = 1;
      } else if (sortBy === 'most-bids') {
        sortStage.highestBidAmount = -1;
      }
      pipeline.push({ $sort: sortStage });

      // Pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });

      // Lookup seller info
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      });
      pipeline.push({ $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } });
      pipeline.push({
        $addFields: {
          'sellerId': {
            _id: '$seller._id',
            firstName: '$seller.firstName',
            lastName: '$seller.lastName',
            ratingAverage: '$seller.ratingAverage'
          }
        }
      });
      pipeline.push({ $project: { seller: 0 } });

      const products = await Product.aggregate(pipeline);

      // Count with same text search
      const countPipeline = [];
      countPipeline.push({ $match: firstMatch });
      if (Object.keys(secondMatch).length > 0) {
        countPipeline.push({ $match: secondMatch });
      }
      countPipeline.push({ $count: 'total' });
      const countResult = await Product.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      // Map _id to id for frontend compatibility
      const mappedProducts = products.map(p => ({
        ...p,
        id: p._id,
        price: p.basePrice || 0,
        currentBid: p.highestBidAmount || p.basePrice || 0,
        auctionEndTime: p.bidEndDate,
        images: p.images || [],
        bidCount: p.bidCount || 0,
        seller: p.sellerId
      }));

      return res.json({
        success: true,
        data: {
          data: mappedProducts,
          total,
          pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
          filters: { category, condition, minPrice, maxPrice, search, sortBy }
        }
      });
    }

    // Case 3: No text search and no geospatial (simple aggregation)
    const pipeline = [];

    const matchStage = { status };
    if (category) matchStage.category = category;
    if (condition) matchStage.condition = condition;
    if (minPrice || maxPrice) {
      matchStage.basePrice = {};
      if (minPrice) matchStage.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) matchStage.basePrice.$lte = parseFloat(maxPrice);
    }

    pipeline.push({ $match: matchStage });

    // Sort
    const sortStage = {};
    if (sortBy === 'price_asc' || sortBy === 'price-low') {
      sortStage.basePrice = 1;
    } else if (sortBy === 'price_desc' || sortBy === 'price-high') {
      sortStage.basePrice = -1;
    } else if (sortBy === 'newest') {
      sortStage.createdAt = -1;
    } else if (sortBy === 'oldest') {
      sortStage.createdAt = 1;
    } else if (sortBy === 'ending-soon') {
      sortStage.bidEndDate = 1;
    } else if (sortBy === 'most-bids') {
      sortStage.highestBidAmount = -1;
    } else {
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Lookup seller info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller'
      }
    });
    pipeline.push({ $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } });
    pipeline.push({
      $addFields: {
        'sellerId': {
          _id: '$seller._id',
          firstName: '$seller.firstName',
          lastName: '$seller.lastName',
          ratingAverage: '$seller.ratingAverage'
        }
      }
    });
    pipeline.push({ $project: { seller: 0 } });

    const products = await Product.aggregate(pipeline);

    // Count
    const countPipeline = [{ $match: matchStage }, { $count: 'total' }];
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Map _id to id for frontend compatibility
    const mappedProducts = products.map(p => ({
      ...p,
      id: p._id,
      price: p.basePrice || 0,
      currentBid: p.highestBidAmount || p.basePrice || 0,
      auctionEndTime: p.bidEndDate,
      images: p.images || [],
      bidCount: p.bidCount || 0,
      seller: p.sellerId
    }));

    res.json({
      success: true,
      data: {
        data: mappedProducts,
        total,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        filters: { category, condition, minPrice, maxPrice, search, sortBy }
      }
    });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get product by ID with view tracking
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('sellerId', 'firstName lastName ratingAverage');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Increment view count
    product.viewCount = (product.viewCount || 0) + 1;
    await product.save();

    // Emit Socket.IO event to seller about product view
    const notificationService = require('../utils/notificationService');
    notificationService.sendToUser(
      product.sellerId._id.toString(),
      'product:view',
      {
        productId: product._id,
        productTitle: product.title,
        viewCount: product.viewCount
      }
    );

    res.json(product);
  } catch (error) {
    logger.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update product (seller only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Only allow seller or admin to update
    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowed = ['title', 'description', 'category', 'basePrice', 'condition', 'geometry', 'location', 'images', 'status', 'aiQualityScore'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    updates.updatedAt = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(updatedProduct);
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete product (seller only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search products by geolocation
const searchNearby = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 50000 } = req.query; // maxDistance in meters

    // $geoNear requires coordinates as numbers
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const distanceMeters = parseInt(maxDistance);

    const products = await Product.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: distanceMeters,
          spherical: true,
          query: { status: 'active' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          sellerId: {
            _id: '$seller._id',
            firstName: '$seller.firstName',
            lastName: '$seller.lastName',
            ratingAverage: '$seller.ratingAverage'
          }
        }
      },
      { $project: { seller: 0 } }
    ]);

    res.json(products);
  } catch (error) {
    logger.error('Search nearby error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Get unique categories matching search (with limit)
    const categoryMatches = await Product.find({
      category: { $regex: q, $options: 'i' },
      status: 'active'
    })
      .distinct('category')
      .then(cats => cats.slice(0, 5));

    // Get unique titles matching search (with limit)
    const titleMatches = await Product.find({
      title: { $regex: q, $options: 'i' },
      status: 'active'
    })
      .distinct('title')
      .then(titles => titles.slice(0, 5));

    res.json({
      suggestions: [
        ...categoryMatches.map(cat => ({ type: 'category', value: cat })),
        ...titleMatches.map(title => ({ type: 'title', value: title }))
      ]
    });
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available categories and filters metadata
const getFilterMetadata = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: 'active' });
    const conditions = ['brand_new', 'like_new', 'excellent', 'good', 'fair'];

    // Get price range
    const priceStats = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$basePrice' },
          maxPrice: { $max: '$basePrice' },
          avgPrice: { $avg: '$basePrice' }
        }
      }
    ]);

    const priceRange = priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };

    res.json({
      categories,
      conditions,
      priceRange
    });
  } catch (error) {
    logger.error('Get filter metadata error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get featured products (random active products for now)
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get random products
    const products = await Product.aggregate([
      { $match: { status: 'active' } },
      { $sample: { size: limit } },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          'sellerId': {
            _id: '$seller._id',
            firstName: '$seller.firstName',
            lastName: '$seller.lastName',
            ratingAverage: '$seller.ratingAverage'
          }
        }
      },
      { $project: { seller: 0 } }
    ]);

    // Map fields for frontend
    const mappedProducts = products.map(p => ({
      id: p._id,
      title: p.title,
      currentBid: p.highestBidAmount || p.basePrice || 0,
      basePrice: p.basePrice,
      images: p.images || [],
      auctionEndTime: p.bidEndDate || new Date(Date.now() + 86400000).toISOString(), // Default 24h if missing
      seller: p.sellerId
    }));

    res.json(mappedProducts);
  } catch (error) {
    logger.error('Get featured products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchNearby,
  getSearchSuggestions,
  getFilterMetadata,
  getFeaturedProducts,
  analyzeProduct
};
