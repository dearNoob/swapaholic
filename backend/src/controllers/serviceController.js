const Service = require('../models/Service');
const User = require('../models/User');
const Review = require('../models/Review');
const notificationService = require('../utils/notificationService');
const logger = require('../utils/logger');

// Get all services with filtering
exports.getAllServices = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      sortBy = '-createdAt',
      page = 1,
      limit = 20,
      search,
      minPrice,
      maxPrice,
      verified,
      featured,
      location,
      radius,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = Service.find().active().where('status', 'approved');

    // Search
    if (search) {
      query = query.where({
        $text: { $search: search },
      });
    }

    // Category filter
    if (category) {
      query = query.where('category', category);
    }

    if (subcategory) {
      query = query.where('subcategory', subcategory);
    }

    // Price range
    if (minPrice) {
      query = query.where('basePrice').gte(minPrice);
    }
    if (maxPrice) {
      query = query.where('basePrice').lte(maxPrice);
    }

    // Verification status
    if (verified === 'true') {
      query = query.where('verificationStatus', 'verified');
    }

    // Featured
    if (featured === 'true') {
      query = query.where('isFeatured', true);
    }

    // Location-based search
    if (location && radius) {
      const coords = location.split(',').map(Number);
      query = query.where('serviceLocation.coordinates').near({
        $geometry: {
          type: 'Point',
          coordinates: coords,
        },
        $maxDistance: parseInt(radius) * 1000, // Convert to meters
      });
    }

    // Count total
    const total = await Service.countDocuments(query);

    // Sort and paginate
    const services = await query
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum)
      .populate('providerId', 'name email profileImage rating')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        services,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message,
    });
  }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId)
      .active()
      .populate('providerId', 'name email profileImage rating reviews')
      .populate('savedBy', 'name');

    if (!service || service.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Increment views
    service.views += 1;
    await service.save();

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    logger.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service',
      error: error.message,
    });
  }
};

// Create service
exports.createService = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      basePrice,
      priceType,
      estimatedDuration,
      tags,
      availability,
      serviceLocation,
      certifications,
      qualifications,
      policies,
    } = req.body;

    // Get provider info
    const provider = await User.findById(req.user.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    const service = new Service({
      title,
      description,
      category,
      subcategory,
      basePrice,
      priceType,
      estimatedDuration,
      tags,
      availability,
      serviceLocation,
      certifications,
      qualifications,
      policies,
      providerId: req.user.id,
      providerName: provider.name,
      providerRating: provider.rating || 0,
      status: 'pending', // Requires admin approval
      verificationStatus: 'pending',
    });

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      service.serviceImages = req.files.map((file) => ({
        url: file.path,
        uploadedAt: new Date(),
      }));
    }

    await service.save();

    // Notify admins
    notificationService.notifyAdmins('NEW_SERVICE_SUBMISSION', {
      serviceId: service._id,
      serviceTitle: service.title,
      providerName: provider.name,
      message: `New service submitted: ${service.title}`,
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service',
      error: error.message,
    });
  }
};

// Update service
exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updateData = req.body;

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check authorization
    if (service.providerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service',
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title',
      'description',
      'subcategory',
      'basePrice',
      'priceType',
      'estimatedDuration',
      'tags',
      'availability',
      'serviceLocation',
      'certifications',
      'qualifications',
      'policies',
    ];

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        service[key] = updateData[key];
      }
    });

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      service.serviceImages = [
        ...service.serviceImages,
        ...req.files.map((file) => ({
          url: file.path,
          uploadedAt: new Date(),
        })),
      ];
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  } catch (error) {
    logger.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service',
      error: error.message,
    });
  }
};

// Delete service (soft delete)
exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check authorization
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this service',
      });
    }

    await service.softDelete();

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service',
      error: error.message,
    });
  }
};

