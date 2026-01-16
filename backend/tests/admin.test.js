const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const Review = require('../src/models/Review');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Admin Dashboard', () => {
  let adminToken, admin, seller, buyer, sellerToken, buyerToken, product, order;

  beforeAll(async () => {
    await connectDB();

    // Create admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Admin',
        lastName: 'User',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `admin_dash_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'admin'
      });
    adminToken = adminRes.body.token;
    admin = adminRes.body.user;

    // Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Seller',
        lastName: 'Dash',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `seller_dash_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'seller'
      });
    seller = sellerRes.body.user;
    sellerToken = sellerRes.body.token;

    // Create buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Buyer',
        lastName: 'Dash',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `buyer_dash_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'buyer'
      });
    buyer = buyerRes.body.user;
    buyerToken = buyerRes.body.token;

    // Create product and order
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Dashboard Test Product',
        description: 'For admin dashboard testing',
        category: 'electronics',
        basePrice: 500,
        condition: 'brand_new'
      });
    product = productRes.body;

    const bidRes = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: product._id,
        bidAmount: 550
      });
    const bid = bidRes.body;

    const acceptRes = await request(app)
      .post(`/api/bids/${bid._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`);

    order = acceptRes.body.order || acceptRes.body;

    // Create payment
    await Payment.create({
      orderId: order._id,
      buyerId: buyer.id || buyer._id,
      sellerId: seller.id || seller._id,
      amount: 550,
      status: 'released',
      paymentMethod: 'card'
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /_dash_/ }).catch(() => {});
    await Product.deleteMany({ title: /Dashboard Test/ }).catch(() => {});
    await disconnectDB();
  });

  describe('Dashboard Statistics', () => {
    test('GET /api/admin/dashboard/stats -> Admin can view dashboard stats', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('orders');
      expect(res.body).toHaveProperty('payments');
      expect(res.body).toHaveProperty('qc');
      expect(res.body.users.total).toBeGreaterThan(0);
    });

    test('GET /api/admin/dashboard/stats -> Non-admin cannot access', async () => {
      // Create regular user token
      const regularRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'NonAdmin',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `nonadmin_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const regularToken = regularRes.body.token;

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${regularToken}`);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('User Management', () => {
    test('GET /api/admin/users -> Admin can list users', async () => {
      const res = await request(app)
        .get('/api/admin/users?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('GET /api/admin/users -> Filter users by role', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=seller')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.every(u => u.role === 'seller')).toBe(true);
    });

    test('GET /api/admin/users -> Search users by name', async () => {
      const res = await request(app)
        .get(`/api/admin/users?search=${seller.firstName}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
    });

    test('GET /api/admin/users/:userId -> Get user profile', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${seller.id || seller._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('email');
      expect(res.body).toHaveProperty('stats');
    });

    test('PUT /api/admin/users/:userId/suspend -> Admin can suspend user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${seller.id || seller._id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Violation of terms and conditions'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.accountStatus).toBe('suspended');
    });

    test('PUT /api/admin/users/:userId/unsuspend -> Admin can unsuspend user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${seller.id || seller._id}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.accountStatus).toBe('active');
    });

    test('PUT /api/admin/users/:userId/ban -> Admin can ban user', async () => {
      // Create a new user to ban
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Ban',
          lastName: 'Test',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `ban_test_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const newUser = newUserRes.body.user;

      const res = await request(app)
        .put(`/api/admin/users/${newUser.id || newUser._id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Fraudulent activity detected'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.accountStatus).toBe('banned');

      await User.deleteOne({ _id: newUser.id || newUser._id }).catch(() => {});
    });

    test('GET /api/admin/users/:userId/transactions -> Get user transaction history', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${seller.id || seller._id}/transactions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      expect(res.body).toHaveProperty('pagination');
    });
  });

  describe('Dispute Management', () => {
    let disputedOrder;

    beforeAll(async () => {
      // Create seller2
      const seller2Res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Seller2',
          lastName: 'Test',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `seller2_dash_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'seller'
        });
      const seller2Token = seller2Res.body.token;

      // Create buyer2
      const buyer2Res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Buyer2',
          lastName: 'Test',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `buyer2_dash_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const buyer2Token = buyer2Res.body.token;

      // Create disputed order
      const productRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${seller2Token}`)
        .send({
          title: 'Dispute Test Product',
          description: 'For dispute testing',
          category: 'electronics',
          basePrice: 300,
          condition: 'brand_new'
        });

      const bidRes = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({
          productId: productRes.body._id,
          bidAmount: 320
        });

      const acceptRes = await request(app)
        .post(`/api/bids/${bidRes.body._id}/accept`)
        .set('Authorization', `Bearer ${seller2Token}`);

      disputedOrder = acceptRes.body.order || acceptRes.body;

      // Mark as disputed
      await Order.findByIdAndUpdate(disputedOrder._id, { status: 'disputed' });
    });

    test('GET /api/admin/disputes -> Admin can view disputes', async () => {
      const res = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('disputes');
      expect(res.body).toHaveProperty('pagination');
    });

    test('GET /api/admin/disputes/:orderId -> Get dispute details', async () => {
      const res = await request(app)
        .get(`/api/admin/disputes/${disputedOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('disputed');
    });

    test('PUT /api/admin/disputes/:orderId/resolve-seller -> Resolve to seller', async () => {
      const res = await request(app)
        .put(`/api/admin/disputes/${disputedOrder._id}/resolve-seller`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'seller',
          notes: 'Seller provided sufficient proof'
        });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('completed');
    });

    test('PUT /api/admin/disputes/:orderId/split-payment -> Split payment', async () => {
      // Create seller3
      const seller3Res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Seller3',
          lastName: 'Test',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `seller3_dash_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'seller'
        });
      const seller3Token = seller3Res.body.token;

      // Create buyer3
      const buyer3Res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Buyer3',
          lastName: 'Test',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `buyer3_dash_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const buyer3Token = buyer3Res.body.token;

      // Create new disputed order
      const productRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${seller3Token}`)
        .send({
          title: 'Split Test Product',
          description: 'For split payment test',
          category: 'electronics',
          basePrice: 200,
          condition: 'brand_new'
        });

      const bidRes = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyer3Token}`)
        .send({
          productId: productRes.body._id,
          bidAmount: 220
        });

      const acceptRes = await request(app)
        .post(`/api/bids/${bidRes.body._id}/accept`)
        .set('Authorization', `Bearer ${seller3Token}`);

      const splitOrder = acceptRes.body.order || acceptRes.body;
      await Order.findByIdAndUpdate(splitOrder._id, { status: 'disputed' });

      const res = await request(app)
        .put(`/api/admin/disputes/${splitOrder._id}/split-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Mutual compromise'
        });

      expect(res.status).toBe(200);
      expect(res.body.split).toHaveProperty('sellerAmount');
      expect(res.body.split).toHaveProperty('buyerRefund');
    });

    test('GET /api/admin/disputes/stats/overview -> Get dispute stats', async () => {
      const res = await request(app)
        .get('/api/admin/disputes/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalDisputes');
      expect(res.body).toHaveProperty('openDisputes');
    });
  });

  describe('Admin Dashboard Analytics', () => {
    test('GET /api/admin/dashboard/user-growth -> Get user growth data', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/user-growth')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    test('GET /api/admin/dashboard/revenue -> Get revenue stats', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/revenue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('monthlyRevenue');
      expect(res.body).toHaveProperty('summary');
    });

    test('GET /api/admin/dashboard/health -> Get system health', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('health');
      expect(res.body).toHaveProperty('alerts');
    });

    test('GET /api/admin/dashboard/top-performers -> Get top performers', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/top-performers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('topSellers');
      expect(res.body).toHaveProperty('topBuyers');
      expect(res.body).toHaveProperty('topRatedSellers');
    });
  });

  describe('Access Control', () => {
    test('Admin endpoints reject non-admin users', async () => {
      // Create regular buyer
      const buyerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Regular',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `regular_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const buyerToken = buyerRes.body.token;

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
