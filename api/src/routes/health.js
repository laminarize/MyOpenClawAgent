const express = require('express');
const os = require('os');

const router = express.Router();

// Simple health check
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    });
});

// Detailed status
router.get('/api/v1/status', async (req, res) => {
    try {
        const memUsage = process.memoryUsage();
        const cpuLoad = os.loadavg();
        
        const status = {
            status: 'operational',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            metrics: {
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                    total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
                    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
                },
                cpu: {
                    load: cpuLoad.map(l => l.toFixed(2)),
                    cores: os.cpus().length
                },
                requests: {
                    // These would be tracked metrics in production
                    active: 0,
                    total: 0
                }
            },
            services: {
                redis: 'connected', // Would check actual connection
                websocket: 'active'
            }
        };
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            error: error.message 
        });
    }
});

module.exports = router;
