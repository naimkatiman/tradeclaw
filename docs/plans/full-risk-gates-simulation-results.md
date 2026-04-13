# Full-Risk Gates — Historical Sanity Simulation Results

Ran `scripts/simulate-full-risk-gates.js` against production `signal_history` on 2026-04-14.

## Inputs

- 1099 resolved hmm-top3 signals (24h outcomes set)
- Gate parameters from `packages/strategies/src/run-backtest.ts`:
  - `LOOKBACK_RESOLVED = 20`
  - `STREAK_N = 3` (3 consecutive losses → block)
  - `DRAWDOWN_THRESHOLD = 0.10` (10% drawdown on $10k notional → block)
- Rolling window walks the history in chronological order.

## Results

| Metric | Value |
|---|---|
| Evaluated signals | 1096 |
| Would allow | 495 (45.2%) |
| **Would block** | **601 (54.8%)** |
| Block by streak | 564 |
| Block by drawdown | 37 |
| Hit rate would_allow | **37.2%** |
| Hit rate would_block | 14.6% |
| **Hit-rate delta** | **+22.6 pp** |
| Avg PnL would_allow | +0.055% |
| Avg PnL would_block | -0.116% |
| Current production baseline (no gates) | 24.5% hit rate, -0.04% avg PnL |

## Decision

Both phase-1 trigger criteria from `full-risk-gates-ab.md` are met by huge margins:

- ✅ Block rate 54.8% (threshold ≥ 5%)
- ✅ Hit-rate delta +22.6 pp (threshold ≥ 8 pp)

**Recommendation: PROCEED with phase 1 (shadow mode).**

The simulation suggests the gates would lift hit rate from the current 24.5% baseline to ~37% by filtering out ~55% of signals — most of which sit in losing streaks. PnL flips from breakeven to slightly positive.

## Important caveats

1. **Shadow vs active semantics.** This simulation walks the full history including signals that would have been blocked, which matches **shadow mode** semantics (all signals recorded, gate decisions logged). In **active mode** blocked signals don't enter the rolling window, so the same blocked streak might unblock faster — actual production block rate could be lower than 54.8%. Phase 1 is shadow specifically to measure this without committing.

2. **Look-ahead bias risk.** The current 24.5% baseline already includes every historical signal, so we're not double-counting. But the gate decision for signal *N* uses the resolved 24h outcomes of signals 1..N-1, which were only known *after* the trade closed. Using them at signal time is fine — the gate is meant to react to *prior* outcomes, not to peek into the future of signal *N* itself.

3. **Hit-rate denominator.** "Would_allow hit rate 37.2%" is the hit rate if we had filtered *retroactively*. Live behavior in active mode will trend toward this number but won't necessarily match — gate blocks compound (one block prevents the next signal from contributing to the rolling window) and the realized population shifts.

4. **Volume cost.** A 55% block rate halves signal flow. For a Telegram-driven user base that's a real product change. Phase 1 shadow mode logs the would-block list so you can preview which signals customers would have missed before flipping to active.

## Next step

Per the plan, ship the phase-1 shadow-mode implementation in `apps/web/lib/full-risk-gates.ts` + the gate evaluation in `apps/web/lib/tracked-signals.ts` behind `TRADECLAW_GATE_MODE=shadow`. Run for a week. Re-run this simulation against the post-shadow data to compare predicted-vs-actual block rate, then decide phase 2.

Re-run this analysis any time:
```bash
node scripts/simulate-full-risk-gates.js
```
