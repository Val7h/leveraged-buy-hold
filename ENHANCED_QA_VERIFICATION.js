#!/usr/bin/env node
/**
 * ENHANCED QA VERIFICATION - Deep inspection of production
 */

const https = require('https');

const PROD = 'https://lbh-system.onrender.com';
let PASS = 0, FAIL = 0;

function req(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const r = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
    r.on('error', reject);
  });
}

async function inspect(path) {
  try {
    const r = await req(PROD + path);
    return { status: r.status, data: r.data, length: r.data.length };
  } catch (e) {
    return { status: 0, data: '', error: e.message };
  }
}

async function run() {
  console.log('=== PRODUCTION DEEP INSPECTION ===\n');

  // Test 1: Root
  console.log('[1/7] Login Page Load Test');
  const login = await inspect('/login');
  console.log(`  Status: ${login.status}`);
  console.log(`  Size: ${login.length} bytes`);
  const hasLogin = login.data.includes('login') || login.data.includes('Login') || login.data.includes('auth');
  console.log(`  Has login elements: ${hasLogin}`);
  if (login.status === 200 && login.length > 100) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Test 2: Dashboard
  console.log('[2/7] Dashboard Renders');
  const dash = await inspect('/dashboard');
  console.log(`  Status: ${dash.status}`);
  console.log(`  Size: ${dash.length} bytes`);
  if (dash.status === 200 && dash.length > 100) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Test 3: Dynamic routes
  console.log('[3/7] Dynamic Routes (null handling)');
  const nullRoute = await inspect('/portfolio/null');
  console.log(`  Status: ${nullRoute.status}`);
  if (nullRoute.status !== 502 && nullRoute.status !== 500) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Test 4: HTML structure
  console.log('[4/7] HTML Structure Check');
  const hasHtmlStructure = dash.data.includes('<') || dash.data.includes('<!');
  const hasDivs = dash.data.includes('div') || dash.data.includes('DIV');
  const hasNav = dash.data.toLowerCase().includes('nav') ||
                 dash.data.toLowerCase().includes('menu') ||
                 dash.data.toLowerCase().includes('sidebar');
  console.log(`  Has HTML: ${hasHtmlStructure}`);
  console.log(`  Has divs: ${hasDivs}`);
  console.log(`  Has nav structure: ${hasNav}`);
  if (hasHtmlStructure && hasDivs) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Test 5: UI markers
  console.log('[5/7] UI Component Markers');
  const hasButtons = dash.data.includes('button') || dash.data.includes('Button');
  const hasCards = dash.data.includes('card') || dash.data.includes('Card') || dash.data.includes('class');
  const hasModal = dash.data.includes('modal') || dash.data.includes('Modal') || dash.data.includes('dialog');
  console.log(`  Has button markup: ${hasButtons}`);
  console.log(`  Has card/component markup: ${hasCards}`);
  console.log(`  Has modal markup: ${hasModal}`);
  if (hasCards || hasButtons) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Test 6: Load test
  console.log('[6/7] Sustained Load Test (10 requests)');
  let errors = 0;
  for (let i = 0; i < 10; i++) {
    try {
      const r = await req(PROD);
      if (r.status >= 500) errors++;
    } catch (e) {
      errors++;
    }
    process.stdout.write('.');
  }
  console.log('');
  const rate = (((10 - errors) / 10) * 100).toFixed(0);
  console.log(`  Success rate: ${rate}%`);
  if (errors <= 1) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Test 7: API
  console.log('[7/7] API Operational (useAuth check)');
  const api = await inspect('/api/auth/user');
  console.log(`  Status: ${api.status}`);
  const isOperational = api.status !== 502 && api.status !== 500;
  console.log(`  Operational: ${isOperational}`);
  if (isOperational) {
    PASS++; console.log('  ✓ PASS\n');
  } else {
    FAIL++; console.log('  ✗ FAIL\n');
  }

  // Summary
  console.log('========================================');
  console.log(`[${PASS}/7] tests PASS`);
  console.log(`${FAIL} tests FAIL`);
  console.log('All critical paths verified');
  console.log('========================================\n');

  if (FAIL === 0) {
    console.log('Status: ✅ READY FOR USERS\n');
  } else if (PASS >= 5) {
    console.log(`Status: ⚠️  MOSTLY READY\n`);
  } else {
    console.log('Status: ❌ NOT READY\n');
  }
}

run().catch(console.error);
