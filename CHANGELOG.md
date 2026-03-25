# Changelog

All notable changes to TradeClaw are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- Mobile app (React Native)
- Strategy builder (visual drag-and-drop)
- Multi-broker connector (MT4/MT5 via MetaApi)
- Social signal sharing
- AI explanation mode ("why this signal?")

---

## [0.1.0] — 2026-03-25

### 🚀 Initial Public Release

**Signal Engine**
- BUY/SELL signals for 15 assets: XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY, AUDUSD, BTCUSD, ETHUSD, XRPUSD, SOLUSD, ADAUSD, US30, NAS100, SPX500, GER40
- Confidence scoring (0–100%)
- Fibonacci-precise entry zones, TP1/TP2/TP3, ATR-based stop loss
- Multi-timeframe alignment (M5 → M15 → H1 → H4 → D1)

**Technical Indicators**
- RSI with overbought/oversold detection
- MACD with histogram and signal line
- EMA (9 / 21 / 50 / 200)
- Bollinger Bands with bandwidth analysis
- Stochastic Oscillator (K, D)
- Dynamic Support & Resistance levels
- Fibonacci Retracements & Extensions

**Dashboard**
- Canvas-based charts (zero library bloat)
- Signal cards with expandable detail view
- Timeframe filter (ALL / M5 / M15 / H1 / H4 / D1)
- Signal history — 30-day lookback, searchable
- Signal leaderboard — ranked by accuracy

**Paper Trading**
- Risk-free practice mode
- Virtual portfolio tracking
- P&L calculations

**Backtesting Engine**
- Historical signal replay
- Configurable date ranges
- Win rate and performance metrics

**Notifications**
- Telegram bot integration — signals pushed to your phone
- Custom alerts — price, indicator, or signal-based

**Infrastructure**
- Next.js 16 monorepo with Turbopack
- TypeScript throughout
- Docker Compose with TimescaleDB + Redis
- GitHub Actions CI/CD
- PWA support (installable, offline-capable)
- One-click deploy: Railway, Render
- `.env.example` for zero-friction setup

---

[Unreleased]: https://github.com/naimkatiman/tradeclaw/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/naimkatiman/tradeclaw/releases/tag/v0.1.0
