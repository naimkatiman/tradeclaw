# tradeclaw CLI

> Fetch live AI trading signals from your terminal in seconds.

[![npm version](https://img.shields.io/npm/v/tradeclaw?style=flat-square)](https://www.npmjs.com/package/tradeclaw)
[![GitHub Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat-square)](https://github.com/naimkatiman/tradeclaw)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/naimkatiman/tradeclaw/blob/main/LICENSE)

## Quick Start

```bash
npx tradeclaw signals
```

No install needed. Fetches live signals instantly.

## Install (optional)

```bash
npm install -g tradeclaw
tradeclaw signals
```

## Commands

```
tradeclaw signals                          # All live signals
tradeclaw signals --pair BTCUSD            # Filter by pair
tradeclaw signals --direction BUY          # BUY signals only
tradeclaw signals --timeframe H4 --limit 5 # H4 signals, top 5
tradeclaw leaderboard                      # Signal accuracy leaderboard
tradeclaw leaderboard --period 7d          # Last 7 days
tradeclaw health                           # API health check
tradeclaw badge XAUUSD                     # Get badge for a pair
tradeclaw help                             # Show all commands
```

## Example Output

```
  📡 Live Trading Signals  (10/48 shown · refreshed 10:27:33)
  ────────────────────────────────────────────────────────────────────────
  #   PAIR       DIR      CONFIDENCE           CONF%  TF   PRICE
  ────────────────────────────────────────────────────────────────────────
   1. BTC/USD    BUY    ████████████░░░░░░░░  87%   H1   @ 94210
   2. XAU/USD    BUY    ███████████████░░░░░  91%   H4   @ 2648
   3. EUR/USD    SELL   ████████████░░░░░░░░  74%   H1   @ 1.0832
```

## API

The CLI uses TradeClaw's public API at `https://tradeclaw.win/api/v1`.

No authentication needed. Rate limited at 60 req/min.

## Links

- **Live Demo:** https://tradeclaw.win
- **GitHub:** https://github.com/naimkatiman/tradeclaw
- **API Docs:** https://tradeclaw.win/api-docs

---

⭐ If this is useful, [star the repo](https://github.com/naimkatiman/tradeclaw) — it helps others discover TradeClaw!
