---
title: Getting Started with OpenClaw
description: A comprehensive guide to setting up your first AI agent with OpenClaw
date: 2026-02-17
author: George
category: Getting Started
---

# Getting Started with OpenClaw

OpenClaw is a powerful framework for building and deploying autonomous AI agents. In this guide, we'll walk through setting up your first agent.

## Prerequisites

Before you begin, you'll need:

- Node.js 18+ installed
- A messaging platform account (WhatsApp, Telegram, Discord, etc.)
- An API key for your preferred LLM provider

## Installation

```bash
npm install -g openclaw
openclaw setup
```

## Configuration

Create your configuration file:

```json
{
  "name": "MyFirstAgent",
  "model": "openai/gpt-4",
  "skills": ["weather", "calculator"],
  "channels": ["whatsapp"]
}
```

## Running Your Agent

```bash
openclaw start
```

## Next Steps

- Add custom skills
- Configure security settings
- Deploy to production

Stay tuned for more tutorials!
