const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getClient } = require('../lib/redis');

function createRedisStore(prefix) {
    const client = getClient();
    if (!client) return undefined;
    return new RedisStore({
        sendCommand: (command, ...args) => client.call(command, ...args),
        prefix,
    });
}

function createRateLimiter() {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

    const baseOptions = (prefix, overrides = {}) => {
        const store = createRedisStore(prefix);
        return {
            windowMs: overrides.windowMs || windowMs,
            max: overrides.max ?? maxRequests,
            standardHeaders: true,
            legacyHeaders: false,
            ...(store && { store }),
            ...overrides,
        };
    };

    const generalLimiter = rateLimit({
        ...baseOptions('rl:general:'),
        message: {
            error: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000),
        },
        keyGenerator: (req) => {
            return req.user?.id ? `${req.ip}:${req.user.id}` : req.ip;
        },
        skip: (req) => {
            return req.path === '/health' || req.path === '/api/v1/status';
        },
    });

    const authLimiter = rateLimit({
        ...baseOptions('rl:auth:', { windowMs: 15 * 60 * 1000, max: 10 }),
        message: {
            error: 'Too many authentication attempts, please try again later.',
        },
    });

    const adminLimiter = rateLimit({
        ...baseOptions('rl:admin:', { windowMs: 60 * 1000, max: 30 }),
        message: {
            error: 'Admin rate limit exceeded.',
        },
    });

    return (req, res, next) => {
        if (req.path.startsWith('/api/v1/auth/')) {
            return authLimiter(req, res, next);
        }
        if (req.path.startsWith('/admin/')) {
            return adminLimiter(req, res, next);
        }
        return generalLimiter(req, res, next);
    };
}

module.exports = { createRateLimiter };
