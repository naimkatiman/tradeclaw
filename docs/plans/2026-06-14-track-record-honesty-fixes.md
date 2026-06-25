# Track-record honesty fixes (2026-06-14)

Source: cross-surface consistency audit of `/track-record` against live `tradeclaw.win/api/signals/*`.

## Findings actioned

1. **CRITICAL — deceptive Premium-vs-All badge.** `TrailingWeekBandCallout` advertises
   `Premium +X% vs All` colored as "filter paying rent" whenever premium's *total return* beats
   all-signals over the last 7 days. Live data shows this is misleading:
   - 7d window: All −40.32% (win 28.1%, exp −0.17R, 256 trades) vs Premium −7.83%
     (win 25.8%, exp −0.23R, 31 trades). Premium has a **lower** win rate and **worse**
     per-trade expectancy that week; it "wins" only by trading ~8× less.
   - All-time: All **+41.16%** vs Premium **−1.7%** (191 trades, win 34.6%, Sharpe 0.03).
     The premium filter underperforms the firehose on return, win rate, expectancy, and Sharpe
     over the full record.

2. **HIGH — headline hierarchy.** The header leads with `+76.35%` (raw sum of per-signal
   market %, no sizing, no costs) in 5xl, while the realized compounded figure a subscriber
   could actually earn (`+41.16%`, with a −82.57% max drawdown) sits lower in the equity card.

## Retracted (not a bug)

- R-stat trio (win-rate × avgR vs expectancy/break-even) reconciles once avgR/win is read
  correctly (~1.71R, not 1.66R). Confirmed by `route.test.ts` "computes expectancyR from the
  sized-trade population". No change.
- Counts reconcile: 3,313 resolved + 2,345 expired + 3,723 gate-blocked + 5 pending = 9,386 total.
- Max drawdown −82.57% is the real peak-to-trough of the compounded path. Honest. No change.

## Plan (3 commits, layered)

1. **api:** add `summaryOnly` to `GET /api/signals/equity` — returns `summary` +
   `rollingWinRates` with `points: []`, so summary-only consumers skip the ~3.3k-point payload.
   Test in `route.test.ts`.
2. **product:** `lib/band-comparison.ts` pure classifier (`classifyBandComparison`) +
   unit test; rewire `TrailingWeekBandCallout` to (a) gate the positive framing on genuine
   per-trade quality (win rate AND expectancy ≥ all), (b) show an all-time Premium-vs-All
   context line via `summaryOnly`.
3. **product:** surface realized compounded return + max drawdown at the `/track-record`
   headline; label the raw `+76.35%` as unsized.

## Verify

- `npm run -w apps/web type-check` (or `tsc --noEmit`) green.
- `npx jest band-comparison route.test --modulePathIgnorePatterns="standalone"` green.
- No change to win-rate computation (honesty contract: win-rate byte-matches across surfaces).
