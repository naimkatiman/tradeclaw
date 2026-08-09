<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="72" height="72" />

# TradeClaw

**Open-source AI trading research with an inspectable signal ledger.**

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat-square&color=10b981)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?style=flat-square)](https://tradeclaw.win/dashboard)

**[Track Record](https://tradeclaw.win/track-record)** · **[Live Demo](https://tradeclaw.win/dashboard)** · **[API Docs](https://tradeclaw.win/api-docs)** · **[Pricing](https://tradeclaw.win/pricing)**

Read this in other languages: [日本語](README.ja.md) · [한국어](README.ko.md) · [中文](README.zh.md) · [more](LANGUAGES.md)

<br />

<img src="docs/assets/demo.gif" alt="TradeClaw dashboard demo" width="100%" />

</div>

---

TradeClaw generates BUY/SELL signals using multi-timeframe technical analysis (RSI, MACD, EMA, Bollinger Bands, Stochastic, ADX, Volume). Eligible signals and their OHLCV-derived outcomes are recorded in PostgreSQL. The [track record](https://tradeclaw.win/track-record) exposes counted wins and losses plus exclusion counters and methodology; it is not a broker-fill or customer-portfolio ledger.

> Status: pre-1.0 (`0.1.0`). The signal engine, dashboard, backtester, and self-host path are usable today; APIs and schema may still change between releases.

## Current access model

| Surface | Current behavior |
|---|---|
| Public dashboard and track record | Read-only research access without authentication |
| Signal history | Current rolling archive, capped at 10,000 source rows; CSV and provenance endpoints are public |
| Costs | Static fee + slippage models; funding and actual broker charges are excluded |
| Portfolio curve | Hypothetical sequential 1%-risk simulation, not concurrent account performance |
| Admin operations | Authentication required |
| Signal broadcasting | Fail-closed unless the broadcast-approved 90-day cohort clears the cost-adjusted evidence gate |
| Automated execution | Disabled by default; Binance USDT-perp testnet is implemented, while the RoboForex R StocksTrader bridge is an unimplemented interface scaffold |

TradeClaw is MIT-licensed, so the signal framework, backtester, dashboard, paper-trading tools, and integration code can be self-hosted. Optional Stripe, premium-source, and legacy group-bot integrations remain in the repository, but their presence is not a promise that a paid hosted tier or private feed is currently available. Alpha Screener is the separate hosted SaaS path for users who do not want to self-host; see [the integration notes](docs/ALPHA_SCREENER.md).

## Quick start (Docker)

### One-liner (no clone required)

```bash
docker run -p 3000:3000 ghcr.io/naimkatiman/tradeclaw:latest
```

Open [http://localhost:3000](http://localhost:3000) — the dashboard loads, but the web app requires a PostgreSQL `DATABASE_URL` and throws on first DB access if it is unset. There is no bundled SQLite fallback. Point `DATABASE_URL` at a PostgreSQL instance:

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

After the stack starts, run the [self-host smoke checklist](docs/self-host-smoke-checklist.md) to verify Compose config, migrations, app health, websocket health, metrics, and optional monitoring before sharing the instance.

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

TradeClaw is an npm-workspaces monorepo. You need Node.js 20+, npm, and a PostgreSQL instance. The web app requires `DATABASE_URL` and throws on first DB access if it is unset — there is no bundled SQLite fallback.

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
| `npm run build` | Build `packages/signals`, `packages/trading-agents`, then the Next.js web app (bundle/static generation; TypeScript validation is a separate CI check) |
| `npm run typecheck:web` | Build the shared signal package, then run the web TypeScript check used by CI |
| `npm run build:signals` | Build the shared signal package only (also run by `typecheck:web`) |
| `npm run build:all` | Build `signals` + `agent` + web + ws-server |
| `npm run start` | Start the built web app |
| `npm run lint` | Lint `apps/web` |
| `npm test` | Run the Jest unit suite |
| `npm run test:e2e` | Run the Playwright e2e suite (`apps/web`) |
| `npm run ws:dev` / `ws:build` / `ws:start` / `ws:test` | Develop, build, run, or test the websocket server (`apps/ws-server`) |
| `npm run agent` | Run the trading-agent CLI (`packages/agent`) |
| `npm run agent:start` / `agent:scan` / `agent:server` | Start the agent loop, run a one-off scan, or run the agent HTTP server |
| `npm run resolve:outcomes` | Resolve recorded signals against configured OHLCV sources |

For the long-form TypeScript command and why `next build` is not a typecheck, see [`docs/ai-improvement/build-typecheck-parity.md`](docs/ai-improvement/build-typecheck-parity.md).

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
  research/recost-segment.ts   Read-only cost-reality probe for signal-history re-costing (`npx tsx scripts/research/recost-segment.ts`)
```

> Note: the standalone `tradeclaw-discord` bot package (issue #38) remains early scaffolding. The web app's Discord webhook integration, however, is shipped and wired: when `DISCORD_WEBHOOK_URL` is set, the `/api/cron/telegram` broadcast job posts the same free-tier signals to a Discord channel (deduped via `discord_posted_at`), and per-user alert rules can target a Discord webhook channel.

## How it works

**Signal flow:**

```
API request → getTrackedSignals() → generateSignalsFromTA()
  → ta-engine.ts (RSI, MACD, EMA, BB, Stoch, ADX, Volume)
  → recordSignalsAsync() → signal_history table
  → /track-record page
```

Signals are generated as a side effect of API requests — no external scheduler. The TA engine runs inside the Next.js process.

**Market data:**

```
/api/prices, OHLCV, SSE
  → market-data-hub (primary, MARKET_DATA_HUB_URL)
  → Binance (crypto fallback)
  → Stooq CSV (forex/metals fallback)
  → static last-known-good / synthetic (ultimate safety net)
```

The hub is the source of truth. The two fallbacks are thin survival paths — they kick in only if the hub returns empty or errors, and OHLCV results from fallbacks are not cached so a hub blip can't lock the dashboard into stale synthetic data.

**Optional automated execution (disabled by default):**

```
Strictly gate-approved signal → apps/web/lib/execution/executor.ts
  → Binance USDT-perp (testnet by default); RoboForex R StocksTrader bridge scaffolded (interface only, not implemented)
  → 90-day cost-adjusted evidence gate (fails closed on negative, stale, incomplete, or unavailable evidence)
  → pg advisory lock (single client across full execution path)
  → kill-switch fail-closed if any precondition missing
```

Order placement maps the TradeClaw pair (`BTC/USD`) to the broker contract (`BTCUSDT` perp) before submission. Bootstrap a Binance testnet account with `bash scripts/launch-binance-testnet.sh`.

## Strategy presets

Five entry strategies, comparable side-by-side in the backtest UI. In live signal generation, `SIGNAL_ENGINE_PRESET` (default `hmm-top3`) currently selects the preset only as a label on emitted signals — the live engine still generates with the `classic` profile regardless of preset. Per-preset live generation is not yet wired:

| Preset | Logic |
|--------|-------|
| `classic` | RSI + MACD + EMA scoring — no regime filter |
| `regime-aware` | Classic filtered by HMM regime (backtest only; live signal path currently runs the `classic` profile) |
| `hmm-top3` | Regime-aware, top 3 by confidence — **production default** (the wired default for the executor and signal cron; live regime filtering applies in the backtest engine) |
| `vwap-ema-bb` | Mean-reversion at BB extremes with VWAP + EMA |
| `full-risk` | HMM top-3 with risk-weighted allocation |

Compare presets in the [backtest UI](https://tradeclaw.win/backtest) with side-by-side metrics and equity curves.

## API

```bash
# Get the current public signal response
curl https://tradeclaw.win/api/signals

# Get track record stats
curl https://tradeclaw.win/api/strategy-breakdown
```

Public history and research responses describe their own scope and rolling-window limits. They do not establish live execution profitability.

## Notifications

TradeClaw can push signals over multiple channels, each enabled by env vars. Hosted entry-like fan-out is suppressed unless the cost-adjusted evidence gate is ready; outcome and risk-exit notifications remain available:

- **Telegram** — configured cron/channel delivery for gate-approved entry-like signals and eligible outcome/risk-exit updates (`TELEGRAM_BOT_TOKEN` + channel IDs). Delivery is not guaranteed to be instantaneous.
- **Email** — configured alert delivery plus an independently scheduled daily digest. Entry-like signal sends remain evidence-gated; provider and recipient settings are required. Pick a provider with `EMAIL_PROVIDER`:
  - `resend` (default) — `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
  - `sendgrid` — `SENDGRID_API_KEY`
  - `smtp` — `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (requires `npm install nodemailer`)
- **Daily digest email** — set `EMAIL_TO` (comma-separated) and the `/api/cron/daily-digest` job emails the day's top signals via the configured provider, independently of Telegram.
- **Webhooks** — see the [webhook integration guide](docs/webhooks.md) for the signal payload schema and polling/cron patterns, plus ready-to-run forwarders in [`examples/webhooks/`](examples/webhooks/) (Slack, Discord, n8n, Zapier, Google Sheets).

See `.env.example` for the full list of notification env vars.
Docker Compose maps the documented `.env` variables into the relevant services through an explicit allowlist. Variables prefixed with `NEXT_PUBLIC_` are compiled into the client bundle, so changing those values requires matching image build arguments and a rebuild rather than only restarting the container.

## Environment variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | Required | PostgreSQL connection string. The web app throws on first DB access if it is unset — there is no SQLite fallback |
| `MARKET_DATA_HUB_URL` | Yes | Market data hub (primary quote/OHLCV/SSE source). Bare host accepted — `https://` is added if missing |
| `CRON_SECRET` | Yes | Auth for `/api/cron/*` endpoints |
| `SIGNAL_ENGINE_PRESET` | No | Strategy preset (default: `hmm-top3`) |
| `D1_SLOW_GATE_MODE` | No | `paper` (default/fail-closed) or `active`; active records only newest-bar BTCUSD/ETHUSD D1 transitions as real tracked rows. It does not enable broker execution or bypass broadcast gates |
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
