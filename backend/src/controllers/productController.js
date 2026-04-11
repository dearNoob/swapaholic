const { HfInference } = require("@huggingface/inference");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require('../models/Product');
const logger = require('../utils/logger');
const path = require('path');
const storageService = require('../services/storageService');

// Initialize AI clients
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// Analyze product images and generate description (Seller only)
const analyzeProduct = async (req, res) => {
  try {
    const { title, category, condition } = req.body;
    const files = req.files;

    let imageBase64 = null;
    let mimeType = null;

    if (files && files.length > 0) {
      // Convert first image to base64 for Hugging Face
      imageBase64 = files[0].buffer.toString("base64");
      mimeType = files[0].mimetype;
    }

    const promptText = `
      You are an expert product copywriter for Swapaholic, a second-hand P2P marketplace. 
      Generate a compelling and detailed product description for a listing.
      
      Product Details:
      - Title: ${title}
      - Category: ${category}
      - Condition: ${condition}
      ${imageBase64 ? '- Vision: Please analyze the provided image to infer quality and features.' : '- Note: No image provided. Base your analysis strictly on the title and category.'}
      
      Key Requirements:
      1. Generate a professional, persuasive description.
      2. If it is an electronics item, infer specifications typical for the model.
      3. Calculate a "Quality Score" (0-100) based on the condition (New=100, Like New=90, Good=75, Fair=60, Poor=40).
      
      You MUST output ONLY a valid JSON object. Do not include any conversational text.
      Format:
      {
        "description": "...",
        "score": 85,
        "detectedLabels": ["label1", "label2"]
      }
    `;

    try {
        let textResponse = '';
        let usedProvider = 'gemini';

        try {
            // First attempt: Gemini 1.5 Flash
            if (imageBase64) {
                const result = await model.generateContent([
                    promptText,
                    {
                        inlineData: {
                            data: imageBase64,
                            mimeType: mimeType
                        }
                    }
                ]);
                const response = await result.response;
                textResponse = response.text();
            } else {
                const result = await model.generateContent(promptText);
                const response = await result.response;
                textResponse = response.text();
            }
        } catch (geminiError) {
            logger.warn('Gemini API failed, falling back to Hugging Face:', geminiError.message);
            // Fallback to Hugging Face Qwen 2.5
            usedProvider = 'huggingface';
            const { HfInference } = require("@huggingface/inference");
            const hfFallback = new HfInference(process.env.HUGGINGFACE_API_KEY);
            
            const messages = [
            {
                role: "user",
                content: imageBase64
                ? [
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                    { type: "text", text: promptText + "\n\nCRITICAL: Respond ONLY in valid English JSON." }
                ]
                : [{ type: "text", text: promptText + "\n\nCRITICAL: Respond ONLY in valid English JSON." }]
            }
            ];

            const result = await hfFallback.chatCompletion({
                model: "Qwen/Qwen2.5-7B-Instruct",
                messages: messages,
                max_tokens: 1500,
                temperature: 0.5,
            });

            textResponse = result.choices[0].message.content;
        }

        console.log(`--- RAW AI RESPONSE (${usedProvider}) ---`);
        console.log(textResponse);
        console.log('-----------------------');

        // Robust JSON extraction: Find the first { and the last }
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(`AI did not return valid JSON format. Response: ${textResponse.substring(0, 50)}...`);
        }

        const cleanJson = jsonMatch[0];
        const content = JSON.parse(cleanJson);

        res.json({
            description: content.description || 'No description generated.',
            score: content.score || 0,
            detectedLabels: content.detectedLabels || []
        });

    } catch (aiError) {
        logger.error('API or Parsing error:', aiError);
        throw aiError; // Handled by the outer catch
    }

  } catch (error) {
    logger.error('Analyze product error:', error);
    console.error('Full Analyze Error:', error);

    let errorMessage = 'Failed to analyze product. Please try again.';
    if (error.message && error.message.includes('API key was reported as leaked')) {
        errorMessage = 'Both AI providers failed. Your Gemini API key is leaked, and Hugging Face fallback failed.';
    }

    res.status(500).json({
      message: errorMessage,
      error: error.message || 'Unknown error'
    });
  }
};

// Regenerate description (Alias for part of analyze logic)
const regenerateDescription = async (req, res) => {
    // For now, we reuse the analyze logic but specifically for text regeneration
    // In a real app, this might avoid image re-processing if not needed
    return analyzeProduct(req, res);
};


