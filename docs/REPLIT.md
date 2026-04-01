# Running TradeClaw on Replit

[![Run on Replit](https://replit.com/badge/github/naimkatiman/tradeclaw)](https://replit.com/github/naimkatiman/tradeclaw)

Run a full TradeClaw instance directly in your browser — no local install required.

---

## Quick Start

1. **Fork on Replit**
   Click the badge above or visit: https://replit.com/github/naimkatiman/tradeclaw

2. **Set environment variables** (optional — works in demo mode without them)
   In the Replit Secrets panel, add:
   ```
   NEXT_PUBLIC_APP_URL=https://<your-repl-slug>.<your-username>.repl.co
   NEXT_TELEMETRY_DISABLED=1
   ```

3. **Run**
   Click the ▶ Run button. Replit installs dependencies and starts the dev server.
   Your TradeClaw instance is live at the URL shown in the Replit webview.

---

## What Works on Replit

| Feature | Status |
|---------|--------|
| Live signal dashboard | ✅ Full |
| Signal screener | ✅ Full |
| Backtest engine | ✅ Full |
| Strategy builder | ✅ Full |
| Paper trading | ✅ Full |
| API endpoints | ✅ Full |
| Signal sharing / OG cards | ✅ Full |
| SSE price stream | ✅ Full |
| Demo mode | ✅ Enabled automatically |

## Limitations on Free Replit Tier

| Limitation | Notes |
|------------|-------|
| **Ephemeral file storage** | File-based JSON data (alerts, webhooks, signals) resets on each restart. Use the export feature to back up your data. |
| **Sleep after inactivity** | Free Replit instances sleep after ~5 minutes idle. Paid Replit keeps them always-on. |
| **No persistent Telegram bot** | The Telegram webhook requires a stable public URL — not guaranteed on free tier. |
| **No custom domain** | You get a `.repl.co` subdomain. Use Docker self-hosting for a custom domain. |

---

## For Production Use

Replit is great for demos and development. For a production self-hosted instance:

- **Docker** (recommended): See [/hub](../apps/web/app/hub/) — one command deploy
- **Railway**: One-click deploy button in README
- **Vercel**: Frontend deploy in one click (API routes included)

---

## Troubleshooting

**Build takes too long on Replit?**
The first run installs all dependencies and compiles 200+ Next.js pages. This can take 3–5 minutes. Subsequent runs are cached and much faster.

**Port not showing in webview?**
Make sure port 3000 is configured in the `.replit` file (already done). If you see a blank page, wait a few seconds for Next.js to finish compiling.

**Environment variable errors?**
TradeClaw runs in demo mode with synthetic data when env vars are missing. No external APIs are required to get started.

---

## Links

- [Live demo](https://tradeclaw.win)
- [GitHub repo](https://github.com/naimkatiman/tradeclaw)
- [Docker self-hosting guide](/hub)
- [API documentation](/api-docs)
