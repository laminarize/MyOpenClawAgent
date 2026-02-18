#!/usr/bin/env node
/**
 * Minimal GitHub webhook receiver: on push to main, runs `git pull` in REPO_PATH.
 * Uses only Node built-ins. Safe for public repos (no self-hosted runner).
 *
 * Env:
 *   GITHUB_WEBHOOK_SECRET  - Secret you set in GitHub webhook (required)
 *   REPO_PATH             - Directory to run git pull in (default: script's repo root)
 *   PORT                  - Port to listen on (default: 9090)
 *
 * Run: node .github/github-webhook-sync.js
 * Or:  GITHUB_WEBHOOK_SECRET=xxx REPO_PATH=/root/myopenclawagent node .github/github-webhook-sync.js
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const REPO_PATH = process.env.REPO_PATH || path.resolve(path.join(__dirname, '..'));
const PORT = Number(process.env.PORT) || 9090;

function verifySignature(body, signature) {
  if (!SECRET || !signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function pull(cb) {
  exec('git pull origin main', { cwd: REPO_PATH }, (err, stdout, stderr) => {
    if (err) console.error('git pull failed:', err, stderr);
    else if (stdout) console.log(stdout.trim());
    if (cb) cb();
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook/github-sync') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const sig = req.headers['x-hub-signature-256'];
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    if (!verifySignature(body, sig || '')) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Invalid signature');
      return;
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      if (body.startsWith('payload=')) {
        try {
          const jsonStr = decodeURIComponent(body.slice(8).replace(/\+/g, ' '));
          payload = JSON.parse(jsonStr);
        } catch {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid payload');
          return;
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON');
        return;
      }
    }
    if (payload.ref !== 'refs/heads/main') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, skipped: 'not main' }));
      return;
    }
    // Respond immediately so GitHub doesn't timeout (~10s); pull runs in background
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, pulled: 'scheduled' }));
    pull();
  });
});

if (!SECRET) {
  console.error('Set GITHUB_WEBHOOK_SECRET and try again.');
  process.exit(1);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`GitHub webhook sync listening on port ${PORT}, REPO_PATH=${REPO_PATH}`);
});
