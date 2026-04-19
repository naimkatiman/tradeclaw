# Dynamic Risk Gates — Regime-Aware Thresholds

## Goal

Replace the static `STREAK_N=3 / DRAWDOWN_THRESHOLD=10% / LOOKBACK=20` gate
constants in `apps/web/lib/full-risk-gates.ts` with regime-dependent
thresholds. In bull/euphoria regimes the gate breathes (loose thresholds,
long lookback) so normal drawdowns don't halt a trending run. In bear/crash
regimes it tightens (short streak, tight DD, short lookback) to preserve
capital when the model is most likely to be wrong.

## Why now

`TRADECLAW_GATE_MODE=active` was flipped on prod 2026-04-19 after the Apr
16–18 drawdown (peak +1340% → trough +561%, -54% DD in 35h). Static 10% DD
threshold is too tight for the bull leg and too loose for the chop that
followed. Dynamic thresholds fix both.

## Design

### Threshold table

| Regime    | STREAK_N | DD_THRESHOLD | LOOKBACK | Philosophy |
|-----------|----------|--------------|----------|------------|
| crash     | 2        | 0.05 (5%)    | 15       | Capital preservation — model least reliable |
| bear      | 2        | 0.07 (7%)    | 20       | Defensive — small losses compound fast |
| neutral   | 3        | 0.10 (10%)   | 20       | Current defaults — preserve existing behavior |
| bull      | 4        | 0.15 (15%)   | 30       | Let trends breathe — winners come in bursts |
| euphoria  | 3        | 0.08 (8%)    | 20       | Moderate-tight — reversals from froth are violent |

### Regime resolution

Reuse `apps/web/lib/regime-filter.ts`:
- `fetchRegimeMap()` → `Map<symbol, MarketRegime>` (reads `market_regimes` table)
- `getDominantRegime(map)` → single `MarketRegime` via majority vote

`neutral` is the fallback when the DB is unavailable or empty. This
preserves current behavior — an infra blip can never tighten gates
unexpectedly.

## Files to change

1. `apps/web/lib/full-risk-gates.ts`
   - Export `GATE_THRESHOLDS_BY_REGIME: Record<MarketRegime, GateThresholds>`
   - `computeGateState(resolved, regime = 'neutral')` — add optional regime param
   - `fetchGateState()` — call `getDominantRegime` before computing, include regime in cached state
   - Add `regime: MarketRegime` to `GateState` for gate-log transparency
   - Keep existing `STREAK_N / DRAWDOWN_THRESHOLD / LOOKBACK_RESOLVED` exports as the `neutral` aliases (no caller breaks)

2. `apps/web/lib/full-risk-gates.test.ts`
   - Existing 5 tests unchanged — they omit the regime param, default stays `neutral`
   - Add tests:
     - `crash` regime → 2 losses trigger streak (was 3)
     - `bull` regime → 3 losses do NOT trigger streak (was blocked at 3)
     - `bull` regime → 12% DD does NOT trigger (was blocked at 10%)
     - `crash` regime → 6% DD triggers (was allowed)

3. `apps/web/lib/tracked-signals.ts` — **no change**. It calls
   `fetchGateState()` which now internally resolves regime. Gate-log entry
   picks up the new `regime` field automatically via `buildGateLogEntry`.

4. `apps/web/lib/gate-log.ts` — extend `GateLogEntry` to include `regime`
   and threshold snapshot, so the `/tmp/tradeclaw-gate-decisions.log` tape
   shows which thresholds fired.

## Verification steps

1. `npm test -- full-risk-gates` — all 5 existing tests pass, 4 new tests pass
2. `npx tsc --noEmit -p apps/web` — no new type errors
3. Deploy via `railway up --detach`, then tail Railway logs for
   `[full-risk-gates]` entries confirming regime is being read
4. `grep gate /tmp/tradeclaw-gate-decisions.log` (or Railway file) and
   verify the `regime` field appears and varies over time
5. Monitor equity curve over 24h — block rate should drop in neutral/bull
   windows and rise in bear/crash windows

## Rollback

```
railway variables --set TRADECLAW_GATE_MODE=shadow --service web
```

Re-deploy not required — shadow mode evaluates but doesn't filter. Code
change is backward-compatible: omitting the regime param in
`computeGateState` gives neutral defaults, so nothing downstream breaks.

## Out of scope

- ATR/volatility-percentile scaling (multiplicative adjustment on top of
  the regime table) — follow-up once we have 2 weeks of regime-tagged
  gate-log data to calibrate against
- Per-symbol regime instead of dominant — current signal volume is too
  concentrated for per-symbol gating to matter
- Auto-flipping `TRADECLAW_GATE_MODE` based on dashboard metrics — config
  change should remain manual
