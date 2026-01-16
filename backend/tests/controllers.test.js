const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('User & Product Controllers', () => {
  let token;
  let userId;
  let productId;
  let sellerId;

  beforeAll(async () => {
    await connectDB();

    // Create a seller user for product tests
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Seller',
        lastName: 'User',
        phone: `+1555${Date.now().toString().slice(-6)}`,
        email: `seller_${Date.now()}@example.com`,
        password: 'TestPass123',
        role: 'seller'
      });

    token = sellerRes.body.token;
    userId = sellerRes.body.user.id;
    sellerId = sellerRes.body.user.id;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: new RegExp('^seller_|^buyer_') }).catch(() => {});
    await Product.deleteMany({}).catch(() => {});
    await disconnectDB();
  });

  describe('User Controller', () => {
    test('GET /api/users/:id -> Get user profile', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password');
    });

    test('PUT /api/users/:id -> Update user profile', async () => {
      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'Updated bio', firstName: 'UpdatedSeller' })
        .expect(200);

      expect(res.body.bio).toBe('Updated bio');
      expect(res.body.firstName).toBe('UpdatedSeller');
    });

    test('GET /api/users/:id/ratings -> Get user ratings', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}/ratings`)
        .expect(200);

      expect(res.body).toHaveProperty('ratingAverage');
      expect(res.body).toHaveProperty('totalTransactions');
    });
  });

  describe('Product Controller', () => {
    test('POST /api/products -> Create product (seller only)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test iPhone',
          description: 'Excellent condition iPhone',
          category: 'electronics',
          basePrice: 500,
          condition: 'excellent',
          geometry: { type: 'Point', coordinates: [-118.2437, 34.0522] }
        })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe('Test iPhone');
      expect(res.body.sellerId).toBe(sellerId);
      productId = res.body._id;
    });

    test('GET /api/products -> List all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .expect(200);

      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.products)).toBe(true);
    });

    test('GET /api/products?category=electronics -> Filter products', async () => {
      const res = await request(app)
        .get('/api/products?category=electronics')
        .expect(200);

      expect(Array.isArray(res.body.products)).toBe(true);
    });

    test('GET /api/products/:id -> Get product by ID', async () => {
      const res = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(res.body._id.toString()).toBe(productId.toString());
      expect(res.body.title).toBe('Test iPhone');
    });

    test('PUT /api/products/:id -> Update product', async () => {
      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ basePrice: 450, title: 'Updated iPhone' })
        .expect(200);

      expect(res.body.basePrice).toBe(450);
      expect(res.body.title).toBe('Updated iPhone');
    });

    test('DELETE /api/products/:id -> Delete product', async () => {
      // Create a new product to delete
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'To Delete',
          description: 'This will be deleted',
          category: 'electronics',
          basePrice: 100,
          condition: 'fair'
        })
        .expect(201);

      const deleteRes = await request(app)
        .delete(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(deleteRes.body).toHaveProperty('message');
    });

    test('GET /api/products/nearby/search -> Search products by location', async () => {
      const res = await request(app)
        .get('/api/products/nearby/search?lng=-118.2437&lat=34.0522&maxDistance=50000')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /api/products -> Reject if not seller role', async () => {
      // Register a buyer
      const buyerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Buyer',
          lastName: 'User',
          phone: `+1555${Date.now().toString().slice(-7)}`,
          email: `buyer_${Date.now()}@example.com`,
          password: 'TestPass123',
          role: 'buyer'
        });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyerRes.body.token}`)
        .send({
          title: 'Should Fail',
          description: 'Buyer cannot create products',
          category: 'electronics',
          basePrice: 100,
          condition: 'good'
        })
        .expect(403);

      expect(res.body).toHaveProperty('message');
    });
  });
});
