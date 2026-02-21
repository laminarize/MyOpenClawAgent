const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { WebSocketServer } = require('ws');
const http = require('http');

const { securityMiddleware } = require('./middleware/security');
const { abuseDetector } = require('./middleware/abuseDetector');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { trafficLogger } = require('./middleware/trafficLogger');

const chatRoutes = require('./routes/chat');
const agentRoutes = require('./routes/agent');
const healthRoutes = require('./routes/health');
const contactRoutes = require('./routes/contact');
const { sessionStore } = require('./services/sessionStore');
const { disconnect: redisDisconnect } = require('./lib/redis');

const app = express();
const server = http.createServer(app);

// WebSocket server for streaming
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active WebSocket connections
const wsClients = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = req.headers['x-client-id'] || req.socket.remoteAddress;
    wsClients.set(clientId, { ws, lastActivity: Date.now() });
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            // Handle incoming WebSocket messages
            if (data.type === 'chat') {
                // Process chat message
                ws.send(JSON.stringify({ type: 'ack', messageId: data.messageId }));
            }
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });
    
    ws.on('close', () => {
        wsClients.delete(clientId);
    });
    
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

// Heartbeat for WebSocket connections
const wsHeartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(wsHeartbeat);
});

// Middleware

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"],
        },
    },
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// User agent parsing
app.use(require('express-useragent').express());

// Security middleware (headers, sanitization)
app.use(securityMiddleware);

// Rate limiting
app.use(createRateLimiter());

// Slow down (progressive rate limiting)
app.use(slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 10,
    delayMs: 500, // Add 500ms delay per request after limit
    maxDelayMs: 8000,
}));

// Abuse detection
app.use(abuseDetector);

// Traffic logging to Redis (counters + unique IPs)
app.use(trafficLogger);

// Routes
app.use('/', healthRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/contact', contactRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
    
    res.status(err.status || 500).json({ 
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    sessionStore.shutdown();
    await redisDisconnect();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;

sessionStore.init();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});

module.exports = { app, server, wsClients };
