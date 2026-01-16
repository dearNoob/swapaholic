/**
 * Environment Variable Validation
 * Ensures all required environment variables are set for production readiness
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'NODE_ENV'
];

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
      warnings.push('FRONTEND_URL should be set in production');
    }

    if (process.env.JWT_SECRET === 'your-super-secure-jwt-secret-key-change-this-in-production-minimum-32-characters') {
      missing.push('JWT_SECRET must be changed from default value in production');
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('test')) {
      warnings.push('STRIPE_SECRET_KEY should be set to live key in production');
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
