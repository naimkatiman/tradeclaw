# 2026-04-20 — Gate-blocked signal recording

## Problem

`TRADECLAW_GATE_MODE=active` on prod. When the regime-aware risk gate trips
(streak or drawdown), `apps/web/lib/tracked-signals.ts:81` sets
`toRecord = []`, so zero rows are INSERTed into `signal_history` for the
duration of the block. Track record UI reads from `signal_history` —
the page freezes until the gate re-opens.

Live right now: `/api/risk/gate-state` → `gatesAllow=false,
reason=streak_blocked: 3/3 consecutive losses`. That's why the track record
screenshot looks stale.

## Goal

Decouple "recorded" from "tradable":

- **Recorded**: every signal the TA engine emits at >= published confidence
  is written to `signal_history`, regardless of gate decision. Engine
  accuracy keeps accumulating so track record stops freezing.
- **Tradable**: blocked signals are stripped from the live API response
  (dashboard, /api/signals) in active mode — same as today.
- **Paper-traded**: the auto paper-trade equity curve on /track-record
  only walks signals that were not gate-blocked. A blocked signal never
  "traded", so it must not contribute P&L or drawdown.
- **Gate self-evaluation**: the drawdown + streak lookback inside
  `fetchGateState` excludes gate-blocked rows. Otherwise blocked-but-right
  signals would re-open the gate on trades we never took — classic
  lookahead leak.

## Out of scope

- Shadow-mode flagging — shadow stays log-only, does not stamp
  `gate_blocked`. Current semantics of shadow mode unchanged.
- UI marker on track record distinguishing blocked vs tradable rows.
  Deferred until we see how the data reads.
- Re-introducing blocked signals into /api/signals response. Still
  stripped in active mode.

## Assumptions

- Additive migration. New columns nullable / default FALSE. Existing
  rows default to `gate_blocked=FALSE` — no backfill needed.
- Pre-migration deploys continue to work via `undefined_column`
  fallback in the INSERT, matching the 012_atr_telemetry pattern.
- `gate_reason` is a human-readable string copied from `GateState.reason`
  — enough to debug, no schema churn if the reason format evolves.

## Files

One commit per layer (per CLAUDE.md phased-feature rule):

1. `apps/web/migrations/017_gate_blocked.sql` — schema only.
2. `apps/web/lib/signal-history.ts` — read/write + types. Uses the
   pre-012-style `undefined_column` fallback so a partial deploy keeps
   working.
3. `apps/web/lib/tracked-signals.ts` — always record, stamp
   `gateBlocked=true` + `gateReason` when `mode==='active' && !gatesAllow`.
4. `apps/web/app/api/signals/equity/route.ts` +
   `apps/web/lib/full-risk-gates.ts` — consumers filter blocked rows.

## Verification

- `npm run build -w apps/web` passes.
- Deploy, apply migration, then hit `/api/risk/gate-state` and
  `/api/signals/history?limit=5`. Expect `gatesAllow=false` AND new
  rows appearing with `gate_blocked=TRUE`.
- `/api/signals/equity` total-return value does not change while the
  gate is blocking (blocked rows excluded from paper-trade walk).
- Spot check: after outcomes resolve on a batch of blocked signals,
  the gate's own drawdown reading doesn't move — it's reading only
  un-blocked history.
