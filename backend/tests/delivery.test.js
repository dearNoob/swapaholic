const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Delivery = require('../src/models/Delivery');
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

describe('Delivery Tracking System', () => {
  let sellerToken;
  let buyerToken;
  let deliveryPersonToken;
  let adminToken;
  let seller;
  let buyer;
  let deliveryPerson;
  let sharedFlow;
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
      email: `delivery_admin_${uniqueSuffix()}@test.com`
    },
    process.env.JWT_SECRET
  );

  const createAuctionOrder = async ({
    titlePrefix = 'Delivery Test Product',
    description = 'This is a product for testing delivery tracking system',
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
        condition: 'brand_new',
        basePrice,
        location: 'New York',
        geometry: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
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
      orderId: confirmResponse.body.data.order.id
    };
  };

  const createDeliveryFlow = async ({
    titlePrefix = 'Delivery Flow Product',
    basePrice = 500,
    bidAmount = 550,
    deliveryPersonId = deliveryPerson?.id,
    pickupLocation = 'New York',
    deliveryLocation = 'Los Angeles',
    status = 'assigned'
  } = {}) => {
    const auction = await createAuctionOrder({ titlePrefix, basePrice, bidAmount });

    const delivery = await Delivery.create({
      orderId: auction.orderId,
      deliveryPersonId,
      status,
      pickupLocation,
      deliveryLocation,
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });

    return {
      ...auction,
      deliveryId: delivery._id.toString()
    };
  };

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'DeliverySeller' });
    sellerToken = sellerAccount.token;
    seller = sellerAccount.user;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'DeliveryBuyer' });
    buyerToken = buyerAccount.token;
    buyer = buyerAccount.user;

    const deliveryPersonAccount = await registerUser({ role: 'buyer', label: 'DeliveryPerson' });
    deliveryPersonToken = deliveryPersonAccount.token;
    deliveryPerson = deliveryPersonAccount.user;

    adminToken = createAdminToken();

    sharedFlow = await createDeliveryFlow({ titlePrefix: 'Shared Delivery Product' });
  });

  afterAll(async () => {
    await Delivery.deleteMany({}).catch(() => {});
    await Order.deleteMany({}).catch(() => {});
    await Bid.deleteMany({}).catch(() => {});
    await Product.deleteMany({}).catch(() => {});
    await User.deleteMany({ _id: { $in: createdUserIds.filter(Boolean) } }).catch(() => {});
    await disconnectDB();
  });

  describe('Delivery Tracking', () => {
    test('GET /api/delivery/:orderId/track -> buyer can track delivery', async () => {
      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/track`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(getId(response.body.orderId)).toBe(sharedFlow.orderId);
      expect(response.body.status).toBe('assigned');
    });

    test('GET /api/delivery/:orderId/track -> seller can track delivery', async () => {
      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/track`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(getId(response.body.orderId)).toBe(sharedFlow.orderId);
    });

    test('GET /api/delivery/:orderId/track -> admin can track delivery', async () => {
      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/track`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('deliveryPersonId');
      expect(getId(response.body.deliveryPersonId)).toBe(deliveryPerson.id);
    });

    test('GET /api/delivery/:orderId/track -> non-participants cannot track', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'DeliveryOtherTrack' });

      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/track`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('GET /api/delivery/:orderId/track -> returns 404 for unknown orders', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/delivery/${fakeOrderId}/track`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });
  });

  describe('Delivery Status Updates', () => {
    test('PUT /api/delivery/:orderId/status -> delivery person can update to picked_up', async () => {
      const flow = await createDeliveryFlow({ titlePrefix: 'Picked Up Delivery Product' });

      const response = await request(app)
        .put(`/api/delivery/${flow.orderId}/status`)
        .set('Authorization', `Bearer ${deliveryPersonToken}`)
        .send({
          status: 'picked_up',
          currentLocation: {
            latitude: 40.7128,
            longitude: -74.006
          }
        })
        .expect(200);

      expect(response.body.status).toBe('picked_up');
      expect(response.body).toHaveProperty('pickupTime');
    });

    test('PUT /api/delivery/:orderId/status -> tracks route updates while in transit', async () => {
      const flow = await createDeliveryFlow({ titlePrefix: 'Transit Delivery Product' });

      const response = await request(app)
        .put(`/api/delivery/${flow.orderId}/status`)
        .set('Authorization', `Bearer ${deliveryPersonToken}`)
        .send({
          status: 'in_transit',
          currentLocation: {
            latitude: 39.7392,
            longitude: -104.9903
          },
          notes: 'On the way to Los Angeles'
        })
        .expect(200);

      expect(response.body.status).toBe('in_transit');
      expect(response.body.deliveryRoute.length).toBeGreaterThan(0);
      expect(response.body.geoTag).toHaveProperty('latitude', 39.7392);
    });

    test('PUT /api/delivery/:orderId/status -> delivered updates store proof and complete the order', async () => {
      const flow = await createDeliveryFlow({ titlePrefix: 'Delivered Delivery Product' });

      const response = await request(app)
        .put(`/api/delivery/${flow.orderId}/status`)
        .set('Authorization', `Bearer ${deliveryPersonToken}`)
        .send({
          status: 'delivered',
          currentLocation: {
            latitude: 34.0522,
            longitude: -118.2437
          },
          proofOfDelivery: 'base64_encoded_image_here'
        })
        .expect(200);

      expect(response.body.status).toBe('delivered');
      expect(response.body).toHaveProperty('deliveryTime');
      expect(response.body.proofOfDelivery).toBe('base64_encoded_image_here');

      const updatedOrder = await Order.findById(flow.orderId);
      expect(updatedOrder.status).toBe('completed');
    });

    test('PUT /api/delivery/:orderId/status -> invalid statuses are rejected', async () => {
      const response = await request(app)
        .put(`/api/delivery/${sharedFlow.orderId}/status`)
        .set('Authorization', `Bearer ${deliveryPersonToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.message).toContain('must be one of');
    });

    test('PUT /api/delivery/:orderId/status -> non-participants cannot update delivery', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'DeliveryOtherUpdate' });

      const response = await request(app)
        .put(`/api/delivery/${sharedFlow.orderId}/status`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .send({ status: 'in_transit' })
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Delivery History', () => {
    test('GET /api/delivery/:orderId/history -> returns milestones and current status', async () => {
      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/history`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orderId', sharedFlow.orderId);
      expect(response.body).toHaveProperty('currentStatus', 'assigned');
      expect(Array.isArray(response.body.milestones)).toBe(true);
    });

    test('GET /api/delivery/:orderId/history -> assigned milestone is marked complete', async () => {
      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/history`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const assignedMilestone = response.body.milestones.find((milestone) => milestone.status === 'assigned');
      expect(assignedMilestone.completed).toBe(true);
    });

    test('GET /api/delivery/:orderId/history -> includes route and current location', async () => {
      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/history`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('route');
      expect(response.body).toHaveProperty('currentLocation');
    });

    test('GET /api/delivery/:orderId/history -> non-participants cannot view history', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'DeliveryOtherHistory' });

      const response = await request(app)
        .get(`/api/delivery/${sharedFlow.orderId}/history`)
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Delivery Assignment', () => {
    test('PUT /api/delivery/:orderId/assign -> admin can assign a delivery person', async () => {
      const flow = await createDeliveryFlow({ titlePrefix: 'Assignment Delivery Product' });
      const newPersonAccount = await registerUser({ role: 'buyer', label: 'DeliveryAssignee' });

      const response = await request(app)
        .put(`/api/delivery/${flow.orderId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryPersonId: newPersonAccount.user.id,
          estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        })
        .expect(200);

      expect(getId(response.body.deliveryPersonId)).toBe(newPersonAccount.user.id);
      expect(response.body).toHaveProperty('estimatedArrival');
    });

    test('PUT /api/delivery/:orderId/assign -> non-admins cannot assign deliveries', async () => {
      const flow = await createDeliveryFlow({ titlePrefix: 'Assignment Permission Delivery Product' });
      const newPersonAccount = await registerUser({ role: 'buyer', label: 'DeliveryAssigneeDenied' });

      const response = await request(app)
        .put(`/api/delivery/${flow.orderId}/assign`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          deliveryPersonId: newPersonAccount.user.id
        })
        .expect(403);

      expect(response.body.message).toContain('permissions');
    });

    test('PUT /api/delivery/:orderId/assign -> rejects missing delivery person IDs', async () => {
      const flow = await createDeliveryFlow({ titlePrefix: 'Assignment Missing Delivery Product' });

      const response = await request(app)
        .put(`/api/delivery/${flow.orderId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Delivery person ID');
    });
  });

  describe('Active Deliveries', () => {
    test('GET /api/delivery/active -> delivery person gets paginated active deliveries', async () => {
      const response = await request(app)
        .get('/api/delivery/active?page=1&limit=10')
        .set('Authorization', `Bearer ${deliveryPersonToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('deliveries');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    test('GET /api/delivery/active -> admin sees all active deliveries', async () => {
      const response = await request(app)
        .get('/api/delivery/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.deliveries)).toBe(true);
      expect(response.body.deliveries.length).toBeGreaterThan(0);
    });

    test('GET /api/delivery/active -> only active statuses are returned', async () => {
      const response = await request(app)
        .get('/api/delivery/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const validStatuses = ['assigned', 'picked_up', 'in_transit'];
      response.body.deliveries.forEach((item) => {
        expect(validStatuses).toContain(item.status);
      });
    });
  });

  describe('Delivery Statistics', () => {
    test('GET /api/delivery/stats -> admin can view delivery statistics', async () => {
      const response = await request(app)
        .get('/api/delivery/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('assigned');
      expect(response.body).toHaveProperty('delivered');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('avgDeliveryTimeHours');
    });

    test('GET /api/delivery/stats -> non-admins cannot view statistics', async () => {
      const response = await request(app)
        .get('/api/delivery/stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.message).toContain('permissions');
    });

    test('GET /api/delivery/stats -> includes all status counts', async () => {
      const response = await request(app)
        .get('/api/delivery/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      ['total', 'assigned', 'pickedUp', 'inTransit', 'delivered', 'failed', 'returned'].forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });
  });
});
