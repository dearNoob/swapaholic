const Content = require('../models/Content');
const logger = require('../utils/logger'); // Assuming logger exists, or use console

exports.getContent = async (req, res) => {
    try {
        const { type } = req.params;
        let content = await Content.findOne({ type });

        if (!content) {
            // Return default/empty content if not found
            return res.json({
                type,
                title: type.charAt(0).toUpperCase() + type.slice(1),
                body: ''
            });
        }

        res.json(content);
    } catch (error) {
        console.error('Get content error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateContent = async (req, res) => {
    try {
        const { type } = req.params;
        const { title, body } = req.body;

        let content = await Content.findOne({ type });

        if (content) {
            content.title = title;
            content.body = body;
            content.lastUpdated = Date.now();
            content.updatedBy = req.user._id;
            await content.save();
        } else {
            content = await Content.create({
                type,
                title,
                body,
                updatedBy: req.user._id
            });
        }

        res.json(content);
    } catch (error) {
        console.error('Update content error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
