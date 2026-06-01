<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="72" height="72" />

# TradeClaw

**Open-source AI trading signals. Every trade verified.**

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat-square&color=10b981)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?style=flat-square)](https://tradeclaw.win/dashboard)

**[Track Record](https://tradeclaw.win/track-record)** · **[Live Demo](https://tradeclaw.win/dashboard)** · **[API Docs](https://tradeclaw.win/api-docs)** · **[Pricing](https://tradeclaw.win/pricing)**

Read this in other languages: [日本語](README.ja.md) · [한국어](README.ko.md) · [中文](README.zh.md) · [more](LANGUAGES.md)

<br />

<img src="docs/assets/demo.gif" alt="TradeClaw dashboard demo" width="100%" />

</div>

---

TradeClaw generates BUY/SELL signals using multi-timeframe technical analysis (RSI, MACD, EMA, Bollinger Bands, Stochastic, Supertrend). Every signal is recorded in a Postgres database and published on the [track record](https://tradeclaw.win/track-record) — wins **and** losses, no cherry-picking.

> Status: pre-1.0 (`0.1.0`). The signal engine, dashboard, backtester, and self-host path are usable today; APIs and schema may still change between releases.

## Free vs Pro

|  | Free | Pro ($29/mo) |
|--|:----:|:------------:|
| Symbols | 6 (BTC, ETH, XAU, EUR/USD, SPY, QQQ) | All pairs (forex, crypto, metals, commodities, US equities incl. AMD/MU/GOOGL/AMZN/META) |
| Signal delay | 15 min | Real-time |
| Take-profit levels | TP1 only | TP1 + TP2 + TP3 |
| Indicators | RSI + EMA trend | RSI, MACD, BB, Stochastic, Supertrend |
| Signal history | 7 days | Full archive |
| Confidence band | Standard (70–84) | Standard + Premium (85+) |
| Telegram alerts | Public channel (delayed) | Private channel (instant), bot-gated Pro group with auto-kick on tier expiry |
| Broker execution | — | Binance USDT-perp (testnet) + RoboForex R StocksTrader bridge |
| Track record | Full access | Full access |
| Self-host | Yes | Yes |

Start free at [tradeclaw.win/dashboard](https://tradeclaw.win/dashboard). Upgrade anytime at [tradeclaw.win/pricing](https://tradeclaw.win/pricing).

## Self-hosting vs. TradeClaw Pro (hosted)

TradeClaw is MIT-licensed. You can fork, self-host, and run the entire signal framework for free — the free-tier signal engine (classic TA, RSI + EMA + MACD confluence), backtester, dashboard, paper trading, and public Telegram broadcaster are all in this repo.

The hosted version at **tradeclaw.win** adds features that activate only when the deploy holds the matching credentials:

| Feature | Unlocked by env var | Who has it |
|---|---|---|
| Real-time premium signals (MTF confluence, curated) | `PREMIUM_SIGNAL_SOURCE_URL` + `PREMIUM_SIGNAL_SOURCE_KEY` | tradeclaw.win only |
| Stripe checkout + tier upgrade on webhook | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Per-deploy |
| Private Pro Telegram group + invite on subscribe | `TELEGRAM_PRO_GROUP_ID` + Pro bot token | tradeclaw.win only |
| Telegram auto-broadcast of free symbols | `TELEGRAM_CHANNEL_ID` + bot token | Per-deploy |

Without these, self-hosters get the free-tier experience — which is the same signal engine the founders trade against real capital. **No code is withheld.** What is withheld is the curated premium signal feed and the payment plumbing. Those are operational, not algorithmic.

If you want to run your own paid tier on top of this code: set your own Stripe keys, run your own premium signal generator, and point `PREMIUM_SIGNAL_SOURCE_URL` at it. The HTTP contract is minimal — `GET <url>` returning `{ signals: TradingSignal[] }` with a Bearer `Authorization` header using `PREMIUM_SIGNAL_SOURCE_KEY`. Returns `[]` (and the hosted deploy keeps working with the DB-backed `premium_signals` table) if the remote is down.

## Quick start (Docker)

### One-liner (no clone required)

```bash
docker run -p 3000:3000 ghcr.io/naimkatiman/tradeclaw:latest
```

Open [http://localhost:3000](http://localhost:3000) — you get the dashboard with the bundled SQLite fallback so you can try it instantly. For persistent storage and the full feature set, point `DATABASE_URL` at a PostgreSQL instance:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/tradeclaw \
  ghcr.io/naimkatiman/tradeclaw:latest
```

### Docker Compose (recommended for production)

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env   # edit DATABASE_URL + Telegram tokens
docker compose up -d   # or: docker-compose up -d on the legacy CLI
```

Open [http://localhost:3000](http://localhost:3000). Requires PostgreSQL. Migrations live in `apps/web/migrations/` and should be applied in filename order against your `DATABASE_URL`.

### Image tags

| Tag | What it tracks |
| --- | --- |
| `ghcr.io/naimkatiman/tradeclaw:latest` | Latest push to `main` (auto-built) |
| `ghcr.io/naimkatiman/tradeclaw:edge` | Same as `latest` — short-lived testing tag |
| `ghcr.io/naimkatiman/tradeclaw:vX.Y.Z` | A specific release tag |
| `ghcr.io/naimkatiman/tradeclaw:sha-<git-sha>` | A specific commit |

## Monitoring (Grafana + Prometheus)

TradeClaw exposes a Prometheus-compatible metrics endpoint at `/api/metrics` (signal direction, confidence, RSI, counts, freshness, outcomes). An opt-in monitoring stack ships with the compose file:

```bash
docker compose --profile monitoring up -d   # adds prometheus (:9090) + grafana (:3001)
```

Then open Grafana at [http://localhost:3001](http://localhost:3001) (default login `admin`/`admin`, override with `GRAFANA_ADMIN_PASSWORD`), add Prometheus (`http://prometheus:9090`) as a data source, and import `grafana/tradeclaw-dashboard.json`. The default `docker compose up` does not start these services. See [`grafana/README.md`](grafana/README.md) for the metrics reference and panel details.

## Local development (from source)

TradeClaw is an npm-workspaces monorepo. You need Node.js 20+, npm, and a PostgreSQL instance (the web app falls back to bundled SQLite if `DATABASE_URL` is unset, but Postgres is recommended).

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
npm install            # installs all workspaces
cp .env.example .env   # set DATABASE_URL and any optional tokens

npm run dev            # start the Next.js web app (apps/web) on :3000
```

Common workspace scripts (all defined in the root `package.json`):

| Command | What it does |
|---|---|
| `npm run dev` | Run the web app (`apps/web`) in dev mode |
| `npm run build` | Build `packages/signals`, then `apps/web` |
| `npm run build:all` | Build `signals` + `agent` + web + ws-server |
| `npm run start` | Start the built web app |
| `npm run lint` | Lint `apps/web` |
| `npm test` | Run the Jest unit suite |
| `npm run test:e2e` | Run the Playwright e2e suite (`apps/web`) |
| `npm run ws:dev` / `ws:build` / `ws:start` / `ws:test` | Develop, build, run, or test the websocket server (`apps/ws-server`) |
| `npm run agent` | Run the trading-agent CLI (`packages/agent`) |
| `npm run agent:start` / `agent:scan` / `agent:server` | Start the agent loop, run a one-off scan, or run the agent HTTP server |
| `npm run resolve:outcomes` | Resolve real outcomes for recorded signals |

The Expo/React Native client in `apps/mobile` has its own `package.json` and is run with the Expo CLI from inside that workspace.

## Repository layout

```
apps/
  web/                  Next.js app — dashboard, API routes, signal engine, broker execution
  web/lib/execution/    Broker bridges (Binance USDT-perp, RoboForex R StocksTrader)
  web/migrations/       Postgres migrations (apply in filename order)
  ws-server/            Websocket server for live updates
  mobile/               Expo / React Native client

packages/
  signals/              Signal types + build target consumed by apps/web
  agent/                Trading-agent runtime + CLI (npm run agent)
  strategies/           Backtest comparison framework (not in the live signal path)
  core/                 Shared core utilities
  cli/  tradeclaw-cli/  Command-line tooling
  create-tradeclaw/     Project scaffolder
  telegram-bot/         Telegram bot integration
  tradeclaw-mcp/        MCP server integration
  tradeclaw-js/  tradeclaw-extension/  tradeclaw-action/  tradeclaw-demo/  trading-agents/

scripts/
  launch-binance-testnet.sh   Binance testnet bootstrap
```

> Note: a `tradeclaw-discord` package exists as early scaffolding. Discord support is proposed in issue #38 and is **not** a shipped, supported integration yet — Telegram is the only chat integration currently wired into the signal flow.

## How it works

**Signal flow:**

```
API request → getTrackedSignals() → generateSignalsFromTA()
  → ta-engine.ts (RSI, MACD, EMA, BB, Stoch, Supertrend)
  → recordSignalsAsync() → signal_history table
  → /track-record page
```

Signals are generated as a side effect of API requests — no external scheduler. The TA engine runs inside the Next.js process.

**Market data:**

```
/api/prices, OHLCV, SSE
  → market-data-hub (primary, MARKET_DATA_HUB_URL)
  → Binance (crypto fallback)
  → Yahoo Finance (everything else fallback)
```

The hub is the source of truth. The two fallbacks are thin survival paths — they kick in only if the hub returns empty or errors, and OHLCV results from fallbacks are not cached so a hub blip can't lock the dashboard into stale synthetic data.

**Execution (Pro):**

```
Pro signal → apps/web/lib/execution/executor.ts
  → Binance USDT-perp (testnet by default) | RoboForex R StocksTrader
  → pg advisory lock (single client across full execution path)
  → kill-switch fail-closed if any precondition missing
```

Order placement maps the TradeClaw pair (`BTC/USD`) to the broker contract (`BTCUSDT` perp) before submission. Bootstrap a Binance testnet account with `bash scripts/launch-binance-testnet.sh`.

## Strategy presets

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
# Get current signals (free tier — 6 symbols, 15-min delay, 7-day history)
curl https://tradeclaw.win/api/signals

# Get track record stats
curl https://tradeclaw.win/api/strategy-breakdown
```

Pro subscribers get real-time access to all endpoints with full depth.

## Notifications

TradeClaw can push signals over multiple channels, each enabled by env vars:

- **Telegram** — instant per-signal alerts (`TELEGRAM_BOT_TOKEN` + channel IDs).
- **Email** — instant per-signal alerts and a daily digest. Pick a provider with `EMAIL_PROVIDER`:
  - `resend` (default) — `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
  - `sendgrid` — `SENDGRID_API_KEY`
  - `smtp` — `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (requires `npm install nodemailer`)
- **Daily digest email** — set `EMAIL_TO` (comma-separated) and the `/api/cron/daily-digest` job emails the day's top signals via the configured provider, independently of Telegram.
- **Webhooks** — see the [webhook integration guide](docs/webhooks.md) for the signal payload schema and polling/cron patterns, plus ready-to-run forwarders in [`examples/webhooks/`](examples/webhooks/) (Slack, Discord, n8n, Zapier, Google Sheets).

See `.env.example` for the full list of notification env vars.

## Environment variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | Recommended | PostgreSQL connection string. If unset, the web app uses a bundled SQLite fallback (fine for a quick local try, not for production) |
| `MARKET_DATA_HUB_URL` | Yes | Market data hub (primary quote/OHLCV/SSE source). Bare host accepted — `https://` is added if missing |
| `CRON_SECRET` | Yes | Auth for `/api/cron/*` endpoints |
| `SIGNAL_ENGINE_PRESET` | No | Strategy preset (default: `hmm-top3`) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot for alerts |
| `TELEGRAM_CHANNEL_ID` | No | Private channel (Pro alerts) |
| `TELEGRAM_PUBLIC_CHANNEL_ID` | No | Public channel (delayed free alerts) |
| `TELEGRAM_PRO_GROUP_ID` | No | Pro group chat ID — bot auto-kicks members without an active Pro tier |
| `STRIPE_SECRET_KEY` | No | Stripe for Pro subscriptions |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | No | Stripe price ID for the Pro tier |
| `PREMIUM_SIGNAL_SOURCE_URL` | No | Hosted-only premium signal feed |
| `PREMIUM_SIGNAL_SOURCE_KEY` | No | Bearer token for the premium feed |
| `BINANCE_API_KEY` / `BINANCE_API_SECRET` | No | Binance USDT-perp execution (testnet by default) |
| `ROBOFOREX_RST_*` | No | RoboForex R StocksTrader bridge credentials |

See `.env.example` for the full, commented list.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [good first issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue).

Before opening a PR: run `npm install`, make your change, then `npm run lint`, `npm test`, and (for web changes) `npm run test:e2e`.

Hacktoberfest-friendly: PRs against this repo qualify for the `hacktoberfest-accepted` label when they pass review.

## Contributors

Thanks to everyone who has helped build TradeClaw — code, docs, bug reports, translations, or sharing the project.

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<a href="https://github.com/naimkatiman/tradeclaw/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=naimkatiman/tradeclaw" alt="Contributors" />
</a>
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://allcontributors.org/) specification — contributions of any kind welcome.

---

<div align="center">
<sub>MIT License · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
