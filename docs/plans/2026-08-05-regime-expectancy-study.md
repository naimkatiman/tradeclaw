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
- Staleness (added pre-registered before the corrected run, commit 98ced17b):
  a signal is classifiable only if its selected D1 bar closed within 7 days
  before the signal; older matches count as unclassified-stale.

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

---

## RESULTS (2026-08-05, run against production)

Runner: `scripts/research/regime-expectancy-study.ts` via `railway run`;
artifact `data/research/regime-study-2026-08-05.json` (gitignored).
Signal source deviation from this spec, decided before results existed: the
public CSV export lacks `cost_estimate_pct`, so the study reads
`signal_history` directly (read-only, `recost-segment.ts` pattern). The
reconciliation gate below is the proof the substitution is faithful.

### Reconciliation gate — PASS

| | study | dashboard (Aug 4) |
|---|---|---|
| counted sized trades | 3,157 | 3,095 (+ new resolutions) |
| gross expectancy | +0.0094R | +0.02R |
| avg modeled cost | 0.5113R | 0.51R |
| net expectancy | -0.5019R | -0.49R |

Dropped with counts: 5,552 rows whose 24h outcome object fails the counted
filter (force-expiry placeholders, legacy/non-observed provenance); 0
missing-SL. Simulated, gate-blocked, and unresolved rows are excluded
upstream in the SQL WHERE clause and are not part of this count.

netR here = avg(sized R − costR), where sized R is capped at ±8 (the equity
path's convention); gross uses uncapped R. Observed cap effect ≤0.0001R.

### Data-quality incident (fixed before interpretation)

The first run classified with a candle store whose D1 coverage ended
2026-06-09 — every later signal was silently classified against a stale June
bar (the tell: `adx25` and `er030` produced byte-identical tables). Fixes,
both pre-registered before the corrected run: D1 backfill through 2026-08-04,
and a 7-day bar-staleness guard (`unclassified-stale` is now a reported
category; corrected run shows 0). The Stooq FX/metals backfill path remains
blocked (fetched=0), so non-crypto pairs stay excluded-with-count.

### Coverage

1,162 of 3,157 counted signals classified (all crypto). 1,995 signals across
20 pairs EXCLUDED for missing D1 candles: 7 FX (USDCHF 204, AUDUSD 193,
USDCAD 190, NZDUSD 184, GBPUSD 132, USDJPY 132, EURUSD 112), WTIUSD 100,
metals (XAGUSD 92, XAUUSD 81), 10 US stocks (MSFT 77, AMZN 69, AMD 68,
TSLA 66, META 57, AAPL 55, NVDA 54, GOOGL 48, JPM 48, BAC 33). H1 verdicts
are therefore scoped to crypto; H2–H4 use the full counted stream.

EMA200 values near the window start carry residual SMA-seed influence from
the 320-bar lookback; uniform across buckets, so no bucket bias.

### H1 — regime split at entry: REFUTED

| variant | bucket | n | win% | grossR | costR | netR | conclusive |
|---|---|---|---|---|---|---|---|
| adx20 | aligned | 306 | 37.3 | +0.0979 | 0.9710 | -0.8732 | yes |
| adx20 | counter | 463 | 40.6 | +0.0965 | 0.7901 | -0.6936 | yes |
| adx20 | sideways | 393 | 36.6 | +0.0325 | 0.8214 | -0.7889 | yes |
| adx25 | aligned | 125 | 39.2 | +0.0972 | 0.6716 | -0.5744 | NO |
| adx25 | counter | 222 | 38.3 | +0.0381 | 0.6201 | -0.5820 | NO |
| adx25 | sideways | 815 | 38.3 | +0.0820 | 0.9376 | -0.8556 | yes |
| er030 | aligned | 102 | 32.4 | -0.0871 | 0.6796 | -0.7667 | NO |
| er030 | counter | 148 | 41.9 | +0.1290 | 0.7544 | -0.6254 | NO |
| er030 | sideways | 912 | 38.5 | +0.0847 | 0.8825 | -0.7978 | yes |

No bucket, under any detector, is net-positive — the best conclusive bucket
(adx20 counter) still loses 0.69R per trade. Trend alignment does not even
improve gross expectancy (adx20: aligned +0.098 vs counter +0.097; er030
aligned is negative). Note the crypto buckets' costR (0.62–0.97R) runs far
above the 0.51R blended average: crypto scalp stops are tightest relative to
round-trip cost, so the cost wall is highest exactly where the signals are
classifiable.

### H2 — inversion ("fade the crowd"): REFUTED

| stream | n | win% | grossR | costR | netR |
|---|---|---|---|---|---|
| original | 3,157 | 37.4 | +0.0094 | 0.5113 | -0.5019 |
| inverted | 3,157 | 62.6 | -0.0094 | 0.5113 | -0.5207 |

Flipping every signal is strictly worse. The counterparty winning these
trades is the cost model, not a smarter trader on the other side.
(Approximation: realized-R flip; TP/SL geometry not re-simulated.)

### H3 — cost vs stop width: CONFIRMED (the only live lever)

avgCostR scales 1/m with stop-width multiple m: 0.51R at 1× → 0.17R at 3× →
0.10R at 5× → 0.05R at 10×. At current M15 stop widths a trade must clear
+0.51R gross just to break even — 54× the stream's actual +0.0094R gross
edge. At 5–10× wider stops (D1-swing territory) breakeven drops to
+0.05..0.10R. Analytic rescale, not a re-simulation: outcome distributions at
wider stops are unknowable from this dataset.

### H4 — per-strategy: loss is structural, not one bad strategy

`classic` (n=3,018): gross +0.0133, net -0.5041. `hmm-top3` (n=139,
inconclusive): gross -0.0748, net -0.4541. No strategy in the stream has
positive net expectancy; the drag is the trade frequency/cost structure, not
a single strategy's signal quality.

### Verdict (pre-registered decision rule, branch 2)

Rule 1 fails: no trending-aligned bucket with N ≥ 300 is net-positive
(adx20 aligned, n=306, is -0.87R). Rule 3 fails: inversion beats nothing.
Branch 2 therefore governs: **the fix is horizon, not filtering.** Filtering
the M15 stream by regime cannot save it — the stream's gross edge (+0.01R) is
≈54× below its cost wall (0.51R), in every regime.

**Next build:** the D1 slow-gate strategy already validated in
`docs/plans/2026-07-18-slow-regime-gate-sandbox.md` (EMA200 gate long-only,
beat buy-and-hold on Calmar after costs in 3/4 folds), productized as a new
tracked strategy: D1 timeframe, trend-gated entries, wide ATR stops
(≥5× current relative width → costR ≤ 0.10), hard trade-frequency cap. Its
own walk-forward validation gates any live activation.
