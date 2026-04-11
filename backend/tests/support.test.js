const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const SupportTicket = require('../src/models/SupportTicket');
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

describe('Support Ticket Controller', () => {
  let sellerToken;
  let buyerToken;
  let adminToken;
  let seller;
  let buyer;
  let admin;
  let sharedOrderId;
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

  const createAdminAccount = async () => {
    const suffix = uniqueSuffix();
    const adminUser = await User.create({
      firstName: 'Support',
      lastName: 'Admin',
      phone: `+1666${suffix.slice(-7)}`,
      email: `support_admin_${suffix}@test.com`,
      password: 'Test1234',
      role: 'admin'
    });

    createdUserIds.push(adminUser._id.toString());

    return {
      user: {
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role
      },
      token: jwt.sign(
        {
          id: adminUser._id.toString(),
          role: 'admin',
          email: adminUser.email
        },
        process.env.JWT_SECRET
      )
    };
  };

  const createAuctionOrder = async ({
    titlePrefix = 'Support Test Product',
    description = 'Product for support testing',
    basePrice = 100,
    bidAmount = 120
  } = {}) => {
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: `${titlePrefix} ${uniqueSuffix()}`,
        description,
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

    const bidId = bidResponse.body.data.id;

    await request(app)
      .post(`/api/bids/${bidId}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const confirmResponse = await request(app)
      .post(`/api/bids/${bidId}/confirm-win`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    return confirmResponse.body.data.order.id;
  };

  const createSupportTicket = ({
    token = buyerToken,
    orderId = sharedOrderId,
    subject = 'Product not as described',
    description = 'The product condition does not match the listing and there are visible issues throughout.',
    category = 'product_quality'
  } = {}) => (
    request(app)
      .post('/api/support')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        subject,
        description,
        category
      })
  );

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'SupportSeller' });
    sellerToken = sellerAccount.token;
    seller = sellerAccount.user;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'SupportBuyer' });
    buyerToken = buyerAccount.token;
    buyer = buyerAccount.user;

    const adminAccount = await createAdminAccount();
    adminToken = adminAccount.token;
    admin = adminAccount.user;

    sharedOrderId = await createAuctionOrder();
  });

  afterAll(async () => {
    await SupportTicket.deleteMany({}).catch(() => {});
    await Order.deleteMany({}).catch(() => {});
    await Bid.deleteMany({}).catch(() => {});
    await Product.deleteMany({}).catch(() => {});
    await User.deleteMany({ _id: { $in: createdUserIds.filter(Boolean) } }).catch(() => {});
    await disconnectDB();
  });

  describe('Ticket Creation', () => {
    test('POST /api/support -> creates a support ticket', async () => {
      const response = await createSupportTicket().expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.subject).toBe('Product not as described');
      expect(response.body.status).toBe('open');
      expect(response.body.category).toBe('product_quality');
      expect(response.body.messages.length).toBeGreaterThan(0);
    });

    test('POST /api/support -> rejects short subjects', async () => {
      const response = await createSupportTicket({
        subject: 'Help',
        description: 'This is a long enough description for testing purposes.',
        category: 'product_quality'
      }).expect(400);

      expect(response.body.message).toContain('at least 5 characters');
    });

    test('POST /api/support -> rejects short descriptions', async () => {
      const response = await createSupportTicket({
        subject: 'Issue with order',
        description: 'Short desc',
        category: 'product_quality'
      }).expect(400);

      expect(response.body.message).toContain('at least 20 characters');
    });

    test('POST /api/support -> rejects invalid categories', async () => {
      const response = await createSupportTicket({
        subject: 'Issue with order',
        description: 'This is a valid description with enough characters for testing.',
        category: 'invalid_category'
      }).expect(400);

      expect(response.body.message).toContain('must be one of');
    });

    test('POST /api/support -> rejects non-participants', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'SupportOtherCreate' });

      const response = await createSupportTicket({
        token: otherAccount.token,
        subject: 'Trying to interfere',
        description: 'This should not be allowed for non-participants in the order.',
        category: 'product_quality'
      }).expect(403);

      expect(response.body.message).toContain('order participants');
    });

    test('POST /api/support -> rejects non-existent orders', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();

      const response = await createSupportTicket({
        orderId: fakeOrderId,
        subject: 'Valid subject text',
        description: 'This is a valid description with enough characters for testing.',
        category: 'product_quality'
      }).expect(404);

      expect(response.body.message).toContain('Order not found');
    });
  });

  describe('Ticket Retrieval', () => {
    let ticketId;

    beforeAll(async () => {
      const response = await createSupportTicket({
        subject: 'Delivery issue',
        description: 'The package arrived late and was not in its original condition when received.',
        category: 'delivery_issue'
      }).expect(201);

      ticketId = response.body._id.toString();
    });

    test('GET /api/support -> users can retrieve their own tickets', async () => {
      const response = await request(app)
        .get('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(response.body.tickets.length).toBeGreaterThan(0);
    });

    test('GET /api/support -> admins can retrieve all tickets', async () => {
      const response = await request(app)
        .get('/api/support')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.tickets.length).toBeGreaterThan(0);
    });

    test('GET /api/support/:ticketId -> participants can retrieve a single ticket', async () => {
      const response = await request(app)
        .get(`/api/support/${ticketId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body._id.toString()).toBe(ticketId);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    test('GET /api/support/:ticketId -> rejects unauthorized access', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'SupportOtherRead' });

      const response = await request(app)
        .get(`/api/support/${ticketId}`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('GET /api/support/:ticketId -> returns 404 for unknown tickets', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/support/${fakeId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Ticket not found');
    });
  });

  describe('Ticket Messages', () => {
    let ticketId;

    beforeAll(async () => {
      const response = await createSupportTicket({
        subject: 'Payment issue',
        description: 'I was charged twice for this order and need a refund for the duplicate charge.',
        category: 'payment_issue'
      }).expect(201);

      ticketId = response.body._id.toString();
    });

    test('POST /api/support/:ticketId/message -> participants can add messages', async () => {
      const response = await request(app)
        .post(`/api/support/${ticketId}/message`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          message: 'I have investigated this issue and can help resolve the duplicate charge.'
        })
        .expect(200);

      expect(response.body.messages.length).toBeGreaterThan(1);
      expect(response.body.messages[response.body.messages.length - 1].message).toContain('duplicate charge');
    });

    test('POST /api/support/:ticketId/message -> rejects short messages', async () => {
      const response = await request(app)
        .post(`/api/support/${ticketId}/message`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ message: 'OK' })
        .expect(400);

      expect(response.body.message).toContain('at least 5 characters');
    });

    test('POST /api/support/:ticketId/message -> rejects non-participants', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'SupportOtherMessage' });

      const response = await request(app)
        .post(`/api/support/${ticketId}/message`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .send({
          message: 'Trying to interfere with this support conversation.'
        })
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Ticket Status Management (Admin)', () => {
    let ticketId;

    beforeAll(async () => {
      const response = await createSupportTicket({
        subject: 'Order dispute',
        description: 'There is a disagreement with the seller regarding product authenticity and condition claims.',
        category: 'dispute'
      }).expect(201);

      ticketId = response.body._id.toString();
    });

    test('PUT /api/support/:ticketId/status -> admins can mark tickets in progress', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_progress',
          resolution: 'Investigating product authenticity claims'
        })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
      expect(response.body.resolution).toContain('Investigating');
    });

    test('PUT /api/support/:ticketId/status -> admins can resolve tickets', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          resolution: 'Seller has agreed to accept a return and issue a refund.'
        })
        .expect(200);

      expect(response.body.status).toBe('resolved');
      expect(response.body).toHaveProperty('resolvedAt');
    });

    test('PUT /api/support/:ticketId/status -> non-admins cannot update status', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'closed' })
        .expect(403);

      expect(response.body.message).toContain('permissions');
    });

    test('PUT /api/support/:ticketId/status -> rejects invalid statuses', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.message).toContain('must be one of');
    });
  });

  describe('Ticket Assignment', () => {
    let ticketId;

    beforeAll(async () => {
      const response = await createSupportTicket({
        subject: 'Urgent delivery complaint',
        description: 'The package never arrived and tracking incorrectly shows it was delivered.',
        category: 'delivery_issue'
      }).expect(201);

      ticketId = response.body._id.toString();
    });

    test('PUT /api/support/:ticketId/assign -> admins can assign tickets to admins', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedToId: admin.id
        })
        .expect(200);

      expect(getId(response.body.assignedTo)).toBe(admin.id);
    });

    test('PUT /api/support/:ticketId/assign -> non-admins cannot assign tickets', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/assign`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          assignedToId: admin.id
        })
        .expect(403);

      expect(response.body.message).toContain('permissions');
    });

    test('PUT /api/support/:ticketId/assign -> rejects non-admin assignees', async () => {
      const response = await request(app)
        .put(`/api/support/${ticketId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedToId: buyer.id
        })
        .expect(400);

      expect(response.body.message).toContain('must be an admin');
    });
  });

  describe('Ticket Statistics (Admin)', () => {
    test('GET /api/support/stats -> admins can retrieve ticket statistics', async () => {
      const response = await request(app)
        .get('/api/support/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('open');
      expect(response.body).toHaveProperty('inProgress');
      expect(response.body).toHaveProperty('resolved');
      expect(response.body).toHaveProperty('closed');
      expect(response.body).toHaveProperty('byCategory');
      expect(response.body).toHaveProperty('avgResolutionTimeHours');
    });

    test('GET /api/support/stats -> non-admins cannot view statistics', async () => {
      const response = await request(app)
        .get('/api/support/stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.message).toContain('permissions');
    });
  });

  describe('Ticket Closing', () => {
    let ticketId;

    beforeAll(async () => {
      const response = await createSupportTicket({
        subject: 'Product question',
        description: 'I need more information about the product specifications and warranty coverage.',
        category: 'other'
      }).expect(201);

      ticketId = response.body._id.toString();
    });

    test('POST /api/support/:ticketId/close -> ticket creators can close their tickets', async () => {
      const response = await request(app)
        .post(`/api/support/${ticketId}/close`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          feedback: 'Issue resolved satisfactorily'
        })
        .expect(200);

      expect(response.body.status).toBe('closed');
      expect(response.body.feedback).toContain('resolved');
      expect(response.body).toHaveProperty('closedAt');
    });

    test('POST /api/support/:ticketId/close -> only the creator or an admin can close', async () => {
      const ticketResponse = await createSupportTicket({
        token: sellerToken,
        subject: 'Seller payment issue',
        description: 'I have not received payment for the completed order yet and need help.',
        category: 'payment_issue'
      }).expect(201);

      const otherAccount = await registerUser({ role: 'buyer', label: 'SupportOtherClose' });

      const response = await request(app)
        .post(`/api/support/${ticketResponse.body._id}/close`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .send({
          feedback: 'Attempting to close someone elses ticket'
        })
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });
});
