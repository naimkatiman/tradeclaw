# Webhook integrations

TradeClaw exposes a public REST API (`/api/signals`) you can poll from
any script, plus a first-class **alert channel** system that pushes
signals to Slack, Discord, and email without polling. This page covers
both.

> **Looking for example scripts?** They live in
> [`examples/webhooks/`](../examples/webhooks/) — Slack, Discord, n8n,
> Zapier, Google Sheets, and a cron runner.

## Option A — Polling `GET /api/signals`

Simplest path, no auth required, zero coupling to TradeClaw internals.

```bash
curl -s https://demo.tradeclaw.win/api/signals | jq '.signals[0]'
```

Response shape (abbreviated):

```json
{
  "signals": [
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
  ]
}
```

Filter via query params: `?symbol=BTCUSDT`, `?direction=BUY`,
`?minConfidence=70`, `?timeframe=H1` etc. See [`apps/web/app/api/signals/route.ts`](../apps/web/app/api/signals/route.ts).

### Pattern: poll + dedupe + forward

```js
const seen = new Set(JSON.parse(fs.readFileSync('seen.json', 'utf8') || '[]'));
const { signals } = await fetch(`${TRADECLAW_URL}/api/signals`).then(r => r.json());

for (const s of signals) {
  if (seen.has(s.id)) continue;
  await fetch(MY_WEBHOOK, { method: 'POST', body: JSON.stringify(s) });
  seen.add(s.id);
}
fs.writeFileSync('seen.json', JSON.stringify([...seen].slice(-500)));
```

Cron it every 1–5 minutes. `signal.id` is stable per symbol/timeframe/direction
so you'll never repost the same alert.

### Cron example

```cron
# every 2 minutes
*/2 * * * * /path/to/forward-to-slack.js >> /var/log/tradeclaw.log 2>&1
```

## Option B — Built-in alert channels (push)

If you want sub-30s latency without polling, use the alert-channel API
that the dispatcher uses internally:

```bash
curl -X POST https://your-tradeclaw/api/alert-channels \
  -H 'content-type: application/json' \
  -d '{
    "kind": "discord",
    "url": "https://discord.com/api/webhooks/.../...",
    "min_confidence": 70
  }'
```

Supported `kind` values: `discord`, `slack`, `email`, `generic` (any
URL — receives the raw JSON payload). See
[`apps/web/lib/webhooks.ts`](../apps/web/lib/webhooks.ts) for the full
payload schema and signature header (`X-TradeClaw-Signature`) used to
verify authenticity when you set a per-channel secret.

## Common recipes

### Slack
[`examples/webhooks/forward-to-slack.js`](../examples/webhooks/forward-to-slack.js) — rich Block Kit message with confidence, entry, SL, TPs.

### Discord
[`examples/webhooks/forward-to-discord.js`](../examples/webhooks/forward-to-discord.js) — color-coded embed (green for BUY, red for SELL).

### n8n
[`examples/webhooks/forward-to-n8n.js`](../examples/webhooks/forward-to-n8n.js) — POSTs the raw signal; branch on `direction`/`confidence` in the n8n workflow.

### Zapier
[`examples/webhooks/zapier-webhook.js`](../examples/webhooks/zapier-webhook.js) — flattens nested fields so Zapier's field-picker can see them.

### Google Sheets
[`examples/webhooks/log-to-google-sheets.js`](../examples/webhooks/log-to-google-sheets.js) — appends each signal as a row via an Apps Script Web App. Apps Script snippet included in the file header.

### Custom webhook
Any POST endpoint that accepts JSON works. The full schema is documented in
[`examples/webhooks/README.md`](../examples/webhooks/README.md).
