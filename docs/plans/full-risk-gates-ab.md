# Full-Risk Drawdown + Streak Gates — A/B Plan

## Goal

Production hit rate is **23.2%** across 1484 historical signals (avg PnL -0.04%). The hypothesis is that streak and drawdown gates from the `full-risk` preset will filter the worst entries and lift hit rate without losing too much volume.

This plan ports the gate logic into **the actual production write path** (`apps/web/lib/tracked-signals.ts` → `recordSignalsAsync`), not into Python. An earlier session almost executed a Python port that would have done nothing because `scripts/scanner-engine.py` is not in the live path. See [workspace CLAUDE.md → TradeClaw — Signal Generation Architecture](../../../CLAUDE.md) for the full architecture.

## Architecture diagram

```
[any API request that calls getTrackedSignals]
                    │
                    ▼
       getSignals() → generateSignalsFromTA()
                    │
                    ▼
        toRecord = filter (real, conf >= MIN)
                    │
                    ▼
       [NEW] computeGateState(history) ──┐
                    │                    │
                    ▼                    │
       [NEW] applyGateFilter(toRecord, gate, mode)
                    │                    │
                    │ tags every signal ─┘
                    │ mode=shadow: passthrough + log
                    │ mode=active: drop blocked
                    ▼
       recordSignalsAsync(toRecord)  →  signal_history
```

Two new helpers, one new env var, no schema migration, no Python touched.

## Code changes

### 1. New file: `apps/web/lib/full-risk-gates.ts`

Pure-functional gate logic, easily unit-testable. Mirrors `riskAllows` from `packages/strategies/src/run-backtest.ts:55-74`.

```ts
import { readHistoryAsync, type SignalHistoryRecord } from './signal-history';

const LOOKBACK_RESOLVED = 20;
const STREAK_N = 3;
const DRAWDOWN_THRESHOLD = 0.10;
const START_BALANCE = 10_000;

export interface GateState {
  gatesAllow: boolean;
  reason: string | null;
  streakLossCount: number;
  currentDrawdownPct: number;
  dataPoints: number;
}

export function computeGateState(resolved: SignalHistoryRecord[]): GateState;
export async function fetchGateState(): Promise<GateState>;
```

- `computeGateState` is pure: takes resolved-newest-first history slice, returns gate state. Unit-tested.
- `fetchGateState` async wrapper: queries `signal_history` for last `LOOKBACK_RESOLVED` resolved rows, calls `computeGateState`. Has a 5s timeout and falls open on any error.
- Streak gate: `last 3 resolved 24h outcomes are all losers → block`.
- Drawdown gate: simulate balance over last 20 outcomes from $10k starting, compute `currentDrawdown = (peak - balance) / peak` after the loop, block if `> 0.10`.
- Both gates use the **24h outcome** (`outcome_24h.hit` and `outcome_24h.pnlPct`).
- **Scope: global, not per-symbol.** Faithful to the backtest. With ~5 signals/run on 13 symbols, per-symbol gating would never trigger.

### 2. New file: `apps/web/lib/full-risk-gates.test.ts`

5 unit tests:
1. Empty history → allow
2. Last 3 all losses → block (streak)
3. Last 3: 2 losses 1 win → allow
4. 20 entries cumulative -11% drawdown → block (drawdown)
5. 20 entries 9% drawdown → allow

Run: `npm test -w apps/web -- full-risk-gates`.

### 3. Modify `apps/web/lib/tracked-signals.ts`

Add gate evaluation between the filter step and `recordSignalsAsync`:

```ts
const mode = process.env.TRADECLAW_GATE_MODE ?? 'shadow';  // 'shadow' | 'active' | 'off'
let gateState: GateState | null = null;
if (mode !== 'off') {
  gateState = await fetchGateState();
}

const passes: typeof toRecord = [];
const blocks: typeof toRecord = [];
for (const sig of toRecord) {
  if (mode !== 'off' && gateState && !gateState.gatesAllow) {
    blocks.push(sig);
  } else {
    passes.push(sig);
  }
}

// Always log decisions (lightweight, fire-and-forget)
if (mode !== 'off' && gateState) {
  logGateDecisions(passes, blocks, gateState).catch(() => {});
}

// Phase 1 (shadow): record everything. Phase 2 (active): drop blocked.
const finalToRecord = mode === 'active' ? passes : [...passes, ...blocks];
recordSignalsAsync(finalToRecord).catch(() => {});
```

Block tag: in `active` mode, blocked signals are dropped. In `shadow` mode, both pass and block are recorded — but we still want to know which the gate would have blocked. Tag via the new `gate_blocked` column (see schema below) or via the log file. Decision: **flat log file**, because adding a column risks breaking the rest of the system and the log file is sufficient for a one-week measurement.

### 4. New file: `apps/web/lib/gate-log.ts`

Append-only NDJSON writer. One line per evaluated batch:

```json
{
  "ts": "2026-04-13T...",
  "mode": "shadow",
  "gate_state": { "gatesAllow": false, "reason": "streak_blocked", ... },
  "passed_count": 0,
  "blocked_count": 3,
  "blocked_signals": [{"symbol": "BTCUSDT", "direction": "BUY", "confidence": 78.5}, ...],
  "passed_signals": []
}
```

Path: `process.env.TRADECLAW_GATE_LOG_PATH ?? '/tmp/tradeclaw-gate-decisions.log'`.

