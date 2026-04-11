const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

const uniqueSuffix = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

describe('User & Product Controllers', () => {
  let sellerToken;
  let sellerId;
  let productId;

  const registerUser = async ({ role, label }) => {
    const suffix = uniqueSuffix();
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: label,
        lastName: 'User',
        phone: `+1555${suffix.slice(-7)}`,
        email: `${label.toLowerCase()}_${suffix}@example.com`,
        password: 'TestPass123',
        role
      })
      .expect(201);

    const user = response.body.data.user;

    return {
      token: response.body.data.accessToken,
      user: {
        ...user,
        id: user.id || user._id?.toString()
      }
    };
  };

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'Seller' });
    sellerToken = sellerAccount.token;
    sellerId = sellerAccount.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp('^seller_|^buyer_') }).catch(() => { });
    await Product.deleteMany({}).catch(() => { });
    await disconnectDB();
  });

  describe('User Controller', () => {
    test('GET /api/users/:id -> returns the normalized user profile payload', async () => {
      const response = await request(app)
        .get(`/api/users/${sellerId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    test('PUT /api/users/profile -> updates the authenticated user profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ bio: 'Updated bio', firstName: 'UpdatedSeller' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.bio).toBe('Updated bio');
      expect(response.body.data.firstName).toBe('UpdatedSeller');
    });

    test('GET /api/users/:id/ratings -> returns rating summary in the normalized shape', async () => {
      const response = await request(app)
        .get(`/api/users/${sellerId}/ratings`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('ratingAverage');
      expect(response.body.data).toHaveProperty('totalTransactions');
    });
  });

  describe('Product Controller', () => {
    test('POST /api/products -> seller can create a product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test iPhone',
          description: 'Excellent condition iPhone',
          category: 'electronics',
          basePrice: 500,
          condition: 'excellent',
          geometry: { type: 'Point', coordinates: [-118.2437, 34.0522] }
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe('Test iPhone');
      expect(response.body.sellerId).toBe(sellerId);
      productId = response.body._id;
    });

    test('GET /api/products -> lists products in the paginated normalized shape', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('GET /api/products?category=electronics -> filters products in the same normalized shape', async () => {
      const response = await request(app)
        .get('/api/products?category=electronics')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    test('GET /api/products/:id -> returns the product inside the success/data envelope', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id.toString()).toBe(productId.toString());
      expect(response.body.data.title).toBe('Test iPhone');
    });

    test('PUT /api/products/:id -> seller can update product fields', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ basePrice: 450, title: 'Updated iPhone' })
        .expect(200);

      expect(response.body.basePrice).toBe(450);
      expect(response.body.title).toBe('Updated iPhone');
    });

    test('DELETE /api/products/:id -> seller can delete a product', async () => {
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'To Delete',
          description: 'This will be deleted',
          category: 'electronics',
          basePrice: 100,
          condition: 'fair'
        })
        .expect(201);

      const deleteResponse = await request(app)
        .delete(`/api/products/${createResponse.body._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('message');
    });

    test('GET /api/products/nearby/search -> returns nearby products as an array', async () => {
      const response = await request(app)
        .get('/api/products/nearby/search?lng=-118.2437&lat=34.0522&maxDistance=50000')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/products -> buyer role is rejected from seller-only product creation', async () => {
      const buyerAccount = await registerUser({ role: 'buyer', label: 'Buyer' });

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyerAccount.token}`)
        .send({
          title: 'Should Fail',
          description: 'Buyer cannot create products',
          category: 'electronics',
          basePrice: 100,
          condition: 'good'
        })
        .expect(403);

      expect(response.body).toHaveProperty('message');
    });
  });
});
