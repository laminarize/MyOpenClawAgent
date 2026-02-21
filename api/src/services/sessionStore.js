const { v4: uuidv4 } = require('uuid');
const { getClient } = require('../lib/redis');

const SESSION_KEY_PREFIX = 'session:';
const SESSION_TTL_SEC = 24 * 60 * 60; // 24 hours

// In-memory fallback when Redis is not available
const memorySessions = new Map();
let memoryCleanupInterval = null;

function useRedis() {
    return getClient() !== null;
}

async function get(id) {
    if (useRedis()) {
        const client = getClient();
        const raw = await client.get(SESSION_KEY_PREFIX + id);
        if (!raw) return null;
        const session = JSON.parse(raw);
        session.updatedAt = new Date().toISOString();
        await set(id, session); // refresh TTL
        return session;
    }
    const session = memorySessions.get(id);
    if (!session) return null;
    session.updatedAt = new Date().toISOString();
    return session;
}

async function set(id, session) {
    session.updatedAt = new Date().toISOString();
    if (useRedis()) {
        const client = getClient();
        await client.setex(
            SESSION_KEY_PREFIX + id,
            SESSION_TTL_SEC,
            JSON.stringify(session)
        );
        return session;
    }
    memorySessions.set(id, session);
    return session;
}

async function create(data = {}) {
    const session = {
        id: data.id || uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        ...data,
    };
    await set(session.id, session);
    return session;
}

async function deleteSession(id) {
    if (useRedis()) {
        const client = getClient();
        await client.del(SESSION_KEY_PREFIX + id);
        return true;
    }
    return memorySessions.delete(id);
}

async function list(options = {}) {
    const { limit = 100, offset = 0 } = options;
    if (useRedis()) {
        const client = getClient();
        const keys = [];
        let cursor = '0';
        do {
            const [next, found] = await client.scan(cursor, 'MATCH', SESSION_KEY_PREFIX + '*', 'COUNT', 500);
            cursor = next;
            keys.push(...found);
        } while (cursor !== '0');
        const results = [];
        for (let i = offset; i < Math.min(offset + limit, keys.length); i++) {
            const raw = await client.get(keys[i]);
            if (raw) results.push(JSON.parse(raw));
        }
        return results;
    }
    return Array.from(memorySessions.values()).slice(offset, offset + limit);
}

async function count() {
    if (useRedis()) {
        const client = getClient();
        let n = 0;
        let cursor = '0';
        do {
            const [next, found] = await client.scan(cursor, 'MATCH', SESSION_KEY_PREFIX + '*', 'COUNT', 500);
            cursor = next;
            n += found.length;
        } while (cursor !== '0');
        return n;
    }
    return memorySessions.size;
}

async function stats() {
    const sessions = await list({ limit: 10000, offset: 0 });
    const now = Date.now();
    return {
        total: sessions.length,
        activeLastHour: sessions.filter((s) => {
            const t = new Date(s.updatedAt || s.createdAt).getTime();
            return now - t < 60 * 60 * 1000;
        }).length,
        totalMessages: sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0),
    };
}

function init() {
    if (!useRedis() && !memoryCleanupInterval) {
        memoryCleanupInterval = setInterval(() => {
            const now = Date.now();
            const ttl = 24 * 60 * 60 * 1000;
            for (const [id, session] of memorySessions.entries()) {
                const last = new Date(session.updatedAt || session.createdAt).getTime();
                if (now - last > ttl) memorySessions.delete(id);
            }
        }, 60 * 60 * 1000);
    }
}

function shutdown() {
    if (memoryCleanupInterval) {
        clearInterval(memoryCleanupInterval);
        memoryCleanupInterval = null;
    }
}

const sessionStore = {
    get,
    set,
    create,
    delete: deleteSession,
    list,
    count,
    stats,
    init,
    shutdown,
};

module.exports = { sessionStore };