On Railway the file lives in container `/tmp` which is wiped on redeploy. Acceptable for phase 1 because:
1. We control redeploy timing
2. We can `railway run cat /tmp/tradeclaw-gate-decisions.log > local-snapshot.log` daily to copy down
3. After phase 2 ships, we can move to a real `gate_decisions` table if the data proves valuable

### 5. Schema: NO migration in phase 1

Phase 1 ships with zero DB changes. The flat log file is the measurement surface. If phase 2 ships and we want long-lived gate metrics, add `migrations/006_gate_decisions.sql`:

```sql
CREATE TABLE IF NOT EXISTS gate_decisions (
  id              BIGSERIAL PRIMARY KEY,
  signal_id       TEXT NOT NULL,
  gate_action     TEXT NOT NULL,  -- 'passed' | 'blocked'
  gate_reason     TEXT,
  streak_loss_count INTEGER,
  current_drawdown_pct NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gate_decisions_signal ON gate_decisions (signal_id);
```

Defer this until phase 2.

## Phase rollout

### Phase 1 — Shadow (week 1)

- `TRADECLAW_GATE_MODE=shadow` (default)
- All signals still recorded as-is in `signal_history`
- Gate evaluations logged to `/tmp/tradeclaw-gate-decisions.log`
- Zero production behavior change
- Daily: `railway ssh "cat /tmp/tradeclaw-gate-decisions.log" > local-gate-log-$(date +%F).log`

### Measurement after week 1

```bash
node scripts/analyze-gate-log.js local-gate-log-*.log
```

The analyzer (new ~80-line script) reads the NDJSON, joins each blocked/passed signal against `signal_history` outcomes by `(symbol, direction, ts)`, computes:
- Total decisions
- Pass count, block count, block trigger reasons (streak vs drawdown)
- Hit rate of `passed` vs hit rate of `would_block`
- Avg PnL of each bucket
- Statistical confidence interval (Wilson) on the difference

### Phase 2 trigger criteria (all must hold)

1. **Sample size**: ≥30 `would_block` signals with resolved outcomes
2. **Hit rate delta**: `would_block` hit rate is ≥8 pp lower than `passed` (so `would_block` ≤15.2% vs current 23.2% baseline)
3. **Trigger frequency**: gate fires on ≥10% of evaluated batches over the week
4. **Passed bucket healthy**: `passed` hit rate ≥ overall historical baseline (no over-blocking of correlated winners)

If criteria 1-3 hold but #4 doesn't, the gate is firing during recovery windows — investigate before flipping.

### Phase 2 — Active (week 2+)

- Set `TRADECLAW_GATE_MODE=active` on Railway web service: `railway variable set TRADECLAW_GATE_MODE=active -s web`
- `railway up --detach` to redeploy with the new env
- Blocked signals are now dropped (not recorded)
- Continue logging for ongoing monitoring
- Compare `signal_history` hit rate week-over-week; expect lift if gates are working

## Rollback

**Instant** (no deploy needed, zero downtime):
```
railway variable set TRADECLAW_GATE_MODE=off -s web
```
Next request that calls `getTrackedSignals` skips the gate evaluation entirely. No DB changes, no log writes, identical to pre-gate behavior.

**Code rollback**: The gate is opt-in via env var. Removing the gate code entirely is a single-commit revert.

## Test plan

- [ ] `apps/web/lib/full-risk-gates.test.ts` — 5 unit tests pass
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` green
- [ ] Smoke test locally: `TRADECLAW_GATE_MODE=shadow npm run dev -w apps/web` → hit `/api/signals` → check `/tmp/tradeclaw-gate-decisions.log`
- [ ] Verify gate state computation: `node -e "require('./apps/web/.next/.../full-risk-gates').fetchGateState().then(console.log)"` against the production DB
- [ ] After deploy: monitor `/api/signals` response time — gate adds one DB query (~10ms), should be invisible

## Open questions

1. **Gate-evaluation caching.** Every `getTrackedSignals` call does an extra `signal_history` query for the last 20 resolved rows. With dashboard SSR this could be ~100 calls/min. Recommend a 60s in-memory cache of `gateState` keyed by nothing (it's global). Decision: include in initial implementation. Cache miss = recompute.
2. **Per-symbol opt-in.** Currently all symbols share the gate. If you ever want to gate only your worst-performing symbols (e.g., the symbols that drag the 23.2% down), the function signature should accept an optional `symbol?: string` filter. Defer to a follow-up.
3. **Gate metrics dashboard.** A small section on `/track-record` showing "X% of signals blocked this week, hit-rate delta Y pp" would close the loop visually. Defer to phase 2.
4. **Backfill the gate log from history.** We can simulate what the gate WOULD have blocked over the historical 1484 signals before shipping anything, just to predict trigger frequency. ~50 lines, no production touch. Recommend doing this **first** before phase 1, as a sanity check that the gate would actually fire often enough to matter. If historical simulation says the gate would have fired on 2/1484 signals, the entire effort is wasted.

## Recommended execution order

1. **Sanity simulation first** (~1h): write a one-shot script that loads `signal_history` ordered by created_at, walks the rows applying `computeGateState` to a rolling window of the prior 20 resolved rows, and logs how many signals would have been blocked. If the count is < 5% of 1484, **do not proceed** — the gate is too rare.
2. If the simulation shows ≥5% block rate: implement steps 1-4 above
3. Ship phase 1 to production with `TRADECLAW_GATE_MODE=shadow`
4. Wait one week, run analyzer
5. Decide phase 2 based on criteria
