#!/usr/bin/env node
/**
 * Minimal GitHub webhook receiver: on push to main, runs `git pull` then `docker compose up -d --build`.
 * Uses only Node built-ins. Safe for public repos (no self-hosted runner).
 *
 * Env:
 *   GITHUB_WEBHOOK_SECRET  - Secret you set in GitHub webhook (required)
 *   REPO_PATH             - Directory to run git pull in (default: /repo when run in Docker)
 *   HOST_REPO_PATH        - Host path to repo for one-off compose (required in Docker: e.g. /root/myopenclawagent)
 *   PORT                  - Port to listen on (default: 9090)
 */
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const REPO_PATH = process.env.REPO_PATH || path.resolve(path.join(__dirname, '..'));
const HOST_REPO_PATH = process.env.HOST_REPO_PATH || REPO_PATH;
const PORT = Number(process.env.PORT) || 9090;

function verifySignature(body, signature) {
  if (!SECRET || !signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function rebuildAndUp(cb) {
  // Run compose from a one-off container so api + nginx pick up new code (needs Docker socket mount).
  // Use HOST_REPO_PATH so the one-off runs in the same directory as "docker compose up" on the host.
  const cmd = `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v ${HOST_REPO_PATH}:${HOST_REPO_PATH} -w ${HOST_REPO_PATH} docker.io/docker/compose:v2 -f docker-compose.yml up -d --build`;
  console.log('[webhook] Running: docker compose up -d --build in', HOST_REPO_PATH);
  exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[webhook] compose up --build failed:', err, stderr || '');
      if (cb) cb();
      return;
    }
    if (stdout) console.log('[webhook] compose:', stdout.trim());
    console.log('[webhook] compose up -d --build completed successfully');
    if (cb) cb();
  });
}

function pull(cb) {
  console.log('[webhook] Running: git pull origin main in', REPO_PATH);
  exec('git pull origin main', { cwd: REPO_PATH }, (err, stdout, stderr) => {
    if (err) {
      console.error('[webhook] git pull failed:', err, stderr || '');
      if (cb) cb();
      return;
    }
    if (stdout) console.log('[webhook] git pull:', stdout.trim());
    console.log('[webhook] git pull completed successfully');
    rebuildAndUp(cb);
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
    const bodyRaw = Buffer.concat(chunks);
    const body = bodyRaw.toString('utf8');
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
      console.log('[webhook] Ignoring push to', payload.ref || '?', '(not main)');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, skipped: 'not main' }));
      return;
    }
    console.log('[webhook] Push to main received, starting git pull + compose up --build');
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
  console.log(`GitHub webhook sync listening on port ${PORT}, REPO_PATH=${REPO_PATH}, HOST_REPO_PATH=${HOST_REPO_PATH}`);
});
