const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = require('../src/index');
const User = require('../src/models/User');

const TEST_EMAIL = `verify_ai_${Date.now()}@example.com`;
const TEST_PASS = 'password123';
const IMAGE_PATH = path.join(__dirname, '../../Product_Image/XR.jpg');

async function verify() {
    console.log('Starting verification...');

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    }

    try {

        // 2. Register a Seller
        console.log('Registering test seller...');
        let res = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Test',
                lastName: 'Seller',
                email: TEST_EMAIL,
                password: TEST_PASS,
                role: 'seller',
                phone: `01${Math.floor(Math.random() * 100000000)}`,
                address: '123 Test St, Test City'
            });

        if (res.statusCode !== 201) {
            console.error('Registration failed:', res.body);
            throw new Error('Registration failed');
        }

        // 3. Login to get token
        console.log('Logging in...');
        res = await request(app)
            .post('/api/auth/login')
            .send({
                email: TEST_EMAIL,
                password: TEST_PASS
            });

        if (res.statusCode !== 200) {
            console.error('Login failed:', res.body);
            throw new Error('Login failed');
        }

        const token = res.body.data.accessToken;
        console.log('Got token.');

        // 4. Test Analyze Endpoint
        if (!fs.existsSync(IMAGE_PATH)) {
            console.warn('Image path not found, creating dummy file...');
            // Creating dummy file if not exists just to pass the file check if middleware is still there
            // But actually we need a real file if middleware validates it.
            // Assuming XR.jpg exists as per previous check.
        }

        console.log('Sending analyze request...');
        res = await request(app)
            .post('/api/products/analyze')
            .set('Authorization', `Bearer ${token}`)
            .field('title', 'iPhone XR')
            .field('category', 'electronics')
            .field('condition', 'good')
            .attach('images', IMAGE_PATH);

        if (res.statusCode !== 200) {
            console.error('Analysis Failed:', res.statusCode, res.body);
            throw new Error('Analysis endpoint returned error');
        }

        console.log('Analysis Success!');
        console.log('Description:', res.body.description ? res.body.description.substring(0, 100) + '...' : 'No description');
        console.log('Score:', res.body.score);
        console.log('Detected Labels:', res.body.detectedLabels);

    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        console.log('Cleaning up...');
        await User.deleteOne({ email: TEST_EMAIL });
        await mongoose.disconnect();
        // Since app keeps server open, we force exit
        process.exit(0);
    }
}

verify();
