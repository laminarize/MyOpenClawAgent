const uaParser = require('ua-parser-js');

// Abuse detection middleware
const abuseDetector = (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.useragent || {};
    const now = Date.now();
    
    // Store request metrics on res.locals for tracking
    res.locals.abuseScore = 0;
    res.locals.clientIp = clientIp;
    
    // Check for known bad user agents
    const badUserAgents = [
        'curl', 'wget', 'python', 'scrapy', 'bot', 'crawler',
        'spider', 'headless', 'phantom', 'selenium', 'hydra'
    ];
    
    const uaString = (userAgent.source || '').toLowerCase();
    if (badUserAgents.some(bad => uaString.includes(bad))) {
        // Allow but flag
        res.locals.abuseScore += 1;
    }
    
    // Check for missing user agent
    if (!userAgent.source || userAgent.source === '') {
        res.locals.abuseScore += 2;
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
        /(\.\.\/)/,  // Path traversal
        /(\$\()/,    // Command injection
        /(<script)/i, // XSS
        /(union\s+select)/i, // SQL injection
        /(eval\()/i, // Code injection
    ];
    
    const requestBody = JSON.stringify(req.body);
    const queryParams = JSON.stringify(req.query);
    const combined = requestBody + queryParams;
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(combined)) {
            res.locals.abuseScore += 5;
            console.warn(`Suspicious pattern detected from ${clientIp}: ${pattern}`);
        }
    }
    
    // Check for unusually large requests
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 100 * 1024) { // 100KB
        res.locals.abuseScore += 3;
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-host', 'x-real-ip'];
    // These are normal, but check for spoofing attempts
    
    // Add client info to request for downstream use
    req.clientInfo = {
        ip: clientIp,
        userAgent: userAgent.source,
        browser: userAgent.browser,
        os: userAgent.os,
        device: userAgent.device,
        isBot: userAgent.isBot,
        abuseScore: res.locals.abuseScore
    };
    
    // Log high-score requests
    if (res.locals.abuseScore >= 5) {
        console.warn(`High abuse score (${res.locals.abuseScore}) from ${clientIp}:`, {
            path: req.path,
            method: req.method,
            userAgent: userAgent.source,
            abuseScore: res.locals.abuseScore
        });
    }
    
    // Continue regardless (logging is for monitoring)
    // For stricter blocking, increase threshold
    next();
};

// Helper to check if client is blocked (could integrate with Redis)
const isClientBlocked = async (clientIp) => {
    // This would check against a blocklist (Redis/database)
    // For now, always return false
    return false;
};

module.exports = { abuseDetector, isClientBlocked };
