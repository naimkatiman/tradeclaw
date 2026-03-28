# Submission: awesome-quant (wilsonfreitas/awesome-quant)

**Target:** https://github.com/wilsonfreitas/awesome-quant
**Stars:** ~4,500+

## Where to add

File: `README.md`

Section: **Trading & Backtesting**

Subsection to add under (or create): **Dashboards & Signal Platforms**

Alphabetical placement: Under "T" — after "TradingView" if listed, before "Zipline"

## Exact line to add

```markdown
- [TradeClaw](https://github.com/naimkatiman/tradeclaw) - Open-source, self-hosted AI trading signal platform. Generates BUY/SELL/HOLD signals (RSI, MACD, Bollinger Bands, EMA cross) for forex, crypto, and metals. Includes backtesting engine, Telegram/Discord alerts, and REST API. MIT. Docker Compose deploy.
```

## PR Title

```
feat: add TradeClaw to Trading & Backtesting
```

## PR Body

```markdown
## What

Adding TradeClaw to the **Trading & Backtesting** section under a new
"Dashboards & Signal Platforms" subsection (or existing equivalent section).

## About the project

| Field | Value |
|-------|-------|
| Repo | https://github.com/naimkatiman/tradeclaw |
| Demo | https://tradeclaw.win |
| License | MIT |
| Language | TypeScript / Node.js (Next.js 15) |
| Last commit | < 7 days |
| Stars | Growing — recently open-sourced |

### Features relevant to quant audience

- **Signal engine:** RSI, MACD, Bollinger Bands (squeeze + width), EMA cross (9/21/50/200 MA), ATR volatility, price-vs-VWAP
- **Backtesting:** Win rate, Sharpe ratio, max drawdown, total return
- **Multi-asset:** 12+ symbols — EURUSD, GBPUSD, USDJPY, BTC, ETH, XAUUSD, etc.
- **API:** REST API with OpenAPI 3.0 spec — scriptable, CI-friendly
- **Self-hosted:** Full Docker Compose stack (Next.js app + TimescaleDB + Redis)
- **Notifications:** Telegram + Discord webhooks for signal push

### Why it fits awesome-quant

awesome-quant already lists backtesting libraries and data tools. TradeClaw adds
a full-stack, self-hosted *platform* layer — rare in the open-source quant space.
Most comparable tools are either cloud-only (TradingView, Coinigy) or purely
Python libraries without a UI.

## Checklist

- [x] I have read CONTRIBUTING.md
- [x] Project is MIT licensed
- [x] Repo is public and actively maintained
- [x] Working live demo available
- [x] Not a spam/promotional link — genuine open-source tool
```

## Notes for submitter

- If the maintainer prefers a different section (e.g., "Frameworks"), the entry text is identical
- The project uses TypeScript/Node.js — not Python — which may be noted; it complements existing Python tools as a UI/dashboard layer
- Ping @wilsonfreitas in the PR to increase response speed
