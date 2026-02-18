# MyOpenClawAgent

A scalable, production-ready web platform for AI agent assistance.

## Features

- 🌐 **Web Interface** - Clean, responsive chat UI
- 🔒 **Security** - Rate limiting, abuse detection, input sanitization
- ⚡ **Performance** - nginx reverse proxy, caching, compression
- 📈 **Scalable** - Docker-based, horizontal scaling ready
- 🔄 **WebSocket** - Real-time streaming support
- 🛡️ **Abuse Prevention** - Configurable middleware

## Quick Start

```bash
# Clone and navigate to project
cd myopenclawagent

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Scale API instances
docker-compose up -d --scale api=3
```

## Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│   nginx     │ (Reverse Proxy, Caching, SSL)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API        │ (Express.js, Rate Limiting)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Redis      │ (Session Store)
└─────────────┘
```


## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/v1/status` - Service status

### Chat
- `POST /api/v1/chat` - Send message
- `GET /api/v1/chat/history/:sessionId` - Get history

### Agents
- `POST /api/v1/agent/spawn` - Spawn agent
- `GET /api/v1/agent/:id` - Get agent status
- `DELETE /api/v1/agent/:id` - Terminate agent

## Security Features

1. **Rate Limiting** - Per-IP and per-session limits
2. **Abuse Detection** - Pattern matching, user agent analysis
3. **Input Sanitization** - XSS, injection prevention
4. **Security Headers** - CSP, HSTS, X-Frame-Options
5. **SSL/TLS** - Ready for HTTPS deployment

## Abuse Prevention Configuration

Edit `api/src/middleware/rateLimiter.js` to adjust:
- Request limits
- Time windows
- Endpoint-specific rules

Edit `api/src/middleware/abuseDetector.js` to customize:
- Bad user agent filters
- Suspicious pattern detection
- Blocking thresholds

## Scaling

```bash
# Scale API horizontally
docker-compose up -d --scale api=5

# Add load balancer (nginx upstream)
# Edit nginx/sites/myopenclawagent.conf
```

## SSL/TLS Setup

1. Generate certificates:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

2. Uncomment SSL server block in `nginx/sites/myopenclawagent.conf`

3. Enable HSTS header

## Development

```bash
# Development mode
cd api && npm run dev

# Or with Docker
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## License

MIT