// Get services by provider
exports.getProviderServices = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = Service.find({ providerId }).active();

    if (status) {
      query = query.where('status', status);
    }

    const total = await Service.countDocuments(query);

    const services = await query
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('providerId', 'name email rating');

    res.status(200).json({
      success: true,
      data: {
        services,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching provider services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching provider services',
      error: error.message,
    });
  }
};

// Search services
exports.searchServices = async (req, res) => {
  try {
    const { q, category, sortBy = 'relevance', limit = 20 } = req.query;

    let query = Service.find().active().where('status', 'approved');

    if (q) {
      query = query.where({
        $text: { $search: q },
      });
    }

    if (category) {
      query = query.where('category', category);
    }

    const services = await query.limit(parseInt(limit)).sort(sortBy).lean();

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    logger.error('Error searching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching services',
      error: error.message,
    });
  }
};

// Get featured services
exports.getFeaturedServices = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const services = await Service.find()
      .active()
      .where('status', 'approved')
      .where('isFeatured', true)
      .where('featuredUntil').gt(new Date())
      .sort('-createdAt')
      .limit(parseInt(limit))
      .populate('providerId', 'name email profileImage rating');

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    logger.error('Error fetching featured services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured services',
      error: error.message,
    });
  }
};

// Save/unsave service
exports.toggleServiceSave = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await service.toggleLike(req.user.id);

    // Update user's saved services
    if (!user.savedServices) {
      user.savedServices = [];
    }

    const index = user.savedServices.indexOf(serviceId);
    if (index > -1) {
      user.savedServices.splice(index, 1);
    } else {
      user.savedServices.push(serviceId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Service save status updated',
      data: {
        isSaved: !user.savedServices.includes(serviceId),
      },
    });
  } catch (error) {
    logger.error('Error toggling service save:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling service save',
      error: error.message,
    });
  }
};

// Get saved services
exports.getSavedServices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const total = user.savedServices ? user.savedServices.length : 0;

    const services = await Service.find({
      _id: { $in: user.savedServices || [] },
    })
      .active()
      .skip(skip)
      .limit(limitNum)
      .populate('providerId', 'name email rating');

    res.status(200).json({
      success: true,
      data: {
        services,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching saved services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved services',
      error: error.message,
    });
  }
};

// Get service categories
exports.getServiceCategories = async (req, res) => {
  try {
    const categories = [
      'Repair & Maintenance',
      'Cleaning',
      'Delivery & Moving',
      'Home Services',
      'Personal Services',
      'Tech Support',
      'Consulting',
      'Tutoring',
      'Photography',
      'Event Services',
      'Landscaping',
      'Other',
    ];

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};

// Admin: Approve service
exports.approveService = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const { serviceId } = req.params;
    const { notes } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    service.status = 'approved';
    service.verificationStatus = 'verified';
    service.verificationNotes = notes;
    await service.save();

    // Notify provider
    notificationService.notifyUser(service.providerId, 'SERVICE_APPROVED', {
      serviceId: service._id,
      serviceTitle: service.title,
      message: `Your service "${service.title}" has been approved!`,
    });

    res.status(200).json({
      success: true,
      message: 'Service approved',
      data: service,
    });
  } catch (error) {
    logger.error('Error approving service:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving service',
      error: error.message,
    });
  }
};

// Admin: Reject service
exports.rejectService = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const { serviceId } = req.params;
    const { reason } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    service.status = 'rejected';
    service.verificationStatus = 'unverified';
    service.verificationNotes = reason;
    await service.save();

    // Notify provider
    notificationService.notifyUser(service.providerId, 'SERVICE_REJECTED', {
      serviceId: service._id,
      serviceTitle: service.title,
      reason,
      message: `Your service "${service.title}" has been rejected. Reason: ${reason}`,
    });

    res.status(200).json({
      success: true,
      message: 'Service rejected',
      data: service,
    });
  } catch (error) {
    logger.error('Error rejecting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting service',
      error: error.message,
    });
  }
};
