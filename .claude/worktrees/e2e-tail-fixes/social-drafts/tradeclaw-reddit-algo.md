# Reddit r/algotrading

**Submit at:** https://reddit.com/r/algotrading/submit

**Flair:** Select "Open Source" or "Tools"

---

## Title

```
Open-sourced my trading signal engine — RSI/MACD/BB/EMA with backtesting, REST API, self-hosted
```

## Body

```
I've been lurking here for a while and finally decided to open-source the signal engine I've been running for my own trading.

**TradeClaw** is a self-hosted trading signal platform that generates BUY/SELL/HOLD signals using 5-indicator confluence scoring:

1. **RSI** (14-period) — overbought/oversold detection
2. **MACD** (12/26/9) — momentum and crossover signals
3. **EMA** (20/50/200) — trend direction and crossovers
4. **Bollinger Bands** (20, 2σ) — volatility breakouts and mean reversion
5. **Stochastic** (14/3/3) — additional momentum confirmation

Each indicator independently votes BUY/SELL/HOLD. The final signal is a weighted confluence score — no ML, no black box. You can read the entire engine in `packages/core/src/signals/engine.ts`.

**What makes this different from other OSS trading tools:**

- **Not a framework** — it's a ready-to-run platform. `docker compose up` and you have signals.
- **Backtesting included:** Historical backtests with slippage modeling, commission costs. Reports win rate, Sharpe ratio, max drawdown, profit factor.
- **Paper trading:** Virtual $10k portfolio that auto-follows signals. Track your equity curve before going live.
- **Multi-timeframe:** M5, M15, H1, H4, D1 — with confluence view across timeframes.
- **REST API:** OpenAPI 3.0 spec. Query signals programmatically, build your own execution layer.
- **12+ instruments:** BTCUSD, ETHUSD, XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY, and more.

**Stack:** TypeScript, Next.js 15, TimescaleDB (time-series optimized PostgreSQL), Redis, Docker.

**Backtesting sample results (H1, 6-month lookback):**

| Symbol | Win Rate | Sharpe | Max DD | Trades |
|--------|----------|--------|--------|--------|
| BTCUSD | 58.3% | 1.42 | -8.7% | 247 |
| XAUUSD | 61.1% | 1.67 | -5.2% | 189 |
| EURUSD | 54.7% | 1.11 | -6.8% | 312 |

*(Run your own backtests — these numbers are from my configuration, your mileage will vary.)*

**Live demo:** https://tradeclaw.win/dashboard
**GitHub:** https://github.com/naimkatiman/tradeclaw

MIT licensed. No vendor lock-in, no subscriptions.

I'm planning to add:
- WebSocket streaming for real-time signal updates
- TradingView webhook bridge (send signals to TV alerts)
- Yahoo Finance integration for equities
- Custom indicator plugins (write your own in TypeScript)

Would love feedback from this community — especially on the indicator weighting and backtesting methodology.
```

---

## Tips

- r/algotrading is technical — they will ask about edge, overfitting, forward testing
- Be honest about limitations: this is a signal generator, not a complete algo trading system
- Expect pushback on win rates — have your methodology ready
- Don't oversell — let the code speak
