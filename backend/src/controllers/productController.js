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
    const { title, category, condition, language = 'English' } = req.body;
    const files = req.files;

    // Map frontend condition values to schema enum values
    const conditionMap = {
      'new': 'brand_new',
      'like-new': 'like_new',
      'excellent': 'excellent',
      'good': 'good',
      'fair': 'fair',
      'brand_new': 'brand_new',
      'like_new': 'like_new'
    };
    const mappedCondition = conditionMap[condition] || condition;

    let imageBase64 = null;
    if (files && files.length > 0) {
      imageBase64 = files[0].buffer.toString('base64');
    }

    let aiDescription = "High quality product looking for a new home.";
    let aiQualityScore = 85;
    let aiSuggestedPrice = 0;

    try {
      if (imageBase64) {
        const prompt = `Analyze this product image in detail and provide a COMPREHENSIVE, professional e-commerce listing for a platform called Swapaholic. 
        Product Context - Title: ${title}, Category: ${category}, Condition: ${mappedCondition}. 
        
        STRICT REQUIREMENTS:
        1. DESCRIPTION LENGTH: Your generated description MUST be between 150 and 300 words. Do not provide a short summary.
        2. FORMATTING: Use a professional introduction paragraph (3-4 sentences), followed by an EXTENSIVE BULLETED LIST of features, materials, specifications, and layout details.
        3. CONTENT: 
           - Identify specific features, brand markings, and textures visible in the image.
           - Detect any visible wear, scratches, or defects to justify the condition.
           - Describe potential usage scenarios or styling tips to make it attractive to buyers.
        4. LANGUAGE: Generate the text entirely in ${language}.
        
        TASKS:
        - Provide the detailed description in the required format.
        - Provide a quality score (0-100) based on visible condition.
        - Suggest a fair resale price in USD.
        
        Format your response ONLY as this JSON structure: 
        { 
          "description": "[Paragraph overview here]\n\n• Feature 1: [Detail]\n• Feature 2: [Detail]\n• Material: [Detail]\n• Condition Note: [Detail]...", 
          "score": 85, 
          "price": 100 
        }`;

        
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType: files[0].mimetype
            }
          }
        ]);
        
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const aiData = JSON.parse(cleanedText);
        
        aiDescription = aiData.description || aiDescription;
        aiQualityScore = aiData.score || aiQualityScore;
        aiSuggestedPrice = aiData.price || aiSuggestedPrice;
      }
    } catch (aiError) {
      logger.error('AI Analysis Error:', aiError);
    }

    res.json({
      success: true,
      description: aiDescription,
      qualityScore: aiQualityScore,
      suggestedPrice: aiSuggestedPrice
    });
  } catch (error) {
    logger.error('Analyze product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Regenerate description based on current details
const regenerateDescription = async (req, res) => {
  try {
    const { title, category, condition, description, language = 'English' } = req.body;
    
    
    const prompt = `Rewrite this product description in ${language} to be highly professional, persuasive, and detailed for an e-commerce marketplace. 
    Current Title: ${title}
    Category: ${category}
    Condition: ${condition}
    Current Description: ${description}
    
    STRICT REQUIREMENTS:
    1. EXPANSION: The new description MUST be between 150 and 300 words. Expand on the original details significantly.
    2. FORMATTING: Use a professional opening paragraph followed by an extensive bulleted list of features and benefits.
    3. TONE: Persuasive, professional, and descriptive.
    
    Provide ONLY the rewritten description text without any extra chat, labels, or JSON wrappers.`;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiDescription = response.text();

    res.json({
      success: true,
      description: aiDescription
    });
  } catch (error) {
    logger.error('Regenerate description error:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
      return res.status(400).json({ 
        message: 'Missing required fields', 
        details: { 
          title: !!title, 
          description: !!description, 
          category: !!category, 
          basePrice: !!basePrice, 
          condition: !!condition 
        } 
      });
    }

    // Map frontend condition values to schema enum values
    const conditionMap = {
      'new': 'brand_new',
      'like-new': 'like_new',
      'excellent': 'excellent',
      'good': 'good',
      'fair': 'fair',
      'brand_new': 'brand_new',
      'like_new': 'like_new'
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

    // Also handle pre-existing image URLs from body
    if (req.body.images) {
      const bodyImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      if (Array.isArray(bodyImages)) {
        imageUrls = [...imageUrls, ...bodyImages];
      }
    }

    // Strict 4-image rule enforcement
    if (imageUrls.length < 4) {
      return res.status(400).json({
        message: 'Validation failed: You must upload at least 4 images to list a product.',
        details: { count: imageUrls.length }
      });
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

    // Notifications
    setImmediate(async () => {
      try {
        const User = require('../models/User');
        const notificationService = require('../utils/notificationService');
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
        logger.error('Error sending notifications:', notifError);
      }
    });

  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

// Get all products with advanced filters and pagination
const getProducts = async (req, res) => {
  try {
    const {
      category,
      condition,
      status: reqStatus,
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

    // Default status: show active and bidden products
    let statusFilter;
    if (reqStatus && reqStatus !== 'all') {
      statusFilter = reqStatus;
    } else {
      statusFilter = { $in: ['active', 'bidden'] };
    }

    // Base match stage
    const matchStage = { status: statusFilter };
    
    // Case-insensitive category match
    if (category && category !== 'all') {
      matchStage.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    
    if (condition) matchStage.condition = condition;
    
    if (minPrice || maxPrice) {
      matchStage.basePrice = {};
      if (minPrice) matchStage.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) matchStage.basePrice.$lte = parseFloat(maxPrice);
    }

    let pipeline = [];
    let countMatchStage = { ...matchStage };

    // Case 1: Geospatial search
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseFloat(radius) * 1000;

      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: radiusMeters,
          spherical: true,
          query: matchStage
        }
      });
      countMatchStage = null; 
    } else if (search) {
      // Case 2: Text search
      pipeline.push({ $match: { ...matchStage, $text: { $search: search } } });
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
      countMatchStage = { ...matchStage, $text: { $search: search } };
    } else {
      // Case 3: Standard match
      pipeline.push({ $match: matchStage });
    }

    // Sorting
    const sortStage = {};
    if (search && !lat) {
      sortStage.score = -1;
    }
    
    if (sortBy === 'price_asc' || sortBy === 'price-low') {
      sortStage.basePrice = 1;
    } else if (sortBy === 'price_desc' || sortBy === 'price-high') {
      sortStage.basePrice = -1;
    } else if (sortBy === 'newest') {
      sortStage.createdAt = -1;
    } else if (sortBy === 'ending-soon') {
      sortStage.bidEndDate = 1;
    } else if (sortBy === 'most-bids') {
      sortStage.highestBidAmount = -1;
    } else if (!sortStage.score) {
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Lookups
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
    let total = 0;
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseFloat(radius) * 1000;
      const countResult = await Product.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: radiusMeters,
            spherical: true,
            query: matchStage
          }
        },
        { $count: 'total' }
      ]);
      total = countResult[0]?.total || 0;
    } else {
      total = await Product.countDocuments(countMatchStage);
    }

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
        pagination: { 
          page: pageNum, 
          limit: limitNum, 
          total, 
          totalPages: Math.ceil(total / limitNum) 
        },
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
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    const product = await Product.findById(req.params.id)
      .populate('sellerId', 'firstName lastName ratingAverage createdAt totalTransactions profilePicture');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Increment view count
    product.viewCount = (product.viewCount || 0) + 1;
    await product.save();

    // Socket.IO notification to seller
    try {
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
    } catch (notifErr) {
      logger.error('Error sending view notification:', notifErr);
    }

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

    let updates = req.body;

    // Map frontend condition values to schema enum values
    const conditionMap = {
      'new': 'brand_new',
      'like-new': 'like_new',
      'excellent': 'excellent',
      'good': 'good',
      'fair': 'fair',
      'brand_new': 'brand_new',
      'like_new': 'like_new'
    };

    if (updates.condition) {
      updates.condition = conditionMap[updates.condition] || updates.condition;
    }
    
    // Logic for images: handle new uploads and removals
    let finalImages = product.images || [];
    
    // If frontend sends remainingImages, use that
    if (req.body.remainingImages || req.body.existingImages) {
      const existingImgs = req.body.remainingImages || req.body.existingImages;
      finalImages = typeof existingImgs === 'string' ? JSON.parse(existingImgs) : existingImgs;
    }

    // Handle new uploads
    if (req.files && req.files.length > 0) {
      const newImageUrls = await storageService.uploadFiles(req.files, {
        folder: 'products'
      });
      finalImages = [...finalImages, ...newImageUrls];
    }

    // Strict 4-image rule enforcement
    if (finalImages.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: A product must have at least 4 images. You currently have ' + finalImages.length + '.',
        details: { count: finalImages.length }
      });
    }

    updates.images = finalImages;
    updates.updatedAt = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, { 
      new: true,
      runValidators: true 
    });


    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    logger.error('Update product error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Update validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete product (seller only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Attempting to delete product ${id} by user ${req.user.id}`);
    
    const product = await Product.findById(id);
    if (!product) {
      logger.warn(`Delete failed: Product ${id} not found.`);
      return res.status(404).json({ message: 'Product not found' });
    }

    // Ownership check
    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`Unauthorized delete attempt on product ${id} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied: You do not own this product' });
    }

    // Prevent deletion if product is sold or has bidden status (optional security)
    if (product.status === 'sold') {
      logger.warn(`Delete blocked: Product ${id} is already sold.`);
      return res.status(400).json({ message: 'Sold products cannot be deleted' });
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      logger.error(`Failed to delete product ${id} from database.`);
      return res.status(500).json({ message: 'Failed to delete product' });
    }

    logger.info(`Successfully deleted product ${id}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Search products by geolocation
const searchNearby = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 50000 } = req.query;
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
          query: { status: { $in: ['active', 'bidden'] } }
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
    if (!q || q.length < 2) return res.json({ suggestions: [] });

    const categoryMatches = await Product.find({
      category: { $regex: q, $options: 'i' },
      status: { $in: ['active', 'bidden'] }
    })
      .distinct('category')
      .then(cats => cats.slice(0, 5));

    const titleMatches = await Product.find({
      title: { $regex: q, $options: 'i' },
      status: { $in: ['active', 'bidden'] }
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

// Get filter metadata
const getFilterMetadata = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: { $in: ['active', 'bidden'] } });
    const conditions = ['brand_new', 'like_new', 'excellent', 'good', 'fair'];
    const priceStats = await Product.aggregate([
      { $match: { status: { $in: ['active', 'bidden'] } } },
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
    res.json({ categories, conditions, priceRange });
  } catch (error) {
    logger.error('Get filter metadata error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.aggregate([
      { $match: { status: { $in: ['active', 'bidden'] } } },
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
    res.json(products.map(p => ({
      ...p,
      id: p._id,
      currentBid: p.highestBidAmount || p.basePrice || 0,
      images: p.images || [],
      auctionEndTime: p.bidEndDate || new Date(Date.now() + 86400000).toISOString(),
      seller: p.sellerId
    })));
  } catch (error) {
    logger.error('Get featured products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin actions
const approveProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'qc_rejected' }, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
    const urls = await storageService.uploadFiles(req.files, { folder: 'products' });
    res.json({ success: true, urls });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSimilarProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const similar = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: { $in: ['active', 'bidden'] }
    })
    .limit(4)
    .populate('sellerId', 'firstName lastName ratingAverage');
    res.json({ success: true, data: similar.map(p => ({ ...p.toObject(), id: p._id })) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const incrementViewCount = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true });
    res.json({ success: true, viewCount: product.viewCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: { $in: ['active', 'bidden'] } });
    res.json({ success: true, data: categories });
  } catch (error) {
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
