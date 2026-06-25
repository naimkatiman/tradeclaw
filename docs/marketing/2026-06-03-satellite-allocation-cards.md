## Core / Satellite Allocation Cards (Satellite Strike Ch9)

This document maps the Satellite Strike Ch9 core/satellite framework onto the TradeClaw signal engine and its `packages/signals/src/allocation` model. It defines three investor profiles. Every win-rate, realized-RR, and decay figure below is quoted verbatim from the deterministic local metrics in `apps/web/data/strategy-decay-metrics.json`.

### Provenance (read first)

All performance numbers are LOCAL scanner/dev samples, computed by `scripts/compute-strategy-decay.py` over `scripts/signals.db` (scanner) and `apps/web/data/signal-history.json` (web Writer A/B). They are NOT the production Railway Postgres record and must not be presented as the live product's verified production track record. Production rolling metrics resolve via the Writer B cron once wired. Slippage is pending real data (no execution fills recorded locally, signal-time prices only).

### Strategy roster and conviction tiers

| Strategy | Sleeve | 90d win rate (local) | Realized RR (local) | Decay status (verbatim) | Sample |
|---|---|---|---|---|---|
| zaky_strategy | CORE only | 61.5% | mean 0.26 | healthy | n=208 |
| tradingview_screener | SATELLITE only | 45.2% | mean 0.71 | watch (all-sample 45.2% below 50.8% baseline) | n=177 |
| hmm-top3 | SATELLITE only (on watch) | 33.7% | mean -0.12 (pct) | watch (all-sample 33.7% below 50.8% baseline) | n=332 |

Baseline = 50.8%. Edge-decay flag fires when rolling-90d win rate < 25.4% (0.5x baseline, Satellite Strike Ch7). hmm-top3 sits below baseline with negative realized RR; it is the weakest performer and is confined to the satellite sleeve as the on-watch strategy. Its measured rolling-90d (33.7%) is still above the 25.4% hard auto-demote threshold, so `auto_demote` is false in the data file — the demotion here is a discipline decision, not an auto-trigger.

The CORE sleeve holds only the single highest-conviction healthy strategy, zaky_strategy (61.5%, healthy). All aggressive strategies — the tradingview_screener bulk scan, scalp variants, and the on-watch hmm-top3 — live ONLY in the satellite sleeve.

### Terminology alignment with the repo allocation model

These cards layer on top of, not replace, the regime engine. The regime allocator (`REGIME_ALLOCATION_RULES`) still caps `maxExposurePct`, `maxLeverage`, `maxSinglePositionPct`, and `allowedDirections` per regime, and applies tier weighting (Tier 1 = 1.0, Tier 2 = 0.8, Tier 3 = 0.6) and the volatility scaler. The core/satellite split is an outer envelope: it decides what fraction of equity each strategy class may consume before the regime allocator sizes any individual position.

### Profiles

Conservative — satellite 10%, per-trade risk 0.25%. Core (zaky_strategy) carries 90% of risk budget. Satellite is a single small probe.

Moderate — satellite 25%, per-trade risk 0.5%. Core 75%. Satellite may run tradingview_screener plus one scalp variant.

Aggressive — satellite 40% (Ch9 hard ceiling), per-trade risk 1.0%. Core 60%. Satellite may run the full aggressive set including the on-watch hmm-top3 at reduced size.

The satellite cap never exceeds 40% in any profile (Ch9). Drawdown ladders pause the satellite sleeve first and the core last, because the core is the only healthy edge.

### Drawdown discipline

Drawdown is measured against the high-water mark, consistent with `PortfolioState.drawdownPct` in `allocation/types.ts`. Each profile has an explicit cut-size-then-pause ladder. Satellite is always cut and paused before core.

### Monthly review

The Ch9.4.3 monthly review re-runs `compute-strategy-decay.py`, re-checks edge-decay flags against the 25.4% threshold, rebalances both sleeves back to target split, demotes any strategy that crossed into DECAYED, verifies the satellite cap is within 10-40%, and logs the discipline review. See the monthly_review_checklist field.
