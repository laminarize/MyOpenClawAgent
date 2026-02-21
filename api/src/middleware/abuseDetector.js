const uaParser = require('ua-parser-js');
const { getClient } = require('../lib/redis');

const BLOCKLIST_KEY = 'blocklist:ips';
const ABUSE_LOG_KEY = 'abuse:log';
const ABUSE_LOG_MAX = 500;
const ABUSE_BLOCK_THRESHOLD = 15; // score >= this can be auto-blocked (optional, currently only log)

// Abuse detection middleware
const abuseDetector = async (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.useragent || {};
    res.locals.abuseScore = 0;
    res.locals.clientIp = clientIp;

    const client = getClient();
    if (client) {
        try {
            const blocked = await client.sismember(BLOCKLIST_KEY, clientIp);
            if (blocked === 1) {
                return res.status(403).json({ error: 'Access denied' });
            }
        } catch (err) {
            console.error('Abuse blocklist check error:', err.message);
        }
    }

    const badUserAgents = [
        'curl', 'wget', 'python', 'scrapy', 'bot', 'crawler',
        'spider', 'headless', 'phantom', 'selenium', 'hydra'
    ];
    const uaString = (userAgent.source || '').toLowerCase();
    if (badUserAgents.some(bad => uaString.includes(bad))) {
        res.locals.abuseScore += 1;
    }
    if (!userAgent.source || userAgent.source === '') {
        res.locals.abuseScore += 2;
    }

    const suspiciousPatterns = [
        /(\.\.\/)/,
        /(\$\()/,
        /(<script)/i,
        /(union\s+select)/i,
        /(eval\()/i,
    ];
    const requestBody = JSON.stringify(req.body || {});
    const queryParams = JSON.stringify(req.query || {});
    const combined = requestBody + queryParams;
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(combined)) {
            res.locals.abuseScore += 5;
            console.warn(`Suspicious pattern detected from ${clientIp}: ${pattern}`);
        }
    }

    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 100 * 1024) {
        res.locals.abuseScore += 3;
    }

    req.clientInfo = {
        ip: clientIp,
        userAgent: userAgent.source,
        browser: userAgent.browser,
        os: userAgent.os,
        device: userAgent.device,
        isBot: userAgent.isBot,
        abuseScore: res.locals.abuseScore
    };

    if (res.locals.abuseScore >= 5) {
        console.warn(`High abuse score (${res.locals.abuseScore}) from ${clientIp}:`, {
            path: req.path,
            method: req.method,
            userAgent: userAgent.source,
            abuseScore: res.locals.abuseScore
        });
    }

    if (client && res.locals.abuseScore >= 5) {
        try {
            const entry = JSON.stringify({
                ip: clientIp,
                path: req.path,
                method: req.method,
                score: res.locals.abuseScore,
                ts: new Date().toISOString(),
            });
            await client.lpush(ABUSE_LOG_KEY, entry);
            await client.ltrim(ABUSE_LOG_KEY, 0, ABUSE_LOG_MAX - 1);
        } catch (err) {
            console.error('Abuse log error:', err.message);
        }
    }

    next();
};

async function isClientBlocked(clientIp) {
    const client = getClient();
    if (!client) return false;
    try {
        const n = await client.sismember(BLOCKLIST_KEY, clientIp);
        return n === 1;
    } catch (err) {
        console.error('Blocklist check error:', err.message);
        return false;
    }
}

async function addToBlocklist(ip) {
    const client = getClient();
    if (!client) return false;
    try {
        await client.sadd(BLOCKLIST_KEY, ip);
        return true;
    } catch (err) {
        console.error('Blocklist add error:', err.message);
        return false;
    }
}

async function removeFromBlocklist(ip) {
    const client = getClient();
    if (!client) return false;
    try {
        await client.srem(BLOCKLIST_KEY, ip);
        return true;
    } catch (err) {
        console.error('Blocklist remove error:', err.message);
        return false;
    }
}

module.exports = { abuseDetector, isClientBlocked, addToBlocklist, removeFromBlocklist };
