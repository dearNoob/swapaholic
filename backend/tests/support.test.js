const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const SupportTicket = require('../src/models/SupportTicket');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Support Ticket Controller', () => {
  let sellerToken, buyerToken, adminToken, seller, buyer, admin, product, bid, order;

  beforeAll(async () => {
    await connectDB();

    // Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Support',
        lastName: 'Seller',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `seller_support_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'seller'
      });
    sellerToken = sellerRes.body.token;
    seller = sellerRes.body.user;

    // Create buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Support',
        lastName: 'Buyer',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `buyer_support_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'buyer'
      });
    buyerToken = buyerRes.body.token;
    buyer = buyerRes.body.user;

    // Create admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Support',
        lastName: 'Admin',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `admin_support_${Math.random()}@test.com`,
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
        title: 'Support Test Product',
        description: 'Product for support testing',
        category: 'electronics',
        basePrice: 100,
        condition: 'good'
      });
    product = productRes.body;

    // Create bid
    const bidRes = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ productId: product._id, bidAmount: 120 });
    bid = bidRes.body;

    // Accept bid
    await request(app)
      .post(`/api/bids/${bid._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`);

    // Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidId: bid._id });
    order = orderRes.body;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /^seller_support_|^buyer_support_|^admin_support_/ }).catch(() => {});
    await Product.deleteMany({ title: /Support Test/ }).catch(() => {});
    await SupportTicket.deleteMany({ userId: seller.id }).catch(() => {});
    await disconnectDB();
  });

  describe('Ticket Creation', () => {
    test('POST /api/support -> Create support ticket', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Product not as described',
          description: 'The product condition does not match the listing. It has visible scratches and the packaging was damaged.',
          category: 'product_quality'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.subject).toBe('Product not as described');
      expect(res.body.status).toBe('open');
      expect(res.body.category).toBe('product_quality');
      expect(res.body.messages.length).toBeGreaterThan(0);
    });

    test('POST /api/support -> Reject with short subject', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Help',
          description: 'This is a long enough description for testing purposes',
          category: 'product_quality'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 5 characters');
    });

    test('POST /api/support -> Reject with short description', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Issue with order',
          description: 'Short desc',
          category: 'product_quality'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 20 characters');
    });

    test('POST /api/support -> Reject with invalid category', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Issue with order',
          description: 'This is a valid description with enough characters for testing',
          category: 'invalid_category'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('must be one of');
    });

    test('POST /api/support -> Reject if not order participant', async () => {
      // Create another user
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other_support_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: order._id,
          subject: 'Trying to interfere',
          description: 'This should not be allowed for non-participants in the order',
          category: 'product_quality'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('order participants');

      // Cleanup
      await User.deleteOne({ email: new RegExp('other_support') }).catch(() => {});
    });

    test('POST /api/support -> Reject with non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: fakeOrderId,
          subject: 'Valid subject text',
          description: 'This is a valid description with enough characters for testing',
          category: 'product_quality'
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Order not found');
    });
  });

  describe('Ticket Retrieval', () => {
    let ticketId;

    beforeAll(async () => {
      // Create a ticket for retrieval tests
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Delivery issue',
          description: 'The package arrived late and was not in original condition when received',
          category: 'delivery_issue'
        });
      ticketId = res.body._id;
    });

    test('GET /api/support -> Get user tickets', async () => {
      const res = await request(app)
        .get('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tickets');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.tickets)).toBe(true);
      expect(res.body.tickets.length).toBeGreaterThan(0);
    });

    test('GET /api/support -> Admin sees all tickets', async () => {
      const res = await request(app)
        .get('/api/support')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThan(0);
    });

    test('GET /api/support/:ticketId -> Get single ticket', async () => {
      const res = await request(app)
        .get(`/api/support/${ticketId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(ticketId);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    test('GET /api/support/:ticketId -> Reject unauthorized access', async () => {
      // Create another user
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other2_support_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .get(`/api/support/${ticketId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      // Cleanup
      await User.deleteOne({ email: new RegExp('other2_support') }).catch(() => {});
    });

    test('GET /api/support/:ticketId -> Return 404 for non-existent ticket', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/support/${fakeId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Ticket not found');
    });
  });

  describe('Ticket Messages', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Payment issue',
          description: 'I was charged twice for this order and need immediate refund for the duplicate charge',
          category: 'payment_issue'
        });
      ticketId = res.body._id;
    });

    test('POST /api/support/:ticketId/message -> Add message to ticket', async () => {
      const res = await request(app)
        .post(`/api/support/${ticketId}/message`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          message: 'I have investigated this issue and can confirm the duplicate charge. Let me help resolve this.'
        });

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBeGreaterThan(1);
      expect(res.body.messages[res.body.messages.length - 1].message).toContain('duplicate charge');
    });

    test('POST /api/support/:ticketId/message -> Reject short message', async () => {
      const res = await request(app)
        .post(`/api/support/${ticketId}/message`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          message: 'OK'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 5 characters');
    });

    test('POST /api/support/:ticketId/message -> Non-participant cannot add message', async () => {
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Third',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `third_support_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .post(`/api/support/${ticketId}/message`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          message: 'Trying to interfere with this support ticket conversation here'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('third_support') }).catch(() => {});
    });
  });

  describe('Ticket Status Management (Admin)', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Order dispute',
          description: 'There is a fundamental disagreement with the seller regarding product authenticity and condition claims',
          category: 'dispute'
        });
      ticketId = res.body._id;
    });

    test('PUT /api/support/:ticketId/status -> Admin updates status to in_progress', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_progress',
          resolution: 'Investigating product authenticity claims'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
      expect(res.body.resolution).toContain('Investigating');
    });

    test('PUT /api/support/:ticketId/status -> Admin resolves ticket', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          resolution: 'Seller has agreed to accept return and issue refund'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('resolved');
      expect(res.body).toHaveProperty('resolvedAt');
    });

    test('PUT /api/support/:ticketId/status -> Non-admin cannot update status', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          status: 'closed'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissions');
    });

    test('PUT /api/support/:ticketId/status -> Reject invalid status', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('must be one of');
    });
  });

  describe('Ticket Assignment', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Urgent delivery complaint',
          description: 'Package never arrived and tracking shows it was delivered. Need immediate assistance to locate package',
          category: 'delivery_issue'
        });
      ticketId = res.body._id;
    });

    test('PUT /api/support/:ticketId/assign -> Admin assigns ticket to admin', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedToId: admin.id
        });

      expect(res.status).toBe(200);
      expect(res.body.assignedTo._id).toBe(admin.id);
    });

    test('PUT /api/support/:ticketId/assign -> Non-admin cannot assign', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/assign`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          assignedToId: admin.id
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissions');
    });

    test('PUT /api/support/:ticketId/assign -> Cannot assign to non-admin', async () => {
      const res = await request(app)
        .put(`/api/support/${ticketId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedToId: buyer.id
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('must be an admin');
    });
  });

  describe('Ticket Statistics (Admin)', () => {
    test('GET /api/support/stats -> Get ticket statistics', async () => {
      const res = await request(app)
        .get('/api/support/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('open');
      expect(res.body).toHaveProperty('inProgress');
      expect(res.body).toHaveProperty('resolved');
      expect(res.body).toHaveProperty('closed');
      expect(res.body).toHaveProperty('byCategory');
      expect(res.body).toHaveProperty('avgResolutionTimeHours');
    });

    test('GET /api/support/stats -> Non-admin cannot view statistics', async () => {
      const res = await request(app)
        .get('/api/support/stats')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissions');
    });
  });

  describe('Ticket Closing', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          subject: 'Product question',
          description: 'I have a question about the product specifications and usage. Can you provide more information about the warranty coverage',
          category: 'other'
        });
      ticketId = res.body._id;
    });

    test('POST /api/support/:ticketId/close -> User closes their ticket', async () => {
      const res = await request(app)
        .post(`/api/support/${ticketId}/close`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          feedback: 'Issue resolved satisfactorily'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('closed');
      expect(res.body.feedback).toContain('resolved');
      expect(res.body).toHaveProperty('closedAt');
    });

    test('POST /api/support/:ticketId/close -> Only user or admin can close', async () => {
      // Create a new ticket
      const ticketRes = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order._id,
          subject: 'Seller payment issue',
          description: 'I have not received payment for the completed order yet. The delivery was confirmed and accepted',
          category: 'payment_issue'
        });
      const newTicketId = ticketRes.body._id;

      // Try to close with different user
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Fourth',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `fourth_support_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .post(`/api/support/${newTicketId}/close`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          feedback: 'Attempting to close someone elses ticket'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('fourth_support') }).catch(() => {});
    });
  });
});
