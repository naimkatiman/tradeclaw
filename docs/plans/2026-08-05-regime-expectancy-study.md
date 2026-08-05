# Regime Expectancy Study — can any subset of the losing track record make money?

Date: 2026-08-05
Status: SPEC — approved direction, pre-registered before any results were computed.
Owner ask: "Fix this track record. The hypothesis that we lose overall is good — but how do we make money from this? Don't follow the mass. Trade the trending chart, not sideways."

## Problem statement

The live track record (Jun 10 – Aug 4, 53 trading days) shows:

| Metric | Value |
|---|---|
| Resolved sized trades | 3,095 |
| Win rate | 37.7% (break-even 37%) |
| Avg R per win / loss | +1.67R / -0.98R |
| Gross expectancy | +0.02R |
| Modeled cost per trade | 0.51R |
| Net expectancy | -0.49R |
| Sequential simulation | $10,000 → $0 (-100%) |

The decomposition already tells us where the loss lives: the signal stream is
directionally ~breakeven gross; the account is destroyed by per-trade cost at
~58 trades/day. `apps/web/lib/modeled-trade-cost.ts` computes
`costR = roundTripCostPct / riskPct` — cost in R is inversely proportional to
stop width, so tight scalp stops make the fixed cost enormous in R terms.

### Pre-computed arithmetic constraint (falsifiable by the study)

Inverting every signal ("fade the crowd") flips gross from +0.02R to ≈ -0.02R
and pays the same 0.51R cost → ≈ -0.53R net, strictly worse. The crowd here is
not losing to a smarter counterparty; it is losing to cost drag. The study runs
the inversion anyway to close the door with data instead of arithmetic.

## Hypotheses (pre-registered)

- H1 (owner's): signals entered in trending regimes have materially better net
  expectancy than signals entered in sideways regimes; counter-trend entries
  are the worst bucket.
- H2: full inversion has net expectancy ≤ the original stream (contrarian
  door closes).
- H3: no M15-stop bucket reaches net-positive at 0.51R-class costs; the
  cost-vs-stop-width curve identifies the minimum stop width (→ hold horizon)
  where a trending-aligned trade turns net-positive.
- H4: per-strategy/band decomposition shows loss concentration in specific
  strategies (07-31 weekly SURVIVED proposal).

## Decision rule (pre-registered, before results)

1. If a trending-aligned bucket with N ≥ 300 shows net expectancy > 0 under
   the exact production cost model → next project: trend gate at those
   thresholds as a new tracked strategy.
2. If trending-aligned improves but stays net-negative → verdict is horizon,
   not filtering: next project builds the D1 slow-gate strategy already
   validated on Calmar in `docs/plans/2026-07-18-slow-regime-gate-sandbox.md`
   (EMA200 gate, 3/4 folds beat buy-and-hold after costs).
3. Inversion is adopted ONLY if it beats both the original stream and the best
   regime bucket (expected: it will not).
4. No result may be interpreted unless the reconciliation check (below) passes.

## Method

### Data sources

- Signals + outcomes: production export
  `https://tradeclaw.win/api/signals/history?format=csv` (public, ungated).
  Full row set: entry, TP1, SL, timestamps, strategyId, per-horizon outcomes
  with pnlPct + provenance source. 24h horizon rows are the sized-trade set.
- Candles: the repo's own candle store (migration 049 `candles` table) via
  `scripts/research/candle-db.ts` / `backfill-candles.ts` (DB mode via
  `DATABASE_PUBLIC_URL` / `railway run`, or `--out-dir` file dump). D1 candles
  with ≥ 200 bars of lookback before 2026-06-10; backfill from the store's
  existing provider path where coverage is missing. Symbols without candle
  coverage are EXCLUDED and the exclusion count is reported — no silent drops.

### Regime classification at entry (no lookahead)

Computed per signal from D1 candles whose close time is ≤ signal timestamp:

- Trend side: close vs EMA200, plus EMA200 slope over trailing 20 bars.
- Trend strength: ADX(14); report both ≥ 20 and ≥ 25 cuts.
- Sideways: ADX < 20, or Kaufman efficiency ratio (20-bar) < 0.30 —
  both detectors reported side by side rather than committing to one.
- Buckets: trending-aligned (BUY in uptrend / SELL in downtrend),
  trending-counter, sideways.

### Metrics per bucket

N, win rate, avg win R, avg loss R, gross expectancy, avg costR, net
expectancy — computed with the SAME formula as
`apps/web/lib/modeled-trade-cost.ts` (`modeledTradeR`), including the
emission-time `costEstimatePct` when present.

### Reconciliation gate (must pass before any interpretation)

Recompute the whole-stream aggregates from the pulled CSV and match the
dashboard: resolved N (3,095 ± new resolutions since screenshot), gross
≈ +0.02R, cost ≈ 0.51R, net ≈ -0.49R. Mismatch beyond tolerance ⇒ stop,
diagnose the filter definition (`isCountedResolved`, sized-trade criteria),
do not interpret splits.

### Lookahead check

Assert for every classified signal that the newest candle used closed at or
before the signal timestamp. Any violation fails the run.

## Deliverables

- `scripts/research/regime-expectancy-study.ts` — CLI in the style of the
  existing `scripts/research/*` tools; raw outputs to gitignored
  `data/research/`.
- `docs/plans/2026-08-05-regime-expectancy-study.md` (this file) updated in
  place with a RESULTS section — same plan-doc-updated-in-place discipline as
  the slow-gate study.
- Verdict mapped through the decision rule, stating the next build.

## Out of scope

- Any product code change (apps/web untouched).
- Building the new strategy (separate project, chosen by the decision rule).
- Publishing the study on the site (decided after results exist).
- Broker execution / live trading changes.

## Risks

- Candle coverage gaps for non-crypto symbols → excluded-with-count, and the
  verdict is scoped to covered symbols only.
- Regime thresholds are researcher degrees of freedom → mitigated by
  pre-registering both ADX cuts + ER detector and reporting all of them.
- 53 days is one market episode; a positive bucket here is necessary but not
  sufficient — the decision rule therefore feeds a strategy build with its own
  walk-forward validation, not a live activation.
