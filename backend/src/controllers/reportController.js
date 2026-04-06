const Report = require('../models/Report');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Create a new report
 * @route   POST /api/reports/:type
 * @access  Private
 */
exports.createReport = async (req, res, next) => {
    try {
        const { type } = req.params;
        const { targetId, reason, details } = req.body;

        const report = await Report.create({
            reporter: req.user.id,
            targetType: type,
            targetId,
            reason,
            details,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            status: 'success',
            data: {
                report
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all reports (Admin)
 * @route   GET /api/admin/reports
 * @access  Private/Admin
 */
exports.getAllReports = async (req, res, next) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (type) query.targetType = type;

        const skip = (page - 1) * limit;

        const reports = await Report.find(query)
            .populate('reporter', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Report.countDocuments(query);

        res.status(200).json({
            success: true,
            count: reports.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: {
                reports
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get report details (Admin)
 * @route   GET /api/admin/reports/:reportId
 * @access  Private/Admin
 */
exports.getReportDetails = async (req, res, next) => {
    try {
        const report = await Report.findById(req.params.reportId)
            .populate('reporter', 'firstName lastName email')
            .populate('resolvedBy', 'firstName lastName');

        if (!report) {
            return next(new AppError('No report found with that ID', 404));
        }

        res.status(200).json({
            success: true,
            data: {
                report
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update report status (Admin)
 * @route   PUT /api/admin/reports/:reportId/review
 * @access  Private/Admin
 */
exports.reviewReport = async (req, res, next) => {
    try {
        const { action, notes } = req.body;
        
        let status = 'pending';
        if (action === 'dismiss') status = 'dismissed';
        if (action === 'action_taken') status = 'action_taken';
        if (action === 'escalate') status = 'escalated';

        const report = await Report.findByIdAndUpdate(
            req.params.reportId,
            {
                status,
                adminNotes: notes,
                resolvedBy: req.user.id,
                resolvedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!report) {
            return next(new AppError('No report found with that ID', 404));
        }

        res.status(200).json({
            success: true,
            data: {
                report
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get valid reporting reasons
 * @route   GET /api/reports/reasons/:type
 * @access  Public
 */
exports.getReportReasons = async (req, res, next) => {
    // Return the enum values from the schema
    const reasons = Report.schema.path('reason').options.enum.values;
    res.status(200).json({
        success: true,
        data: {
            reasons
        }
    });
};
