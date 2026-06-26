# BTC daily-momentum sleeve — pre-registration + plan

Date: 2026-06-26
Branch: worktree-btc-daily-sleeve (off main @ df8adeb4)
Status: KILLED at Phase 1 (2026-06-26). The pre-registered drift/reproduction
check FAILED — see "Phase 1 outcome" below. The sleeve is NOT built. This doc is
retained as the honest decision record. Phase 0 pre-registration was committed
BEFORE the re-run, so the kill is a clean, non-cherry-picked result.

## Phase 1 outcome: KILLED — the edge does not reproduce

A fresh 6-year Binance BTC D1 backfill (2020-06-26 → 2026-06-25, 2191 bars) re-run
through the SAME validator + config inverts the committed result on a ~2-week
window shift:

| metric (signal-flip, costed) | committed 2026-06-12 | fresh 2026-06-26 |
|---|---|---|
| window | 2020-06-12 → 2026-06-10 | 2020-06-26 → 2026-06-25 |
| trades | 100 | 99 |
| win rate | 23% | 18.2% |
| total return | +20.58% | −8.70% |
| expectancy | +0.0198 | −0.0090 |
| profit factor | 1.62 | 0.67 |
| Sharpe | +1.35 | −1.28 |
| max drawdown | 5.97% | 12.68% |

VERDICT: NEGATIVE across all three exit configs. Decisively: even at ZERO cost the
fresh window is negative (totalReturn −2.05%, Sharpe −0.25) — not a cost story; the
raw 28d momentum signal itself has no edge on current BTC data. A real edge does
not flip from Sharpe +1.35 to −1.28 on a two-week window shift; the committed
+0.0198R was a window-fragile artifact carried by a few right-tail trades (23% win
rate). This confirms the overfit/survivorship risk this spec flagged.

Conclusion: there is NO deployable single-asset timing edge — not even the one
candidate that appeared to clear costs. The shadow harness is NOT built. Honest
paths remaining: a funding-carry pivot (structurally different; failed its own gate,
needs a maker-cost re-spec) or repositioning the product off raw P&L.

Fresh evidence: docs/research/experiments/daily-momentum-validation-BTCUSD-D1-f4.json
(this run). Phases 1-5 below are retained for context but NOT executed.

## Why this exists

After real costs the firehose has no net edge ([[engine-no-net-edge]]). The ONE
strategy in the research corpus that clears real cost is BTCUSD daily 28-day
time-series momentum with a signal-flip exit:
+0.0198R net, PF 1.62, Sharpe 1.35, maxDD 5.97%, n=100 over ~6yr
(`daily-momentum-validation` f4.json, `results.BTCUSD.full['signal-flip'].costed`).

This is MARGINAL and post-hoc. BTC is the single survivor of a 10-way symbol
search; the broad +24.9% aggregate is fluke-driven (SOL +189%, AVAX +102%
launch-era; ex-fluke mean −5.25%, fold stability 0.375). BTC's own folds are
only 2/4 positive (fold1 +16.7%, fold4 +1.7% up; fold2 −4.7%, fold3 −4.3% down).
Win rate is 23% — all edge is right-tail. Therefore the backtest CANNOT justify a
public claim. Only a live forward record can. This plan builds a shadow harness
that runs the sleeve live, records it privately, and surfaces it publicly ONLY
after a pre-frozen forward gate clears (~18–24 months at ~16 crosses/yr; it may
never clear). The harness is reusable for vetting any future strategy.

## FROZEN sleeve spec (v1) — do not change without a new dated pre-registration

- Symbol universe: `{ BTCUSD }` ONLY. DOT is the sole future basket candidate
  (validated set, not a launch-era fluke) but is explicitly OUT of v1 — adding it
  now is a second post-hoc pick.
- Entry: `dailyMomentumEntry` — 28-day trailing-SMA time-series momentum, fires
  only on a fresh momentum cross (`packages/strategies/src/entry/daily-momentum.ts`).
- Exit: `signal-flip` — ride to the opposite-direction cross; SL floor at
  ATR(14)×2.5; NO take-profit (`run-backtest.ts` signal-flip path).
- Timeframe: D1, decided on CLOSED bars only (drop the last possibly-open bar).
- Cost model: `CRYPTO_PERP_COSTS` (fee 0.05%/side + slippage 0.15%/side +
  funding 0.01%/8h; `backtest-options.ts:32-36`).
- Sizing: 1% risk/trade fixed-fractional, `HARD_R_CAP=8`, real per-row cost —
  identical to the live equity route shipped in #136.

## FROZEN forward gate — graded ONLY on the live shadow record (+ sealed slice), never in-sample folds

