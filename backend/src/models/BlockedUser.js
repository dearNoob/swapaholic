const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
    blocker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    blocked: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

blockedUserSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockedUserSchema.index({ blocker: 1 });

module.exports = mongoose.model('BlockedUser', blockedUserSchema);
