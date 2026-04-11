const multer = require('multer');

const createUpload = ({
    allowedMimeTypes,
    allowedMimePrefixes,
    errorMessage = 'Invalid file type',
    maxFileSize = 10 * 1024 * 1024,
    maxFiles = 5
} = {}) => {
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
        const matchesExplicitType = Array.isArray(allowedMimeTypes) && allowedMimeTypes.includes(file.mimetype);
        const matchesPrefix = Array.isArray(allowedMimePrefixes) && allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix));

        if (matchesExplicitType || matchesPrefix) {
            cb(null, true);
        } else {
            cb(new Error(errorMessage), false);
        }
    };

    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: maxFileSize,
            files: maxFiles
        }
    });
};

const imageUpload = createUpload({
    allowedMimePrefixes: ['image/'],
    errorMessage: 'Not an image! Please upload only images.'
});

module.exports = imageUpload;
module.exports.createUpload = createUpload;
