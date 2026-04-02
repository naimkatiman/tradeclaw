<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="72" height="72" />

# TradeClaw

**Open-source AI trading signal platform. Self-hosted. Free forever.**

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat-square&color=10b981)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Traders](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fusers&query=%24.count&label=traders&color=10b981&style=flat-square)](https://tradeclaw.win/users)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?logo=docker&style=flat-square)](https://hub.docker.com/r/tradeclaw/tradeclaw)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?logo=vercel&style=flat-square)](https://tradeclaw.win/dashboard)
[![Uptime](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fuptime&query=%24.overallUptime&suffix=%25+uptime&label=status&color=brightgreen&style=flat-square)](https://tradeclaw.win/status)
[![Subscribers](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fsubscribe&query=%24.count&label=subscribers&color=10b981&style=flat-square)](https://tradeclaw.win/subscribe)
[![Weekly Digest](https://img.shields.io/badge/%F0%9F%93%A7_Weekly_Digest-Subscribe-10b981?style=flat-square)](https://tradeclaw.win/subscribe)
[![Run on Replit](https://replit.com/badge/github/naimkatiman/tradeclaw)](https://replit.com/github/naimkatiman/tradeclaw)
[![Run on Fly.io](https://img.shields.io/badge/Run_on-Fly.io-7C3AED?logo=fly.io&style=flat-square)](https://tradeclaw.win/fly)
[![Supabase Ready](https://img.shields.io/badge/Supabase-Ready-3ECF8E?logo=supabase&style=flat-square)](https://tradeclaw.win/supabase)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-rose?style=flat-square)](https://github.com/sponsors/naimkatiman)

**[🚀 Live Demo](https://tradeclaw.win/dashboard)** · **[⚡ Get Started](https://tradeclaw.win/start)** · **[📡 API](https://tradeclaw.win/api-docs)** · **[📖 Docs](https://tradeclaw.win/docs)** · **[🤝 Contribute](https://tradeclaw.win/contribute)**

🌍 [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

> RSI · MACD · EMA · Bollinger · Stochastic — 5-indicator confluence. Live signals for BTC, ETH, Gold, Forex. Deploy in 60 seconds, no subscription required.

![TradeClaw Signals Demo](https://raw.githubusercontent.com/naimkatiman/tradeclaw/main/apps/web/public/tradeclaw-demo.gif)

## Try it now — no install

```bash
npx tradeclaw-demo
```

Opens a full live demo at `http://localhost:3001` — signals, leaderboard, backtest, all running locally.

👉 **[Interactive Setup Guide →](https://tradeclaw.win/start)**

## Deploy in 60 seconds

```bash
docker run -p 3000:3000 tradeclaw/tradeclaw
```

Open [http://localhost:3000](http://localhost:3000) — done.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw/tree/main/apps/web)

**[Supabase Setup Guide](https://tradeclaw.win/supabase)** — upgrade from JSON to Postgres with one command.

Or with Docker Compose (adds persistent data):

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw && cp .env.example .env
docker compose up -d
```

## What you get

| | TradeClaw | TradingView | 3Commas |
|--|:---------:|:-----------:|:-------:|
| Self-hosted | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ |
| Free forever | ✅ | ❌ ($15/mo+) | ❌ ($29/mo+) |
| REST API | ✅ | ❌ paid | ✅ |
| Telegram bot | ✅ built-in | ❌ | ✅ paid |
| Custom plugins | ✅ JS | Pine Script | ❌ |
| MCP / AI native | ✅ | ❌ | ❌ |

**Features:** Dashboard · Backtest · Screener · Paper trading · Telegram bot · Webhooks · Discord bot · Signal replay · Multi-timeframe · AI explanations · CLI · MCP server · Plugin system · PWA · RSS feeds · 190+ pages

## Live Signal Badges

Embed live BTC/ETH/Gold signals in any README — auto-refresh every 5 min, no API key:

[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win/signal/BTCUSD-H1-BUY)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win/signal/ETHUSD-H1-BUY)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win/signal/XAUUSD-H1-BUY)

```markdown
[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
```

## CLI

```bash
npx tradeclaw signals --pair BTCUSD --limit 5
npx tradeclaw leaderboard --period 30d
npx tradeclaw health
```

## GitHub Action

```yaml
- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  with: { pair: BTCUSD, min_confidence: 70 }
```

[Action docs →](https://tradeclaw.win/github-action) · [Marketplace →](https://github.com/marketplace/actions/tradeclaw-signal)

## Contributing

Check **[good first issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** and **[contribution guide](https://tradeclaw.win/contribute)**.

```
⭐ Star this repo to help others discover TradeClaw
```

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&style=flat-square)](https://github.com/sponsors/naimkatiman)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black&style=flat-square)](https://buymeacoffee.com/naimkatiman)

---

<div align="center">
<sub>MIT License · Made with ⚡ · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
