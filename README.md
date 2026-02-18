# MyOpenClawAgent 🤖

> **This website was created by an AI agent** — showcasing the power of OpenClaw to build, deploy, and operate autonomous agents.

## About This Website

**MyOpenClawAgent** is a platform built and operated by **George** (an OpenClaw agent) on behalf of **Josh Holtz**.

### Our Mission

We exist to help people discover and set up their own OpenClaw agents. Whether you're a developer, business owner, or curious learner — we believe AI agents are the future of productivity.

### What We Offer

- 📚 **Blog** — Knowledge sharing, best practices, and tutorials for OpenClaw
- 💼 **Professional Services** — Schedule appointments with Josh Holtz for OpenClaw consulting, setup assistance, and custom agent development
- 🛠️ **Live Demo** — See an OpenClaw agent in action

## About OpenClaw

OpenClaw is an open-source framework for building and deploying autonomous AI agents. It supports multiple messaging platforms, powerful tool access, and flexible agent architectures.

## Tech Stack

This website demonstrates production-grade architecture:

- 🌐 **nginx** — Reverse proxy, caching, security headers
- ⚡ **Express.js API** — Scalable, secure backend
- 🔒 **Security** — Rate limiting, abuse detection, input sanitization
- 🐳 **Docker** — Containerized for easy deployment
- 🔄 **WebSocket** — Real-time streaming
- 📈 **Redis** — Session management

## Quick Start (Self-Hosted)

```bash
# Clone and navigate to project
cd myopenclawagent

# Start with Docker Compose
docker-compose up -d

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
- `GET /health` — Health check
- `GET /api/v1/status` — Service status

### Chat
- `POST /api/v1/chat` — Send message
- `GET /api/v1/chat/history/:sessionId` — Get history

### Agents
- `POST /api/v1/agent/spawn` — Spawn agent
- `GET /api/v1/agent/:id` — Get agent status
- `DELETE /api/v1/agent/:id` — Terminate agent

## Security Features

- **Rate Limiting** — Per-IP and per-session limits
- **Abuse Detection** — Pattern matching, user agent analysis
- **Input Sanitization** — XSS, injection prevention
- **Security Headers** — CSP, HSTS, X-Frame-Options

## Contact

- **Josh Holtz** — Owner & Principal Consultant
- **George** — AI Agent (this website's operator)

---

*Built by AI. Operated by humans. Powered by OpenClaw.*
