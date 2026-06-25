# Changelog

All notable changes to TradeClaw are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

- Docs: clarified the Docker Compose quick-start command for both the modern `docker compose` and legacy `docker-compose` CLIs.

---

## [0.5.0] — 2026-05-09

### Added
- **Track 1 broker execution** — live order placement against Binance USDT-perp futures (testnet by default) via `apps/web/lib/execution/`, with notional-equity fallback when account balance reads as zero, and `scripts/launch-binance-testnet.sh` to bootstrap and verify a fresh testnet account end-to-end
- **RoboForex R StocksTrader bridge** — bridge interface + symbol map for forex/CFD execution; symbol resolver maps TradeClaw pairs to RST contract specs before order placement
- **TradeClaw → Binance symbol resolver** — runtime mapping (`BTC/USD` → `BTCUSDT`, etc.) before any order placement; protects against silent fills on the wrong instrument
- **Market-data-hub as primary quote source** — new `MARKET_DATA_HUB_URL` env, hub-first architecture for `/api/prices`, OHLCV, and SSE streams, with two thin survival fallbacks (Binance for crypto, Yahoo for the rest)
- **21 hub-pending symbols pre-wired** — symbol registry advertises pending coverage so the hub team can light them up server-side without a TradeClaw redeploy
- **Symbol expansion** — AMD, MU, GOOGL, AMZN, META US equities; XAG/USD silver; WTI/USD as distinct from BRENT/USD; RoboForex index CFDs replacing the ETF proxies on the landing hero
- **OpenAPI 3.0.3 spec endpoint** at `/api/openapi` — download the full spec to integrate with any HTTP client
- **Interactive API playground** at `/api-docs` — try every endpoint directly in the browser with curl / Python / JS snippets
- **Telegram Pro group auto-gating** — bot owns Pro group membership, auto-kicks any member without an active Pro tier, and issues fresh invite links on subscribe
- **Pro tier landing badges** — hero signals show Pro tier status; sparklines hydrate with live hub prices instead of static demo data
- **User profile in navbar** — member and admin links split into separate menus
- **Cron-signals pipeline counters** — `/api/cron/signals` response now exposes catchup counters for hub observability
- **Per-request source-distribution log** — every `/api/prices` request emits a hub-vs-fallback distribution line for observability
- **GitHub community files**: issue templates (bug, feature, signal question), PR template, FUNDING.yml, CODEOWNERS

### Changed
- **Crypto primary quote source switched from CoinGecko to Binance** — lower latency, no public-API rate-limit cliff
- **Prices / OHLCV / SSE collapsed to hub-first** — three separate provider chains replaced with a single hub-first path plus two survival fallbacks; ~40% less code in the data layer
- **Pro broadcast catchup** — signals recorded by request path but never broadcast are now caught up by the cron pipeline instead of being silently dropped
- **Signal resolution pending window widened from 14 to 30 days** — surfaces slow-resolving setups that previously timed out as `pending`

### Fixed
- **OHLCV no longer caches synthetic data** — fallback responses bypass the cache so a single hub blip can't lock the dashboard into stale synthetic candles
- **OHLCV preserves real data when fallbacks return empty** — empty fallback responses no longer overwrite a previous good cache entry
- **`MARKET_DATA_HUB_URL` tolerates missing `https://` prefix** — accidental bare-host config no longer breaks startup
- **Alert creation has live-price fallback** — alerts can be created against symbols whose last-known price is stale, by fetching live on demand

### Security
- **Magic-link auth hardened** — single-use enforcement, tighter token expiry, scrubbed error responses
- **OAuth callback re-validates `state.next`** — open-redirect closed; cookies default to `Secure`
- **SSRF allowlist** on outbound webhook + premium-feed fetches; v1 tier-leak closed; EarningsEdge webhook auth verified
- **Cron auth gaps closed** on `/api/cron/trial-reminders`, telegram, and TradingView routes
- **Executor kill-switch fail-closed** — pg advisory lock held by a single client across the full execution path; logs scrubbed of order payloads
- **Admin gate hardened** — constant-time compares for `tc_admin`; magic-link admin paths re-validated
- **TradingView webhook 500 body scrubbed** — link-token no longer leaked in error responses

---

## [0.4.0] — 2026-03-27

### Added
- **Screener / Multi-timeframe analysis** — H1/H4/D1 confluence matrix for all assets, agreement scoring, conflict alerts
- **Paper trading simulator** — virtual $10,000 portfolio, auto-follow signals, equity curve, win rate/Sharpe/drawdown stats
- **Webhook alerts** — POST signals to Discord/Slack/custom URLs with HMAC-SHA256 signing and retry logic
- **Strategy builder** — visual IF/THEN indicator composer with JSON export, backtest integration, localStorage library
- **Telegram bot** — subscribe/unsubscribe commands, per-pair + confidence filtering, broadcast API
- **Backtest visualizer** — price chart with EMA overlays and signal markers, RSI/MACD panels, monthly returns heatmap

### Changed
- Dashboard signal cards now show inline H1/H4/D1 multi-timeframe badges
- `/signal/[id]` detail page now shows multi-timeframe breakdown panel

---

## [0.3.0] — 2026-03-27

### Added
- **Signal sharing** — shareable signal cards with dynamic OG images (1200×630 dark cards), X/Telegram/copy-link buttons
- **Embeddable widget** — `<script>` tag + iframe embed for any website, auto-refreshes every 60s, dark/light themes
- **Public leaderboard** — track signal accuracy per pair (7d/30d/all), hit rate bars, sparkline trends, P&L tracker
- **Landing page redesign** — animated hero with live signal ticker, comparison table (vs TradingView/3Commas), FAQ accordion

---

## [0.2.0] — 2026-03-27

### Added
- **Real signal engine** — RSI, MACD, EMA crossover, Bollinger Bands, Stochastic from live Binance + Yahoo Finance prices
- **Multi-asset support** — BTCUSD, ETHUSD, XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY + more
- **Public demo mode** — zero auth required for dashboard, signals, leaderboard, backtest, strategy builder
- **SEO landing page** — dynamic OG images, JSON-LD structured data, sitemap.xml, hero stats with live GitHub stars
- **Railway + Vercel deploy buttons** — one-click deployment, working health endpoint at `/api/health`

### Fixed
- Synthetic signal fallback when live price APIs are unavailable

---

## [0.1.0] — 2026-03-25

### Added
- Initial monorepo scaffold (Next.js 15 + TypeScript + Tailwind)
- Docker Compose one-click setup
- Basic signal dashboard (mock data)
- README with badges, Quick Start, deploy buttons
- GitHub Actions CI/CD pipeline
- MIT License

---

[Unreleased]: https://github.com/naimkatiman/tradeclaw/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/naimkatiman/tradeclaw/releases/tag/v0.1.0
