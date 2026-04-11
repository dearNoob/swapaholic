const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Notification System', () => {
  let user1Token, user1, user2Token, user2;

  beforeAll(async () => {
    await connectDB();

    // Create user 1
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Notif',
        lastName: 'User1',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `notif_user1_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    user1 = user1Res.body.user;
    user1Token = user1Res.body.token;

    // Create user 2
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Notif',
        lastName: 'User2',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `notif_user2_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    user2 = user2Res.body.user;
    user2Token = user2Res.body.token;

    // Create test notifications
    await Notification.create({
      recipientId: user1._id || user1.id,
      type: 'bid_received',
      title: 'New Bid Received',
      message: 'You received a new bid on your product',
      data: { relatedType: 'Bid' },
      read: false,
      priority: 'high',
      actionUrl: '/bids'
    });

    await Notification.create({
      recipientId: user1._id || user1.id,
      type: 'order_created',
      title: 'Order Created',
      message: 'Your order has been created',
      data: { relatedType: 'Order' },
      read: true,
      priority: 'normal',
      actionUrl: '/orders'
    });

    await Notification.create({
      recipientId: user2._id || user2.id,
      type: 'payment_released',
      title: 'Payment Released',
      message: 'Your payment has been released',
      data: { relatedType: 'Payment' },
      read: false,
      priority: 'high',
      actionUrl: '/payments'
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /notif_user/ }).catch(() => {});
    await Notification.deleteMany({ recipientId: { $in: [user1._id || user1.id, user2._id || user2.id] } }).catch(() => {});
    await disconnectDB();
  });

  describe('Get Notifications', () => {
    test('GET /api/notifications -> Authenticated user can get notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('notifications');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(res.body.notifications.length).toBeGreaterThan(0);
    });

    test('GET /api/notifications -> Pagination works correctly', async () => {
      const res = await request(app)
        .get('/api/notifications?page=1&limit=1')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.notifications.length).toBeLessThanOrEqual(1);
    });

    test('GET /api/notifications -> Filter by read status', async () => {
      const res = await request(app)
        .get('/api/notifications?read=false')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.every(n => n.read === false)).toBe(true);
    });

    test('GET /api/notifications -> Filter by type', async () => {
      const res = await request(app)
        .get('/api/notifications?type=bid_received')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.every(n => n.type === 'bid_received')).toBe(true);
    });

    test('GET /api/notifications -> Unauthenticated users cannot access', async () => {
      const res = await request(app).get('/api/notifications');

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('Get Unread Count', () => {
    test('GET /api/notifications/unread/count -> Get unread notification count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('unreadCount');
      expect(res.body.unreadCount).toBeGreaterThan(0);
    });
  });

  describe('Get Notifications by Type', () => {
    test('GET /api/notifications/type/:type -> Get notifications by specific type', async () => {
      const res = await request(app)
        .get('/api/notifications/type/bid_received')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('notifications');
      expect(res.body.type).toBe('bid_received');
      expect(res.body.notifications.every(n => n.type === 'bid_received')).toBe(true);
    });

    test('GET /api/notifications/type/:type -> Invalid type returns 400', async () => {
      const res = await request(app)
        .get('/api/notifications/type/invalid_type')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Get Specific Notification', () => {
    let testNotificationId;

    beforeAll(async () => {
      const notif = await Notification.findOne({ recipientId: user1._id || user1.id });
      testNotificationId = notif._id;
    });

    test('GET /api/notifications/:notificationId -> Get specific notification', async () => {
      const res = await request(app)
        .get(`/api/notifications/${testNotificationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body._id.toString()).toBe(testNotificationId.toString());
    });

    test('GET /api/notifications/:notificationId -> Auto-marks as read', async () => {
      // Create unread notification
      const newNotif = await Notification.create({
        recipientId: user1._id || user1.id,
        type: 'bid_received',
        title: 'Test',
        message: 'Test',
        read: false
      });

      const res = await request(app)
        .get(`/api/notifications/${newNotif._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.read).toBe(true);
      expect(res.body.readAt).toBeDefined();
    });

    test('GET /api/notifications/:notificationId -> User cannot access other user notifications', async () => {
      const res = await request(app)
        .get(`/api/notifications/${testNotificationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
    });

    test('GET /api/notifications/:notificationId -> Invalid ID returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Mark as Read', () => {
    let unreadNotificationId;

    beforeAll(async () => {
      const notif = await Notification.create({
        recipientId: user1._id || user1.id,
        type: 'bid_received',
        title: 'Test Unread',
        message: 'Test',
        read: false
      });
      unreadNotificationId = notif._id;
    });

    test('PUT /api/notifications/:notificationId/read -> Mark single as read', async () => {
      const res = await request(app)
        .put(`/api/notifications/${unreadNotificationId}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.read).toBe(true);
      expect(res.body.notification.readAt).toBeDefined();
    });

    test('PUT /api/notifications/read/all -> Mark all as read', async () => {
      // Create multiple unread notifications
      await Notification.create([
        {
          recipientId: user1._id || user1.id,
          type: 'bid_received',
          title: 'Unread 1',
          message: 'Test',
          read: false
        },
        {
          recipientId: user1._id || user1.id,
          type: 'order_created',
          title: 'Unread 2',
          message: 'Test',
          read: false
        }
      ]);

      const res = await request(app)
        .put('/api/notifications/read/all')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');

      // Verify all are marked as read
      const allNotifs = await Notification.find({ recipientId: user1._id || user1.id });
      expect(allNotifs.every(n => n.read === true)).toBe(true);
    });

    test('POST /api/notifications/read/batch -> Mark multiple as read', async () => {
      // Create notifications for batch marking
      const notifs = await Notification.create([
        {
          recipientId: user1._id || user1.id,
          type: 'bid_received',
          title: 'Batch 1',
          message: 'Test',
          read: false
        },
        {
          recipientId: user1._id || user1.id,
          type: 'order_created',
          title: 'Batch 2',
          message: 'Test',
          read: false
        }
      ]);

      const notifIds = notifs.map(n => n._id);

      const res = await request(app)
        .post('/api/notifications/read/batch')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ notificationIds: notifIds });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(notifIds.length);
    });

    test('POST /api/notifications/read/batch -> Empty array returns 400', async () => {
      const res = await request(app)
        .post('/api/notifications/read/batch')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ notificationIds: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('Delete Notifications', () => {
    let deleteNotificationId;

    beforeAll(async () => {
      const notif = await Notification.create({
        recipientId: user1._id || user1.id,
        type: 'bid_received',
        title: 'To Delete',
        message: 'Test'
      });
      deleteNotificationId = notif._id;
    });

    test('DELETE /api/notifications/:notificationId -> Delete single notification', async () => {
      const res = await request(app)
        .delete(`/api/notifications/${deleteNotificationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);

      // Verify deleted
      const notif = await Notification.findById(deleteNotificationId);
      expect(notif).toBeNull();
    });

    test('POST /api/notifications/delete/batch -> Delete multiple notifications', async () => {
      const notifs = await Notification.create([
        {
          recipientId: user1._id || user1.id,
          type: 'bid_received',
          title: 'Delete Batch 1',
          message: 'Test'
        },
        {
          recipientId: user1._id || user1.id,
          type: 'order_created',
          title: 'Delete Batch 2',
          message: 'Test'
        }
      ]);

      const notifIds = notifs.map(n => n._id);

      const res = await request(app)
        .post('/api/notifications/delete/batch')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ notificationIds: notifIds });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(notifIds.length);
    });
  });

  describe('Notification Models', () => {
    test('Notification types are correctly defined', async () => {
      const validTypes = [
        'order_created', 'bid_received', 'bid_accepted', 'bid_rejected',
        'order_confirmed', 'payment_released', 'payment_received',
        'delivery_started', 'delivery_completed', 'order_completed', 'review_received',
        'review_posted', 'dispute_opened', 'dispute_resolved',
        'message_received', 'qc_passed', 'qc_failed', 'new_product_match',
        'ticket_resolved', 'ticket_updated', 'seller_suspended',
        'seller_banned', 'product_listed', 'product_sold', 'support_notice',
        'auction_won', 'auction_confirmation_reminder',
        'auction_confirmation_expired', 'auction_second_chance',
        'seller_payout', 'outbid'
      ];

      for (const type of validTypes) {
        const notif = new Notification({
          recipientId: user1._id || user1.id,
          type,
          title: `Test ${type}`,
          message: 'Test message'
        });

        expect(notif.type).toBe(type);
      }
    });

    test('Notification priority levels work correctly', async () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];

      for (const priority of priorities) {
        const notif = new Notification({
          recipientId: user1._id || user1.id,
          type: 'bid_received',
          title: 'Test',
          message: 'Test',
          priority
        });

        expect(notif.priority).toBe(priority);
      }
    });
  });

  describe('Edge Cases', () => {
    test('GET /api/notifications -> User with no notifications gets empty array', async () => {
      // Create new user with no notifications
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Empty',
          lastName: 'Notif',
          phone: `+1555${Math.random().toString().slice(2, 8)}`,
          email: `empty_notif_${Math.random()}@test.com`,
          password: 'Test1234',
          role: 'user'
        });
      const newUserToken = newUserRes.body.token;

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.length).toBe(0);

      await User.deleteOne({ email: newUserRes.body.user.email }).catch(() => {});
    });

    test('GET /api/notifications/preferences -> Get notification preferences', async () => {
      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('preferences');
      expect(res.body.preferences).toHaveProperty('orderNotifications');
      expect(res.body.preferences).toHaveProperty('emailNotifications');
    });
  });

  describe('Notification TTL (Time to Live)', () => {
    test('Notification schema has TTL expiration set', async () => {
      // Check schema definition
      const schemaPath = Notification.schema.path('createdAt');
      expect(schemaPath).toBeDefined();
      expect(schemaPath.options.expires).toBe(90 * 24 * 60 * 60); // 90 days in seconds
    });
  });
});
