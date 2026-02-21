#!/usr/bin/env node
/**
 * Test TCP connectivity to smtp.gmail.com on port 587 (TLS) and 465 (SSL).
 * Forces IPv4 first (your host may resolve to IPv6 and timeout if IPv6 is not routed).
 * Run on host:    node scripts/test-smtp-connectivity.js
 *
 * Usage: node scripts/test-smtp-connectivity.js [port]
 *   No args = test both 587 and 465 over IPv4
 *   port    = test only that port (587 or 465)
 */

const net = require('net');
const dns = require('dns').promises;

const hostname = 'smtp.gmail.com';
const ports = [587, 465];
const timeout = 10000;

async function resolveIPv4() {
  try {
    const { address } = await dns.lookup(hostname, { family: 4 });
    return address;
  } catch (err) {
    console.error('DNS IPv4 lookup failed:', err.message);
    return null;
  }
}

function testConnection(host, port) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection(port, host, () => {
      socket.destroy();
      resolve({ port, ok: true, ms: Date.now() - start });
    });
    socket.setTimeout(timeout);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, ok: false, error: 'timeout' });
    });
    socket.on('error', (err) => {
      resolve({ port, ok: false, error: err.message });
    });
  });
}

async function main() {
  const arg = process.argv[2];
  const toTest = arg ? [parseInt(arg, 10)] : ports;
  if (toTest.some((p) => p !== 587 && p !== 465)) {
    console.error('Usage: node test-smtp-connectivity.js [587|465]');
    process.exit(1);
  }

  const ipv4 = await resolveIPv4();
  if (!ipv4) {
    process.exit(1);
  }
  console.log(`${hostname} → IPv4 ${ipv4} (${timeout}ms timeout per port)\n`);

  for (const port of toTest) {
    const label = port === 465 ? '465 (SSL)' : '587 (TLS)';
    process.stdout.write(`  Port ${label} ... `);
    const result = await testConnection(ipv4, port);
    if (result.ok) {
      console.log(`OK (${result.ms}ms)`);
    } else {
      console.log(`FAIL (${result.error})`);
    }
  }

  const results = await Promise.all(toTest.map((p) => testConnection(ipv4, p)));
  const ok = results.filter((r) => r.ok);
  if (ok.length) {
    console.log('\nUse GOOG_SMTP_PORT=' + ok[0].port + ' in .env. API contact form is set to use IPv4.');
  }
  if (ok.length === 0) {
    console.log('\nIPv4 connectivity failed. Try a transactional email API over HTTPS (Resend, SendGrid).');
    process.exit(1);
  }
}

main();
