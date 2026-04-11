const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

const LOCAL_PROVIDER = 'local';
const CLOUDINARY_PROVIDER = 'cloudinary';
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const sanitizeFolder = (folder) => String(folder || 'misc').replace(/[^a-zA-Z0-9/_-]/g, '');

const generateFilename = (originalname) => {
  const extension = path.extname(originalname || '') || '.bin';
  return `${Date.now()}-${crypto.randomUUID()}${extension.toLowerCase()}`;
};

const ensureDirectory = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const getProvider = () => (process.env.FILE_STORAGE_PROVIDER || LOCAL_PROVIDER).toLowerCase();

const getCloudinaryConfig = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET
});

const getContentType = (file) => file.mimetype || 'application/octet-stream';

const toDataUri = (file) => {
  const base64 = file.buffer.toString('base64');
  return `data:${getContentType(file)};base64,${base64}`;
};

const uploadToLocal = async (file, options = {}) => {
  const folder = sanitizeFolder(options.folder);
  const fileName = generateFilename(file.originalname);
  const folderPath = path.join(LOCAL_UPLOAD_ROOT, folder);
  const absolutePath = path.join(folderPath, fileName);

  ensureDirectory(folderPath);
  await fs.promises.writeFile(absolutePath, file.buffer);

  return `/uploads/${folder}/${fileName}`;
};

const uploadToCloudinary = async (file, options = {}) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary storage is enabled but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing');
  }

  const folder = sanitizeFolder(options.folder);
  const publicId = path.basename(generateFilename(file.originalname), path.extname(file.originalname || ''));
  const resourceType = options.resourceType || 'auto';
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const formBody = new URLSearchParams({
    file: toDataUri(file),
    folder: `swapaholic/${folder}`,
    public_id: publicId,
    use_filename: 'false',
    unique_filename: 'false',
    overwrite: 'false'
  });

  const response = await axios.post(endpoint, formBody, {
    auth: {
      username: apiKey,
      password: apiSecret
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000
  });

  return response.data.secure_url || response.data.url;
};

const uploadSingleFile = async (file, options = {}) => {
  const provider = getProvider();

  if (!file || !file.buffer) {
    throw new Error('uploadSingleFile requires a multer memory file with a buffer');
  }

  if (provider === CLOUDINARY_PROVIDER) {
    return uploadToCloudinary(file, options);
  }

  return uploadToLocal(file, options);
};

const uploadFiles = async (files, options = {}) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  try {
    return await Promise.all(files.map((file) => uploadSingleFile(file, options)));
  } catch (error) {
    logger.error('Storage upload error:', error);
    throw error;
  }
};

module.exports = {
  LOCAL_PROVIDER,
  CLOUDINARY_PROVIDER,
  getProvider,
  uploadSingleFile,
  uploadFiles
};
