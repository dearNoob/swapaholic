const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Bid = require('../src/models/Bid');
const Order = require('../src/models/Order');
const Review = require('../src/models/Review');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Review Controller', () => {
  let sellerToken, buyerToken, seller, buyer, product, bid, order, review;

  beforeAll(async () => {
    await connectDB();

    // Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Reviewer',
        lastName: 'Seller',
        phone: `+1555${Date.now().toString().slice(-6)}`,
        email: `seller_review_${Date.now()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    sellerToken = sellerRes.body.token;
    seller = sellerRes.body.user;

    // Create buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Reviewer',
        lastName: 'Buyer',
        phone: `+1555${Date.now().toString().slice(-7)}`,
        email: `buyer_review_${Date.now()}@test.com`,
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
        title: 'Review Test Product',
        description: 'Product for review testing',
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

    // Accept bid to close auction
    await request(app)
      .post(`/api/bids/${bid._id}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`);

    // Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidId: bid._id });
    order = orderRes.body;

    // Mark order as completed
    await Order.findByIdAndUpdate(order._id, { status: 'completed' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /^seller_review_|^buyer_review_/ }).catch(() => {});
    await Product.deleteMany({ title: /Review Test/ }).catch(() => {});
    await Review.deleteMany({ reviewerId: seller.id }).catch(() => {});
    await disconnectDB();
  });

  describe('Review Creation', () => {
    test('POST /api/reviews -> Create review (buyer to seller)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          rating: 5,
          comment: 'Excellent seller! Fast shipping and great item quality.'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.rating).toBe(5);
      expect(res.body.reviewType).toBe('buyer_to_seller');
      expect(res.body.revieweeId._id || res.body.revieweeId).toBe(seller.id);

      review = res.body;
    });

    test('POST /api/reviews -> Create review (seller to buyer)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order._id,
          rating: 4,
          comment: 'Good buyer, responsive communication. Highly recommended.'
        });

      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(4);
      expect(res.body.reviewType).toBe('seller_to_buyer');
      expect(res.body.revieweeId._id || res.body.revieweeId).toBe(buyer.id);
    });

    test('POST /api/reviews -> Reject review with rating < 1', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          rating: 0,
          comment: 'Invalid rating test comment'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Rating must be between 1 and 5');
    });

    test('POST /api/reviews -> Reject review with rating > 5', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          rating: 6,
          comment: 'Invalid rating test comment'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Rating must be between 1 and 5');
    });

    test('POST /api/reviews -> Reject short comment', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          rating: 3,
          comment: 'Short'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 10 characters');
    });

    test('POST /api/reviews -> Reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 5
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    test('POST /api/reviews -> Reject non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: fakeOrderId,
          rating: 5,
          comment: 'This is a valid comment for testing'
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Order not found');
    });

    test('POST /api/reviews -> Reject duplicate review from same user', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order._id,
          rating: 3,
          comment: 'Duplicate review test with valid comment'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already reviewed');
    });

    test('POST /api/reviews -> Reject review from non-participant', async () => {
      // Create another user
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Other',
          lastName: 'User',
          phone: `+1555${Date.now().toString().slice(-5)}`,
          email: `other_review_${Date.now()}@test.com`,
          password: 'Test1234',
          role: 'user'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: order._id,
          rating: 5,
          comment: 'Non-participant review attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('order participants');

      // Cleanup
      await User.deleteOne({ email: `other_review_${Date.now()}@test.com` }).catch(() => {});
    });
  });

  describe('Review Retrieval', () => {
    test('GET /api/reviews/:reviewId -> Get single review', async () => {
      const res = await request(app)
        .get(`/api/reviews/${review._id}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(review._id);
      expect(res.body).toHaveProperty('rating');
      expect(res.body).toHaveProperty('comment');
    });

    test('GET /api/reviews/:reviewId -> Return 404 for non-existent review', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/reviews/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Review not found');
    });

    test('GET /api/reviews/user/:userId/received -> Get reviews for user', async () => {
      const res = await request(app)
        .get(`/api/reviews/user/${seller.id}/received`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reviews');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.reviews)).toBe(true);
      expect(res.body.reviews.length).toBeGreaterThan(0);
    });

    test('GET /api/reviews/user/:userId/given -> Get reviews by user', async () => {
      const res = await request(app)
        .get(`/api/reviews/user/${buyer.id}/given`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reviews');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.reviews)).toBe(true);
    });

    test('GET /api/reviews/user/:userId/summary -> Get rating summary', async () => {
      const res = await request(app)
        .get(`/api/reviews/user/${seller.id}/summary`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('totalReviews');
      expect(res.body).toHaveProperty('averageRating');
      expect(res.body).toHaveProperty('ratingDistribution');
      expect(res.body.totalReviews).toBeGreaterThan(0);
      expect(res.body.averageRating).toBeGreaterThanOrEqual(1);
      expect(res.body.averageRating).toBeLessThanOrEqual(5);
    });

    test('GET /api/reviews/user/:userId/summary -> Return 0 for user with no reviews', async () => {
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          phone: `+1555${Date.now().toString().slice(-4)}`,
          email: `newuser_review_${Date.now()}@test.com`,
          password: 'Test1234',
          role: 'user'
        });
      const newUserId = newUserRes.body.user.id;

      const res = await request(app)
        .get(`/api/reviews/user/${newUserId}/summary`);

      expect(res.status).toBe(200);
      expect(res.body.totalReviews).toBe(0);
      expect(res.body.averageRating).toBe(0);

      // Cleanup
      await User.deleteOne({ _id: newUserId }).catch(() => {});
    });
  });

  describe('Review Update & Delete', () => {
    test('PUT /api/reviews/:reviewId -> Update review', async () => {
      // Create a fresh review for update test
      const product2Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Update Test Product',
          description: 'Product for update testing',
          category: 'electronics',
          basePrice: 200,
          condition: 'good'
        });
      const product2 = product2Res.body;

      const bid2Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product2._id, bidAmount: 220 });
      const bid2 = bid2Res.body;

      await request(app)
        .post(`/api/bids/${bid2._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order2Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid2._id });
      const order2 = order2Res.body;

      await Order.findByIdAndUpdate(order2._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order2._id,
          rating: 5,
          comment: 'Original review comment for update test'
        });
      const updateReview = reviewRes.body;

      const res = await request(app)
        .put(`/api/reviews/${updateReview._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 4,
          comment: 'Updated comment - seller was actually quite responsive!'
        });

      expect(res.status).toBe(200);
      expect(res.body.rating).toBe(4);
      expect(res.body.comment).toContain('Updated');
    });

    test('PUT /api/reviews/:reviewId -> Reject non-reviewer from updating', async () => {
      // Create a fresh review for permission test
      const product3Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Permission Test Product',
          description: 'Product for permission testing',
          category: 'electronics',
          basePrice: 250,
          condition: 'good'
        });
      const product3 = product3Res.body;

      const bid3Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product3._id, bidAmount: 270 });
      const bid3 = bid3Res.body;

      await request(app)
        .post(`/api/bids/${bid3._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order3Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid3._id });
      const order3 = order3Res.body;

      await Order.findByIdAndUpdate(order3._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order3._id,
          rating: 5,
          comment: 'Test review for permission check test'
        });
      const permReview = reviewRes.body;

      const res = await request(app)
        .put(`/api/reviews/${permReview._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          rating: 1,
          comment: 'Trying to change someone elses review comment'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    test('PUT /api/reviews/:reviewId -> Reject invalid rating update', async () => {
      // Create a fresh review for rating validation test
      const product4Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Rating Validation Product',
          description: 'Product for rating validation',
          category: 'electronics',
          basePrice: 300,
          condition: 'good'
        });
      const product4 = product4Res.body;

      const bid4Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product4._id, bidAmount: 320 });
      const bid4 = bid4Res.body;

      await request(app)
        .post(`/api/bids/${bid4._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order4Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid4._id });
      const order4 = order4Res.body;

      await Order.findByIdAndUpdate(order4._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order4._id,
          rating: 5,
          comment: 'Valid review for rating update validation test'
        });
      const ratingReview = reviewRes.body;

      const res = await request(app)
        .put(`/api/reviews/${ratingReview._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 10,
          comment: 'Valid update comment with proper length'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Rating must be between 1 and 5');
    });

    test('DELETE /api/reviews/:reviewId -> Delete review', async () => {
      // Create a fresh review for delete test
      const product5Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Delete Test Product',
          description: 'Product for delete testing',
          category: 'electronics',
          basePrice: 350,
          condition: 'good'
        });
      const product5 = product5Res.body;

      const bid5Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product5._id, bidAmount: 370 });
      const bid5 = bid5Res.body;

      await request(app)
        .post(`/api/bids/${bid5._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order5Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid5._id });
      const order5 = order5Res.body;

      await Order.findByIdAndUpdate(order5._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order5._id,
          rating: 5,
          comment: 'Review that will be deleted for testing'
        });
      const deleteReview = reviewRes.body;

      const res = await request(app)
        .delete(`/api/reviews/${deleteReview._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');

      // Verify soft delete (status changed to deleted)
      const deletedReview = await Review.findById(deleteReview._id);
      expect(deletedReview.status).toBe('deleted');
    });

    test('DELETE /api/reviews/:reviewId -> Reject non-owner deletion', async () => {
      // Create a new review first
      const product6Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Delete Permission Test',
          description: 'Product for delete permission testing',
          category: 'electronics',
          basePrice: 400,
          condition: 'good'
        });
      const product6 = product6Res.body;

      const bid6Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product6._id, bidAmount: 420 });
      const bid6 = bid6Res.body;

      await request(app)
        .post(`/api/bids/${bid6._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order6Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid6._id });
      const order6 = order6Res.body;

      await Order.findByIdAndUpdate(order6._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order6._id,
          rating: 5,
          comment: 'Test review for deletion permission test'
        });
      const newReview = reviewRes.body;

      // Try to delete with different user
      const res = await request(app)
        .delete(`/api/reviews/${newReview._id}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('Review Moderation', () => {
    test('POST /api/reviews/:reviewId/flag -> Flag review as inappropriate', async () => {
      // Create a review to flag
      const product3Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Flag Test Product',
          description: 'Product for flag testing',
          category: 'electronics',
          basePrice: 300,
          condition: 'good'
        });
      const product3 = product3Res.body;

      const bid3Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product3._id, bidAmount: 320 });
      const bid3 = bid3Res.body;

      await request(app)
        .post(`/api/bids/${bid3._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order3Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid3._id });
      const order3 = order3Res.body;

      await Order.findByIdAndUpdate(order3._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order3._id,
          rating: 2,
          comment: 'Inappropriate content test review message'
        });
      const flagReview = reviewRes.body;

      // Flag the review
      const res = await request(app)
        .post(`/api/reviews/${flagReview._id}/flag`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reportCount');
      expect(res.body.reportCount).toBe(1);
    });

    test('POST /api/reviews/:reviewId/flag -> Auto-flag after 3 reports', async () => {
      // Create another review
      const product4Res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Auto-Flag Test Product',
          description: 'Product for auto-flag testing',
          category: 'electronics',
          basePrice: 400,
          condition: 'good'
        });
      const product4 = product4Res.body;

      const bid4Res = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: product4._id, bidAmount: 420 });
      const bid4 = bid4Res.body;

      await request(app)
        .post(`/api/bids/${bid4._id}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const order4Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ bidId: bid4._id });
      const order4 = order4Res.body;

      await Order.findByIdAndUpdate(order4._id, { status: 'completed' });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          orderId: order4._id,
          rating: 1,
          comment: 'Very problematic review content inappropriate'
        });
      const flagReview = reviewRes.body;

      // Flag 3 times
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/reviews/${flagReview._id}/flag`)
          .set('Authorization', `Bearer ${buyerToken}`);
      }

      // Check if auto-flagged
      const finalReview = await Review.findById(flagReview._id);
      expect(finalReview.status).toBe('flagged');
    });
  });
});
