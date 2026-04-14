# TradingView → TradeClaw Premium Signals Setup

This doc explains how to pipe signals from Zaky's three strategies into
`premium_signals` so licensed users see them in TradeClaw.

## Endpoint

```
POST https://tradeclaw.win/api/webhooks/tradingview
Header: X-TV-Secret: <TV_WEBHOOK_SECRET from Railway>
Content-Type: application/json
```

Auth: shared-secret header. The secret is set on the Railway `web` service
env var `TV_WEBHOOK_SECRET`. Rotate it by updating the env var and
re-saving every alert.

## Payload shape

```json
{
  "source_id": "hafiz-xauusd-h1-{{timenow}}",
  "strategy_id": "tv-hafiz-synergy",
  "symbol": "XAUUSD",
  "timeframe": "H1",
  "direction": "BUY",
  "confidence": 85,
  "entry": {{close}},
  "stop_loss": {{plot("SL")}},
  "take_profit_1": {{plot("TP1")}},
  "take_profit_2": {{plot("TP2")}},
  "signal_ts": "{{timenow}}"
}
```

Required: `source_id`, `strategy_id`, `symbol`, `timeframe`, `direction`,
`entry`, `signal_ts`. Optional: `confidence` (defaults to 90), `stop_loss`,
`take_profit_1`, `take_profit_2`.

`source_id` must be unique per bar — duplicates are silently dropped
(ON CONFLICT DO NOTHING). Include `{{timenow}}` or the bar timestamp to
dedupe TV's retry storms.

Allowed `strategy_id` values:
- `tv-zaky-classic` — from `trading-strategies`
- `tv-hafiz-synergy` — from `HafizSynergyFX`
- `tv-impulse-hunter` — from `ImpulsePipHunters`

A payload with any other `strategy_id` is rejected with 400.

## Wiring each repo

### HafizSynergyFX — `XAUUSD_H1_Range_Trend_Backtest.pine`

Two entry modes (Range / Trend). Add an `alertcondition()` for each entry
and one TV alert per condition. Alert message body:

```json
{
  "source_id": "hafiz-{{ticker}}-{{interval}}-{{timenow}}",
  "strategy_id": "tv-hafiz-synergy",
  "symbol": "{{ticker}}",
  "timeframe": "{{interval}}",
  "direction": "BUY",
  "confidence": 85,
  "entry": {{close}},
  "signal_ts": "{{timenow}}"
}
```

Change `"direction": "BUY"` to `"SELL"` on the short alert. If the script
already plots SL/TP, pass them via `{{plot("SL")}}` etc. Webhook URL +
header go in the TV alert config (Notifications tab).

### ImpulsePipHunters — `BeautyOfEMA_VIP.pine` + `XAUUSD_H1_Range_Trend_Backtest.pine`

Same pattern. One alert per entry signal, `strategy_id: "tv-impulse-hunter"`.
If both Pine scripts should share this id, that's fine — TradeClaw keys on
`strategy_id`, not on the script name.

### trading-strategies — no Pine source

This repo is a Cloudflare-Workers bot that calls OpenRouter AI on
captured charts. There is no Pine script emitting alerts, so TV webhooks
don't apply directly. To pipe its output into TradeClaw:

1. After the bot produces a signal (see `index.ts` → `aiAnalyzer.ts`),
   have it POST the same JSON payload to TradeClaw's webhook endpoint.
2. Set `strategy_id: "tv-zaky-classic"`.
3. Use `source_id = hash(symbol + timeframe + timestamp)` for dedupe.
4. Store `TV_WEBHOOK_SECRET` as a Cloudflare Worker secret and send it
   as `X-TV-Secret`.

This is a ~15-line fetch call inside the bot's signal handler.

## Configuring a TV alert

1. Open the Pine strategy in TradingView.
2. Click the clock icon → Create Alert.
3. Condition: pick the `alertcondition()` you added (e.g. "Long Entry").
4. Set "Once per bar close" (not "Once per bar") to avoid fire-on-every-tick.
5. Expand Notifications → Webhook URL:
   ```
   https://tradeclaw.win/api/webhooks/tradingview
   ```
   TradingView Pro lets you set a custom header — add:
   ```
   X-TV-Secret: <paste TV_WEBHOOK_SECRET>
   ```
6. Paste the JSON template above into the Message box.
7. Save.

## Verifying

Anonymous request — no premium signals visible:
```bash
curl -s https://tradeclaw.win/api/premium-signals | jq .
# { "signals": [], "locked": true }
```

With a license that grants `tv-hafiz-synergy`:
```bash
curl -s -H "X-License-Key: tck_live_..." \
  https://tradeclaw.win/api/premium-signals | jq '.signals | length'
```

Fire a test alert in TV (right-click the condition → "Test Webhook") and
the count should increment within a few seconds.

## Troubleshooting

- **401 unauthorized** — header missing or secret mismatch. Re-copy the
  Railway env var, no quotes.
- **400 strategy_id_not_allowed** — typo in `strategy_id`. Must be one of
  the 3 allowed values above.
- **400 signal_ts_format** — TV's `{{timenow}}` returns ISO 8601 by
  default, which is valid. If you built the string manually and it's
  invalid, pass a Unix ms timestamp in quotes: `"1712345678000"` and
  update the endpoint to accept it (currently `Date.parse` — already
  handles both).
- **Row not appearing** — check for silent `ON CONFLICT DO NOTHING`
  drops. Your `source_id` is probably repeating. Include a unique
  component (`{{timenow}}` or bar index).
