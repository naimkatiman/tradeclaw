# Live Demo (No API Keys Required)

This guide walks through deploying a public live demo of TradeClaw that
shows realistic dashboard activity without any real market data
providers, broker credentials, or paid tier secrets.

## What ships with demo mode

When `DEMO_MODE=true`, the engine routes signal and OHLCV lookups
through `packages/core/src/mock/` — a seeded PRNG that regenerates a
fresh set of bars and signals once per UTC day. This means:

- No external API calls are made.
- The page works with `DATABASE_URL` unset (no Postgres needed).
- Each daily refresh is deterministic so screenshots / bug reports are
  reproducible.

The same set of symbols is published every day (`BTCUSDT`, `ETHUSDT`,
`SOLUSDT`, `XAUUSD`, `EURUSD`, `GBPUSD`, `AAPL`, `TSLA`, `NVDA`,
`SPY`), with randomized but plausible price action, RSI/MACD/EMA
readings, and ATR-based SL/TP.

## One-command deploy (Vercel)

```bash
gh repo clone naimkatiman/tradeclaw demo
cd demo
vercel --prod -e DEMO_MODE=true
```

## One-command deploy (Railway)

```bash
railway up --service tradeclaw-demo \
  --env DEMO_MODE=true
```

## One-command deploy (Docker)

```bash
docker run -p 3000:3000 -e DEMO_MODE=true ghcr.io/naimkatiman/tradeclaw:latest
```

## Daily reset cron

The demo state is keyed off the current UTC date — no cron is needed
for the page itself. If you want the docker container restarted nightly
(e.g. to clear in-memory rate-limit counters), add this to your host
crontab:

```cron
# Reset the public demo container at 00:05 UTC
5 0 * * * docker restart tradeclaw-demo
```

Or use Vercel's "Cron Jobs" feature pointing at
`/api/cron/reset-demo` (a no-op route safe to call repeatedly).

## Rate limiting

The demo deploy is rate-limited at the platform layer (Vercel /
Railway / Cloudflare). If you self-host the demo image, add a reverse
proxy like Caddy / Cloudflare in front to cap requests per IP.

A minimal Caddyfile:

```caddy
demo.tradeclaw.win {
  reverse_proxy localhost:3000

  @demoApi path /api/*
  rate_limit @demoApi {
    zone demo_api
    events 60
    window 1m
  }
}
```

## The demo endpoint

`GET /api/demo` — returns the day's mock signals and the list of
demo symbols. Useful for embedding the demo data in an external page
or for testing forwarders.

```json
{
  "signals": [{ "symbol": "BTCUSDT", "direction": "BUY", "confidence": 78, "...": "..." }],
  "symbols": ["BTCUSDT", "ETHUSDT", "..."],
  "isDemo": true,
  "resetsAt": "2026-05-27T00:00:00.000Z"
}
```

`GET /api/demo?symbol=BTCUSDT` — returns the OHLCV bars for one
symbol.

## Turning demo mode off

Unset `DEMO_MODE` (or set it to `false`) and provide real market data
providers (`BINANCE_API_KEY`, `POLYGON_API_KEY`, etc — see
[`.env.example`](../.env.example)). The same code path runs in both
modes.
