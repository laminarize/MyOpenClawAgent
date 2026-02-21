const { getClient } = require('../lib/redis');

const TRAFFIC_TOTAL_KEY = 'traffic:total';
const TRAFFIC_PATH_PREFIX = 'traffic:path:';
const TRAFFIC_DAILY_PREFIX = 'traffic:daily:';
const TRAFFIC_IPS_KEY = 'traffic:ips';
const DAILY_TTL_SEC = 31 * 24 * 60 * 60; // 31 days

function trafficLogger(req, res, next) {
    const client = getClient();
    if (!client) return next();

    const path = (req.route && req.route.path) ? req.baseUrl + req.route.path : req.path;
    const date = new Date().toISOString().slice(0, 10);
    const ip = req.ip || req.socket?.remoteAddress || '';
    const pathKey = TRAFFIC_PATH_PREFIX + path;
    const dailyKey = TRAFFIC_DAILY_PREFIX + date;

    client
        .pipeline()
        .incr(TRAFFIC_TOTAL_KEY)
        .incr(pathKey)
        .incr(dailyKey)
        .expire(dailyKey, DAILY_TTL_SEC)
        .sadd(TRAFFIC_IPS_KEY, ip || 'unknown')
        .exec()
        .catch((err) => {
            console.error('Traffic log error:', err.message);
        });

    next();
}

module.exports = { trafficLogger };
