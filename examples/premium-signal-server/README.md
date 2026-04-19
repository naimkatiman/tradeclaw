# Premium Signal Server — Reference Implementation

A minimal HTTP server that satisfies the TradeClaw premium signal contract.
Clone, run, point `PREMIUM_SIGNAL_SOURCE_URL` at it, and your TradeClaw
deploy will start serving premium symbols to Pro subscribers.

This reference uses **mock signals** so you can verify the wiring end-to-end
without a real signal engine. Replace the mock generator with your own edge
— Pine Script webhooks, an ML model, a scraped feed, anything that produces
`TradingSignal[]`.

## Why this exists

TradeClaw is MIT. Self-hosters get the free-tier framework. The hosted
product at tradeclaw.win augments it with a curated premium signal feed
served from a private HTTP source.

This example lets anyone run their own paid tier on top of TradeClaw
without forking. Set two env vars in your TradeClaw deploy and the public
repo's code plugs into your private generator.

## The contract

```
GET <PREMIUM_SIGNAL_SOURCE_URL>
Authorization: Bearer <PREMIUM_SIGNAL_SOURCE_KEY>
Accept: application/json

Response 200:
{
  "signals": TradingSignal[]
}
```

Anything other than `{ signals: [...] }` — non-2xx, network error, malformed
body — is treated as empty. The TradeClaw deploy keeps serving free-tier
signals from its own TA engine while the remote is down.

`TradingSignal` shape (required fields):

```ts
{
  id: string;             // unique per signal (used for dedup)
  strategyId: string;     // must match a granted strategy in strategy_license_grants
  symbol: string;         // e.g. "EURUSD"
  timeframe: string;      // e.g. "H1"
  direction: "BUY" | "SELL";
  confidence: number;     // 0-100
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  timestamp: number;      // ms epoch
  source: "real";
  dataQuality: "real";
}
```

## Run locally

```bash
cd examples/premium-signal-server
export PREMIUM_SIGNAL_SOURCE_KEY="change-me-to-a-real-secret"
node index.js
# Premium signal server listening on :8787
```

Then from a separate terminal, test auth:

```bash
curl -sS -H "Authorization: Bearer change-me-to-a-real-secret" http://localhost:8787 | jq .
# { "signals": [ ... 3 mock EURUSD/GBPUSD/USDJPY signals ... ] }

curl -sS http://localhost:8787
# { "error": "unauthorized" }
```

## Wire into TradeClaw

In your TradeClaw deploy's `.env` (or Railway environment):

```
PREMIUM_SIGNAL_SOURCE_URL=http://host.docker.internal:8787
PREMIUM_SIGNAL_SOURCE_KEY=change-me-to-a-real-secret
```

Restart the TradeClaw web service. A Pro-tier call to `/api/signals` will
now return mock EURUSD/GBPUSD/USDJPY rows alongside the TA engine's
free-tier signals.

## Replace the mock generator

Open `index.js` and replace `generateMockSignals()` with your own logic.
Typical patterns:

- **Pine Script webhook adapter** — accept `POST /ingest` from TradingView,
  buffer signals in memory or a tiny SQLite, serve the last N on `GET /`.
- **ML scorer** — on each `GET`, fetch recent prices, score them, emit
  signals above a confidence threshold.
- **Scraper** — periodically fetch from a paid upstream and re-serve.

Keep the response shape stable — TradeClaw's `fetchPremiumFromHttp()` only
cares about `{ signals: TradingSignal[] }` and the Bearer header.

## Production notes

- Run behind HTTPS (this reference is HTTP for local testing).
- Put it on a private network or use an allowlist IP — the Bearer token is
  the only auth layer here.
- Cache your signals. A Pro user on the dashboard hits this endpoint on
  every API request. A 30–60 second cache is usually fine.
- Rotate `PREMIUM_SIGNAL_SOURCE_KEY` on a schedule. The key is a shared
  secret between this server and the TradeClaw deploy.
- Log rejected auth attempts — helps detect scraping attempts.

## License

MIT, same as TradeClaw.
