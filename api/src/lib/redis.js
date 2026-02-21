const Redis = require('ioredis');

let client = null;
let connectError = null;

const REDIS_URL = process.env.REDIS_URL || '';

function getClient() {
    if (REDIS_URL === '') {
        return null;
    }
    if (client) {
        return client;
    }
    if (connectError) {
        return null;
    }
    try {
        client = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) return null;
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });
        client.on('error', (err) => {
            console.error('Redis client error:', err.message);
        });
        client.on('connect', () => {
            console.log('Redis connected');
        });
        return client;
    } catch (err) {
        connectError = err;
        console.error('Redis init error:', err.message);
        return null;
    }
}

async function ping() {
    const c = getClient();
    if (!c) return { ok: false, error: 'not configured' };
    try {
        const pong = await c.ping();
        return { ok: pong === 'PONG' };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

async function disconnect() {
    if (client) {
        await client.quit();
        client = null;
        connectError = null;
    }
}

module.exports = { getClient, ping, disconnect };
