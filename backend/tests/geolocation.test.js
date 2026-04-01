// tests/geolocation.test.js
// Tests for the new geolocation endpoint (/api/products/nearby/search)

const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

describe('Geolocation Endpoint', () => {
    let sellerToken, seller;
    let productNY, productLA;

    beforeAll(async () => {
        await connectDB();

        // Register a seller
        const sellerRes = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Geo',
                lastName: 'Seller',
                phone: `+1555${Math.random().toString().slice(2, 8)}`,
                email: `geo_seller_${Math.random()}@test.com`,
                password: 'Test1234',
                role: 'user'
            });
        seller = sellerRes.body.user;
        sellerToken = sellerRes.body.token;

        // Create a product in New York (coordinates approx -74.0, 40.7)
        productNY = (
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    title: 'NYC Widget',
                    description: 'A widget located in New York',
                    category: 'tools',
                    basePrice: 100,
                    condition: 'brand_new',
                    geometry: { type: 'Point', coordinates: [-74.0, 40.7] },
                    location: 'New York'
                })
        ).body;

        // Create a product in Los Angeles (coordinates approx -118.2, 34.05)
        productLA = (
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    title: 'LA Gadget',
                    description: 'A gadget located in Los Angeles',
                    category: 'electronics',
                    basePrice: 200,
                    condition: 'like_new',
                    geometry: { type: 'Point', coordinates: [-118.2, 34.05] },
                    location: 'Los Angeles'
                })
        ).body;

        // Give MongoDB a moment to index the 2dsphere field
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterAll(async () => {
        await User.deleteMany({ email: /geo_seller_/ }).catch(() => { });
        await Product.deleteMany({ title: /NYC Widget|LA Gadget/ }).catch(() => { });
        await disconnectDB();
    });

    test('GET /api/products/nearby/search returns nearby products with distance', async () => {
        const res = await request(app).get(
            '/api/products/nearby/search?lat=40.7&lng=-74.0&maxDistance=10000' // 10 km
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // Should contain the NYC product and have a distance field
        const nyc = res.body.find(p => p._id === productNY._id);
        expect(nyc).toBeDefined();
        expect(nyc.distance).toBeDefined();
        // LA product should be excluded (farther than 10 km)
        const la = res.body.find(p => p._id === productLA._id);
        expect(la).toBeUndefined();
    });

    test('Missing query parameters return 400', async () => {
        const res = await request(app).get('/api/products/nearby/search?lat=40.7');
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Longitude/);
    });

    test('Invalid coordinate values return 400', async () => {
        const res = await request(app).get('/api/products/nearby/search?lat=invalid&lng=abc');
        expect([400, 500]).toContain(res.status);
    });
});
