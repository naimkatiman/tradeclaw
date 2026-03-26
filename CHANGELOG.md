# Changelog

All notable changes to TradeClaw are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- OpenAPI 3.0.3 spec endpoint at `/api/openapi` — download the full spec to integrate with any HTTP client
- Interactive API playground at `/api-docs` — try every endpoint directly in the browser with curl/Python/JS snippets
- GitHub community files: issue templates (bug, feature, signal question), PR template, FUNDING.yml, CODEOWNERS

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

[Unreleased]: https://github.com/naimkatiman/tradeclaw/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/naimkatiman/tradeclaw/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/naimkatiman/tradeclaw/releases/tag/v0.1.0
