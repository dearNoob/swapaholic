const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

const uniqueSuffix = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

describe('Admin Dashboard', () => {
  let admin;
  let adminToken;
  let seller;
  let buyer;
  let sellerToken;
  let buyerToken;
  let primaryOrderId;
  let disputedOrderId;

  const createAdmin = async () => {
    const suffix = uniqueSuffix();
    const user = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      phone: `+1555${suffix.slice(-7)}`,
      email: `admin_dash_${suffix}@test.com`,
      password: 'Test1234',
      role: 'admin'
    });

    return {
      user,
      token: jwt.sign(
        { id: user._id.toString(), role: 'admin', email: user.email },
        process.env.JWT_SECRET
      )
    };
  };

  const registerUser = async ({ role, label }) => {
    const suffix = uniqueSuffix();
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: label,
        lastName: 'Dash',
        phone: `+1555${suffix.slice(-7)}`,
        email: `${label.toLowerCase()}_dash_${suffix}@test.com`,
        password: 'Test1234',
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

  const createAuctionOrder = async ({
    sellerAuthToken,
    buyerAuthToken,
    sellerId,
    buyerId,
    titlePrefix = 'Dashboard Test Product',
    basePrice = 500,
    bidAmount = 550
  }) => {
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerAuthToken}`)
      .send({
        title: `${titlePrefix} ${uniqueSuffix()}`,
        description: 'For admin dashboard testing',
        category: 'electronics',
        basePrice,
        condition: 'brand_new'
      })
      .expect(201);

    const product = productResponse.body;

    const bidResponse = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${buyerAuthToken}`)
      .send({
        productId: product._id,
        bidAmount
      })
      .expect(201);

    const bidId = bidResponse.body.data.id;

    await request(app)
      .post(`/api/bids/${bidId}/accept`)
      .set('Authorization', `Bearer ${sellerAuthToken}`)
      .expect(200);

    const confirmResponse = await request(app)
      .post(`/api/bids/${bidId}/confirm-win`)
      .set('Authorization', `Bearer ${buyerAuthToken}`)
      .expect(200);

    return {
      productId: product._id.toString(),
      bidId,
      orderId: confirmResponse.body.data.order.id,
      sellerId,
      buyerId,
      bidAmount
    };
  };

  const createReleasedOrderWithPayment = async () => {
    const flow = await createAuctionOrder({
      sellerAuthToken: sellerToken,
      buyerAuthToken: buyerToken,
      sellerId: seller.id,
      buyerId: buyer.id,
      titlePrefix: 'Revenue Product',
      basePrice: 500,
      bidAmount: 550
    });

    await Order.findByIdAndUpdate(flow.orderId, { status: 'completed' });

    await Payment.create({
      orderId: flow.orderId,
      buyerId: flow.buyerId,
      sellerId: flow.sellerId,
      amount: flow.bidAmount,
      status: 'released',
      paymentMethod: 'card'
    });

    return flow.orderId;
  };

  const createDisputedOrder = async (titlePrefix = 'Dispute Product') => {
    const flow = await createAuctionOrder({
      sellerAuthToken: sellerToken,
      buyerAuthToken: buyerToken,
      sellerId: seller.id,
      buyerId: buyer.id,
      titlePrefix,
      basePrice: 300,
      bidAmount: 320
    });

    await Order.findByIdAndUpdate(flow.orderId, {
      status: 'disputed',
      notes: 'Initial dispute created by test'
    });

    return flow.orderId;
  };

  beforeAll(async () => {
    await connectDB();

    const adminAccount = await createAdmin();
    admin = adminAccount.user;
    adminToken = adminAccount.token;

    const sellerAccount = await registerUser({ role: 'seller', label: 'Seller' });
    seller = sellerAccount.user;
    sellerToken = sellerAccount.token;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'Buyer' });
    buyer = buyerAccount.user;
    buyerToken = buyerAccount.token;

    primaryOrderId = await createReleasedOrderWithPayment();
    disputedOrderId = await createDisputedOrder('Primary Dispute Product');
  });

  afterAll(async () => {
    await Payment.deleteMany({}).catch(() => { });
    await Order.deleteMany({}).catch(() => { });
    await Bid.deleteMany({}).catch(() => { });
    await Product.deleteMany({}).catch(() => { });
    await User.deleteMany({ email: /_dash_/ }).catch(() => { });
    if (admin?._id) {
      await User.deleteOne({ _id: admin._id }).catch(() => { });
    }
    await disconnectDB();
  });

  describe('Dashboard Statistics', () => {
    test('GET /api/admin/dashboard/stats -> admin can view dashboard stats', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('payments');
      expect(response.body).toHaveProperty('qc');
      expect(response.body.users.total).toBeGreaterThan(0);
    });

    test('GET /api/admin/dashboard/stats -> non-admin cannot access', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('User Management', () => {
    test('GET /api/admin/users -> admin can list users', async () => {
      const response = await request(app)
        .get('/api/admin/users?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    test('GET /api/admin/users -> admin can filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=seller')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.every((user) => user.role === 'seller')).toBe(true);
    });

    test('GET /api/admin/users -> admin can search users by name', async () => {
      const response = await request(app)
        .get(`/api/admin/users?search=${seller.firstName}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThan(0);
    });

    test('GET /api/admin/users/:userId -> admin can view detailed user profile', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${seller.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('email');
      expect(response.body).toHaveProperty('stats');
    });

    test('PUT /api/admin/users/:userId/suspend -> admin can suspend a user', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${seller.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violation of terms and conditions' })
        .expect(200);

      expect(response.body.user.accountStatus).toBe('suspended');
    });

    test('PUT /api/admin/users/:userId/unsuspend -> admin can unsuspend a user', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${seller.id}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user.accountStatus).toBe('active');
    });

    test('PUT /api/admin/users/:userId/ban -> admin can ban a user', async () => {
      const banTarget = await registerUser({ role: 'buyer', label: 'BanTarget' });

      const response = await request(app)
        .put(`/api/admin/users/${banTarget.user.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Fraudulent activity detected' })
        .expect(200);

      expect(response.body.user.accountStatus).toBe('banned');
    });

    test('GET /api/admin/users/:userId/transactions -> admin can view user transaction history', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${seller.id}/transactions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Dispute Management', () => {
    test('GET /api/admin/disputes -> admin can view disputes', async () => {
      const response = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('disputes');
      expect(response.body).toHaveProperty('pagination');
    });

    test('GET /api/admin/disputes/:orderId -> admin can view dispute details', async () => {
      const response = await request(app)
        .get(`/api/admin/disputes/${disputedOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.order.status).toBe('disputed');
    });

    test('PUT /api/admin/disputes/:orderId/resolve-seller -> admin can resolve a dispute to the seller', async () => {
      const orderId = await createDisputedOrder('Resolve Seller Dispute');

      const response = await request(app)
        .put(`/api/admin/disputes/${orderId}/resolve-seller`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'seller',
          notes: 'Seller provided sufficient proof'
        })
        .expect(200);

      expect(response.body.order.status).toBe('completed');
      expect(response.body.order.escrowStatus).toBe('released');
    });

    test('PUT /api/admin/disputes/:orderId/split-payment -> admin can split a disputed payment', async () => {
      const orderId = await createDisputedOrder('Split Dispute Product');

      const response = await request(app)
        .put(`/api/admin/disputes/${orderId}/split-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Mutual compromise' })
        .expect(200);

      expect(response.body.split).toHaveProperty('sellerAmount');
      expect(response.body.split).toHaveProperty('buyerRefund');
    });

    test('GET /api/admin/disputes/stats/overview -> admin can view dispute stats', async () => {
      const response = await request(app)
        .get('/api/admin/disputes/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalDisputes');
      expect(response.body).toHaveProperty('openDisputes');
    });
  });

  describe('Admin Dashboard Analytics', () => {
    test('GET /api/admin/dashboard/user-growth -> admin can view user growth data', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/user-growth')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    test('GET /api/admin/dashboard/revenue -> admin can view revenue stats', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('monthlyRevenue');
      expect(response.body).toHaveProperty('summary');
    });

    test('GET /api/admin/dashboard/health -> admin can view system health', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('health');
      expect(response.body).toHaveProperty('alerts');
    });

    test('GET /api/admin/dashboard/top-performers -> admin can view top performers', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/top-performers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('topSellers');
      expect(response.body).toHaveProperty('topBuyers');
      expect(response.body).toHaveProperty('topRatedSellers');
    });
  });
});
