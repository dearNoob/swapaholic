#!/usr/bin/env node

/**
 * Manual Authentication Test Script
 * Tests registration and login endpoints
 * 
 * Usage: Make sure backend is running, then run: node test-auth-manual.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const testEmail = `test${Date.now()}@example.com`;
const testPhone = `+880155${Date.now().toString().slice(-7)}`;
const testPassword = 'TestPass123';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRegistration() {
    log('\n📝 Testing Registration...', 'blue');

    try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Test',
            lastName: 'User',
            email: testEmail,
            password: testPassword,
            phone: testPhone,
            role: 'buyer',
            address: '123 Test Street, Dhaka'
        });

        if (response.data.success && response.data.data.accessToken) {
            log('✅ Registration successful!', 'green');
            log(`   Email: ${testEmail}`);
            log(`   Token: ${response.data.data.accessToken.substring(0, 20)}...`);
            log(`   User ID: ${response.data.data.user.id}`);
            return true;
        } else {
            log('❌ Registration failed: Unexpected response format', 'red');
            console.log(response.data);
            return false;
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log('❌ Cannot connect to backend server!', 'red');
            log('   Make sure the backend is running on port 5000', 'yellow');
            log('   Run: npm run dev (in backend directory)', 'yellow');
        } else {
            log('❌ Registration failed:', 'red');
            log(`   ${error.response?.data?.message || error.message}`, 'red');
        }
        return false;
    }
}

async function testLogin() {
    log('\n🔐 Testing Login...', 'blue');

    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testEmail,
            password: testPassword
        });

        if (response.data.success && response.data.data.accessToken) {
            log('✅ Login successful!', 'green');
            log(`   Email: ${testEmail}`);
            log(`   Token: ${response.data.data.accessToken.substring(0, 20)}...`);
            return true;
        } else {
            log('❌ Login failed: Unexpected response format', 'red');
            console.log(response.data);
            return false;
        }
    } catch (error) {
        log('❌ Login failed:', 'red');
        log(`   ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

async function testWrongPassword() {
    log('\n🚫 Testing Wrong Password...', 'blue');

    try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testEmail,
            password: 'WrongPassword123'
        });

        log('❌ Should have failed with wrong password!', 'red');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            log('✅ Correctly rejected wrong password', 'green');
            log(`   Message: ${error.response.data.message}`, 'yellow');
            return true;
        } else {
            log('❌ Unexpected error:', 'red');
            log(`   ${error.message}`, 'red');
            return false;
        }
    }
}

async function testDuplicateEmail() {
    log('\n🔄 Testing Duplicate Email...', 'blue');

    try {
        await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Another',
            lastName: 'User',
            email: testEmail, // Same email
            password: testPassword,
            phone: `+880155${Date.now().toString().slice(-7)}`, // Different phone
            role: 'seller',
            address: '456 Another Street, Dhaka'
        });

        log('❌ Should have failed with duplicate email!', 'red');
        return false;
    } catch (error) {
        if (error.response?.status === 409) {
            log('✅ Correctly rejected duplicate email', 'green');
            log(`   Message: ${error.response.data.message}`, 'yellow');
            return true;
        } else {
            log('❌ Unexpected error:', 'red');
            log(`   ${error.message}`, 'red');
            return false;
        }
    }
}

async function runTests() {
    log('🧪 Starting Authentication Tests', 'blue');
    log('================================\n', 'blue');

    const results = {
        registration: false,
        login: false,
        wrongPassword: false,
        duplicateEmail: false
    };

    // Run tests in sequence
    results.registration = await testRegistration();

    if (results.registration) {
        results.login = await testLogin();
        results.wrongPassword = await testWrongPassword();
        results.duplicateEmail = await testDuplicateEmail();
    }

    // Summary
    log('\n📊 Test Summary', 'blue');
    log('================================', 'blue');

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        const color = passed ? 'green' : 'red';
        log(`${icon} ${test}`, color);
    });

    log(`\n${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

    if (passed === total) {
        log('\n🎉 All tests passed! Authentication is working correctly.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
    }
}

// Run tests
runTests().catch(error => {
    log('\n💥 Fatal error:', 'red');
    console.error(error);
    process.exit(1);
});
