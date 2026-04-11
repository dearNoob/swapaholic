const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Review = require('../src/models/Review');
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

describe('Review Controller', () => {
  let sellerToken;
  let buyerToken;
  let seller;
  let buyer;
  let sharedOrderId;
  let buyerReviewId;
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

  const createCompletedOrder = async ({
    titlePrefix = 'Review Test Product',
    description = 'Product for review testing',
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

    const orderId = confirmResponse.body.data.order.id;

    await Order.findByIdAndUpdate(orderId, { status: 'completed' });

    return {
      productId: product._id.toString(),
      bidId,
      orderId
    };
  };

  beforeAll(async () => {
    await connectDB();

    const sellerAccount = await registerUser({ role: 'seller', label: 'ReviewSeller' });
    sellerToken = sellerAccount.token;
    seller = sellerAccount.user;

    const buyerAccount = await registerUser({ role: 'buyer', label: 'ReviewBuyer' });
    buyerToken = buyerAccount.token;
    buyer = buyerAccount.user;

    const sharedOrder = await createCompletedOrder();
    sharedOrderId = sharedOrder.orderId;
  });

  afterAll(async () => {
    await Review.deleteMany({}).catch(() => {});
    await Order.deleteMany({}).catch(() => {});
    await Bid.deleteMany({}).catch(() => {});
    await Product.deleteMany({}).catch(() => {});
    await User.deleteMany({ _id: { $in: createdUserIds.filter(Boolean) } }).catch(() => {});
    await disconnectDB();
  });

  describe('Review Creation', () => {
    test('POST /api/reviews -> buyer can create a seller review', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: sharedOrderId,
          rating: 5,
          comment: 'Excellent seller! Fast shipping and great item quality.'
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.rating).toBe(5);
      expect(response.body.reviewType).toBe('buyer_to_seller');
      expect(getId(response.body.revieweeId)).toBe(seller.id);

      buyerReviewId = response.body._id.toString();
    });

    test('POST /api/reviews -> seller can create a buyer review', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: sharedOrderId,
          rating: 4,
          comment: 'Good buyer, responsive communication, and easy to work with.'
        })
        .expect(201);

      expect(response.body.rating).toBe(4);
      expect(response.body.reviewType).toBe('seller_to_buyer');
      expect(getId(response.body.revieweeId)).toBe(buyer.id);
    });

    test('POST /api/reviews -> rejects ratings below 1', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: sharedOrderId,
          rating: 0,
          comment: 'Invalid rating test comment'
        })
        .expect(400);

      expect(response.body.message).toContain('Rating must be between 1 and 5');
    });

    test('POST /api/reviews -> rejects ratings above 5', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: sharedOrderId,
          rating: 6,
          comment: 'Invalid rating test comment'
        })
        .expect(400);

      expect(response.body.message).toContain('Rating must be between 1 and 5');
    });

    test('POST /api/reviews -> rejects short comments', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: sharedOrderId,
          rating: 3,
          comment: 'Short'
        })
        .expect(400);

      expect(response.body.message).toContain('at least 10 characters');
    });

    test('POST /api/reviews -> rejects missing required fields', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 5 })
        .expect(400);

      expect(response.body.message).toContain('required');
    });

    test('POST /api/reviews -> rejects non-existent orders', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: fakeOrderId,
          rating: 5,
          comment: 'This is a valid comment for testing purposes.'
        })
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    test('POST /api/reviews -> rejects duplicate reviews from the same user', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: sharedOrderId,
          rating: 3,
          comment: 'Duplicate review test with valid comment length.'
        })
        .expect(400);

      expect(response.body.message).toContain('already reviewed');
    });

    test('POST /api/reviews -> rejects reviews from non-participants', async () => {
      const otherAccount = await registerUser({ role: 'buyer', label: 'ReviewOther' });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${otherAccount.token}`)
        .send({
          orderId: sharedOrderId,
          rating: 5,
          comment: 'Non-participant review attempt with enough detail.'
        })
        .expect(403);

      expect(response.body.message).toContain('order participants');
    });
  });

  describe('Review Retrieval', () => {
    test('GET /api/reviews/:reviewId -> returns a single review', async () => {
      const response = await request(app)
        .get(`/api/reviews/${buyerReviewId}`)
        .expect(200);

      expect(response.body._id.toString()).toBe(buyerReviewId);
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('comment');
    });

    test('GET /api/reviews/:reviewId -> returns 404 for unknown reviews', async () => {
      const fakeReviewId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/reviews/${fakeReviewId}`)
        .expect(404);

      expect(response.body.message).toContain('Review not found');
    });

    test('GET /api/reviews/user/:userId/received -> returns received reviews with pagination', async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${seller.id}/received`)
        .expect(200);

      expect(response.body).toHaveProperty('reviews');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.reviews.length).toBeGreaterThan(0);
    });

    test('GET /api/reviews/user/:userId/given -> returns reviews written by a user', async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${buyer.id}/given`)
        .expect(200);

      expect(response.body).toHaveProperty('reviews');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.reviews.length).toBeGreaterThan(0);
    });

    test('GET /api/reviews/user/:userId/summary -> returns rating summary', async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${seller.id}/summary`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', seller.id);
      expect(response.body).toHaveProperty('totalReviews');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('ratingDistribution');
      expect(response.body.totalReviews).toBeGreaterThan(0);
      expect(response.body.averageRating).toBeGreaterThanOrEqual(1);
      expect(response.body.averageRating).toBeLessThanOrEqual(5);
    });

    test('GET /api/reviews/user/:userId/summary -> returns zeroed stats for users with no reviews', async () => {
      const newUserAccount = await registerUser({ role: 'buyer', label: 'ReviewNew' });

      const response = await request(app)
        .get(`/api/reviews/user/${newUserAccount.user.id}/summary`)
        .expect(200);

      expect(response.body.totalReviews).toBe(0);
      expect(response.body.averageRating).toBe(0);
    });
  });

  describe('Review Update & Delete', () => {
    test('PUT /api/reviews/:reviewId -> reviewer can update a review', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Update Test Product', basePrice: 200, bidAmount: 220 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 5,
          comment: 'Original review comment with enough detail.'
        })
        .expect(201);

      const response = await request(app)
        .put(`/api/reviews/${reviewResponse.body._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 4,
          comment: 'Updated comment that better reflects the full experience.'
        })
        .expect(200);

      expect(response.body.rating).toBe(4);
      expect(response.body.comment).toContain('Updated');
    });

    test('PUT /api/reviews/:reviewId -> rejects non-reviewers from updating', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Permission Test Product', basePrice: 250, bidAmount: 270 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 5,
          comment: 'Test review for permission check with valid length.'
        })
        .expect(201);

      const response = await request(app)
        .put(`/api/reviews/${reviewResponse.body._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          rating: 1,
          comment: 'Trying to change someone elses review comment.'
        })
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('PUT /api/reviews/:reviewId -> rejects invalid rating updates', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Rating Validation Product', basePrice: 300, bidAmount: 320 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 5,
          comment: 'Valid review for rating update validation testing.'
        })
        .expect(201);

      const response = await request(app)
        .put(`/api/reviews/${reviewResponse.body._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 10,
          comment: 'Valid update comment with proper length.'
        })
        .expect(400);

      expect(response.body.message).toContain('Rating must be between 1 and 5');
    });

    test('DELETE /api/reviews/:reviewId -> reviewer can soft-delete a review', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Delete Test Product', basePrice: 350, bidAmount: 370 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 5,
          comment: 'Review that will be deleted during this test.'
        })
        .expect(201);

      const reviewId = reviewResponse.body._id.toString();

      const response = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');

      const deletedReview = await Review.findById(reviewId);
      expect(deletedReview.status).toBe('deleted');
    });

    test('DELETE /api/reviews/:reviewId -> rejects non-owner deletion', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Delete Permission Test', basePrice: 400, bidAmount: 420 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 5,
          comment: 'Test review for deletion permission verification.'
        })
        .expect(201);

      const response = await request(app)
        .delete(`/api/reviews/${reviewResponse.body._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Review Moderation', () => {
    test('POST /api/reviews/:reviewId/flag -> increments the report count', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Flag Test Product', basePrice: 300, bidAmount: 320 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 2,
          comment: 'Inappropriate content test review message here.'
        })
        .expect(201);

      const response = await request(app)
        .post(`/api/reviews/${reviewResponse.body._id}/flag`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reportCount', 1);
      expect(response.body.status).toBe('active');
    });

    test('POST /api/reviews/:reviewId/flag -> auto-flags a review after three reports', async () => {
      const flow = await createCompletedOrder({ titlePrefix: 'Auto Flag Test Product', basePrice: 400, bidAmount: 420 });

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: flow.orderId,
          rating: 1,
          comment: 'Very problematic review content that should be flagged.'
        })
        .expect(201);

      const reviewId = reviewResponse.body._id.toString();

      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post(`/api/reviews/${reviewId}/flag`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(200);
      }

      const flaggedReview = await Review.findById(reviewId);
      expect(flaggedReview.status).toBe('flagged');
      expect(flaggedReview.reportCount).toBe(3);
    });
  });
});
