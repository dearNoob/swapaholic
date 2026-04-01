const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Advanced Search & Filtering', () => {
  let sellerToken, seller, buyer, buyerToken;
  let product1, product2, product3, product4, product5;

  beforeAll(async () => {
    await connectDB();

    // Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Search',
        lastName: 'Seller',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `search_seller_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    seller = sellerRes.body.user;
    sellerToken = sellerRes.body.token;

    // Create buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Search',
        lastName: 'Buyer',
        phone: `+1555${Math.random().toString().slice(2, 8)}`,
        email: `search_buyer_${Math.random()}@test.com`,
        password: 'Test1234',
        role: 'user'
      });
    buyer = buyerRes.body.user;
    buyerToken = buyerRes.body.token;

    // Create diverse products for testing
    product1 = (
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Apple iPhone 13 Pro Max',
          description: 'Excellent condition smartphone with all accessories',
          category: 'electronics',
          basePrice: 1200,
          condition: 'brand_new',
          geometry: { type: 'Point', coordinates: [-74.0, 40.7] },
          location: 'New York'
        })
    ).body;

    product2 = (
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Samsung Galaxy S21 Ultra',
          description: 'Like new condition smartphone with box',
          category: 'electronics',
          basePrice: 900,
          condition: 'like_new',
          geometry: { type: 'Point', coordinates: [-74.01, 40.71] },
          location: 'New York'
        })
    ).body;

    product3 = (
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'MacBook Pro 16 inch',
          description: 'High performance laptop for professionals',
          category: 'electronics',
          basePrice: 2500,
          condition: 'excellent',
          geometry: { type: 'Point', coordinates: [-118.2, 34.05] },
          location: 'Los Angeles'
        })
    ).body;

    product4 = (
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Sony Headphones Pro',
          description: 'Wireless noise-canceling headphones',
          category: 'audio',
          basePrice: 350,
          condition: 'brand_new',
          geometry: { type: 'Point', coordinates: [-74.02, 40.72] },
          location: 'New York'
        })
    ).body;

    product5 = (
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Used Budget Phone',
          description: 'Old smartphone but still working',
          category: 'electronics',
          basePrice: 150,
          condition: 'fair',
          geometry: { type: 'Point', coordinates: [-87.6, 41.8] },
          location: 'Chicago'
        })
    ).body;

    // Wait for indexes to be ready (they're created in Product model)
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await User.deleteMany({ email: /search_/ }).catch(() => {});
    await Product.deleteMany({ title: /iPhone|Galaxy|MacBook|Headphones|Budget/ }).catch(() => {});
    await disconnectDB();
  });

  describe('Price Range Filtering', () => {
    test('GET /api/products?minPrice=100&maxPrice=500 -> Filter by price range', async () => {
      const res = await request(app).get('/api/products?minPrice=100&maxPrice=500&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
      expect(res.body.pagination).toBeDefined();

      // Verify all returned products are within price range
      res.body.products.forEach(product => {
        expect(product.basePrice).toBeGreaterThanOrEqual(100);
        expect(product.basePrice).toBeLessThanOrEqual(500);
      });
    });

    test('GET /api/products?minPrice=1000 -> Filter by minimum price', async () => {
      const res = await request(app).get('/api/products?minPrice=1000&status=active');

      expect(res.status).toBe(200);
      res.body.products.forEach(product => {
        expect(product.basePrice).toBeGreaterThanOrEqual(1000);
      });
    });

    test('GET /api/products?maxPrice=500 -> Filter by maximum price', async () => {
      const res = await request(app).get('/api/products?maxPrice=500&status=active');

      expect(res.status).toBe(200);
      res.body.products.forEach(product => {
        expect(product.basePrice).toBeLessThanOrEqual(500);
      });
    });
  });

  describe('Category Filtering', () => {
    test('GET /api/products?category=electronics -> Filter by category', async () => {
      const res = await request(app).get('/api/products?category=electronics&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products.every(p => p.category === 'electronics')).toBe(true);
    });

    test('GET /api/products?category=audio -> Filter by audio category', async () => {
      const res = await request(app).get('/api/products?category=audio&status=active');

      expect(res.status).toBe(200);
      if (res.body.products.length > 0) {
        expect(res.body.products.every(p => p.category === 'audio')).toBe(true);
      }
    });
  });

  describe('Condition Filtering', () => {
    test('GET /api/products?condition=brand_new -> Filter by condition', async () => {
      const res = await request(app).get('/api/products?condition=brand_new&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products.every(p => p.condition === 'brand_new')).toBe(true);
    });

    test('GET /api/products?condition=like_new -> Filter by like_new condition', async () => {
      const res = await request(app).get('/api/products?condition=like_new&status=active');

      expect(res.status).toBe(200);
      if (res.body.products.length > 0) {
        expect(res.body.products.every(p => p.condition === 'like_new')).toBe(true);
      }
    });
  });

  describe('Full-Text Search', () => {
    test('GET /api/products?search=iPhone -> Search by keyword', async () => {
      const res = await request(app).get('/api/products?search=iPhone&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      // Results should include iPhone products
    });

    test('GET /api/products?search=laptop -> Search laptop products', async () => {
      const res = await request(app).get('/api/products?search=laptop&status=active');

      expect(res.status).toBe(200);
      if (res.body.products.length > 0) {
        // Check if any product has "laptop" in title or description
        expect(res.body.products.some(p => 
          p.title.toLowerCase().includes('laptop') || 
          p.description.toLowerCase().includes('laptop')
        )).toBe(true);
      }
    });

    test('GET /api/products?search=wireless -> Search wireless products', async () => {
      const res = await request(app).get('/api/products?search=wireless&status=active');

      expect(res.status).toBe(200);
      // Should find products with "wireless" in description
    });
  });

  describe('Geospatial Radius Search', () => {
    test('GET /api/products?lat=40.7&lng=-74.0&radius=5 -> Search nearby products', async () => {
      const res = await request(app).get(
        '/api/products?lat=40.7&lng=-74.0&radius=5&status=active'
      );

      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
      // Should return products near coordinates
    });

    test('GET /api/products?lat=34.05&lng=-118.2&radius=10 -> Search LA area', async () => {
      const res = await request(app).get(
        '/api/products?lat=34.05&lng=-118.2&radius=10&status=active'
      );

      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
    });

    test('Search nearby with insufficient parameters returns 400', async () => {
      const res = await request(app).get('/api/products/nearby/search?lat=40.7');

      expect(res.status).toBe(400);
    });
  });

  describe('Combined Filters', () => {
    test('GET /api/products?category=electronics&minPrice=200&maxPrice=1500 -> Combined price and category', async () => {
      const res = await request(app).get(
        '/api/products?category=electronics&minPrice=200&maxPrice=1500&status=active'
      );

      expect(res.status).toBe(200);
      expect(res.body.products.every(p => p.category === 'electronics')).toBe(true);
      expect(res.body.products.every(p => p.basePrice >= 200 && p.basePrice <= 1500)).toBe(true);
    });

    test('GET /api/products?search=phone&condition=like_new&maxPrice=1000 -> Search + condition + price', async () => {
      const res = await request(app).get(
        '/api/products?search=phone&condition=like_new&maxPrice=1000&status=active'
      );

      expect(res.status).toBe(200);
      expect(res.body.products.every(p => p.basePrice <= 1000)).toBe(true);
      if (res.body.products.length > 0) {
        expect(res.body.products.every(p => p.condition === 'like_new')).toBe(true);
      }
    });

    test('GET /api/products?category=electronics&search=phone&lat=40.7&lng=-74.0&radius=50 -> Full multi-filter', async () => {
      const res = await request(app).get(
        '/api/products?category=electronics&search=phone&lat=40.7&lng=-74.0&radius=50&status=active'
      );

      expect(res.status).toBe(200);
      expect(res.body.filters).toBeDefined();
      expect(res.body.filters.category).toBe('electronics');
      expect(res.body.filters.search).toBe('phone');
    });
  });

  describe('Sorting', () => {
    test('GET /api/products?sortBy=price_asc -> Sort by price ascending', async () => {
      const res = await request(app).get('/api/products?sortBy=price_asc&status=active');

      expect(res.status).toBe(200);
      if (res.body.products.length > 1) {
        for (let i = 0; i < res.body.products.length - 1; i++) {
          expect(res.body.products[i].basePrice).toBeLessThanOrEqual(res.body.products[i + 1].basePrice);
        }
      }
    });

    test('GET /api/products?sortBy=price_desc -> Sort by price descending', async () => {
      const res = await request(app).get('/api/products?sortBy=price_desc&status=active');

      expect(res.status).toBe(200);
      if (res.body.products.length > 1) {
        for (let i = 0; i < res.body.products.length - 1; i++) {
          expect(res.body.products[i].basePrice).toBeGreaterThanOrEqual(res.body.products[i + 1].basePrice);
        }
      }
    });

    test('GET /api/products?sortBy=newest -> Sort by newest first', async () => {
      const res = await request(app).get('/api/products?sortBy=newest&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
    });

    test('GET /api/products?sortBy=oldest -> Sort by oldest first', async () => {
      const res = await request(app).get('/api/products?sortBy=oldest&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
    });
  });

  describe('Pagination', () => {
    test('GET /api/products?page=1&limit=2 -> Pagination works correctly', async () => {
      const res = await request(app).get('/api/products?page=1&limit=2&status=active');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
      expect(res.body.pagination.totalPages).toBeDefined();
    });

    test('GET /api/products?page=2&limit=3 -> Second page retrieval', async () => {
      const res = await request(app).get('/api/products?page=2&limit=3&status=active');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
    });
  });

  describe('Search Suggestions', () => {
    test('GET /api/products/search/suggestions?q=iph -> Get autocomplete suggestions', async () => {
      const res = await request(app).get('/api/products/search/suggestions?q=iph');

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });

    test('GET /api/products/search/suggestions?q=electronics -> Category suggestions', async () => {
      const res = await request(app).get('/api/products/search/suggestions?q=electronics');

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
    });

    test('GET /api/products/search/suggestions?q=x -> Short query returns empty', async () => {
      const res = await request(app).get('/api/products/search/suggestions?q=x');

      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBe(0);
    });
  });

  describe('Filter Metadata', () => {
    test('GET /api/products/filters/metadata -> Get filter options', async () => {
      const res = await request(app).get('/api/products/filters/metadata');

      expect(res.status).toBe(200);
      expect(res.body.categories).toBeDefined();
      expect(res.body.conditions).toBeDefined();
      expect(res.body.priceRange).toBeDefined();
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(Array.isArray(res.body.conditions)).toBe(true);
    });

    test('Filter metadata contains expected conditions', async () => {
      const res = await request(app).get('/api/products/filters/metadata');

      expect(res.status).toBe(200);
      expect(res.body.conditions).toContain('brand_new');
      expect(res.body.conditions).toContain('like_new');
      expect(res.body.conditions).toContain('excellent');
      expect(res.body.conditions).toContain('good');
      expect(res.body.conditions).toContain('fair');
    });

    test('Filter metadata price range is valid', async () => {
      const res = await request(app).get('/api/products/filters/metadata');

      expect(res.status).toBe(200);
      expect(res.body.priceRange.minPrice).toBeGreaterThanOrEqual(0);
      expect(res.body.priceRange.maxPrice).toBeGreaterThanOrEqual(res.body.priceRange.minPrice);
    });
  });

  describe('Edge Cases', () => {
    test('Invalid page number defaults to 1', async () => {
      const res = await request(app).get('/api/products?page=0&status=active');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });

    test('Negative price range returns empty results', async () => {
      const res = await request(app).get('/api/products?minPrice=-100&maxPrice=-10&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(0);
    });

    test('Empty search query returns all products', async () => {
      const res = await request(app).get('/api/products?search=&status=active');

      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
    });

    test('Invalid coordinates returns error', async () => {
      const res = await request(app).get(
        '/api/products/nearby/search?lat=invalid&lng=-74.0'
      );

      // Should handle gracefully
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('Performance & Response Format', () => {
    test('Response includes pagination metadata', async () => {
      const res = await request(app).get('/api/products?page=1&limit=10&status=active');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBeDefined();
      expect(res.body.pagination.limit).toBeDefined();
      expect(res.body.pagination.total).toBeDefined();
      expect(res.body.pagination.totalPages).toBeDefined();
    });

    test('Response includes filter metadata', async () => {
      const res = await request(app).get(
        '/api/products?category=electronics&search=phone&minPrice=100&status=active'
      );

      expect(res.status).toBe(200);
      expect(res.body.filters).toBeDefined();
      expect(res.body.filters.category).toBe('electronics');
      expect(res.body.filters.search).toBe('phone');
      expect(res.body.filters.minPrice).toBe('100');
    });

    test('Products include seller information', async () => {
      const res = await request(app).get('/api/products?status=active&limit=1');

      expect(res.status).toBe(200);
      if (res.body.products.length > 0) {
        expect(res.body.products[0].sellerId).toBeDefined();
        expect(res.body.products[0].sellerId.firstName).toBeDefined();
      }
    });
  });
});
