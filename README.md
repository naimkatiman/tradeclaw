<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="88" height="88" />

<a href="https://tradeclaw.win/dashboard">
  <img src="apps/web/public/tradeclaw-demo.gif" alt="TradeClaw Dashboard Demo" width="100%" />
</a>

<h1>TradeClaw</h1>
<p><strong>Open-source AI trading signal platform. Self-hosted. Free forever.</strong></p>
<p>RSI · MACD · EMA · Bollinger · Stochastic — all in one dashboard. Deploy in 2 minutes.</p>

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?color=10b981)](https://github.com/naimkatiman/tradeclaw/commits/main)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?logo=docker)](https://hub.docker.com/r/tradeclaw/tradeclaw)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?logo=vercel)](https://tradeclaw.win/dashboard)
[![GitHub Action](https://img.shields.io/badge/Action-Marketplace-2088FF?logo=github-actions)](https://github.com/marketplace/actions/tradeclaw-signal)

**[🚀 Live Demo](https://tradeclaw.win/dashboard)** · **[📡 API Docs](https://tradeclaw.win/api-docs)** · **[🤝 Contribute](https://tradeclaw.win/contribute)**

🌍 **English** | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [All languages](LANGUAGES.md)

</div>

---

## Why TradeClaw?

- **No subscriptions** — self-host it, own your data, pay $0
- **Real signals** — RSI/MACD/EMA/Bollinger/Stochastic confluence scoring, live from Binance + Yahoo Finance
- **Developer-first** — REST API, CLI (`npx tradeclaw`), webhooks, plugins, MCP server for AI assistants
- **120+ pages** — dashboard, backtest, screener, paper trading, Telegram bot, signal replay, and more

## Quick Start

```bash
# Option 1: Docker Hub (fastest — no clone needed)
docker pull tradeclaw/tradeclaw
docker run -p 3000:3000 tradeclaw/tradeclaw
# → hub.docker.com/r/tradeclaw/tradeclaw (linux/amd64 + linux/arm64)

# Option 1b: Docker Compose (with .env)
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d

# Option 2: npx demo (no install)
npx tradeclaw-demo

# Option 3: CLI
npx tradeclaw signals --pair BTCUSD --limit 5
```

Open [http://localhost:3000](http://localhost:3000) — dashboard is live.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw/tree/main/apps/web)

## Features

| Category | What you get |
|----------|-------------|
| 📊 **Signals** | RSI, MACD, EMA, Bollinger, Stochastic — 5-indicator confluence scoring |
| 🎯 **Assets** | BTCUSD, ETHUSD, XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY + more |
| ⏱️ **Timeframes** | M5, M15, H1, H4, D1 + multi-timeframe confluence view |
| 📱 **Mobile** | Responsive PWA — installable, offline-capable |
| 🤖 **Automation** | Telegram bot, Discord/Slack webhooks, custom JS plugins |
| 🔌 **API** | REST API with API keys, rate limiting, shields.io badges |
| 🖥️ **CLI** | `npx tradeclaw signals` — fetch signals from terminal |
| 🧠 **AI** | MCP server for Claude Desktop, AI signal explanations |
| 📈 **Backtest** | Canvas chart with RSI/MACD overlays, CSV export, monthly heatmap |
| 🎮 **Paper trading** | Virtual $10k portfolio, auto-follow signals, equity curve |

## TradeClaw vs Others

| Feature | TradeClaw | TradingView | 3Commas |
|---------|-----------|-------------|---------|
| Self-hosted | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ |
| Free forever | ✅ | ❌ ($15/mo+) | ❌ ($29/mo+) |
| REST API | ✅ | ❌ (paid) | ✅ |
| Telegram bot | ✅ built-in | ❌ | ✅ paid |
| Custom plugins | ✅ | Pine Script | ❌ |
| MCP / AI native | ✅ | ❌ | ❌ |

## Tech Stack

Next.js 15 · TypeScript 5 · Tailwind CSS v4 · Node.js 22 · Docker

## Embed Your Portfolio

Share your paper trading performance anywhere with embeddable widgets:

```html
<!-- Iframe embed (dark theme, auto-refreshes every 30s) -->
<iframe src="https://tradeclaw.win/api/widget/portfolio/embed?theme=dark" width="320" height="200" frameborder="0" style="border-radius:12px"></iframe>
```

```markdown
<!-- Shields.io badge for your README -->
[![TradeClaw Portfolio](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fwidget%2Fportfolio%2Fbadge&style=for-the-badge)](https://tradeclaw.win/paper-trading)
```

```markdown
<!-- SVG badge (no external service) -->
[![TradeClaw Portfolio](https://tradeclaw.win/api/widget/badge)](https://tradeclaw.win/paper-trading)
```

JSON API: `GET /api/widget/portfolio` — returns balance, equity, P&L, win rate. [Widget gallery &rarr;](https://tradeclaw.win/widgets)

## Live Signal Badges

Embed real-time BTC, ETH, and Gold signal badges directly in your README — auto-refresh every 5 minutes, no API key required.

[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win/signal/BTCUSD-H1-BUY)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win/signal/ETHUSD-H1-BUY)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win/signal/XAUUSD-H1-BUY)
[![EUR/USD Signal](https://tradeclaw.win/api/badge/EURUSD)](https://tradeclaw.win/signal/EURUSD-H1-BUY)

```markdown
<!-- Paste into any README — shows live BUY/SELL with confidence % -->
[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

```markdown
<!-- Or via shields.io (cache-busting friendly) -->
[![BTC Signal](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2FBTCUSD%2Fjson)](https://tradeclaw.win)
[![ETH Signal](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2FETHUSD%2Fjson)](https://tradeclaw.win)
```

URL format: `https://tradeclaw.win/api/badge/{PAIR}?tf={H1|H4|D1}` · [All badge pairs &rarr;](https://tradeclaw.win/badge)

## GitHub Action

Fetch live signals in your CI/CD pipeline:

```yaml
- name: Get BTC signal
  uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  id: signal
  with:
    pair: BTCUSD
    timeframe: H1
    min_confidence: 70

- name: Deploy if confident
  if: success()
  run: npm run deploy
```

Gate deployments on market conditions, run scheduled signal checks, scan multiple pairs with matrix strategy. [Action docs &rarr;](https://tradeclaw.win/action) &middot; [Marketplace &rarr;](https://github.com/marketplace/actions/tradeclaw-signal)

## Discord Bot

Add TradeClaw to your Discord server for live trading signals:

```bash
cd packages/tradeclaw-discord
npm install
DISCORD_BOT_TOKEN=your_token node bin/bot.js
```

**Slash commands:** `/signal`, `/leaderboard`, `/health`, `/subscribe`, `/unsubscribe`, `/help`

[Discord setup guide &rarr;](https://tradeclaw.win/discord) &middot; [Bot source &rarr;](https://github.com/naimkatiman/tradeclaw/tree/main/packages/tradeclaw-discord)

## Contributing

We welcome PRs! Check our **[good first issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** and **[contribution guide](https://tradeclaw.win/contribute)**.

```
⭐ Star this repo to help others discover TradeClaw
```

## Support the Project

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors)](https://github.com/sponsors/naimkatiman)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/naimkatiman)

---

<div align="center">
<sub>MIT License · Made with ⚡ · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
