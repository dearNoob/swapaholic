const fs = require('fs');
const { stateFile } = require('./jest.mongoState');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-123456789012345678901234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-12345678901234567890';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.SMTP_USER = process.env.SMTP_USER || 'test@swapaholic.local';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'test-password';

if (fs.existsSync(stateFile)) {
  const { mongoUri } = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_URI_TEST = mongoUri;
}
