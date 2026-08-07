# D1 Slow-Gate Build Spec (2026-08-08) — propose-only, owner gate before any code

Status: DRAFT for owner approval. This document commissions nothing by itself.
No strategy code, no engine change, no activation. The build starts only when
the owner approves this spec; live activation has its own, later gate (§6).

## 1. Why this build, and why now

The 2026-08-05 regime-expectancy study (`docs/plans/2026-08-05-regime-expectancy-study.md`,
published to /research in PR #200) ended in pre-registered decision-rule
branch 2: **the fix is horizon, not filtering.** No regime bucket of the M15
stream is net-positive under any detector; the stream's gross edge (+0.0094R)
sits ≈54× below its 1× cost wall (0.5113R). Its verdict names the next build:
the D1 slow-gate strategy already validated in
`docs/plans/2026-07-18-slow-regime-gate-sandbox.md`.

Inherited evidence (committed artifact
`docs/research/experiments/slow-gate-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json`,
BTC+ETH two-sleeve portfolio, spot costs, 2017-09-01 → 2026-07-16):

| Variant | CAGR | Max DD | Calmar |
|---|---|---|---|
| buy-and-hold | 28.1% | 86.5% | 0.325 |
| **EMA200 gate (long/flat)** | **29.4%** | **58.8%** | **0.500** |
| EMA200 + vol-target sizing | 22.8% | 37.4% | 0.608 |
| EMA200 + HMM sizing | 10.8% | 50.2% | 0.215 — REFUTED (995 flips, ~90% cost drag) |

The gate's edge is drawdown-adjusted, not raw return: the sandbox's own
honesty rule was that nothing beats buy-and-hold on raw CAGR. Trade frequency
is the point — 86 flips on BTC and 64 on ETH over 8.9 years (≈10/yr/symbol)
versus the M15 stream's 3,157 counted trades in under two months.

## 2. Deliverable

A new tracked strategy `d1-slow-gate`, shipped one layer per commit:

1. **Strategy module** (`packages/strategies`): D1 bars only. Long/flat EMA200
   gate (close above a rising EMA200 = long, else flat). ATR-based stop sized
   so the modeled cost is ≤ 0.10R at the production crypto cost model — the
   ≥5× relative-stop-width point on the study's cost curve. Hard
   trade-frequency cap as a code-level invariant, not a hope.
2. **Emit-only registration**: signals recorded to `signal_history` as a
   simulated/paper lane, fail-closed excluded from counted-resolved (the
   existing `isCountedResolved` discipline) until §6 passes.
3. **Walk-forward validation harness** (`scripts/research`): its spec is a
   separate pre-registered plan doc — hypotheses, tolerances, and decision
   rule written before the first run, carrying the three standing QA gates
   from the regime study (reconciliation, lookahead, bar staleness).
4. **Research surface**: a registry entry on /research whose verdict is
   published whichever way it lands, kill included.

## 3. Universe

Crypto majors with D1 candle coverage in the repository store — the same
coverage boundary now disclosed on /methodology (PR #201). BTC and ETH are the
validated pair; the sandbox's survivorship caveat applies (results generalize
to the majors, not to any 2017 altcoin pick). No non-crypto pair enters until
a licensed daily feed exists.

## 4. Pre-registered before the first walk-forward run

- Parameters are inherited, not tuned: EMA200, long/flat, no sweeps. Changing
  any parameter after seeing walk-forward results is tuning and voids the run.
- Sizing is a single owner decision taken in §7 before the harness runs:
  fixed-fractional (the sandbox headline) or vol-target (better Calmar 0.608
  and 37.4% DD, at 22.8% CAGR). One variant goes forward; the other is not a
  fallback.
- HMM sizing is dead. The sandbox refuted it; it does not return in this build.

## 5. Explicitly out of scope

No live activation. No change to existing strategies, crons, migrations,
auth/billing, or the public counted record. No DB schema change is expected;
if one becomes necessary it ships as its own approved migration commit.

## 6. Activation gate (later, separate owner decision)

The paper lane may only be promoted to a counted tracked strategy if the
pre-registered walk-forward passes its own decision rule — at minimum:
net-positive after the production cost model, Calmar at or above buy-and-hold
in the majority of folds, frequency cap held, all three QA gates green — and
the owner then approves activation explicitly. A failed walk-forward is
published to /research as a kill entry.

## 7. Owner decisions needed before code starts

1. Approve this spec (or edit it — edits before the walk-forward are free).
2. Universe: BTC+ETH only, or all crypto pairs with D1 coverage.
3. Sizing variant: fixed-fractional or vol-target (§4).
4. Lane reconciliation: `feat/slow-gate-research-surface`
   (worktree `C:/Ai/tradeclaw-slow-gate-surface`) predates this spec — decide
   whether it is superseded, absorbed, or the base for layer 4.
