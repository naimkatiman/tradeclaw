# Phase 5 verdict — funding carry is real but compressed below deployability; cross-sectional momentum fails after costs

Date: 2026-06-13
Status: FINAL
Parent plan: `docs/plans/2026-06-13-phase5-carry-xsection-research.md`
Umbrella: `docs/plans/2026-06-10-engine-makeover.md`
Evidence: `docs/research/experiments/carry-validation-10majors-f4.json`, `docs/research/experiments/xsection-validation-30majors-D1-lb14-rb7-top5-f4.json` (both registered in `REGISTRY.md`, both determinism-verified byte-identical ex-meta).

---

## The question

Phase 4.5 closed single-asset OHLCV timing: nothing clears ~0.4% round-trip crypto costs. Its verdict ranked the two surviving candidates — (1) funding-rate carry, the strongest documented raw crypto edge, structural not timing; (2) cross-sectional momentum, cheap to test from existing OHLCV. The owner's call was to run BOTH in parallel under pre-registered gates and reconcile them into one ranked verdict. The gates were frozen in the design doc before any data was seen. This memo reports what they said.

---

## Track A — funding-rate carry

Method: 7,403 BTC funding events back to 2019-09 (10 majors total), delta-neutral short-perp/long-spot accounting, notional 1 on capital 2 (1 spot + 1 perp margin, **unlevered**), all yields reported on 2× deployed capital. Two-leg costs (0.70% per full round trip). Three pre-registered variants, no tuning. Gates: net yield > 8%/yr full-window AND > 5%/yr over the recent 24 months (the decay test) AND max drawdown < 10% AND ≥ 3/4 folds positive.

| Variant | Full-window yield (on 2× cap) | Recent-24mo | Max DD | Folds + | Gate |
|---|---|---|---|---|---|
| A1 always-on BTC | **+5.84%/yr** (+39.50% over 6.75y) | +2.35%/yr | 0.73% | 4/4 | **FAIL** |
| A2 threshold-gated (per symbol) | +2.51% to +6.78%/yr | — | — | — | **FAIL 0/10** |
| A3 top-3 rotation, weekly | −0.07%/yr | −6.11%/yr | 16.57% | 1/4 | **FAIL** |

**A1 is the load-bearing result, and it is the honest one.** The structural yield is real: +39.50% on unlevered 2× capital over 6.75 years, every one of the 4 folds positive, max drawdown 0.73%. This is not noise — it is a genuine, low-variance harvest. It fails on magnitude, not existence. At 5.84%/yr full-window it is below the 8% gate, and the decay arc is the whole story: fold 1 (2019→2021) +12.38%/yr, fold 2 +3.47%, fold 3 +4.55%, fold 4 (most recent) +2.36%/yr. The recent-24-month read of +2.35%/yr is below the 5% decay gate **and below passive stablecoin/treasury yield (~4–5%)**. The literature's warned-of compression of crypto basis into 2024–26 is now confirmed in our own registered data, not borrowed from a paper.

**A2 (threshold timing overlay) makes it strictly worse.** Trying to harvest only when trailing funding is hot adds 19–34 round trips per symbol; the resulting costs run 6.65%–11.90% of capital and eat the yield the timing was meant to protect. 0 of 10 symbols pass. The overlay is the problem, not the solution.

**A3 (chase the hottest funding) is pure churn.** Full-window −0.07%/yr, recent −6.11%/yr, drawdown 16.57%, only 1 of 4 folds positive. Gross funding income was 44.85% of capital; round-trip costs were 45.27% — turnover ate slightly more than the entire harvest. Weekly rotation across the top-3 funders destroys the very thing that makes A1 work (sitting still and collecting). (Folds, oldest→newest, on capital: +18.15%, −4.62%, −5.01%, −10.57% — the same decay arc as A1, but now net-negative once turnover costs are charged.)

Disclosed v1 limitations, both pointing the same direction: basis mark-to-market path risk and short-perp-leg squeeze/liquidation risk are not modeled. Modeling them makes carry **worse**, never better — so they strengthen the FAIL, they do not threaten it. The accounting is unlevered; a levered desk would multiply A1's yield, but it would multiply the risk identically, and the gates were registered on unlevered capital precisely so leverage cannot be used to manufacture a pass.

---

## Track B — cross-sectional momentum

Method: 30-major D1 universe (2,190 grid days), 14-day lookback trailing return, weekly rebalance, listing-date-aware eligibility. Costs 0.2%/side on actual turnover, charged identically to the benchmark. Gate benchmark is the equal-weight basket through the same machinery (beating zero is not the bar — rotation must beat passively holding the same universe, or it is churn). Two variants. Gate: beat the basket on total return AND Sharpe, with ≥ 3/4 folds of positive excess.

| Window | Variant | Return | Sharpe | vs basket return | Folds excess + | Gate |
|---|---|---|---|---|---|---|
| Full | B1 long-only top-5 | +1325.48% | 1.06 | basket +758.96% | 2/4 | **FAIL** |
| Full | B2 long-short | −12.64% | 0.46 | basket +758.96% | 2/4 | **FAIL** |
| Subwindow 2024-06→ | B1 long-only top-5 | −46.99% | 0.12 | basket −50.29% | 1/4 | **FAIL** |
| Subwindow 2024-06→ | B2 long-short | −12.15% | 0.35 | basket −50.29% | 4/4 | **PASS** |

