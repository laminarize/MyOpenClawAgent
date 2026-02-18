# myopenclawagent.com - Technical Specification

## Project Overview
- **Domain**: myopenclawagent.com
- **Purpose**: Web-based platform where users can get AI assistant help via OpenClaw
- **Target Users**: Individuals and businesses wanting to deploy AI agents
- **Architecture**: Docker-based, nginx reverse proxy, scalable API design

## Technical Architecture

### Stack
- **Frontend**: Static HTML/JS (optimized, minimal dependencies)
- **API Backend**: Node.js/Express with scalable design
- **Reverse Proxy**: nginx with caching, compression, security headers
- **Container**: Docker (amd64 Linux)

### Components
```
myopenclawagent/
├── docker-compose.yml
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── sites/
│       └── myopenclawagent.conf
├── api/
│   ├── src/
│   │   ├── index.js          # Express server
│   │   ├── middleware/
│   │   │   ├── rateLimiter.js
│   │   │   ├── abuseDetector.js
│   │   │   ├── cors.js
│   │   │   └── security.js
│   │   ├── routes/
│   │   │   ├── chat.js
│   │   │   ├── agent.js
│   │   │   └── health.js
│   │   └── services/
│   │       ├── agentManager.js
│   │       └── sessionStore.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── assets/
└── README.md
```

## Features

### 1. Web Interface
- Clean, fast-loading landing page
- Chat interface for agent interaction
- Real-time streaming responses
- Mobile-responsive design

### 2. API Architecture
- RESTful endpoints for agent interaction
- WebSocket support for streaming
- Session management
- Agent spawning capabilities

### 3. Abuse Prevention Middleware
- **Rate Limiting**: Per-IP, per-session limits
- **Request Size Limits**: Prevent payload abuse
- **User Agent Filtering**: Block known bad agents
- **Geographic Blocking**: Optional country restrictions
- **Behavior Analysis**: Detect abnormal usage patterns
- **Captcha Integration**: Configurable challenge system

### 4. nginx Configuration
- Gzip compression
- Static file caching
- Security headers (CSP, HSTS, etc.)
- Load balancing ready
- SSL/TLS termination ready

### 5. Scalability
- Stateless API design
- Redis-compatible session store (configurable)
- Horizontal scaling via nginx upstream
- Health check endpoints

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/v1/status` - Service status

### Protected (require auth/session)
- `POST /api/v1/chat` - Send message to agent
- `GET /api/v1/chat/stream` - Stream responses
- `POST /api/v1/agent/spawn` - Create new agent session
- `DELETE /api/v1/agent/:id` - Terminate agent

## Environment Variables
- `PORT` - API port (default: 3000)
- `REDIS_URL` - Session store (optional)
- `RATE_LIMIT_WINDOW` - Rate limit window ms
- `RATE_LIMIT_MAX` - Max requests per window
- `ALLOWED_ORIGINS` - CORS origins
- `ADMIN_KEY` - Admin API key

## Security
- Input sanitization
- SQL injection prevention (parameterized queries)
- XSS protection headers
- CSRF tokens
- Request validation

## Deployment
```bash
# Build and run
docker-compose up -d

# Scale horizontally
docker-compose up -d --scale api=3
```
