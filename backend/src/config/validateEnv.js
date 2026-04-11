/**
 * Environment Variable Validation
 * Ensures all required environment variables are set for production readiness
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'NODE_ENV'
];

const DEFAULT_JWT_SECRET = 'your-super-secure-jwt-secret-key-change-this-in-production-minimum-32-characters';
const LOCAL_STORAGE_PROVIDER = 'local';
const CLOUDINARY_STORAGE_PROVIDER = 'cloudinary';

const isHttpsUrl = (value) => {
  if (!value) return false;

  try {
    return new URL(value).protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const validateEnvironment = () => {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Security checks
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long');
  }

  if (process.env.NODE_ENV === 'production') {
    // Additional production checks
    if (!process.env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL should be set in production for CORS, emails, and payment redirects');
    } else if (!isHttpsUrl(process.env.FRONTEND_URL)) {
      warnings.push('FRONTEND_URL should use https in production');
    }

    if (process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
      missing.push('JWT_SECRET must be changed from default value in production');
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      warnings.push('JWT_REFRESH_SECRET should be set separately in production');
    } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
      warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long');
    }

    const corsOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);
    if (corsOrigins.some((origin) => !isHttpsUrl(origin))) {
      warnings.push('CORS_ALLOWED_ORIGINS should only contain https origins in production');
    }

    if (corsOrigins.some((origin) => /localhost|127\.0\.0\.1/i.test(origin))) {
      warnings.push('CORS_ALLOWED_ORIGINS should not include localhost entries in production');
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('test')) {
      warnings.push('STRIPE_SECRET_KEY should be set to live key in production');
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      warnings.push('SMTP_USER and SMTP_PASS should be set in production to send OTP and transactional emails');
    }

    const storageProvider = (process.env.FILE_STORAGE_PROVIDER || LOCAL_STORAGE_PROVIDER).toLowerCase();
    if (storageProvider === LOCAL_STORAGE_PROVIDER) {
      warnings.push('FILE_STORAGE_PROVIDER is set to local in production; use durable object storage for uploaded media');
    }

    if (storageProvider === CLOUDINARY_STORAGE_PROVIDER) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        warnings.push('Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
      }
    }
  }

  // Report issues
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(variable => console.error(`   - ${variable}`));
    console.error('\nPlease check your .env file or environment configuration.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  console.log('✅ Environment validation passed');
};

module.exports = { validateEnvironment };