// Create product (seller only)
const createProduct = async (req, res) => {
  try {
    let { title, description, category, basePrice, price, condition, geometry, location, aiQualityScore, aiSuggestedPrice } = req.body;

    // Handle mismatched field name from frontend
    if (!basePrice && price) {
      basePrice = price;
    }

    // Parse basePrice as number (FormData sends strings)
    basePrice = parseFloat(basePrice);

    if (!title || !description || !category || !basePrice || !condition) {
      return res.status(400).json({ message: 'Missing required fields', details: { title: !!title, description: !!description, category: !!category, basePrice: !!basePrice, condition: !!condition } });
    }

    // Map frontend condition values to schema enum values
    const conditionMap = {
      'new': 'brand_new',
      'like-new': 'like_new',
      'excellent': 'excellent',
      'good': 'good',
      'fair': 'fair',
      // Also accept schema values directly
      'brand_new': 'brand_new',
      'like_new': 'like_new',
    };
    const mappedCondition = conditionMap[condition] || condition;

    // Handle uploaded images through the configured storage provider
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await storageService.uploadFiles(req.files, {
        folder: 'products',
        resourceType: 'image'
      });
    }

    // Also handle pre-existing image URLs from body (for updates)
    if (req.body.images) {
      const bodyImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      if (Array.isArray(bodyImages)) {
        imageUrls = [...imageUrls, ...bodyImages];
      }
    }

    const product = new Product({
      sellerId: req.user.id,
      title,
      description,
      category,
      basePrice,
      condition: mappedCondition,
      geometry: typeof geometry === 'string' ? JSON.parse(geometry) : (geometry || { type: 'Point', coordinates: [0, 0] }),
      location,
      images: imageUrls,
      status: 'active',
      bidStartDate: new Date(),
      aiQualityScore: parseFloat(aiQualityScore) || 0,
      aiSuggestedPrice: aiSuggestedPrice ? parseFloat(aiSuggestedPrice) : undefined
    });

    await product.save();
    res.status(201).json(product);

    // After responding, process notifications asynchronously
    setImmediate(async () => {
      try {
        const User = require('../models/User');
        const notificationService = require('../utils/notificationService');
        
        // Use words > 2 chars to avoid matching 'and', 'the', etc.
        const titleWords = title.split(/\s+/).filter(w => w.length > 2).map(w => new RegExp(w, 'i'));
        
        const matchCondition = {
          $or: [
            { interests: { $regex: new RegExp(category, 'i') } },
            ...titleWords.map(word => ({ interests: { $regex: word } }))
          ],
          _id: { $ne: req.user.id }
        };
        
        const interestedUsers = await User.find(matchCondition).select('_id');
        const userIds = interestedUsers.map(u => u._id.toString());
        
        if (userIds.length > 0) {
          await notificationService.notifyNewProductMatch(userIds, title, product._id, category);
        }
      } catch (notifError) {
        logger.error('Error sending new product match notifications:', notifError);
      }
    });

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
      .populate('sellerId', 'firstName lastName ratingAverage createdAt totalTransactions profilePicture');

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

    res.json({
      status: 'success',
      data: product
    });
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

    const allowed = ['title', 'description', 'category', 'basePrice', 'condition', 'geometry', 'location', 'status', 'aiQualityScore', 'aiSuggestedPrice'];
    const updates = {};
    
    // Map price to basePrice if frontend sent price
    if (req.body.price && !req.body.basePrice) {
        req.body.basePrice = req.body.price;
    }

    // Map geometry
    if (req.body.geometry) {
        updates.geometry = typeof req.body.geometry === 'string' 
            ? JSON.parse(req.body.geometry) 
            : req.body.geometry;
    }

    allowed.forEach(field => {
      if (req.body[field] !== undefined && field !== 'geometry') {
          updates[field] = req.body[field];
      }
    });

    // Handle new images through the configured storage provider
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = await storageService.uploadFiles(req.files, {
        folder: 'products',
        resourceType: 'image'
      });
    }

    // Handle existing images
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = typeof req.body.existingImages === 'string' 
        ? JSON.parse(req.body.existingImages) 
        : req.body.existingImages;
    }

    // Only update images if there are new ones or if the existing images were explicitly provided
    if (newImageUrls.length > 0 || req.body.existingImages) {
        updates.images = [...existingImages, ...newImageUrls];
    }

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

// Admin: Approve a pending product
const approveProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { status: 'active' },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product approved successfully', product });
  } catch (error) {
    logger.error('Approve product error:', error);
    res.status(500).json({ message: 'Failed to approve product' });
  }
};

// Admin: Reject a pending product
const rejectProduct = async (req, res) => {
  try {
    const { reason } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { status: 'rejected', rejectionReason: reason || 'Violation of terms' },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product rejected successfully', product });
  } catch (error) {
    logger.error('Reject product error:', error);
    res.status(500).json({ message: 'Failed to reject product' });
  }
};

// Upload additional images to existing product
const uploadImages = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const newImageUrls = await storageService.uploadFiles(req.files, {
      folder: 'products',
      resourceType: 'image'
    });

    product.images = [...(product.images || []), ...newImageUrls];
    await product.save();

    res.json({ success: true, images: product.images });
  } catch (error) {
    logger.error('Upload product images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get products by a specific seller
const getSellerProducts = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { sellerId, status: 'active' };
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        data: products.map(p => ({ ...p.toObject(), id: p._id })),
        total,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      }
    });
  } catch (error) {
    logger.error('Get seller products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get similar products (same category, different ID)
const getSimilarProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const similar = await Product.find({
      category: product.category,
      _id: { $ne: id },
      status: 'active'
    })
    .limit(limit)
    .populate('sellerId', 'firstName lastName ratingAverage');

    res.json({
        success: true,
        data: similar.map(p => ({ ...p.toObject(), id: p._id }))
    });
  } catch (error) {
    logger.error('Get similar products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Discrete route to increment view count
const incrementViewCount = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, viewCount: product.viewCount });
  } catch (error) {
    logger.error('Increment view count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Simple categories list
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: 'active' });
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Get categories error:', error);
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
  analyzeProduct,
  regenerateDescription,
  approveProduct,
  rejectProduct,
  uploadImages,
  getSellerProducts,
  getSimilarProducts,
  incrementViewCount,
  getCategories
};
