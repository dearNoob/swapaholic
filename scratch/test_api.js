const axios = require('axios');

async function testAIAnalysis() {
  const url = 'http://localhost:5000/api/products/analyze';
  const data = new FormData();
  data.append('title', 'Test Product');
  data.append('category', 'electronics');
  data.append('condition', 'new');
  data.append('language', 'Bengali');

  // Note: Since this is backend and we use multer, we'd normally send a file.
  // This script might fail if multer is strict about files.
  // But we can check the logs to see if the mapping works before it hits the file check.
  try {
    const response = await axios.post(url, data);
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Error (Expected if no file):', error.response?.data || error.message);
  }
}

testAIAnalysis();
