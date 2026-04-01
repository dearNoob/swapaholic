const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Auth Routes', () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  const password = 'TestPass123';

  beforeAll(async () => {
    // Ensure DB connection for tests
    await connectDB();
  });

  afterAll(async () => {
    // Remove any test users created
    await User.deleteMany({ email: new RegExp('^testuser_') }).catch(() => { });
    // Close mongoose connection
    await disconnectDB();
  });

  test('POST /api/auth/register -> registers a user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', phone: `+1555${Date.now().toString().slice(-6)}`, email: testEmail, password, role: 'user' })
      .expect(201);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe(testEmail);
  });

  test('POST /api/auth/login -> logs in the user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe(testEmail);
  });

  test('POST /api/auth/login -> fails with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword123' })
      .expect(401);

    expect(res.body).toHaveProperty('message');
  });

  test('POST /api/auth/register -> fails with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', phone: `+1555${Date.now().toString().slice(-6)}`, email: testEmail, password, role: 'user' })
      .expect(409);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Email already in use');
  });
});
