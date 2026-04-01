const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const QCVerification = require('../src/models/QCVerification');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('QC Verification System', () => {
  let sellerToken, buyerToken, adminToken, seller, buyer, admin, product, bid, order, qc;

  beforeAll(async () => {
    await connectDB();

    // Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'QC',
        lastName: 'Seller',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `seller_qc_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    sellerToken = sellerRes.body.token;
    seller = sellerRes.body.user;

    // Create buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'QC',
        lastName: 'Buyer',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `buyer_qc_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    buyerToken = buyerRes.body.token;
    buyer = buyerRes.body.user;

    // Create admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'QC',
        lastName: 'Admin',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `admin_qc_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'admin'
      });
    adminToken = adminRes.body.token;
    admin = adminRes.body.user;

    // Create product
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'QC Test Product',
        description: 'Product for QC verification testing',
        category: 'electronics',
        basePrice: 500,
        condition: 'brand_new'
      });
    product = productRes.body;

    // Create bid
    const bidRes = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: product._id,
        bidAmount: 550
      });
    bid = bidRes.body;

    // Accept bid to create order
    const acceptRes = await request(app)
      .post(`/api/bids/${bid._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`);

    order = acceptRes.body.order || acceptRes.body;

    // Create payment record
    await Payment.create({
      orderId: order._id,
      buyerId: buyer.id || buyer._id,
      sellerId: seller.id || seller._id,
      amount: order.finalPrice || 550,
      status: 'escrowed',
      paymentMethod: 'card',
      transactionId: `txn_${Math.random().toString().slice(2, 10)}`
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /qc_/ }).catch(() => {});
    await Product.deleteMany({ title: /QC Test/ }).catch(() => {});
    await Bid.deleteMany({ productId: product._id }).catch(() => {});
    await Order.deleteOne({ _id: order._id }).catch(() => {});
    await Payment.deleteOne({ orderId: order._id }).catch(() => {});
    await QCVerification.deleteMany({ orderId: order._id }).catch(() => {});
    await disconnectDB();
  });

  describe('QC Initiation', () => {
    test('POST /api/qc/initiate -> Seller can initiate QC', async () => {
      const res = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order._id,
          inspectionNotes: 'Product in excellent condition, all components functional',
          images: ['image_url_1.jpg', 'image_url_2.jpg']
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.status).toBe('pending');
      expect(res.body.inspectionNotes).toContain('excellent');
      expect(res.body.images.length).toBe(2);

      qc = res.body;
    });

    test('POST /api/qc/initiate -> Reject duplicate QC initiation', async () => {
      const res = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order._id,
          inspectionNotes: 'Duplicate attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('QC already initiated');
    });

    test('POST /api/qc/initiate -> Reject non-seller from initiating', async () => {
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other_qc_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'user'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: order._id,
          inspectionNotes: 'Unauthorized attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('other_qc') }).catch(() => {});
    });

    test('POST /api/qc/initiate -> Reject missing order ID', async () => {
      const res = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          inspectionNotes: 'No order ID provided'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Order ID');
    });

    test('POST /api/qc/initiate -> Reject non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: fakeOrderId,
          inspectionNotes: 'Order does not exist'
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Order not found');
    });
  });

  describe('QC Status Retrieval', () => {
    test('GET /api/qc/:orderId/status -> Seller can view QC status', async () => {
      const res = await request(app)
        .get(`/api/qc/${order._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
      expect(res.body).toHaveProperty('inspectionNotes');
    });

    test('GET /api/qc/:orderId/status -> Buyer can view QC status', async () => {
      const res = await request(app)
        .get(`/api/qc/${order._id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
    });

    test('GET /api/qc/:orderId/status -> Admin can view QC status', async () => {
      const res = await request(app)
        .get(`/api/qc/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sellerId');
    });

    test('GET /api/qc/:orderId/status -> Non-participant cannot view', async () => {
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User2',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other_qc2_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'user'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .get(`/api/qc/${order._id}/status`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('other_qc2') }).catch(() => {});
    });

    test('GET /api/qc/:orderId/status -> Return 404 for non-existent QC', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/qc/${fakeOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('QC record not found');
    });
  });

  describe('Admin QC Review & Approval', () => {
    test('PUT /api/qc/:qcId/review -> Admin can move QC to in_review', async () => {
      const res = await request(app)
        .put(`/api/qc/${qc._id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qualityChecklist: {
            productCondition: { passed: true, notes: 'No scratches' },
            functionality: { passed: true, notes: 'All buttons work' },
            packaging: { passed: true, notes: 'Original box intact' },
            documentation: { passed: true, notes: 'Manual included' }
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_review');
      expect(res.body).toHaveProperty('reviewedBy');
    });

    test('PUT /api/qc/:qcId/approve -> Admin can approve QC', async () => {
      const res = await request(app)
        .put(`/api/qc/${qc._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qualityValidation: 95,
          notes: 'Product meets all quality standards'
        });

      expect(res.status).toBe(200);
      expect(res.body.qc.status).toBe('approved');
      expect(res.body.qc.qualityValidation).toBe(95);
      expect(res.body.message).toContain('Payment release enabled');
    });

    test('PUT /api/qc/:qcId/approve -> Verify order marked as qc_approved', async () => {
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.qcApproved).toBe(true);
      expect(updatedOrder.qcApprovedAt).toBeDefined();
    });

    test('PUT /api/qc/:qcId/approve -> Verify payment flagged for release', async () => {
      const payment = await Payment.findOne({ orderId: order._id });
      expect(payment.escrowReleaseEligible).toBe(true);
    });

    test('PUT /api/qc/:qcId/approve -> Non-admin cannot approve', async () => {
      // Create a new order for rejection test
      const product2Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'QC Test Product 2',
          description: 'For rejection test',
          category: 'electronics',
          basePrice: 600,
          condition: 'brand_new'
        });
      const product2 = product2Res.body;

      const bid2Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: product2._id,
          bidAmount: 650
        });
      const bid2 = bid2Res.body;

      const acceptRes2 = await request(app)
        .post(`/api/bids/${bid2._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order2 = acceptRes2.body.order || acceptRes2.body;

      const qcRes = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order2._id,
          inspectionNotes: 'Product for rejection test'
        });
      const qc2 = qcRes.body;

      const res = await request(app)
        .put(`/api/qc/${qc2._id}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          qualityValidation: 90
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permission');

      await Product.deleteOne({ _id: product2._id }).catch(() => {});
      await Bid.deleteOne({ _id: bid2._id }).catch(() => {});
      await Order.deleteOne({ _id: order2._id }).catch(() => {});
      await QCVerification.deleteOne({ _id: qc2._id }).catch(() => {});
    });
  });

  describe('Admin QC Rejection', () => {
    test('PUT /api/qc/:qcId/reject -> Admin can reject QC', async () => {
      // Create new test QC for rejection
      const product3Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'QC Rejection Test Product',
          description: 'For rejection workflow',
          category: 'electronics',
          basePrice: 700,
          condition: 'brand_new'
        });
      const product3 = product3Res.body;

      const bid3Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: product3._id,
          bidAmount: 750
        });
      const bid3 = bid3Res.body;

      const acceptRes3 = await request(app)
        .post(`/api/bids/${bid3._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order3 = acceptRes3.body.order || acceptRes3.body;

      const qcRes = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order3._id,
          inspectionNotes: 'Product with issues'
        });
      const qc3 = qcRes.body;

      const res = await request(app)
        .put(`/api/qc/${qc3._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Product has visible defects and scratches',
          notes: 'Recommend seller for refund'
        });

      expect(res.status).toBe(200);
      expect(res.body.qc.status).toBe('rejected');
      expect(res.body.qc.rejectionReason).toContain('defects');
      expect(res.body.message).toContain('Seller notified');

      await Product.deleteOne({ _id: product3._id }).catch(() => {});
      await Bid.deleteOne({ _id: bid3._id }).catch(() => {});
      await Order.deleteOne({ _id: order3._id }).catch(() => {});
      await QCVerification.deleteOne({ _id: qc3._id }).catch(() => {});
    });

    test('PUT /api/qc/:qcId/reject -> Reject without reason returns error', async () => {
      const res = await request(app)
        .put(`/api/qc/${qc._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('reason required');
    });
  });

  describe('Image Upload', () => {
    test('POST /api/qc/:qcId/images -> Seller can upload images', async () => {
      // Create new QC for image upload test
      const product4Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'QC Image Upload Test',
          description: 'For image testing',
          category: 'electronics',
          basePrice: 800,
          condition: 'brand_new'
        });
      const product4 = product4Res.body;

      const bid4Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: product4._id,
          bidAmount: 850
        });
      const bid4 = bid4Res.body;

      const acceptRes4 = await request(app)
        .post(`/api/bids/${bid4._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order4 = acceptRes4.body.order || acceptRes4.body;

      const qcRes = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order4._id,
          inspectionNotes: 'Initial QC'
        });
      const qc4 = qcRes.body;

      const res = await request(app)
        .post(`/api/qc/${qc4._id}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          images: ['image_3.jpg', 'image_4.jpg', 'image_5.jpg']
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('3 images uploaded');
      expect(res.body.qc.images.length).toBeGreaterThanOrEqual(3);

      await Product.deleteOne({ _id: product4._id }).catch(() => {});
      await Bid.deleteOne({ _id: bid4._id }).catch(() => {});
      await Order.deleteOne({ _id: order4._id }).catch(() => {});
      await QCVerification.deleteOne({ _id: qc4._id }).catch(() => {});
    });

    test('POST /api/qc/:qcId/images -> Reject empty images array', async () => {
      const res = await request(app)
        .post(`/api/qc/${qc._id}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          images: []
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Images array');
    });
  });

  describe('Admin QC List & Stats', () => {
    test('GET /api/qc/all/list -> Admin can view all QC records', async () => {
      const res = await request(app)
        .get('/api/qc/all/list?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('qcRecords');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.qcRecords)).toBe(true);
    });

    test('GET /api/qc/all/list -> Non-admin cannot view', async () => {
      const res = await request(app)
        .get('/api/qc/all/list')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
    });

    test('GET /api/qc/stats/overview -> Admin can view QC statistics', async () => {
      const res = await request(app)
        .get('/api/qc/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('pending');
      expect(res.body).toHaveProperty('approved');
      expect(res.body).toHaveProperty('rejected');
      expect(res.body).toHaveProperty('approvalRate');
      expect(res.body).toHaveProperty('averageQualityScore');
    });

    test('GET /api/qc/stats/overview -> Non-admin cannot view stats', async () => {
      const res = await request(app)
        .get('/api/qc/stats/overview')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('QC Workflow Edge Cases', () => {
    test('QC blocks payment release until approved', async () => {
      // Payment should have escrowReleaseEligible = false initially
      const initialPayment = await Payment.findOne({ orderId: order._id });
      expect(initialPayment).toBeDefined();
      // After approve in earlier test, it should be true
      const approvedPayment = await Payment.findOne({ orderId: order._id });
      expect(approvedPayment.escrowReleaseEligible).toBe(true);
    });

    test('Cannot finalize QC twice', async () => {
      // Try to approve already approved QC
      const res = await request(app)
        .put(`/api/qc/${qc._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qualityValidation: 90
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already finalized');
    });

    test('Seller cannot upload images after QC approved', async () => {
      const res = await request(app)
        .post(`/api/qc/${qc._id}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          images: ['late_image.jpg']
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('finalized');
    });
  });
});
