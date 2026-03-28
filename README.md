<div align="center">

<img src="apps/web/public/readme-banner.svg" alt="TradeClaw — Open-source AI trading signals. Self-hostable. Free." width="100%" />

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![Forks](https://img.shields.io/github/forks/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/forks)
[![Issues](https://img.shields.io/github/issues/naimkatiman/tradeclaw?color=2ea44f)](https://github.com/naimkatiman/tradeclaw/issues)
[![Last Commit](https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?color=10b981)](https://github.com/naimkatiman/tradeclaw/commits/main)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/naimkatiman/tradeclaw)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-Launch-DA552F?logo=producthunt&logoColor=white)](https://www.producthunt.com/posts/tradeclaw)
[![Show HN](https://img.shields.io/badge/Hacker%20News-Show%20HN-FF6600?logo=ycombinator&logoColor=white)](https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2Fnaimkatiman%2Ftradeclaw&t=Show+HN%3A+TradeClaw+%E2%80%93+Open-source+AI+trading+signal+platform+(self-hosted))
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-85EA2D?logo=openapiinitiative&logoColor=black)](https://github.com/naimkatiman/tradeclaw/blob/main/apps/web/app/api/openapi/route.ts)
[![RSS Feed](https://img.shields.io/badge/RSS-Live%20Signals-orange?logo=rss&logoColor=white)](https://tradeclaw.win/feed.xml)
[![Demo](https://img.shields.io/badge/Demo-Live%20Signals-10b981?logo=vercel&logoColor=white)](https://tradeclaw.win/demo)

**AI-powered trading signals for forex, crypto, and metals — free, open-source, self-hostable.**

[**Live Demo**](https://tradeclaw.win) · [**Dashboard**](https://tradeclaw.win/dashboard) · [**CLI Agent**](https://github.com/naimkatiman/tradeclaw-agent) · [**Alpha Screener (hosted)**](https://alphascreen.io) · [**Discord**](https://discord.gg/tradeclaw)

</div>

---

## Quick Terminal Demo

<div align="center">

![TradeClaw Terminal Demo](https://raw.githubusercontent.com/naimkatiman/tradeclaw/main/apps/web/public/demo-terminal-animated.svg)

</div>

```bash
npx tradeclaw signals            # Live signals in your terminal
npx tradeclaw-demo               # Local demo in your browser
```

No installation. No config. No Docker. Fetches live AI signals instantly.

> **Prefer CLI over web?** Check out **[tradeclaw-agent](https://github.com/naimkatiman/tradeclaw-agent)** — the daemon version that pushes signals directly to Telegram/Discord.

---

## Key Features

- **AI signal engine** — RSI, MACD, EMA, Bollinger, Fibonacci, multi-timeframe alignment with confidence scoring
- **15 assets** — Forex (XAUUSD, EURUSD, GBPUSD), Crypto (BTC, ETH, SOL, XRP), Indices (US30, NAS100)
- **Self-hosted** — `docker compose up -d` and you own everything. No vendor lock-in.
- **Beautiful dashboard** — Canvas charts, signal history, leaderboard, paper trading, backtesting

---

## Quick Start

```bash
git clone https://github.com/naimkatiman/tradeclaw
cp .env.example .env
# Set DB_PASSWORD and AUTH_SECRET in .env
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). That's it.

**Verify your setup:**
```bash
bash scripts/test-docker.sh            # Build + health check
bash scripts/test-docker.sh --no-build # Skip rebuild (faster)
bash scripts/test-docker.sh --cleanup  # Tear down after test
```

---

## Deploy

| Platform | Button | Notes |
|----------|--------|-------|
| **Railway** | [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/naimkatiman/tradeclaw) | Includes Redis + TimescaleDB |
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw&root=apps/web) | Serverless, no DB included |
| **Docker** | `docker compose up -d` | Full stack, self-hosted |

---

## 🎬 See It In Action

<div align="center">

![TradeClaw Live Signal Feed](https://raw.githubusercontent.com/naimkatiman/tradeclaw/main/apps/web/public/demo-signals-animated.svg)

**AI-scored signals with confidence, TP/SL, and indicator context — for 10 assets, 3 timeframes**

</div>

---

## Live Dashboard

<div align="center">

![TradeClaw Dashboard](https://raw.githubusercontent.com/naimkatiman/tradeclaw/main/apps/web/public/demo-dashboard-animated.svg)

> **[Try the live demo →](https://tradeclaw.win)** — AI signals for BTC, ETH, Gold, EUR/USD. No login required.

</div>

---

## Support the Project

If TradeClaw is useful to you, help us grow by starring the repo — it takes 2 seconds and helps thousands of traders discover free tools.

[![TradeClaw Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw)

Every star unlocks community milestones: MT4/MT5 integration at 100, mobile app at 250, hosted cloud at 500, and full backtesting at 1,000. See our **[star campaign page →](https://tradeclaw.win/star)**

---

## MCP Server (Claude Desktop / Cursor / Cline)

```json
{
  "mcpServers": {
    "tradeclaw": {
      "command": "npx",
      "args": ["tradeclaw-mcp"]
    }
  }
}
```
Add to `claude_desktop_config.json`, restart Claude, then ask: *"What's the current BTC signal?"*

---

## Live Signal Badges

Embed live trading signals directly in your GitHub README — no API key required.

```markdown
[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)

Badges update every **5 minutes**, powered by real TA (RSI, MACD, EMA, Bollinger Bands).
Supports Markdown, HTML, RST, and AsciiDoc — see **[tradeclaw.win/badges](https://tradeclaw.win/badges)** for all 10 pairs.

Also available as a **shields.io-compatible endpoint**:
```
https://tradeclaw.win/api/badge/BTCUSD/json
```

---

## API Access

Get a free API key at **[tradeclaw.win/api-keys](https://tradeclaw.win/api-keys)**.

```bash
curl -H "X-API-Key: tc_live_YOUR_KEY" \
  https://tradeclaw.win/api/signals
```

- **1,000 requests/hour** free
- Scoped permissions: signals, leaderboard, screener
- Self-host for unlimited access
- Full docs: [tradeclaw.win/api-docs](https://tradeclaw.win/api-docs)

---

## Why TradeClaw?

Most trading dashboards are **expensive, cloud-locked, and dumb** (no AI, just charts). TradeClaw is different:

### Head-to-Head Comparison

| Feature | **TradeClaw** | TradingView | 3Commas | QuantConnect | Freqtrade |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Free forever** | ✅ | ❌ ($15–60/mo) | ❌ ($49–79/mo) | ❌ ($8–24/mo) | ✅ |
| **Self-hosted** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Beautiful UI** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **AI-generated signals** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Open source (MIT)** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Multi-asset (forex + crypto + metals)** | ✅ | ✅ | Crypto only | ✅ | Crypto only |
| **One-command Docker deploy** | ✅ | ❌ | ❌ | ❌ | ⚠️ complex |
| **Telegram push alerts** | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Backtesting engine** | ✅ | ✅ Pro only | ❌ | ✅ | ✅ |
| **Signal confidence scoring** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **No vendor lock-in** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Live /demo (no login)** | ✅ | ❌ | ❌ | ❌ | ❌ |

> **TL;DR** — TradeClaw is the only platform that's free + self-hosted + beautiful + AI-powered + open source.

> See the full technical benchmark → **[/compare](https://tradeclaw.win/compare)**

---

## What It Does

TradeClaw gives you AI-powered trading signals on **15 assets** across forex, crypto, and metals — with full technical analysis, risk management, and a clean dashboard.

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

**Technical Indicators:** RSI · MACD · EMA (9/21/50/200) · Bollinger Bands · Stochastic · Support/Resistance · Fibonacci

### Full Feature Set

| Feature | Description |
|---------|-------------|
| **Canvas charts** | Fast, no library bloat |
| **Signal history** | 30-day lookback, searchable |
| **Leaderboard** | Signals ranked by accuracy |
| **Paper trading** | Risk-free practice mode |
| **Backtesting** | Test strategies on historical data |
| **Telegram bot** | Signals pushed to your phone |
| **Custom alerts** | Price, indicator, or signal-based |
| **PWA** | Installable, works offline |

---

## Screenshots

<div align="center">

[![Dashboard](https://tradeclaw.win/api/og)](https://tradeclaw.win/dashboard)

[![Signal Leaderboard](https://tradeclaw.win/api/og/leaderboard)](https://tradeclaw.win/leaderboard)

[![XAUUSD Signal](https://tradeclaw.win/api/og/signal/XAUUSD-H1-BUY)](https://tradeclaw.win/signals/XAUUSD)

</div>

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
│   └── web/              # Next.js 15 frontend + API routes
│       ├── app/          # App router pages
│       ├── components/   # UI components
│       └── lib/          # Signal engine, indicators, utils
├── packages/
│   └── core/             # Shared types, signal logic, backtesting engine
└── docs/                 # Documentation
```

**Stack:** Next.js 15 · TypeScript · Tailwind CSS v4 · Canvas API · Vercel/Railway-ready

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
| 📋 | AI explanation mode ("why this signal?") |

---

## Help Us Grow

Every star and share helps independent traders discover a free alternative to expensive signal platforms.

- **[Star the repo](https://github.com/naimkatiman/tradeclaw)** — takes 3 seconds, signals traction to the community
- **[Share on social](https://tradeclaw.win/share)** — pre-written posts for Reddit, HN, Twitter, LinkedIn, Discord
- **[Submit to awesome-lists](https://tradeclaw.win/awesome)** — upvote open PRs to awesome-selfhosted, awesome-quant

---

## Contributing

Pull requests welcome. For major changes, open an issue first.

**[Contributor hub → tradeclaw.win/contribute](https://tradeclaw.win/contribute)** — good first issues, mentorship program, and step-by-step setup guide.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines. Ready-to-post issue templates are in [.github/GOOD_FIRST_ISSUES.md](.github/GOOD_FIRST_ISSUES.md).

```bash
# Development
npm install
npm run dev        # Start dev server on :3000
npm run lint       # ESLint
npm run build      # Production build
```

- [Report a bug](https://github.com/naimkatiman/tradeclaw/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/naimkatiman/tradeclaw/issues/new?template=feature_request.yml)
- [Join Discord](https://discord.gg/tradeclaw)

---

## Community

- **Discord:** [discord.gg/tradeclaw](https://discord.gg/tradeclaw)
- **Reddit:** [r/tradeclaw](https://reddit.com/r/tradeclaw)
- **Twitter/X:** [@tradeclaw_io](https://twitter.com/tradeclaw_io)
- **Issues:** [GitHub Issues](https://github.com/naimkatiman/tradeclaw/issues)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=naimkatiman/tradeclaw,naimkatiman/tradeclaw-agent&type=Date)](https://star-history.com/#naimkatiman/tradeclaw&naimkatiman/tradeclaw-agent&Date)

---

## License

MIT — use it, fork it, build on it.

---

<div align="center">

**If TradeClaw saved you money on trading tools, give it a star**

Made with 🦾 by [@naimkatiman](https://github.com/naimkatiman) · Powered by [Alpha Screener](https://alphascreen.io)

</div>
