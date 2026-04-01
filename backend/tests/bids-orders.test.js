const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Bid & Order Controllers', () => {
  let sellerToken, buyerToken, seller, buyer, product, bid;

  beforeAll(async () => {
    await connectDB();

    // Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Seller',
        lastName: 'Test',
        phone: `+1555${Date.now().toString().slice(-6)}`,
        email: `seller_${Date.now()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    sellerToken = sellerRes.body.token;
    seller = sellerRes.body.user;

    // Create buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Buyer',
        lastName: 'Test',
        phone: `+1555${Date.now().toString().slice(-7)}`,
        email: `buyer_${Date.now()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    buyerToken = buyerRes.body.token;
    buyer = buyerRes.body.user;

    // Create product
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Test Laptop',
        description: 'High-end gaming laptop',
        category: 'electronics',
        basePrice: 1000,
        condition: 'excellent',
        geometry: { type: 'Point', coordinates: [-118.2437, 34.0522] }
      });
    product = productRes.body;
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp('^seller_|^buyer_') }).catch(() => {});
    await Product.deleteMany({}).catch(() => {});
    await Bid.deleteMany({}).catch(() => {});
    await Order.deleteMany({}).catch(() => {});
    await disconnectDB();
  });

  describe('Bid Controller', () => {
    test('POST /api/bids -> Place a bid on product', async () => {
      const res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product._id, bidAmount: 1100 })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.bidAmount).toBe(1100);
      expect(res.body.status).toBe('active');
      expect(res.body.buyerId._id).toBe(buyer.id);
      bid = res.body;
    });

    test('POST /api/bids -> Reject bid if below base price', async () => {
      const res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product._id, bidAmount: 500 })
        .expect(400);

      expect(res.body.message).toContain('Bid must be');
    });

    test('POST /api/bids -> Reject if seller tries to bid on own product', async () => {
      const res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ productId: product._id, bidAmount: 1200 })
        .expect(400);

      expect(res.body.message).toContain('Cannot bid on your own product');
    });

    test('GET /api/bids/:productId -> Get all bids for product (seller only)', async () => {
      const res = await request(app)
        .get(`/api/bids/${product._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].bidAmount).toBe(1100);
    });

    test('GET /api/bids/user/:userId -> Get user bid history', async () => {
      const res = await request(app)
        .get(`/api/bids/user/${buyer.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('PUT /api/bids/:bidId -> Update bid amount', async () => {
      const res = await request(app)
        .put(`/api/bids/${bid._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidAmount: 1200 })
        .expect(200);

      expect(res.body.bidAmount).toBe(1200);
    });

    test('POST /api/bids/:bidId/accept -> Accept bid (seller only)', async () => {
      const res = await request(app)
        .post(`/api/bids/${bid._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.message).toContain('Bid accepted');
      expect(res.body.bid.status).toBe('accepted');
    });

    test('POST /api/bids/:bidId/reject -> Reject bid', async () => {
      // Create another product to reject bid on
      const rejectProductRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Reject Test Product',
          description: 'Product for reject test',
          category: 'electronics',
          basePrice: 400,
          condition: 'good'
        });

      const bidRes = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: rejectProductRes.body._id, bidAmount: 450 })
        .expect(201);

      const res = await request(app)
        .post(`/api/bids/${bidRes.body._id}/reject`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.bid.status).toBe('rejected');
    });

    test('POST /api/bids/:bidId/withdraw -> Withdraw bid (buyer)', async () => {
      // Create a new product and bid for this test
      const newProductRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Phone',
          description: 'Smartphone',
          category: 'electronics',
          basePrice: 500,
          condition: 'good'
        });

      const withdrawBidRes = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: newProductRes.body._id, bidAmount: 550 })
        .expect(201);

      const res = await request(app)
        .post(`/api/bids/${withdrawBidRes.body._id}/withdraw`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.bid.status).toBe('withdrawn');
    });
  });

  describe('Order Controller', () => {
    test('POST /api/orders -> Create order from accepted bid', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid._id })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.status).toBe('pending');
      expect(res.body.finalPrice).toBe(1200);
      expect(res.body.escrowStatus).toBe('held');
    });

    test('GET /api/orders -> Get user orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('orders');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.orders)).toBe(true);
    });

    test('GET /api/orders/:id -> Get order details', async () => {
      // First get the order
      const ordersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const order = ordersRes.body.orders[0];

      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body._id).toBe(order._id);
      expect(res.body).toHaveProperty('buyerId');
      expect(res.body).toHaveProperty('sellerId');
    });

    test('PUT /api/orders/:id -> Update order status', async () => {
      const ordersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const order = ordersRes.body.orders[0];

      const res = await request(app)
        .put(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'confirmed', notes: 'Order confirmed by seller' })
        .expect(200);

      expect(res.body.status).toBe('confirmed');
    });

    test('PUT /api/orders/:id/confirm-delivery -> Confirm delivery (buyer)', async () => {
      const ordersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const order = ordersRes.body.orders[0];

      // First move to in_delivery
      await request(app)
        .put(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'in_delivery' });

      const res = await request(app)
        .put(`/api/orders/${order._id}/confirm-delivery`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.message).toContain('Delivery confirmed');
      expect(res.body.order.status).toBe('completed');
    });

    test('PUT /api/orders/:id/dispute -> Raise dispute', async () => {
      // Create new order for dispute test
      const product2Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Tablet',
          description: 'Tablet device',
          category: 'electronics',
          basePrice: 300,
          condition: 'good'
        });

      const bid2Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product2Res.body._id, bidAmount: 350 })
        .expect(201);

      await request(app)
        .post(`/api/bids/${bid2Res.body._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order2Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid2Res.body._id })
        .expect(201);

      const res = await request(app)
        .put(`/api/orders/${order2Res.body._id}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Product damaged on arrival' })
        .expect(200);

      expect(res.body.order.status).toBe('disputed');
    });

    test('PUT /api/orders/:id/cancel -> Cancel order (pending only)', async () => {
      const product3Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Headphones',
          description: 'Wireless headphones',
          category: 'electronics',
          basePrice: 200,
          condition: 'good'
        });

      const bid3Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product3Res.body._id, bidAmount: 250 })
        .expect(201);

      await request(app)
        .post(`/api/bids/${bid3Res.body._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order3Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid3Res.body._id })
        .expect(201);

      const res = await request(app)
        .put(`/api/orders/${order3Res.body._id}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.order.status).toBe('cancelled');
      expect(res.body.order.escrowStatus).toBe('refunded');
    });
  });
});
