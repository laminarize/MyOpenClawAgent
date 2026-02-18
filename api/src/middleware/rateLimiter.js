const rateLimit = require('express-rate-limit');

// Configurable rate limiter
const createRateLimiter = () => {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    
    // General API rate limiter
    const generalLimiter = rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            error: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            // Use IP + user ID if authenticated
            return req.user?.id 
                ? `${req.ip}:${req.user.id}` 
                : req.ip;
        },
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health' || req.path === '/api/v1/status';
        }
    });

    // Stricter limiter for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 attempts
        message: {
            error: 'Too many authentication attempts, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Very strict limiter for admin endpoints
    const adminLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30,
        message: {
            error: 'Admin rate limit exceeded.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Apply general limiter to all routes
    return (req, res, next) => {
        // Route-specific limiters
        if (req.path.startsWith('/api/v1/auth/')) {
            return authLimiter(req, res, next);
        }
        if (req.path.startsWith('/admin/')) {
            return adminLimiter(req, res, next);
        }
        return generalLimiter(req, res, next);
    };
};

module.exports = { createRateLimiter };
