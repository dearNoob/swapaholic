const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter is required']
    },
    targetType: {
        type: String,
        required: [true, 'Target type is required'],
        enum: {
            values: ['product', 'user', 'review', 'content'],
            message: 'Target type must be product, user, review, or content'
        }
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Target ID is required'],
        // Dynamic ref depending on targetType (handled in population)
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        enum: {
            values: [
                'spam', 
                'harassment', 
                'inappropriate', 
                'fake', 
                'prohibited_item', 
                'other'
            ],
            message: 'Invalid report reason'
        }
    },
    details: {
        type: String,
        required: [true, 'Details are required'],
        trim: true,
        maxlength: [1000, 'Details cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'dismissed', 'action_taken', 'escalated'],
        default: 'pending'
    },
    adminNotes: {
        type: String,
        trim: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ status: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
