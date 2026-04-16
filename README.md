<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="72" height="72" />

# TradeClaw

**Open-source AI trading signals. Every trade verified.**

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat-square&color=10b981)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?style=flat-square)](https://tradeclaw.win/dashboard)

**[Track Record](https://tradeclaw.win/track-record)** · **[Live Demo](https://tradeclaw.win/dashboard)** · **[API Docs](https://tradeclaw.win/api-docs)** · **[Pricing](https://tradeclaw.win/pricing)**

</div>

---

TradeClaw generates BUY/SELL signals using multi-timeframe technical analysis (RSI, MACD, EMA, Bollinger Bands, Stochastic, Supertrend). Every signal is recorded in a Postgres database and published on the [track record](https://tradeclaw.win/track-record) — wins **and** losses, no cherry-picking.

## Free vs Pro

|  | Free | Pro ($29/mo) |
|--|:----:|:------------:|
| Symbols | 3 (BTC, ETH, XAU) | All pairs |
| Signal delay | 15 min | Real-time |
| Take-profit levels | TP1 only | TP1 + TP2 + TP3 |
| Signal history | 24 hours | Full archive |
| Telegram alerts | Public channel (delayed) | Private channel (instant) |
| Track record | Full access | Full access |
| Self-host | Yes | Yes |

Start free at [tradeclaw.win/dashboard](https://tradeclaw.win/dashboard). Upgrade anytime at [tradeclaw.win/pricing](https://tradeclaw.win/pricing).

## Self-host with Docker Compose

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env   # edit DATABASE_URL + Telegram tokens
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

Requires PostgreSQL. Run migrations from `apps/web/migrations/` in order.

## Architecture

```
apps/web/           Next.js app (dashboard, API routes, signal engine)
packages/strategies/ Backtest comparison framework (not in live signal path)
scripts/            Local dev tools (scanner-engine.py — local only)
```

**Signal flow:**

```
API request → getTrackedSignals() → generateSignalsFromTA()
  → ta-engine.ts (RSI, MACD, EMA, BB, Stoch, Supertrend)
  → recordSignalsAsync() → signal_history table
  → /track-record page
```

Signals are generated as a side effect of API requests — no external scheduler. The TA engine runs inside the Next.js process.

## Strategy Presets

Five entry strategies, switchable via `SIGNAL_ENGINE_PRESET`:

| Preset | Logic |
|--------|-------|
| `classic` | RSI + MACD + EMA scoring — no regime filter |
| `regime-aware` | Classic filtered by HMM regime |
| `hmm-top3` | Regime-aware, top 3 by confidence — **production default** |
| `vwap-ema-bb` | Mean-reversion at BB extremes with VWAP + EMA |
| `full-risk` | HMM top-3 with risk-weighted allocation |

Compare presets in the [backtest UI](https://tradeclaw.win/backtest) with side-by-side metrics and equity curves.

## API

```bash
# Get current signals (free tier — 3 symbols, 15-min delay)
curl https://tradeclaw.win/api/signals

# Get track record stats
curl https://tradeclaw.win/api/strategy-breakdown
```

Pro subscribers get real-time access to all endpoints with full depth.

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `MARKET_DATA_HUB_URL` | Yes | Market data proxy URL |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot for alerts |
| `TELEGRAM_CHANNEL_ID` | No | Private channel (Pro alerts) |
| `TELEGRAM_PUBLIC_CHANNEL_ID` | No | Public channel (delayed free alerts) |
| `STRIPE_SECRET_KEY` | No | Stripe for Pro subscriptions |
| `STRIPE_PRO_PRICE_ID` | No | Stripe price ID for Pro tier |
| `CRON_SECRET` | Yes | Auth for `/api/cron/*` endpoints |
| `SIGNAL_ENGINE_PRESET` | No | Strategy preset (default: `hmm-top3`) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [good first issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue).

---

<div align="center">
<sub>MIT License · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
