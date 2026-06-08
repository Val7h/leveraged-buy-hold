#!/usr/bin/env node
/**
 * DETAILED QA SMOKE TEST - Production Validation
 */

const https = require('https');

const PROD_URL = 'https://leveraged-buy-hold.onrender.com';
const results = [];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
    request.on('error', reject);
  });
}

async function inspectPage(path, label) {
  try {
    const res = await makeRequest(PROD_URL + path);
    console.log(`\n${label}`);
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Content length: ${res.data.length} bytes`);

    // Sample content
    const sample = res.data.substring(0, 500);
    console.log(`Sample:\n${sample}...`);

    return { status: res.status, data: res.data };
  } catch (error) {
    console.log(`${label}: ERROR - ${error.message}`);
    return { status: 0, data: '' };
  }
}

async function run() {
  console.log('=== PRODUCTION INSPECTION ===\n');

  const home = await inspectPage('/', 'GET /');
  const dashboard = await inspectPage('/dashboard', 'GET /dashboard');
  const login = await inspectPage('/login', 'GET /login');

  // Check for real React/Next app markers
  console.log('\n=== DETECTION ===');
  console.log(`Home has __NEXT_DATA__: ${home.data.includes('__NEXT_DATA__')}`);
  console.log(`Home has React root: ${home.data.includes('react-root') || home.data.includes('__next')}`);
  console.log(`Dashboard status: ${dashboard.status}`);
  console.log(`Login status: ${login.status}`);
}

run().catch(console.error);
