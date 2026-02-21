#!/usr/bin/env node
/**
 * Test the /api/v1/contact endpoint end-to-end.
 * Sends a real POST and checks the response; also prints API logs hint.
 *
 * Usage:
 *   node scripts/test-contact-form.js                    # tests production (https://myopenclawagent.com)
 *   node scripts/test-contact-form.js local              # tests localhost API directly
 *   node scripts/test-contact-form.js https://my.domain  # tests custom URL
 */

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
let baseUrl;
if (!args[0] || args[0] === 'local') {
  baseUrl = args[0] === 'local' ? 'http://localhost:3000' : 'https://myopenclawagent.com';
} else {
  baseUrl = args[0];
}

const endpoint = `${baseUrl}/api/v1/contact`;
const testPayload = {
  name: 'Test User',
  email: 'joshholtz88@gmail.com',
  message: 'This is an automated test from test-contact-form.js',
};

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Origin': baseUrl,
      },
    };
    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out after 15s'));
    });
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log(`\nTesting contact form at: ${endpoint}\n`);

  // Test 1: valid payload
  console.log('Test 1: Valid submission');
  console.log('  Payload:', JSON.stringify(testPayload));
  try {
    const { status, body } = await post(endpoint, testPayload);
    const ok = status === 200 && body.success === true;
    console.log(`  Status: ${status} ${ok ? '✓' : '✗'}`);
    console.log(`  Body:   ${JSON.stringify(body)}`);
    if (!ok) console.log('  FAIL: expected 200 + success:true');
    else console.log('  PASS');
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
  }

  console.log('');

  // Test 2: missing fields (should return 400)
  console.log('Test 2: Missing fields (expect 400)');
  try {
    const { status, body } = await post(endpoint, { name: 'No Email' });
    const ok = status === 400;
    console.log(`  Status: ${status} ${ok ? '✓' : '✗'}`);
    console.log(`  Body:   ${JSON.stringify(body)}`);
    if (!ok) console.log('  FAIL: expected 400');
    else console.log('  PASS');
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
  }

  console.log('');

  // Test 3: invalid email (should return 400)
  console.log('Test 3: Invalid email (expect 400)');
  try {
    const { status, body } = await post(endpoint, { name: 'Test', email: 'notanemail', message: 'hello' });
    const ok = status === 400;
    console.log(`  Status: ${status} ${ok ? '✓' : '✗'}`);
    console.log(`  Body:   ${JSON.stringify(body)}`);
    if (!ok) console.log('  FAIL: expected 400');
    else console.log('  PASS');
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
  }

  console.log('');
  console.log('Check API logs for the Resend email ID (background send):');
  console.log('  docker compose logs api --tail=20');
}

runTests();
