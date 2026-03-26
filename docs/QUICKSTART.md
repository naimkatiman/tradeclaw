# TradeClaw Quickstart Guide

Get trading signals running in under 5 minutes. No coding required.

---

## Prerequisites

- Docker & Docker Compose installed ([Get Docker](https://docs.docker.com/get-docker/))
- 2GB RAM minimum (4GB recommended)
- Port 3000 available

## Option 1: Docker Compose (Recommended)

```bash
# Clone the repo
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw

# Copy environment config
cp .env.example .env

# Start everything
docker compose up -d
```

Open `http://localhost:3000` — you'll see the signal dashboard.

**That's it.** You're running AI trading signals for forex, crypto, and metals.

### What's Running

| Service | Port | Description |
|---------|------|-------------|
| Web Dashboard | 3000 | Signal dashboard, charts, paper trading |
| API Server | 3001 | REST API for signals, history, backtesting |
| Scanner | — | Background signal engine (polls every 60s) |
| TimescaleDB | 5432 | Time-series database for signal history |
| Redis | 6379 | Cache layer for real-time data |

### Check Health

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","version":"0.1.0","services":{"db":"connected","redis":"connected","scanner":"running"}}
```

## Option 2: Railway (One-Click Cloud Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/tradeclaw)

Railway provisions everything automatically. Free tier works for evaluation.

## Option 3: Manual Setup (Development)

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URLs

# Initialize database
npm run db:push

# Start development server
npm run dev
```

---

## Configuration

### Environment Variables

Edit `.env` to customize:

```bash
# Core
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://tradeclaw:tradeclaw@db:5432/tradeclaw

# Redis
REDIS_URL=redis://redis:6379

# Scanner Settings
SCAN_INTERVAL=60          # Signal refresh interval (seconds)
DEFAULT_LEVERAGE=1000     # Default leverage (1:1000)
DEFAULT_CAPITAL=500       # Default paper trading capital ($)

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=       # Get from @BotFather
TELEGRAM_CHAT_ID=         # Your chat/group ID

# Assets to scan (comma-separated)
ASSETS=XAUUSD,XAGUSD,EURUSD,GBPUSD,USDJPY,AUDUSD,BTCUSD,ETHUSD,XRPUSD,SOLUSD,ADAUSD,US30,NAS100,SPX500,GER40
```

### Adding/Removing Assets

Edit `ASSETS` in `.env`. Supported asset types:
- **Forex:** EURUSD, GBPUSD, USDJPY, AUDUSD, etc.
- **Metals:** XAUUSD, XAGUSD
- **Crypto:** BTCUSD, ETHUSD, XRPUSD, SOLUSD, ADAUSD
- **Indices:** US30, NAS100, SPX500, GER40

### Telegram Integration

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your chat ID via [@userinfobot](https://t.me/userinfobot)
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`
4. Restart: `docker compose restart`
5. Signals push automatically to your Telegram

---

## Dashboard Tour

### Signal Cards
Each asset shows:
- **Direction:** BUY (green) or SELL (red)
- **Confidence:** 0-100% score based on indicator alignment
- **Entry Zone:** Fibonacci-precise entry range
- **TP Levels:** TP1 (1.618 Fib), TP2, TP3
- **Stop Loss:** ATR-based dynamic SL

### Timeframe Filters
Toggle between: ALL | M5 | M15 | H1 | H4 | D1

Signals align across timeframes — a D1 BUY with H4 BUY confirmation is stronger than M5 alone.

### Paper Trading
Click any signal to enter a paper trade. Track P&L in real-time without risking money.

### Signal History
30-day lookback with searchable history. See past signals, accuracy rates, and P&L if you followed them.

### Leaderboard
Assets ranked by signal accuracy. See which pairs are performing best.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Web Dashboard                │
│            (Next.js + Canvas Charts)         │
├─────────────────────────────────────────────┤
│                  API Layer                   │
│         (REST + WebSocket for live)          │
├──────────┬──────────────┬───────────────────┤
│ Scanner  │  Signal      │   Paper Trading   │
│ Engine   │  History     │   Engine          │
├──────────┴──────────────┴───────────────────┤
│     TimescaleDB          │      Redis       │
│   (signal storage)       │   (real-time)    │
└──────────────────────────┴──────────────────┘
```

---

## FAQ

**Q: Is this a trading bot? Will it execute trades?**
A: No. TradeClaw generates signals (BUY/SELL recommendations). You decide whether to act on them. Execution is on your roadmap but not in v0.1.0.

**Q: Where does the data come from?**
A: CoinGecko (crypto), metals.live (metals), fawazahmed0 (forex). All free, no API keys needed.

**Q: How accurate are the signals?**
A: Accuracy varies by asset and timeframe. Check the leaderboard for real-time accuracy tracking. Paper trade first.

**Q: Can I add my own indicators?**
A: Yes. See `/packages/scanner/src/indicators/` for the indicator interface. PRs welcome.

**Q: Is this really free?**
A: Yes. MIT license. No hidden costs, no freemium gates, no tokens.

---

## Next Steps

- ⭐ [Star on GitHub](https://github.com/naimkatiman/tradeclaw) — helps others find TradeClaw
- 💬 [Join Discord](https://discord.gg/tradeclaw) — community signals discussion
- 🐛 [Report Issues](https://github.com/naimkatiman/tradeclaw/issues) — help improve TradeClaw
- 📖 [Read the Docs](./README.md) — full documentation
- 🚀 [Alpha Screener](https://alphascreener.io) — managed cloud version (coming soon)
