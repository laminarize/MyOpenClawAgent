#!/usr/bin/env node
/**
 * Validate .env format and credentials used by this project.
 * Run from repo root: node scripts/check-env.js
 * Does not print secret values, only format/validity.
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\n/g, '\n');
    }
    out[key] = value;
  }
  return out;
}

function red(s) {
  return process.stdout.isTTY ? `\x1b[31m${s}\x1b[0m` : s;
}
function green(s) {
  return process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s;
}
function dim(s) {
  return process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s;
}

const checks = [
  {
    key: 'GOOG_SMTP',
    required: false,
    hint: 'Format: your@gmail.com:app-password (16-char Gmail App Password, no spaces)',
    validate: (v) => {
      if (!v || v === '') return { ok: false, msg: 'empty or missing' };
      if (!v.includes(':')) return { ok: false, msg: 'must contain ":" (email:password)' };
      const [user, pass] = v.split(':');
      if (!user || !pass) return { ok: false, msg: 'both email and password part required' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) return { ok: false, msg: 'left side should look like an email' };
      return { ok: true, msg: `email part looks ok, password length ${pass.length}` };
    },
  },
  {
    key: 'GOOG_SMTP_PORT',
    required: false,
    hint: 'Gmail: 587 = TLS (default), 465 = SSL. See https://developers.google.com/workspace/gmail/imap/imap-smtp',
    validate: (v) => {
      if (!v || v === '') return { ok: true, msg: 'not set (default 587)' };
      const n = parseInt(v, 10);
      if (n !== 465 && n !== 587) return { ok: false, msg: 'use 587 or 465' };
      return { ok: true, msg: `port ${n} (${n === 465 ? 'SSL' : 'TLS'})` };
    },
  },
  {
    key: 'REDIS_URL',
    required: false,
    hint: 'Format: redis://host:port or redis://redis:6379 for Docker',
    validate: (v) => {
      if (!v || v === '') return { ok: true, msg: 'not set (API may use in-memory fallback)' };
      if (!/^redis:\/\//.test(v)) return { ok: false, msg: 'should start with redis://' };
      return { ok: true, msg: 'format ok' };
    },
  },
  {
    key: 'ALLOWED_ORIGINS',
    required: false,
    hint: 'Comma-separated origins, e.g. https://myopenclawagent.com,https://www.myopenclawagent.com',
    validate: (v) => {
      if (!v || v === '') return { ok: false, msg: 'empty (CORS will block non-localhost)' };
      const origins = v.split(',').map((o) => o.trim()).filter(Boolean);
      if (origins.length === 0) return { ok: false, msg: 'no valid origins' };
      const bad = origins.filter((o) => !/^https?:\/\//.test(o));
      if (bad.length) return { ok: false, msg: `each origin must start with http:// or https://` };
      return { ok: true, msg: `${origins.length} origin(s)` };
    },
  },
  {
    key: 'ADMIN_KEY',
    required: false,
    hint: 'Secret for admin endpoints; change from default in production',
    validate: (v) => {
      if (!v || v === '') return { ok: false, msg: 'empty' };
      if (v === 'changeme') return { ok: true, msg: 'still default (change in production)' };
      return { ok: true, msg: 'set (non-default)' };
    },
  },
  {
    key: 'SSL_CERTS_DIR',
    required: false,
    hint: 'Path to directory containing fullchain.crt and privkey.key (for nginx)',
    validate: (v) => {
      if (!v || v === '') return { ok: true, msg: 'not set (compose default ./certs)' };
      return { ok: true, msg: 'set' };
    },
  },
  {
    key: 'GITHUB_WEBHOOK_SECRET',
    required: false,
    hint: 'Secret for GitHub webhook (webhook service)',
    validate: (v) => {
      if (!v || v === '') return { ok: true, msg: 'not set' };
      return { ok: true, msg: 'set' };
    },
  },
];

function main() {
  console.log('Checking .env format and credentials\n');
  if (!fs.existsSync(envPath)) {
    console.log(red('File not found: .env'));
    console.log(dim('Create .env in the project root (same folder as docker-compose.yml).'));
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = parseEnv(content);
  let hasError = false;

  for (const { key, hint, validate } of checks) {
    const value = env[key];
    const result = validate(value);
    const status = result.ok ? green('ok') : red('fail');
    const valueDesc = value === undefined || value === '' ? 'missing' : 'set';
    console.log(`${key}: ${status} (${valueDesc})`);
    if (!result.ok) {
      console.log(dim('  ' + result.msg));
      console.log(dim('  ' + hint));
      hasError = true;
    } else if (result.msg) {
      console.log(dim('  ' + result.msg));
    }
    console.log('');
  }

  const otherKeys = Object.keys(env).filter((k) => !checks.some((c) => c.key === k));
  if (otherKeys.length) {
    console.log(dim('Other keys in .env: ' + otherKeys.join(', ')));
  }

  if (hasError) {
    process.exit(1);
  }
  console.log(green('All checked variables have valid format.'));
}

main();
