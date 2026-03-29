# Reddit r/selfhosted

**Submit at:** https://reddit.com/r/selfhosted/submit

**Flair:** Select "New Software" or "Self-Hosted Alternatives"

---

## Title

```
I got tired of paying $60/month for trading signals I couldn't trust, so I self-hosted my own
```

## Body

```
For the past two years I was paying for a trading signal service. It worked okay — until the one week it didn't. During a volatile EUR/USD swing, the service went down for 6 hours. No explanation, no refund. That was the last straw.

I built **TradeClaw** — an open-source, self-hosted trading signal platform. It generates BUY/SELL/HOLD signals for forex, crypto, and metals using technical analysis (RSI, MACD, Bollinger Bands, EMA, Stochastic). Everything runs on your own server.

**Why r/selfhosted would care:**

- **One command deploy:** `docker compose up` — that's it. TimescaleDB + Redis + dashboard, all containerized.
- **No cloud dependency:** Runs entirely on your VPS. No accounts, no telemetry, no phone-home.
- **No subscriptions:** MIT license. Free forever.
- **Lightweight:** Runs fine on a $5/month VPS (1 vCPU, 1GB RAM).
- **Data stays with you:** All OHLCV data stored in your TimescaleDB instance. Export anytime.

**What you get:**

- Real-time dashboard with BUY/SELL/HOLD signals for 12+ symbols
- Backtesting engine (win rate, Sharpe ratio, drawdown)
- Paper trading with virtual $10k portfolio
- Telegram/Discord/Slack alerts
- REST API with OpenAPI 3.0 spec
- Mobile PWA — installable, works offline
- Multi-timeframe analysis (M5, M15, H1, H4, D1)

**Stack:** Next.js 15 + TypeScript + TimescaleDB + Redis + Docker

**Live demo:** https://tradeclaw.win/dashboard
**GitHub:** https://github.com/naimkatiman/tradeclaw
**Docker image:** `docker pull ghcr.io/naimkatiman/tradeclaw`

Happy to answer any questions about the architecture or self-hosting setup. If you find it useful, a star on GitHub helps visibility.
```

---

## Tips

- r/selfhosted loves: Docker Compose, no telemetry, lightweight, MIT license
- Don't mention "AI" in the title — this sub is skeptical of AI buzzwords
- Reply to every comment, especially critical ones
- Cross-post to r/selfhosted Discord if they have one
