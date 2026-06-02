# HackerNews Show HN

**Submit at:** https://news.ycombinator.com/submit

---

## Title

```
Show HN: TradeClaw – Self-hosted trading signal daemon with TradingView bridge (TypeScript)
```

## Body (paste in the "text" field)

```
I built tradeclaw-agent because I was paying $60/month for a trading signal service that:

1. Went dark during a volatile week (when I needed it most)
2. Wouldn't tell me how signals were generated
3. Locked my historical data behind their paywall

So I wrote an open-source alternative. TradeClaw is a self-hosted trading signal platform that generates BUY/SELL/HOLD signals for forex, crypto, and metals using 5-indicator confluence scoring (RSI, MACD, EMA, Bollinger Bands, Stochastic).

What makes it different from other open-source trading tools:

- The signal engine is plain TypeScript — no ML black box, just readable indicator logic in `packages/core/src/signals/engine.ts`
- Confluence scoring: each indicator votes BUY/SELL/HOLD, and the final signal is a weighted vote. You can see and tune every weight.
- One-command deploy: `docker compose up` gives you TimescaleDB + Redis + the full dashboard
- REST API with OpenAPI 3.0 spec — build your own frontend or plug into existing tools
- Backtesting with slippage modeling, win rate, Sharpe ratio, max drawdown
- Paper trading: virtual $10k portfolio that auto-follows signals
- Push alerts via Telegram bot, Discord webhooks, or Slack
- MCP server so Claude/AI assistants can query your signals programmatically

Tech stack: Next.js 15, TypeScript 5, TimescaleDB, Redis, Docker.

Covers 12+ symbols across forex (EURUSD, GBPUSD, USDJPY), crypto (BTCUSD, ETHUSD), and metals (XAUUSD, XAGUSD). Multiple timeframes: M5 to D1.

Live demo: https://tradeclaw.win/dashboard
GitHub: https://github.com/naimkatiman/tradeclaw

MIT licensed. No telemetry, no accounts, no subscriptions.

I'd love feedback on:
- What indicators or assets would you add?
- Is the REST API surface useful, or would you prefer WebSocket streaming?
- Anyone interested in contributing a TradingView webhook bridge?
```

---

## Tips

- Best time: weekday 8-10 AM EST (Tuesday-Thursday optimal)
- Sunday posts can still do well if the content is strong
- Reply to every comment quickly — HN rewards engagement
- Don't ask for upvotes anywhere