**B1's full-window +1325% is a survivorship mirage.** It beats the basket's +759% in aggregate but fails fold stability (2/4): the entire excess lives in fold 1 (+1696.61% excess) and is negative or flat in the other three (−4.87%, −42.70%, +2.18%). That fold 1 is the 2020–21 launch-era bull run measured over today's hand-picked 30 survivors — exactly the bias the spec disclosed. The bias-mitigated subwindow (2024-06→, all 30 listed) is −46.99% vs basket −50.29%, only 1/4 folds positive. Outside the flattered early window, B1 does not beat passive holding.

**B2's subwindow PASS is reported because the gate was frozen — and it is the single most important honesty point in this memo.** The pre-registered gate (beat the basket on return AND Sharpe + ≥3/4 folds) was genuinely met: B2 returned −12.15% against a basket that crashed −50.29%, with 3 of 4 folds of positive excess (per-fold excess −95.38%, +30.04%, +16.40%, +23.76%). But a dollar-neutral book that **loses 12% of capital** is not deployable. It "won" by losing less than a one-directional benchmark that has no business being the yardstick for a market-neutral strategy — the correct benchmark for a dollar-neutral book is cash/zero, against which B2 fails outright (−12.15% < 0). This is a registered gate-design lesson: the equal-weight basket is the right benchmark for a long-only rotation (B1) and the wrong benchmark for a long-short book (B2). Per the no-retro-tuning rule, the gate stays frozen, the PASS is reported as the gate computed it, and the verdict treats B2 as **NOT deployable**. The lesson ships as a lesson, not as a quiet threshold edit.

---

## The conclusion

With Phase 4.5 and Phase 5, every edge candidate that fits the **retail crypto cost structure** is now a registered dead end:

- single-asset OHLCV timing — momentum/mean-reversion, any timeframe, wide targets, flip-exit (Phase 4.5);
- funding-rate carry — real raw yield, compressed below passive and below the gate; timing/rotation overlays cost-killed (Phase 5A);
- cross-sectional momentum — survivorship-flattered in-aggregate, fails out-of-sample and on fold stability; the one "pass" is a benchmark artifact (Phase 5B).

The common killer is the **cost denominator**: 0.2%/side perp, 0.70% two-leg carry round trip, against edges that have compressed hard into 2024–26. Carry is the one candidate whose raw structural edge genuinely exists (A1: low-variance, all-folds-positive, +39.50% over the window) — but its blocker is not cost, it is **decay**: the recent 24-month harvest is +2.35%/yr, below what a stablecoin pays. Cutting costs would not rescue it (A1 pays a single round trip over the whole window; halving it moves 5.84% by basis points). Only leverage would lift the magnitude, and leverage was deliberately excluded from the gate because it lifts risk in lockstep.

Two honest paths remain, and neither is "ship a timing or yield signal as if it has edge":

1. **Change the cost denominator** — maker/VIP/institutional execution where the round-trip is a fraction of retail. Out of scope for the current product, and it only helps the cost-killed variants (A2/A3, the momentum books), not A1, whose blocker is decay.
2. **Stop selling signals and sell what the bench actually validated** — regime context plus honest, cost-adjusted measurement. This is Phase 4.5's option 3, and it is now backed by three independent registered eliminations instead of one.

---

## Strategic options (ranked)

### 1 — Reposition to a regime-context product (recommended; Phase 4.5 option 3, now triply-evidenced)

Sell the regime engine's market-context output and the honest measurement bench, not "winning signals" or "structural yield." The case is materially stronger than when first proposed: the product's credibility is precisely that the bench killed single-asset timing, funding carry, and cross-sectional momentum **before a customer saw any of them**. That is a defensible, due-diligence-surviving story. Lower revenue ceiling than a signal/execution product, but it is the only framing the evidence supports.

### 2 — Cost-structure change, THEN re-test (carry only, narrow conditions)

If institutional/maker execution ever becomes available, re-test A2/A3 carry there — they are cost-killed, not edge-less. Do NOT expect this to rescue A1: A1's blocker is decayed recent yield, not cost. A carry product would additionally require leverage to reach a meaningful magnitude, and Phase 5.5 would first need to measure the basis path risk and short-leg squeeze risk this v1 explicitly did not model. This is a real-money, real-risk engineering effort gated on an execution relationship the product does not currently have.

### 3 — Accept nothing; keep the bench as a kill-test for future candidates

The validated edge-vs-noise harness (regime engine + costed carry/momentum/timing simulators + frozen-gate discipline) is the durable asset across all of Phases 2–5. Its job is to kill bad strategies cheaply. Hold it ready for the next candidate (a new data source, a cost-structure change, a different asset class) and ship nothing until something clears.

Phase 5 execution/webhook go-live (umbrella "Phase 5 — Execution hardening") **stays gated on edge that does not exist.** No timing signal, no carry product, no rotation product ships on this evidence.

---

## Recommendation

Reposition to the regime-context-and-honest-measurement product (option 1). Funding carry is the only candidate with a real raw edge and is worth a single sentence in the product narrative — "we tested delta-neutral carry against frozen gates and it has compressed below passive yield since 2023" is itself a credible, differentiated claim. But carry is not a deployable product on retail execution at unlevered scale, and the cross-sectional and timing engines are dead. The product narrative must shift fully away from "we have winning signals / structural yield" and toward "we have a validated bench that tells you what is and is not real, and an honest forward record of it."

The durable asset is the bench. Phase 6, if any, is a positioning decision, not another backtest.
