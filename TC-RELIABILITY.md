# TC-RELIABILITY: Signal Reliability Fixes

## Tasks (execute in order after current job completes)

### REL-001: Raise signal threshold + improve scoring weight

File: apps/web/app/lib/signal-generator.ts

- Change `SIGNAL_THRESHOLD = 40` → `SIGNAL_THRESHOLD = 55`
- Add minimum candle count guard: if candles.length < 100, return [] (insufficient data)
- Add confluence requirement: only generate signal if AT LEAST 2 indicator categories agree
  - Category A (momentum): RSI + Stochastic
  - Category B (trend): EMA + MACD
  - Category C (volatility): Bollinger Bands
  - Signal requires score from at least 2 categories to be non-zero in the same direction
- Add `dataQuality: 'real' | 'synthetic'` field to TradingSignal interface
- Pass source through from getOHLCV into signals

### REL-002: Suppress signals on synthetic data + show source badge

Files: 
- apps/web/app/lib/signal-generator.ts
- apps/web/app/api/signals/route.ts
- apps/web/app/components/signal-card.tsx (or wherever signal cards are rendered)

Changes:
- In signal-generator.ts: if source === 'synthetic', do NOT generate signals — return [] with a note
- In /api/signals route: if a symbol falls back to synthetic, include it in response but mark as `{ symbol, error: 'insufficient_data', source: 'synthetic' }` instead of signals
- On signal cards: show a small "LIVE" green badge when source=real, show no signal / greyed out card when source=synthetic with text "Awaiting live data"
- Add a global banner at top of dashboard if MORE THAN 30% of symbols are on synthetic data

### REL-003: Fix H4 forex candle aggregation

File: apps/web/app/lib/ohlcv.ts

Current issue: Yahoo Finance 1H candles are chunked into groups of 4 regardless of actual market hours. This creates misaligned H4 candles (e.g. midnight to 4am instead of 00:00/04:00/08:00 etc).

Fix:
- Align aggregation to proper H4 boundaries (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
- Group candles by: `Math.floor(timestamp / (4 * 3600 * 1000)) * (4 * 3600 * 1000)`
- This ensures H4 candles snap to the same periods as TradingView/MT4
- Update aggregateCandles() to accept an optional `alignToMs` parameter

Also for Yahoo Finance: increase the range for H4:
- Current: `H4: { interval: '1h', range: '60d' }` → change to `H4: { interval: '1h', range: '90d' }` for more candles after aggregation

### REL-004: Real outcome tracking (replace simulated accuracy stats)

Files:
- apps/web/lib/signal-history.ts
- apps/web/app/lib/ohlcv.ts
- apps/web/app/api/signals/route.ts

Replace the fake `simulateOutcome()` function with real price outcome tracking:

1. When a signal is recorded via `recordSignal()`, store its TP1, SL, entry price
2. Add a background resolution job: `resolveRealOutcomes(records)` 
   - For each unresolved signal (outcomes['4h'] === null or outcomes['24h'] === null)
   - If 4h+ has passed: fetch the real price from getOHLCV for that symbol
   - Check if price hit TP1 or SL within the time window using actual OHLCV candles
   - `hit = true` if TP1 was reached before SL within the window
   - `hit = false` if SL was hit first, or if neither was hit (direction didn't move enough)
3. Call `resolveRealOutcomes()` at the start of the /api/signals/history route
4. Add `tp1: number, sl: number` fields to SignalHistoryRecord interface
5. Remove `simulateOutcome()` entirely — or keep it only for seed data clearly labeled as "example data"

For the leaderboard/accuracy pages:
- Show a disclaimer: "Accuracy stats are based on real price outcomes tracked since [earliest record date]"
- Add a `isSimulated: boolean` field to SignalHistoryRecord
- Seed data should have `isSimulated: true` and be excluded from accuracy calculations (or shown separately)
- Only real tracked signals (isSimulated: false) should count toward win rate stats

### REL-005: Accuracy page disclaimer + transparency

File: apps/web/app/accuracy/page.tsx (or AccuracyClient.tsx)

- Add a prominent banner at top: "Signal accuracy is tracked in real-time. Each signal's outcome is verified against live market data at 4h and 24h intervals. Historical seed data is excluded from stats."
- Add a "Data source" column to the signal history table: "Live tracked" (green) vs "Example" (grey)
- On leaderboard page: same disclaimer + filter out isSimulated records from default view
- Add a "Last verified" timestamp to each signal row

## Execution instructions
- Work in /home/naim/.openclaw/workspace/tradeclaw
- Run `npm run build` in apps/web after ALL changes to verify
- Fix any TypeScript errors before declaring done
- Commit with message: "fix: signal reliability — real outcomes, no synthetic signals, H4 alignment, threshold 55"
- Push to GitHub
- When done: openclaw system event --text "Done: Signal reliability fixes complete — real outcome tracking, synthetic data suppressed, H4 fixed, threshold raised to 55" --mode now
