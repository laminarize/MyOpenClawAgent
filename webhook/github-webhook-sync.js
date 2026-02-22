#!/usr/bin/env node
/**
 * Minimal GitHub webhook receiver: on push to main, runs `git pull` then `docker compose up -d --build`.
 * Uses only Node built-ins. Safe for public repos (no self-hosted runner).
 *
 * Env:
 *   GITHUB_WEBHOOK_SECRET  - Secret you set in GitHub webhook (required)
 *   REPO_PATH             - Directory to run git pull in (default: /repo when run in Docker)
 *   HOST_REPO_PATH        - Host path to repo for one-off compose (required in Docker: e.g. /root/myopenclawagent)
 *   GIT_PULL_URL          - HTTPS clone URL for pull (avoids SSH in container; e.g. https://github.com/owner/repo.git)
 *   PORT                  - Port to listen on (default: 9090)
 */
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const REPO_PATH = process.env.REPO_PATH || path.resolve(path.join(__dirname, '..'));
const HOST_REPO_PATH = process.env.HOST_REPO_PATH || REPO_PATH;
const GIT_PULL_URL = process.env.GIT_PULL_URL || '';
const PORT = Number(process.env.PORT) || 9090;

function verifySignature(body, signature) {
  if (!SECRET || !signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function rebuildAndUp(cb) {
  // docker-cli-compose plugin is installed in this container; Docker socket is mounted.
  // Run compose directly with HOST_REPO_PATH as cwd so it finds docker-compose.yml and the correct context.
  const projectName = path.basename(HOST_REPO_PATH);
  // Exclude 'webhook' from the rebuild: running compose up on yourself causes the container
  // to be killed mid-execution (exit 137), leaving other services stranded.
  const cmd = `docker compose -p ${projectName} -f docker-compose.yml up -d --build --no-deps nginx api redis`;
  console.log('[webhook] Running: docker compose up -d --build in', HOST_REPO_PATH);
  exec(cmd, { cwd: REPO_PATH, timeout: 120000 }, (err, stdout, stderr) => {
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
  // Use HTTPS URL when set so we don't need SSH in the container (avoids "cannot run ssh: No such file or directory")
  const pullCmd = GIT_PULL_URL ? `git pull ${GIT_PULL_URL} main` : 'git pull origin main';
  console.log('[webhook] Running:', pullCmd, 'in', REPO_PATH);
  exec(pullCmd, { cwd: REPO_PATH }, (err, stdout, stderr) => {
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
