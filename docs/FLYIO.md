# Deploy TradeClaw on Fly.io

Deploy TradeClaw to [Fly.io](https://fly.io) in under 5 minutes. Fly.io runs your app close to users with automatic HTTPS, global edge networking, and machines that scale to zero when idle.

**Estimated cost:** ~$0–5/mo (fits within Fly.io free tier for hobby use)

---

## Prerequisites

- A [Fly.io account](https://fly.io/app/sign-up) (free)
- [flyctl CLI](https://fly.io/docs/flyctl/install/) installed

## Quick Start

### 1. Install flyctl

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Authenticate

```bash
fly auth login
```

### 3. Clone & deploy

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
fly launch --config fly.toml
```

When prompted:
- **App name:** `tradeclaw` (or pick your own)
- **Region:** Choose the closest to you (default: `sin` — Singapore)
- **Database:** No (TradeClaw uses file-based storage)

### 4. Deploy

```bash
fly deploy
```

Your app is live at `https://<your-app>.fly.dev` 🎉

---

## Environment Variables

Set environment variables via `fly secrets`:

```bash
fly secrets set NEXT_PUBLIC_APP_URL=https://your-app.fly.dev
fly secrets set TELEGRAM_BOT_TOKEN=your-bot-token
fly secrets set CRON_SECRET=your-cron-secret
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Recommended | Your deployed URL (for OG images, webhooks) |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token for signal alerts |
| `TELEGRAM_WEBHOOK_URL` | Optional | Webhook URL for Telegram bot |
| `TELEGRAM_CHANNEL_ID` | Optional | Channel ID for auto-broadcast |
| `CRON_SECRET` | Optional | Auth token for cron endpoints |
| `DISCORD_BOT_TOKEN` | Optional | Discord bot token |
| `DISCORD_CHANNEL_ID` | Optional | Discord channel for signals |
| `NOTION_TOKEN` | Optional | Notion integration token |
| `NOTION_DATABASE_ID` | Optional | Notion database for signal sync |

---

## Scaling

### Scale to zero (default)

TradeClaw ships with `auto_stop_machines = "stop"` and `min_machines_running = 0`. Your app hibernates when idle and wakes on the next request (~2s cold start).

### Always-on

```bash
fly scale count 1 --max-per-region 1
```

Or edit `fly.toml`:

```toml
[http_service]
  min_machines_running = 1
```

### Add memory

```bash
fly scale memory 512
```

### Multiple regions

```bash
fly scale count 2 --region sin,iad
```

---

## Cost Estimate

| Component | Free Tier | Paid |
|-----------|-----------|------|
| Shared CPU (1×) | 3 free machines | $1.94/mo per machine |
| 256 MB RAM | Included in free | $0.00/mo |
| Outbound transfer | 100 GB/mo free | $0.02/GB |
| HTTPS/TLS | ✅ Free | ✅ Free |
| **Total** | **$0/mo** | **~$2–5/mo** |

> Fly.io free tier includes 3 shared-cpu-1x 256MB VMs, 3GB persistent storage, and 160GB outbound transfer. TradeClaw fits comfortably within this.

---

## Useful Commands

```bash
# Check app status
fly status

# View logs
fly logs

# SSH into the machine
fly ssh console

# Open in browser
fly open

# Destroy the app
fly destroy tradeclaw
```

---

## Persistent Storage (Optional)

TradeClaw uses file-based JSON storage. For persistence across deploys, attach a Fly volume:

```bash
fly volumes create tradeclaw_data --size 1 --region sin
```

Then add to `fly.toml`:

```toml
[mounts]
  source = "tradeclaw_data"
  destination = "/app/data"
```

---

## Troubleshooting

**Build fails?** Check the build log: `fly logs --instance <id>`

**App won't start?** Verify the healthcheck: `curl https://your-app.fly.dev/api/health`

**Cold start too slow?** Set `min_machines_running = 1` in `fly.toml`

**Need help?** Open an issue at [github.com/naimkatiman/tradeclaw/issues](https://github.com/naimkatiman/tradeclaw/issues)

---

## Other Deploy Options

- **[Railway](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)** — One-click deploy
- **[Docker](https://tradeclaw.win/hub)** — `docker run -p 3000:3000 tradeclaw/tradeclaw`
- **[Replit](https://tradeclaw.win/replit)** — Fork and run in browser
