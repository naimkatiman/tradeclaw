<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw Logo" width="120" />

# TradeClaw

**Self-hosted AI trading signal platform. Runs on your machine. Free forever.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/naimkatiman/tradeclaw)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

[**🚀 Live Demo**](https://web-production-a5139.up.railway.app) · [**Dashboard**](https://web-production-a5139.up.railway.app/dashboard) · [**🦞 CLI Agent**](https://github.com/naimkatiman/tradeclaw-agent) · [**Alpha Screener (hosted)**](https://alphascreen.io) · [**Discord**](https://discord.gg/tradeclaw)

> **Prefer CLI over web?** → Check out **[tradeclaw-agent](https://github.com/naimkatiman/tradeclaw-agent)** — the daemon version that pushes signals directly to Telegram/Discord.

<br/>

<!-- Dashboard preview -->
<img src="docs/assets/dashboard-preview.png" alt="TradeClaw Dashboard — AI Trading Signals" width="800" onerror="this.style.display='none'" />

> **[→ Try the live demo](https://tradeclaw.demo.alphascreen.io)** • [Deploy your own in 5 min ↗](#quick-start)

</div>

---

## Why TradeClaw?

Most trading dashboards are:
- **Expensive** (Bloomberg, TradingView Pro — $$$)
- **Cloud-locked** (your signals, their servers)
- **Dumb** (no AI, no context, just charts)

TradeClaw is different:

| Feature | TradeClaw | TradingView | MT4 Platform |
|---------|-----------|-------------|--------------|
| AI-generated signals | ✅ | ❌ | ❌ |
| Self-hosted | ✅ | ❌ | Partial |
| Open source | ✅ | ❌ | ❌ |
| Multi-asset (forex + crypto + metals) | ✅ | ✅ | Partial |
| One-click Docker deploy | ✅ | ❌ | ❌ |
| Free forever | ✅ | ❌ | ❌ |

---

## What It Does

TradeClaw gives you AI-powered trading signals on **15 assets** across forex, crypto, and metals — with full technical analysis, risk management, and a clean dashboard you actually want to look at.

### Supported Assets
```
Forex:   XAUUSD · XAGUSD · EURUSD · GBPUSD · USDJPY · AUDUSD
Crypto:  BTCUSD · ETHUSD · XRPUSD · SOLUSD · ADAUSD
Indices: US30 · NAS100 · SPX500 · GER40
```

### Signal Engine
Every signal includes:
- **Direction:** BUY / SELL with confidence score
- **Entry zone** with Fibonacci precision
- **TP1, TP2, TP3** (Fibonacci extension levels)
- **Stop loss** (ATR-based, volatility-adjusted)
- **Multi-timeframe alignment** (M15 → H1 → H4 → D1)

### Technical Indicators
RSI · MACD · EMA (9/21/50/200) · Bollinger Bands · Stochastic · Support/Resistance · Fibonacci Retracements

### Everything Else
- 📊 **Canvas-based charts** — fast, no Canvas library bloat
- 📜 **Signal history** — 30-day lookback, searchable
- 🏆 **Signal leaderboard** — ranked by accuracy
- 📝 **Paper trading** — risk-free practice mode
- 🔬 **Backtesting engine** — test strategies on historical data
- 🤖 **Telegram bot** — signals pushed to your phone
- 🔔 **Custom alerts** — price, indicator, or signal-based
- 📱 **PWA** — installable, works offline

---

## Quick Start

```bash
git clone https://github.com/naimkatiman/tradeclaw
cp .env.example .env
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). That's it.

---

## One-Click Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/naimkatiman/tradeclaw)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/naimkatiman/tradeclaw)

---

## Configuration

```env
# .env.local

# Required
ADMIN_SECRET=your-super-secret-key

# Optional — Telegram bot for signal push notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Optional — External price feeds (defaults to free APIs)
COINMARKETCAP_API_KEY=
ALPHA_VANTAGE_API_KEY=

# Optional — Leverage and trading defaults
DEFAULT_LEVERAGE=1000
DEFAULT_CAPITAL=500
```

---

## Architecture

```
tradeclaw/
├── apps/
│   └── web/              # Next.js 16 frontend + API routes
│       ├── app/          # App router pages
│       ├── components/   # UI components
│       └── lib/          # Signal engine, indicators, utils
├── packages/
│   └── core/             # Shared types, signal logic, backtesting engine
└── docs/                 # Documentation
```

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · Canvas API · Vercel/Railway-ready

---

## Self-host vs Cloud

TradeClaw is **free and open source forever**.

If you don't want to manage infrastructure, **[Alpha Screener](https://alphascreen.io)** is the hosted version — managed updates, cloud data feeds, team features.

| | TradeClaw (self-host) | Alpha Screener (cloud) |
|-|----------------------|------------------------|
| Cost | Free | Paid |
| Hosting | Your machine | Our servers |
| Updates | Manual | Automatic |
| Data feeds | Bring your own | Included |
| Team access | Self-managed | Built-in |
| Support | Community | Priority |

---

## Roadmap

| Status | Feature |
|--------|---------|
| ✅ | Signal engine (RSI, MACD, EMA, Bollinger, Stochastic, S/R, Fibonacci) |
| ✅ | Multi-timeframe analysis (M5 → D1) |
| ✅ | TP/SL engine with Fibonacci levels |
| ✅ | Paper trading mode |
| ✅ | Backtesting engine |
| ✅ | Signal history + leaderboard |
| ✅ | Telegram bot push notifications |
| ✅ | Custom alerts |
| ✅ | PWA (installable, offline) |
| 🔄 | TradingView webhook receiver |
| 📋 | Mobile app (React Native) |
| 📋 | Strategy builder (visual drag-and-drop) |
| 📋 | MT4/MT5 connector (MetaApi) |
| 📋 | Social signal sharing |
| 📋 | AI explanation mode ("why this signal?") |

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=naimkatiman/tradeclaw,naimkatiman/tradeclaw-agent&type=Date)](https://star-history.com/#naimkatiman/tradeclaw&naimkatiman/tradeclaw-agent&Date)

---

## Contributing

Pull requests welcome. For major changes, open an issue first.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development
npm install
npm run dev        # Start dev server on :3000
npm run lint       # ESLint
npm run build      # Production build
```

---

## Community

- **Discord:** [discord.gg/tradeclaw](https://discord.gg/tradeclaw)
- **Reddit:** [r/tradeclaw](https://reddit.com/r/tradeclaw)
- **Twitter/X:** [@tradeclaw_io](https://twitter.com/tradeclaw_io)
- **Issues:** [GitHub Issues](https://github.com/naimkatiman/tradeclaw/issues)

---

## License

MIT — use it, fork it, build on it. Just don't sell it as your own.

---

<div align="center">

**If TradeClaw saved you money on trading tools, give it a ⭐**

Made with 🦾 by [@naimkatiman](https://github.com/naimkatiman) · Powered by [Alpha Screener](https://alphascreen.io)

</div>
