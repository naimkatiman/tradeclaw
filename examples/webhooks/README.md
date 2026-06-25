# Webhook integration examples

This folder shows how to forward TradeClaw signals to common destinations
— Slack, Discord, n8n, Zapier, Google Sheets, custom servers — by
polling the `GET /api/signals` endpoint or by subscribing to the
existing alert-channel dispatcher.

> **TL;DR:** the API is open and unauthenticated for public read access.
> Poll it on a cron, dedupe by `signal.id`, and forward each new signal
> to whatever endpoint you like.

## Signal payload schema

`GET /api/signals` returns a JSON object with a `signals[]` array. Each
signal looks like:

```json
{
  "id": "BTCUSDT-H1-BUY-1714000000",
  "symbol": "BTCUSDT",
  "direction": "BUY",
  "confidence": 78,
  "timeframe": "H1",
  "entry": 64850.12,
  "stopLoss": 64200.50,
  "takeProfit": [65500.0, 66200.0, 66900.0],
  "indicators": {
    "rsi": { "value": 32.1 },
    "macd": { "signal": "bullish", "histogram": 0.0142 },
    "ema": { "ema20": 64720, "ema50": 64500 }
  },
  "timestamp": "2026-05-26T10:00:00.000Z"
}
```

Use `signal.id` as a deduplication key — it is stable per
symbol/timeframe/direction and only changes when a new signal of the
opposite direction (or a new candle) fires.

## Examples in this folder

| Script                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `forward-to-slack.js`     | Post each new BUY/SELL signal to a Slack channel.     |
| `forward-to-discord.js`   | Post each new signal as a Discord rich embed.         |
| `forward-to-n8n.js`       | POST the full signal payload to an n8n webhook URL.   |
| `zapier-webhook.js`       | Format signals as Zapier-compatible flat JSON.        |
| `log-to-google-sheets.js` | Append each signal to a Google Sheet via Apps Script. |
| `cron-runner.sh`          | Run any of the above on a cron schedule.              |

All scripts are zero-dependency vanilla Node.js (Node 18+) and read
config from environment variables.

## Setup

```bash
export TRADECLAW_URL=https://demo.tradeclaw.win   # or your self-hosted URL
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T0/B0/abc
node examples/webhooks/forward-to-slack.js
```

## Polling vs. push

TradeClaw also exposes a first-class **alert channel** system that
pushes signals to Slack/Discord/email without polling — see
`/api/alert-channels` and the in-app UI at `/settings/alerts`. Polling
(this folder) is the right choice when:

- You're prototyping a forwarder before wiring it up properly.
- Your destination is something we don't natively support (Zapier,
  Sheets, custom internal tool).
- You want the simplest possible integration and don't need <30s
  latency.
