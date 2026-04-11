const fs = require('fs/promises');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { stateFile } = require('./jest.mongoState');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'swapaholic_test'
    }
  });

  const mongoUri = mongod.getUri();

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_URI_TEST = mongoUri;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-123456789012345678901234567890';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-12345678901234567890';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  process.env.SMTP_USER = process.env.SMTP_USER || 'test@swapaholic.local';
  process.env.SMTP_PASS = process.env.SMTP_PASS || 'test-password';

  globalThis.__MONGOD__ = mongod;

  await fs.writeFile(stateFile, JSON.stringify({ mongoUri }), 'utf8');
};
