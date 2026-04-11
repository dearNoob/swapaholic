const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const QCVerification = require('../src/models/QCVerification');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

const uniqueSuffix = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const getId = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value.id) return value.id.toString();
  if (value._id) return value._id.toString();
  return value.toString();
};

describe('QC Verification System', () => {
  let sellerToken;
  let buyerToken;
  let adminToken;
  let seller;
  let buyer;
  let mainFlow;
  let mainQcId;
  const createdUserIds = [];

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

    const user = response.body.data.user;
    const normalizedUser = {
      ...user,
      id: getId(user)
    };

    createdUserIds.push(normalizedUser.id);

    return {
      token: response.body.data.accessToken,
      user: normalizedUser
    };
  };

  const createAdminToken = () => jwt.sign(
    {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'admin',
      email: `qc_admin_${uniqueSuffix()}@test.com`
    },
    process.env.JWT_SECRET
  );

  const createAuctionOrder = async ({
    titlePrefix = 'QC Test Product',
    description = 'Product for QC verification testing',
    basePrice = 500,
    bidAmount = 550
  } = {}) => {
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `${titlePrefix} ${uniqueSuffix()}`,
        description,
        category: 'electronics',
        basePrice,
        condition: 'brand_new'
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
      orderId: confirmResponse.body.data.order.id,
      finalPrice: confirmResponse.body.data.order.finalPrice
    };
  };

  const createOrderWithPayment = async ({
    titlePrefix = 'QC Flow Product',
    basePrice = 500,
    bidAmount = 550
  } = {}) => {
    const flow = await createAuctionOrder({ titlePrefix, basePrice, bidAmount });

    await Payment.create({
      orderId: flow.orderId,
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: flow.finalPrice,
      status: 'escrowed',
      paymentMethod: 'card',
      transactionId: `txn_${uniqueSuffix()}`
    });

    return flow;
  };

  const initiateQcForFlow = (flow, payload = {}, token = sellerToken) => (
    request(app)
      .post('/api/qc/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: flow.orderId,
        inspectionNotes: 'Product in excellent condition, all components functional.',
        ...payload
      })
  );

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'QCSeller' });
    sellerToken = sellerAccount.token;
    seller = sellerAccount.user;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'QCBuyer' });
    buyerToken = buyerAccount.token;
    buyer = buyerAccount.user;

    adminToken = createAdminToken();

    mainFlow = await createOrderWithPayment({ titlePrefix: 'QC Main Product' });
  });

  afterAll(async () => {
    await QCVerification.deleteMany({}).catch(() => {});
    await Payment.deleteMany({}).catch(() => {});
    await Order.deleteMany({}).catch(() => {});
    await Bid.deleteMany({}).catch(() => {});
    await Product.deleteMany({}).catch(() => {});
    await User.deleteMany({ _id: { $in: createdUserIds.filter(Boolean) } }).catch(() => {});
    await disconnectDB();
  });

  describe('QC Initiation', () => {
    test('POST /api/qc/initiate -> seller can initiate QC', async () => {
      const response = await initiateQcForFlow(mainFlow, {
        images: ['image_url_1.jpg', 'image_url_2.jpg']
      }).expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.status).toBe('pending');
      expect(response.body.inspectionNotes).toContain('excellent');
      expect(response.body.images).toHaveLength(2);
      expect(response.body.images[0].url).toBe('image_url_1.jpg');

      mainQcId = response.body._id.toString();
    });

    test('POST /api/qc/initiate -> rejects duplicate QC initiation', async () => {
      const response = await initiateQcForFlow(mainFlow, {
        inspectionNotes: 'Duplicate attempt'
      }).expect(400);

      expect(response.body.message).toContain('QC already initiated');
    });

    test('POST /api/qc/initiate -> rejects non-sellers', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'QCOtherInit' });

      const response = await initiateQcForFlow(mainFlow, {
        inspectionNotes: 'Unauthorized attempt'
      }, otherAccount.token).expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('POST /api/qc/initiate -> rejects missing order IDs', async () => {
      const response = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ inspectionNotes: 'No order ID provided' })
        .expect(400);

      expect(response.body.message).toContain('Order ID');
    });

    test('POST /api/qc/initiate -> rejects non-existent orders', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/qc/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: fakeOrderId,
          inspectionNotes: 'Order does not exist'
        })
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });
  });

  describe('QC Status Retrieval', () => {
    test('GET /api/qc/:orderId/status -> seller can view QC status', async () => {
      const response = await request(app)
        .get(`/api/qc/${mainFlow.orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.status).toBe('pending');
      expect(response.body).toHaveProperty('inspectionNotes');
    });

    test('GET /api/qc/:orderId/status -> buyer can view QC status', async () => {
      const response = await request(app)
        .get(`/api/qc/${mainFlow.orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.status).toBe('pending');
    });

    test('GET /api/qc/:orderId/status -> admin can view QC status', async () => {
      const response = await request(app)
        .get(`/api/qc/${mainFlow.orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sellerId');
      expect(getId(response.body.sellerId)).toBe(seller.id);
    });

    test('GET /api/qc/:orderId/status -> non-participants cannot view QC', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'QCOtherStatus' });

      const response = await request(app)
        .get(`/api/qc/${mainFlow.orderId}/status`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('GET /api/qc/:orderId/status -> returns 404 for missing QC records', async () => {
      const otherFlow = await createOrderWithPayment({ titlePrefix: 'QC Missing Status Product' });

      const response = await request(app)
        .get(`/api/qc/${otherFlow.orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('QC record not found');
    });
  });

  describe('Admin QC Review & Approval', () => {
    test('PUT /api/qc/:qcId/review -> admin can move QC to in_review', async () => {
      const response = await request(app)
        .put(`/api/qc/${mainQcId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qualityChecklist: {
            productCondition: { passed: true, notes: 'No scratches' },
            functionality: { passed: true, notes: 'All buttons work' },
            packaging: { passed: true, notes: 'Original box intact' },
            documentation: { passed: true, notes: 'Manual included' }
          }
        })
        .expect(200);

      expect(response.body.status).toBe('in_review');
      expect(response.body).toHaveProperty('reviewedBy');
    });

    test('PUT /api/qc/:qcId/approve -> admin can approve QC', async () => {
      const response = await request(app)
        .put(`/api/qc/${mainQcId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qualityValidation: 95,
          notes: 'Product meets all quality standards'
        })
        .expect(200);

      expect(response.body.qc.status).toBe('approved');
      expect(response.body.qc.qualityValidation).toBe(95);
      expect(response.body.message).toContain('Payment release enabled');
    });

    test('PUT /api/qc/:qcId/approve -> marks the order as qc_approved', async () => {
      const updatedOrder = await Order.findById(mainFlow.orderId);

      expect(updatedOrder.qcApproved).toBe(true);
      expect(updatedOrder.qcApprovedAt).toBeDefined();
      expect(updatedOrder.status).toBe('qc_approved');
    });

    test('PUT /api/qc/:qcId/approve -> flags escrowed payments for release', async () => {
      const payment = await Payment.findOne({ orderId: mainFlow.orderId });

      expect(payment.escrowReleaseEligible).toBe(true);
    });

    test('PUT /api/qc/:qcId/approve -> non-admins cannot approve QC', async () => {
      const flow = await createOrderWithPayment({ titlePrefix: 'QC Non Admin Approve Product' });
      const qcResponse = await initiateQcForFlow(flow, {
        inspectionNotes: 'Product for non-admin approval test'
      }).expect(201);

      const response = await request(app)
        .put(`/api/qc/${qcResponse.body._id}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ qualityValidation: 90 })
        .expect(403);

      expect(response.body.message).toContain('permission');
    });
  });

  describe('Admin QC Rejection', () => {
    test('PUT /api/qc/:qcId/reject -> admin can reject QC', async () => {
      const flow = await createOrderWithPayment({ titlePrefix: 'QC Rejection Product' });
      const qcResponse = await initiateQcForFlow(flow, {
        inspectionNotes: 'Product with issues'
      }).expect(201);

      const response = await request(app)
        .put(`/api/qc/${qcResponse.body._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Product has visible defects and scratches',
          notes: 'Recommend seller for refund'
        })
        .expect(200);

      expect(response.body.qc.status).toBe('rejected');
      expect(response.body.qc.rejectionReason).toContain('defects');
      expect(response.body.message).toContain('Seller notified');
    });

    test('PUT /api/qc/:qcId/reject -> rejecting without a reason fails', async () => {
      const flow = await createOrderWithPayment({ titlePrefix: 'QC Missing Rejection Reason Product' });
      const qcResponse = await initiateQcForFlow(flow, {
        inspectionNotes: 'Needs a rejection reason test'
      }).expect(201);

      const response = await request(app)
        .put(`/api/qc/${qcResponse.body._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('reason required');
    });
  });

  describe('Image Upload', () => {
    test('POST /api/qc/:qcId/images -> seller can upload images to pending QC', async () => {
      const flow = await createOrderWithPayment({ titlePrefix: 'QC Image Upload Product' });
      const qcResponse = await initiateQcForFlow(flow, {
        inspectionNotes: 'Initial QC'
      }).expect(201);

      const response = await request(app)
        .post(`/api/qc/${qcResponse.body._id}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          images: ['image_3.jpg', 'image_4.jpg', 'image_5.jpg']
        })
        .expect(200);

      expect(response.body.message).toContain('3 images uploaded');
      expect(response.body.qc.images.length).toBeGreaterThanOrEqual(3);
    });

    test('POST /api/qc/:qcId/images -> rejects empty image arrays', async () => {
      const flow = await createOrderWithPayment({ titlePrefix: 'QC Empty Images Product' });
      const qcResponse = await initiateQcForFlow(flow, {
        inspectionNotes: 'QC for empty image validation'
      }).expect(201);

      const response = await request(app)
        .post(`/api/qc/${qcResponse.body._id}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ images: [] })
        .expect(400);

      expect(response.body.message).toContain('Images array');
    });
  });

  describe('Admin QC List & Stats', () => {
    test('GET /api/qc/all/list -> admin can view all QC records', async () => {
      const response = await request(app)
        .get('/api/qc/all/list?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('qcRecords');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.qcRecords)).toBe(true);
      expect(response.body.qcRecords.length).toBeGreaterThan(0);
    });

    test('GET /api/qc/all/list -> non-admins cannot view the QC list', async () => {
      await request(app)
        .get('/api/qc/all/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });

    test('GET /api/qc/stats/overview -> admin can view QC statistics', async () => {
      const response = await request(app)
        .get('/api/qc/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('approvalRate');
      expect(response.body).toHaveProperty('averageQualityScore');
    });

    test('GET /api/qc/stats/overview -> non-admins cannot view stats', async () => {
      await request(app)
        .get('/api/qc/stats/overview')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('QC Workflow Edge Cases', () => {
    test('QC blocks payment release until approved', async () => {
      const flow = await createOrderWithPayment({ titlePrefix: 'QC Payment Block Product' });
      const pendingPayment = await Payment.findOne({ orderId: flow.orderId });

      expect(pendingPayment).toBeDefined();
      expect(pendingPayment.escrowReleaseEligible).toBe(false);

      const qcResponse = await initiateQcForFlow(flow, {
        inspectionNotes: 'Pending QC payment gate test'
      }).expect(201);

      await request(app)
        .put(`/api/qc/${qcResponse.body._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ qualityValidation: 88 })
        .expect(200);

      const approvedPayment = await Payment.findOne({ orderId: flow.orderId });
      expect(approvedPayment.escrowReleaseEligible).toBe(true);
    });

    test('Cannot finalize QC twice', async () => {
      const response = await request(app)
        .put(`/api/qc/${mainQcId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ qualityValidation: 90 })
        .expect(400);

      expect(response.body.message).toContain('already finalized');
    });

    test('Seller cannot upload images after QC approved', async () => {
      const response = await request(app)
        .post(`/api/qc/${mainQcId}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          images: ['late_image.jpg']
        })
        .expect(400);

      expect(response.body.message).toContain('finalized');
    });
  });
});