All must hold before ANY public surfacing:
1. Sample: n ≥ 30 forward signal-flip round trips (`THIN_CELL_MIN_TRADES=30`).
2. Window: ≥ 4 weeks of live shadow evidence (so n≥30 cannot cluster in one tick).
3. Net edge: forward per-trade expectancy > 0 after REAL per-row cost.
4. Drawdown: forward maxDD ≤ 6.0% (within the backtest envelope).
5. Stability: positive expectancy on BOTH the live shadow record AND the sealed
   held-out slice (two independent out-of-sample reads agreeing).

Until all five hold, the sleeve lives only in the private shadow store and NO
public claim, badge, or curve is made.

## Validation approach (chosen): live-forward-only

The full 6-year backfill is the in-sample reference and a determinism/drift gate
(must reproduce expectancy 0.019771, PF 1.62, n=100 byte-for-byte). The real
out-of-sample test is the LIVE shadow record from day one — the recent folds are
thin and flat, so a fresh sealed tail would be weak; live-forward is the honest
test. An `--as-of` sealed-slice capability is added for a secondary read, but the
governing OOS evidence is the live shadow record.

## Phases (one commit per layer; no public surface touched until Phase 5)

- Phase 0 — pre-register (THIS doc). No code.
- Phase 1 — validation: add `--as-of <ISO>` held-out slice to the validator;
  backfill BTC D1; re-run; diff the BTC signal-flip cell byte-for-byte vs the
  committed result (drift gate); run the validator unit test.
  Files: `scripts/research/daily-momentum-validation.ts`,
  `scripts/research/__tests__/daily-momentum-validation.test.ts`.
- Phase 2 — strategy wiring: new TS daily cron route + GitHub workflow
  (`5 0 * * *`, after D1 close) reusing `requireCronAuth`+`recordSignalRun`;
  fetch `getOHLCV('BTCUSD','D1')`, drop the open bar, run the entry; build a
  persistent position-state store for the signal-flip hold (none exists today).
  NOT a preset (preset dispatch exits on ATR geometry per-tick, can't model
  signal-flip). NOT the Python scanner (intraday-only). TS only.
  Files: `apps/web/app/api/cron/daily-momentum/route.ts`,
  `.github/workflows/daily-momentum.yml`, `apps/web/lib/daily-momentum-position.ts`.
- Phase 3 — shadow recording: clone the router-shadow mode gate
  (`TRADECLAW_DAILY_MOMENTUM_MODE`, default `shadow`); a dedicated
  `shadow_signals` Postgres table keyed `strategyId='daily-momentum-btc'`;
  a flip-exit resolver off the run-backtest signal-flip path. NEVER writes
  `signal_history` (which has no strategy filter in `getResolvedSlice` →
  anything there leaks straight onto the public curve). Fire-and-forget.
  Files: `apps/web/lib/daily-momentum-shadow.ts`,
  `apps/web/lib/daily-momentum-shadow-log.ts`,
  `apps/web/migrations/0NN_shadow_signals.sql`.
- Phase 4 — measurement: private authed net-R view over `shadow_signals` using
  the live equity math; public scopes still exclude it.
- Phase 5 — public surfacing (GATED, operator-flipped): ONLY after the forward
  gate clears; under a DEDICATED scope (not folded into scope=pro, which would
  move the headline numbers). Add `daily-momentum` to the StrategyId union /
  router / PRO_STRATEGIES at this point.

## Risks (kept visible, not hidden)

- Overfit/survivorship: BTC is the post-hoc winner of a 10-way search.
- Fold stability 2/4; the headline is carried by 2 of 6 years; recent folds flat.
- 23% win rate — a choppy BTC year produces many small losses and no big trend;
  the live curve can look nothing like the backtest.
- ~18–24 months to n≥30; the claim is earned slowly or not at all.
- Signal-flip is a backtest abstraction; the live position-state store + closed-
  bar guard must be correct or live parity breaks (lookahead).
- Funding is a sign-agnostic upper bound; a multi-day short hold in a positive-
  funding regime can flip net edge — re-cost at the real venue before grading.

## Do not do

- Do NOT register the sleeve as a preset (can't honor signal-flip).
- Do NOT edit the Python scanner (intraday-only, wrong engine).
- Do NOT write the sleeve to `signal_history` during shadow (leaks to public).
- Do NOT re-run scoped to `--symbols BTCUSD` before this doc is committed.
- Do NOT reuse the 4h/24h TP/SL resolver for the multi-week flip hold.
- Do NOT let `mode=active` silently surface; go-live is an explicit operator step.
- Do NOT add DOT or any second symbol to v1.
