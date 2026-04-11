const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

const uniqueSuffix = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

describe('Bid & Order Controllers', () => {
  let sellerToken;
  let buyerToken;
  let seller;
  let buyer;
  let mainProduct;
  let mainBidId;
  let mainOrderId;

  const registerUser = async ({ role, label }) => {
    const suffix = uniqueSuffix();
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: label,
        lastName: 'Test',
        phone: `+1555${suffix.slice(-7)}`,
        email: `${label.toLowerCase()}_${suffix}@test.com`,
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

  const createProduct = async ({
    titlePrefix = 'Test Product',
    basePrice = 1000,
    condition = 'excellent'
  } = {}) => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `${titlePrefix} ${uniqueSuffix()}`,
        description: 'Test product description',
        category: 'electronics',
        basePrice,
        condition,
        geometry: { type: 'Point', coordinates: [-118.2437, 34.0522] }
      })
      .expect(201);

    return response.body;
  };

  const createPendingOrderFlow = async ({
    titlePrefix = 'Order Flow Product',
    basePrice = 300,
    bidAmount = 350
  } = {}) => {
    const product = await createProduct({ titlePrefix, basePrice, condition: 'good' });

    const bidResponse = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ productId: product._id, bidAmount })
      .expect(201);

    const bidId = bidResponse.body.data.id;

    await request(app)
      .post(`/api/bids/${bidId}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const confirmResponse = await request(app)
      .post(`/api/bids/${bidId}/confirm-win`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    return {
      productId: product._id.toString(),
      bidId,
      orderId: confirmResponse.body.data.order.id
    };
  };

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'Seller' });
    sellerToken = sellerAccount.token;
    seller = sellerAccount.user;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'Buyer' });
    buyerToken = buyerAccount.token;
    buyer = buyerAccount.user;

    mainProduct = await createProduct({ titlePrefix: 'Test Laptop', basePrice: 1000 });
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp('^seller_|^buyer_') }).catch(() => { });
    await Product.deleteMany({}).catch(() => { });
    await Bid.deleteMany({}).catch(() => { });
    await Order.deleteMany({}).catch(() => { });
    await disconnectDB();
  });

  describe('Bid Controller', () => {
    test('POST /api/bids -> buyer can place a bid on a product', async () => {
      const response = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: mainProduct._id, bidAmount: 1100 })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.bidAmount).toBe(1100);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.userId).toBe(buyer.id);

      mainBidId = response.body.data.id;
    });

    test('POST /api/bids -> rejects bids below the minimum allowed threshold', async () => {
      const response = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: mainProduct._id, bidAmount: 100 })
        .expect(400);

      expect(response.body.message).toContain('Bid must be');
    });

    test('POST /api/bids -> seller cannot bid on their own product', async () => {
      const response = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ productId: mainProduct._id, bidAmount: 1200 })
        .expect(400);

      expect(response.body.message).toContain('Cannot bid on your own product');
    });

    test('GET /api/bids/:productId -> seller receives bids inside the normalized array payload', async () => {
      const response = await request(app)
        .get(`/api/bids/${mainProduct._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].bidAmount).toBe(1100);
    });

    test('GET /api/bids/user/:userId -> buyer receives their bid history in the normalized payload', async () => {
      const response = await request(app)
        .get(`/api/bids/user/${buyer.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('PUT /api/bids/:bidId -> buyer can update an active bid amount', async () => {
      const response = await request(app)
        .put(`/api/bids/${mainBidId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidAmount: 1200 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.bidAmount).toBe(1200);
    });

    test('POST /api/bids/:bidId/accept -> seller can move the highest bid into confirmation', async () => {
      const response = await request(app)
        .post(`/api/bids/${mainBidId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('buyer has 3 hours');
      expect(response.body.data.bid.status).toBe('pending_confirmation');
    });

    test('POST /api/bids/:bidId/confirm-win -> buyer confirms the auction win and creates the order', async () => {
      const response = await request(app)
        .post(`/api/bids/${mainBidId}/confirm-win`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.bid.status).toBe('accepted');
      expect(response.body.data.order.status).toBe('pending');
      expect(response.body.data.order.finalPrice).toBe(1200);

      mainOrderId = response.body.data.order.id;
    });

    test('POST /api/bids/:bidId/reject -> seller can reject another bid', async () => {
      const rejectProduct = await createProduct({ titlePrefix: 'Reject Test Product', basePrice: 400, condition: 'good' });

      const bidResponse = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: rejectProduct._id, bidAmount: 450 })
        .expect(201);

      const response = await request(app)
        .post(`/api/bids/${bidResponse.body.data.id}/reject`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.bid.status).toBe('rejected');
    });

    test('POST /api/bids/:bidId/withdraw -> buyer can withdraw an active bid', async () => {
      const withdrawProduct = await createProduct({ titlePrefix: 'Withdraw Test Product', basePrice: 500, condition: 'good' });

      const bidResponse = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: withdrawProduct._id, bidAmount: 550 })
        .expect(201);

      const response = await request(app)
        .post(`/api/bids/${bidResponse.body.data.id}/withdraw`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.bid.status).toBe('withdrawn');
    });
  });

  describe('Order Controller', () => {
    test('POST /api/orders -> create order remains idempotent after confirm-win creates it', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: mainBidId })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.finalPrice).toBe(1200);
      expect(response.body.data.escrowStatus).toBe('held');
      expect(response.body.data.id).toBe(mainOrderId);
    });

    test('GET /api/orders -> buyer receives paginated normalized orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    test('GET /api/orders/:id -> buyer can fetch normalized order details', async () => {
      const response = await request(app)
        .get(`/api/orders/${mainOrderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(mainOrderId);
      expect(response.body.data).toHaveProperty('buyerId');
      expect(response.body.data).toHaveProperty('sellerId');
    });

    test('PUT /api/orders/:id -> seller can update an order status', async () => {
      const response = await request(app)
        .put(`/api/orders/${mainOrderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'confirmed', notes: 'Order confirmed by seller' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('confirmed');
    });

    test('PUT /api/orders/:id/confirm-delivery -> buyer confirms delivery after seller moves order in delivery', async () => {
      await request(app)
        .put(`/api/orders/${mainOrderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'in_delivery' })
        .expect(200);

      const response = await request(app)
        .put(`/api/orders/${mainOrderId}/confirm-delivery`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.message).toContain('Delivery confirmed');
      expect(response.body.data.status).toBe('completed');
    });

    test('PUT /api/orders/:id/dispute -> buyer can raise a dispute on a fresh pending order', async () => {
      const flow = await createPendingOrderFlow({ titlePrefix: 'Dispute Test Product', basePrice: 300, bidAmount: 350 });

      const response = await request(app)
        .put(`/api/orders/${flow.orderId}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Product damaged on arrival' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.order.status).toBe('disputed');
    });

    test('PUT /api/orders/:id/cancel -> buyer can cancel a pending order', async () => {
      const flow = await createPendingOrderFlow({ titlePrefix: 'Cancel Test Product', basePrice: 200, bidAmount: 250 });

      const response = await request(app)
        .put(`/api/orders/${flow.orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.order.status).toBe('cancelled');
      expect(response.body.data.order.escrowStatus).toBe('refunded');
    });
  });
});
