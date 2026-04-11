const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

const uniqueSuffix = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const createAdminToken = () => jwt.sign(
  {
    id: new mongoose.Types.ObjectId().toString(),
    role: 'admin',
    email: `admin_${uniqueSuffix()}@test.com`
  },
  process.env.JWT_SECRET
);

describe('Payment Controller', () => {
  let sellerToken;
  let buyerToken;
  let seller;
  let buyer;
  let adminToken;

  const registerUser = async ({ role, label }) => {
    const suffix = uniqueSuffix();
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: label,
        lastName: 'Tester',
        phone: `+1555${suffix.slice(-7)}`,
        email: `${label.toLowerCase()}_${suffix}@test.com`,
        password: 'Test1234',
        role
      })
      .expect(201);

    return {
      token: response.body.data.accessToken,
      user: response.body.data.user
    };
  };

  const createAuctionOrder = async ({
    titlePrefix = 'Payment Test Product',
    basePrice = 100,
    bidAmount = 120
  } = {}) => {
    const suffix = uniqueSuffix();

    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `${titlePrefix} ${suffix}`,
        description: 'Product for payment testing',
        category: 'electronics',
        basePrice,
        condition: 'good'
      })
      .expect(201);

    const product = productResponse.body;

    const bidResponse = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: product._id,
        bidAmount
      })
      .expect(201);

    const bid = bidResponse.body.data;

    await request(app)
      .post(`/api/bids/${bid.id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const confirmResponse = await request(app)
      .post(`/api/bids/${bid.id}/confirm-win`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    const order = confirmResponse.body.data.order;

    return {
      productId: product._id.toString(),
      bidId: bid.id,
      orderId: order.id,
      bidAmount,
      totalPayable: order.totalPayable
    };
  };

  const initiatePayment = (orderId, payload = {}, token = buyerToken) => (
    request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, ...payload })
  );

  const createEscrowedPayment = async ({
    method = 'bkash',
    basePrice = 100,
    bidAmount = 120
  } = {}) => {
    const auction = await createAuctionOrder({
      titlePrefix: 'Escrow Payment Product',
      basePrice,
      bidAmount
    });

    const initiateResponse = await initiatePayment(auction.orderId, { method }).expect(200);
    const payment = initiateResponse.body.data;

    const trxId = `trx_${uniqueSuffix()}`;

    await request(app)
      .post('/api/payments/mock/process')
      .send({
        sessionKey: payment.sessionKey,
        method,
        trxId,
        action: 'success'
      })
      .expect(200);

    return {
      ...auction,
      paymentId: payment.id,
      sessionKey: payment.sessionKey,
      trxId
    };
  };

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'SellerPay' });
    sellerToken = sellerAccount.token;
    seller = sellerAccount.user;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'BuyerPay' });
    buyerToken = buyerAccount.token;
    buyer = buyerAccount.user;

    adminToken = createAdminToken();
  });

  afterAll(async () => {
    await Payment.deleteMany({}).catch(() => { });
    await Order.deleteMany({}).catch(() => { });
    await Bid.deleteMany({}).catch(() => { });
    await Product.deleteMany({}).catch(() => { });
    await User.deleteMany({ _id: { $in: [seller?.id, buyer?.id].filter(Boolean) } }).catch(() => { });
    await disconnectDB();
  });

  describe('Payment Initiation', () => {
    test('POST /api/payments/initiate -> buyer receives a normalized payment payload', async () => {
      const auction = await createAuctionOrder();

      const response = await initiatePayment(auction.orderId).expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        orderId: auction.orderId,
        amount: auction.bidAmount,
        status: 'pending',
        paymentMethod: 'card'
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('clientSecret');
    });

    test('POST /api/payments/initiate -> seller cannot initiate buyer payment', async () => {
      const auction = await createAuctionOrder({ titlePrefix: 'Seller Access Payment Product' });

      const response = await initiatePayment(auction.orderId, {}, sellerToken).expect(403);

      expect(response.body).toHaveProperty('message');
    });

    test('POST /api/payments/initiate -> rejects missing order ID', async () => {
      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Order ID required');
    });

    test('POST /api/payments/initiate -> rejects unknown orders', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();
      const response = await initiatePayment(fakeOrderId).expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    test('POST /api/payments/initiate -> pending payments can be re-initiated', async () => {
      const auction = await createAuctionOrder({ titlePrefix: 'Repeat Initiation Product' });

      const firstResponse = await initiatePayment(auction.orderId, { method: 'bkash' }).expect(200);
      const secondResponse = await initiatePayment(auction.orderId, { method: 'bkash' }).expect(200);

      expect(firstResponse.body.data.orderId).toBe(auction.orderId);
      expect(secondResponse.body.data.orderId).toBe(auction.orderId);
      expect(secondResponse.body.data.status).toBe('pending');
      expect(secondResponse.body.data.sessionKey).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
    test('POST /api/payments/mock/process -> completes a mock gateway payment into escrow', async () => {
      const auction = await createAuctionOrder({ titlePrefix: 'Mock Gateway Product', bidAmount: 160 });

      const initiateResponse = await initiatePayment(auction.orderId, { method: 'bkash' }).expect(200);
      const payment = initiateResponse.body.data;
      const trxId = `trx_${uniqueSuffix()}`;

      const processResponse = await request(app)
        .post('/api/payments/mock/process')
        .send({
          sessionKey: payment.sessionKey,
          method: 'bkash',
          trxId,
          action: 'success'
        })
        .expect(200);

      expect(processResponse.body).toMatchObject({
        success: true,
        status: 'success'
      });
      expect(processResponse.body.redirectUrl).toContain('status=success');

      const storedPayment = await Payment.findOne({ orderId: auction.orderId });
      expect(storedPayment).not.toBeNull();
      expect(storedPayment.status).toBe('escrowed');
      expect(storedPayment.transactionId).toBe(trxId);
      expect(storedPayment.paymentMethod).toBe('bkash');
    });
  });

  describe('Payment Details', () => {
    test('GET /api/payments/:orderId -> buyer, seller, and admin can view payment details', async () => {
      const auction = await createAuctionOrder({ titlePrefix: 'Payment Details Product', bidAmount: 220 });

      const initiateResponse = await initiatePayment(auction.orderId).expect(200);
      const payment = initiateResponse.body.data;

      const buyerResponse = await request(app)
        .get(`/api/payments/${auction.orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(buyerResponse.body).toHaveProperty('success', true);
      expect(buyerResponse.body.data).toMatchObject({
        id: payment.id,
        orderId: auction.orderId,
        amount: auction.bidAmount
      });

      const sellerResponse = await request(app)
        .get(`/api/payments/${auction.orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(sellerResponse.body.data.id).toBe(payment.id);

      const adminResponse = await request(app)
        .get(`/api/payments/${payment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.data.orderId).toBe(auction.orderId);
    });

    test('GET /api/payments/:orderId -> returns 404 when payment does not exist', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/payments/${fakeOrderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Payment not found');
    });

    test('GET /api/payments/:orderId/invoice -> returns an HTML invoice for authorized users', async () => {
      const auction = await createAuctionOrder({ titlePrefix: 'Invoice Product', bidAmount: 240 });

      await initiatePayment(auction.orderId).expect(200);

      const response = await request(app)
        .get(`/api/payments/${auction.orderId}/invoice`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Swapaholic');
      expect(response.text).toContain(auction.orderId);
    });
  });

  describe('Payment Release & Refund', () => {
    test('POST /api/payments/:orderId/release -> admin can release escrow after completion', async () => {
      const paymentFlow = await createEscrowedPayment({ bidAmount: 250 });

      await Order.findByIdAndUpdate(paymentFlow.orderId, { status: 'completed' });

      const response = await request(app)
        .post(`/api/payments/${paymentFlow.orderId}/release`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.payment.status).toBe('released');

      const storedPayment = await Payment.findOne({ orderId: paymentFlow.orderId });
      expect(storedPayment.status).toBe('released');
    });

    test('POST /api/payments/:orderId/release -> rejects non-admin callers', async () => {
      const paymentFlow = await createEscrowedPayment({ bidAmount: 260 });

      await Order.findByIdAndUpdate(paymentFlow.orderId, { status: 'completed' });

      const response = await request(app)
        .post(`/api/payments/${paymentFlow.orderId}/release`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
    });

    test('POST /api/payments/:orderId/refund -> admin can refund an escrowed payment', async () => {
      const paymentFlow = await createEscrowedPayment({ bidAmount: 270 });

      const response = await request(app)
        .post(`/api/payments/${paymentFlow.orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Buyer reported an issue' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.payment.status).toBe('refunded');

      const storedPayment = await Payment.findOne({ orderId: paymentFlow.orderId });
      expect(storedPayment.status).toBe('refunded');
      expect(storedPayment.refundReason).toBe('Buyer reported an issue');
    });

    test('POST /api/payments/:orderId/refund -> requires a refund reason for admins', async () => {
      const paymentFlow = await createEscrowedPayment({ bidAmount: 280 });

      const response = await request(app)
        .post(`/api/payments/${paymentFlow.orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Refund reason required');
    });
  });
});
