# Sync on push to main (webhook — safe for public repos)

This uses a **webhook** instead of a self-hosted runner, so fork PRs cannot run code on your machine. When someone pushes to `main`, GitHub sends a POST to your server and a small script runs `git pull`.

## 1. Run the webhook receiver on this machine

**Run from the repo root** (or Node will look for `.github/` in the wrong place):

```bash
cd /root/myopenclawagent

# Set a secret (generate one: openssl rand -hex 32)
export GITHUB_WEBHOOK_SECRET=your_secret_here
export REPO_PATH=/root/myopenclawagent   # optional if you run from repo root
export PORT=9090                          # optional, default 9090

node .github/github-webhook-sync.js
```

Or from any directory: `node /root/myopenclawagent/.github/github-webhook-sync.js`

For production, run it as a service (e.g. systemd) and pass the secret via env file or systemd environment.

**Example systemd unit** (`/etc/systemd/system/github-webhook-sync.service`):

```ini
[Unit]
Description=GitHub webhook sync
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/myopenclawagent
Environment=GITHUB_WEBHOOK_SECRET=your_secret_here
Environment=REPO_PATH=/root/myopenclawagent
Environment=PORT=9090
ExecStart=/usr/bin/node /root/myopenclawagent/.github/github-webhook-sync.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then: `sudo systemctl daemon-reload && sudo systemctl enable --now github-webhook-sync`.

## 2. Expose the endpoint (if the server is behind NAT/firewall)

- Ensure port **9090** is reachable from the internet (or use a reverse proxy and forward a path to `http://localhost:9090`).
- Your URL will be: `https://your-domain.com/webhook/github-sync` (if you put nginx in front) or `http://YOUR_PUBLIC_IP:9090/webhook/github-sync`.

## 3. Add the webhook in GitHub

1. Repo → **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL**: `https://your-domain.com/webhook/github-sync` (or your public URL).
3. **Content type**: `application/json`.
4. **Secret**: same value as `GITHUB_WEBHOOK_SECRET`.
5. **Events**: choose **Just the push event** (or “Let me select…”, then only **Pushes**).
6. Save. GitHub will send a ping; you can check “Recent Deliveries” for success/failure.

After this, every push to `main` will trigger a request to your server and the script will run `git pull` in `REPO_PATH`.
