const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Delivery = require('../src/models/Delivery');
const logger = require('../src/utils/logger');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Delivery Tracking System', () => {
  let sellerToken, buyerToken, adminToken, seller, buyer, admin, product, bid, order, delivery;

  beforeAll(async () => {
    try {
      await connectDB();

      // Create seller
      const sellerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Delivery',
          lastName: 'Seller',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `seller_delivery_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'seller'
        });
      sellerToken = sellerRes.body.token;
      seller = sellerRes.body.user;

      // Create buyer
      const buyerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Delivery',
          lastName: 'Buyer',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `buyer_delivery_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      buyerToken = buyerRes.body.token;
      buyer = buyerRes.body.user;

      // Create admin
      const adminRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Delivery',
          lastName: 'Admin',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `admin_delivery_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'admin'
        });
      adminToken = adminRes.body.token;
      admin = adminRes.body.user;

      // Create delivery person
      const deliveryRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Delivery',
          lastName: 'Person',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `deliveryman_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const deliveryPerson = deliveryRes.body.user;
      if (!deliveryPerson || !(deliveryPerson._id || deliveryPerson.id)) {
        throw new Error(`Delivery person creation failed: ${JSON.stringify(deliveryRes.body)}`);
      }

      // Create product
      const productRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Delivery Test Product',
          description: 'This is a product for testing delivery tracking system',
          category: 'Electronics',
          condition: 'brand_new',
          basePrice: 500,
          location: 'New York',
          geometry: {
            type: 'Point',
            coordinates: [-74.0060, 40.7128]
          }
        });
      product = productRes.body;

      if (!product._id) {
        throw new Error('Product creation failed');
      }

      // Create bid
      const bidRes = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: product._id,
          bidAmount: 550
        });
      bid = bidRes.body;

      if (!bid._id) {
        throw new Error('Bid creation failed');
      }

      // Accept bid to create order
      const orderRes = await request(app)
        .post(`/api/bids/${bid._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      // Accept response may include { message, bid, order }
      if (orderRes.status !== 200) {
        throw new Error(`Order accept failed: ${JSON.stringify(orderRes.body)}`);
      }

      order = orderRes.body.order || orderRes.body;

      if (!order || !order._id) {
        throw new Error(`Order creation failed, response: ${JSON.stringify(orderRes.body)}`);
      }

      // Create delivery record directly using mongoose
      delivery = await Delivery.create({
        orderId: order._id,
        deliveryPersonId: deliveryPerson.id || deliveryPerson._id,
        status: 'assigned',
        pickupLocation: 'New York',
        deliveryLocation: 'Los Angeles',
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      logger.error('BeforeAll setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await Delivery.deleteMany({ orderId: order._id }).catch(() => {});
    await Order.deleteOne({ _id: order._id }).catch(() => {});
    await Bid.deleteOne({ _id: bid._id }).catch(() => {});
    await Product.deleteOne({ _id: product._id }).catch(() => {});
    await User.deleteMany({ email: new RegExp('delivery') }).catch(() => {});
    await disconnectDB();
  });

  describe('Delivery Tracking', () => {
    test('GET /api/delivery/:orderId/track -> Buyer can track delivery', async () => {
      const res = await request(app)
        .get(`/api/delivery/${order._id}/track`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('orderId');
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('assigned');
    });

    test('GET /api/delivery/:orderId/track -> Seller can track delivery', async () => {
      const res = await request(app)
        .get(`/api/delivery/${order._id}/track`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orderId._id || res.body.orderId).toEqual(order._id.toString());
    });

    test('GET /api/delivery/:orderId/track -> Admin can track delivery', async () => {
      const res = await request(app)
        .get(`/api/delivery/${order._id}/track`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('deliveryPersonId');
    });

    test('GET /api/delivery/:orderId/track -> Non-participant cannot track', async () => {
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other_delivery_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .get(`/api/delivery/${order._id}/track`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('other_delivery') }).catch(() => {});
    });

    test('GET /api/delivery/:orderId/track -> Return 404 for non-existent delivery', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/delivery/${fakeOrderId}/track`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('Delivery Status Updates', () => {
    test('PUT /api/delivery/:orderId/status -> Update to picked_up', async () => {
      const res = await request(app)
        .put(`/api/delivery/${order._id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          status: 'picked_up',
          currentLocation: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('picked_up');
      expect(res.body).toHaveProperty('pickupTime');
    });

    test('PUT /api/delivery/:orderId/status -> Update to in_transit with route tracking', async () => {
      const res = await request(app)
        .put(`/api/delivery/${order._id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          status: 'in_transit',
          currentLocation: {
            latitude: 39.7392,
            longitude: -104.9903
          },
          notes: 'On the way to Los Angeles'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_transit');
      expect(res.body.deliveryRoute.length).toBeGreaterThan(0);
      expect(res.body.geoTag).toHaveProperty('latitude');
    });

    test('PUT /api/delivery/:orderId/status -> Update to delivered with proof', async () => {
      const res = await request(app)
        .put(`/api/delivery/${order._id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          status: 'delivered',
          currentLocation: {
            latitude: 34.0522,
            longitude: -118.2437
          },
          proofOfDelivery: 'base64_encoded_image_here'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('delivered');
      expect(res.body).toHaveProperty('deliveryTime');
      expect(res.body.proofOfDelivery).toBe('base64_encoded_image_here');
    });

    test('PUT /api/delivery/:orderId/status -> Invalid status returns error', async () => {
      const res = await request(app)
        .put(`/api/delivery/${order._id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('must be one of');
    });

    test('PUT /api/delivery/:orderId/status -> Non-delivery person cannot update', async () => {
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other_delivery2_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .put(`/api/delivery/${order._id}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          status: 'in_transit'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('other_delivery2') }).catch(() => {});
    });
  });

  describe('Delivery History', () => {
    test('GET /api/delivery/:orderId/history -> Get delivery history with milestones', async () => {
      const res = await request(app)
        .get(`/api/delivery/${order._id}/history`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('orderId');
      expect(res.body).toHaveProperty('currentStatus');
      expect(res.body).toHaveProperty('milestones');
      expect(Array.isArray(res.body.milestones)).toBe(true);
    });

    test('GET /api/delivery/:orderId/history -> Milestones show completion status', async () => {
      const res = await request(app)
        .get(`/api/delivery/${order._id}/history`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      const assignedMilestone = res.body.milestones.find(m => m.status === 'assigned');
      expect(assignedMilestone.completed).toBe(true);
    });

    test('GET /api/delivery/:orderId/history -> Includes route and current location', async () => {
      const res = await request(app)
        .get(`/api/delivery/${order._id}/history`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('route');
      expect(res.body).toHaveProperty('currentLocation');
    });

    test('GET /api/delivery/:orderId/history -> Non-participant cannot view history', async () => {
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `other_delivery3_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .get(`/api/delivery/${order._id}/history`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');

      await User.deleteOne({ email: new RegExp('other_delivery3') }).catch(() => {});
    });
  });

  describe('Delivery Assignment', () => {
    test('PUT /api/delivery/:orderId/assign -> Admin can assign delivery to person', async () => {
      const newPersonRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'DeliveryPerson',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `newdelivery_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const newPerson = newPersonRes.body.user;

      const res = await request(app)
        .put(`/api/delivery/${order._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryPersonId: newPerson.id || newPerson._id,
          estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        });

      expect(res.status).toBe(200);
      expect(res.body.deliveryPersonId._id || res.body.deliveryPersonId).toEqual((newPerson.id || newPerson._id).toString());
      expect(res.body).toHaveProperty('estimatedArrival');

      await User.deleteOne({ email: new RegExp('newdelivery') }).catch(() => {});
    });

    test('PUT /api/delivery/:orderId/assign -> Non-admin cannot assign', async () => {
      const newPersonRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'DeliveryPerson2',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `newdelivery2_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'buyer'
        });
      const newPerson = newPersonRes.body.user;

      const res = await request(app)
        .put(`/api/delivery/${order._id}/assign`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          deliveryPersonId: newPerson._id
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissions');

      await User.deleteOne({ email: new RegExp('newdelivery2') }).catch(() => {});
    });

    test('PUT /api/delivery/:orderId/assign -> Reject missing delivery person ID', async () => {
      const res = await request(app)
        .put(`/api/delivery/${order._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Delivery person ID');
    });
  });

  describe('Active Deliveries', () => {
    test('GET /api/delivery/active -> Get active deliveries with pagination', async () => {
      const res = await request(app)
        .get('/api/delivery/active?page=1&limit=10')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('deliveries');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
    });

    test('GET /api/delivery/active -> Admin sees all active deliveries', async () => {
      const res = await request(app)
        .get('/api/delivery/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.deliveries)).toBe(true);
    });

    test('GET /api/delivery/active -> Only includes active statuses', async () => {
      const res = await request(app)
        .get('/api/delivery/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const validStatuses = ['assigned', 'picked_up', 'in_transit'];
      res.body.deliveries.forEach(delivery => {
        expect(validStatuses).toContain(delivery.status);
      });
    });
  });

  describe('Delivery Statistics', () => {
    test('GET /api/delivery/stats -> Admin can view delivery statistics', async () => {
      const res = await request(app)
        .get('/api/delivery/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('assigned');
      expect(res.body).toHaveProperty('delivered');
      expect(res.body).toHaveProperty('failed');
      expect(res.body).toHaveProperty('avgDeliveryTimeHours');
    });

    test('GET /api/delivery/stats -> Non-admin cannot view statistics', async () => {
      const res = await request(app)
        .get('/api/delivery/stats')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissions');
    });

    test('GET /api/delivery/stats -> Statistics include all status counts', async () => {
      const res = await request(app)
        .get('/api/delivery/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const statuses = ['total', 'assigned', 'pickedUp', 'inTransit', 'delivered', 'failed', 'returned'];
      statuses.forEach(status => {
        expect(res.body).toHaveProperty(status);
      });
    });
  });
});
