# Issue #53 (ATR-scaled stops) — disposition plan

**Date:** 2026-05-05
**Status:** Plan only — no code changes pending sign-off
**Trigger:** Daily intel 2026-05-04 item #5

## Reality vs. the issue

Issue #53 was filed against `scripts/signal-engine.py`, proposing a Python
calibration script (`scripts/calibrate-atr-multipliers.py`) and a JSON file
(`scripts/atr-multipliers.json`).

That entire path is gone:

- `scripts/signal-engine.py` is **deleted** per CLAUDE.md (was never invoked
  in production).
- `scripts/scanner-engine.py` is **local-only** — writes to local SQLite and a
  local JSON file. Never writes to Railway Postgres. Editing it changes nothing
  on tradeclaw.win.

The TS production path already implements per-symbol ATR-scaled stops:

| Concern | Where it lives today |
|---|---|
| Per-symbol multiplier search (grid over `[0.5, 0.75, …, 2.0, 2.5]`) | `packages/signals/src/atr-calibration.ts` → `calibrateAtrMultiplier()` |
| In-memory cache with TTL + cold-start fallback | `apps/web/app/lib/atr-calibration-cache.ts` → `getCachedAtrMultiplier()` |
| Cache warm-up at boot | `apps/web/instrumentation.ts` (Next.js register hook) |
| Periodic re-calibration | `apps/web/app/api/cron/prewarm/route.ts` |
| Wired into BUY signal generation | `apps/web/app/lib/signal-generator.ts:699` (`buyAtrMultiplier`) |
| Wired into SELL signal generation | `apps/web/app/lib/signal-generator.ts:763` (`sellAtrMultiplier`) |
| ATR telemetry per row (entry_atr, atr_multiplier) | migration `012_atr_telemetry.sql` + `signal_history` columns |

Conclusion: the spirit of issue #53 is **already shipped** in TS, with a more
sophisticated grid search than the Python proposal (uses real adverse
excursion telemetry from migration 012, not just hit/stop binary outcomes).

## What is actually broken (post-audit)

Three concrete gaps surfaced while auditing — none of these are in the issue.

### Gap 1: Two `DEFAULT_ATR_MULTIPLIER` constants disagree

```
packages/signals/src/atr-calibration.ts:61   → DEFAULT_ATR_MULTIPLIER = 2.5
apps/web/lib/execution/sizing.ts:19          → DEFAULT_ATR_MULTIPLIER = 1.5
```

Signal generation uses `2.5`, paper-trading position sizing uses `1.5`. A signal
emitted with a 2.5× ATR stop is sized as if it were 1.5× ATR — the dollar risk
on paper-trade orders is ~1.67× what the trader expects.

Fix: pick one canonical default, re-export from `@tradeclaw/signals`. Sizing
should not own its own ATR constant. Verify no caller of the sizing constant
is also doing its own multiplier math (would compound the error).

### Gap 2: Cold-start uses default for everything below the confidence floor

`getCachedAtrMultiplier()` returns `DEFAULT_ATR_MULTIPLIER` for any symbol
where the calibration result is `confidence === 'low'` — which means newly
added symbols and low-history symbols all get the same `2.5×` multiplier
regardless of asset class.

For a low-vol pair like EURUSD a 2.5× ATR stop is fine; for XAUUSD the same
2.5× will whip out on routine NY-open noise. Issue #53's instinct (per-asset
floors) was correct here.

Proposed fix: per-asset-class **default** floors in
`packages/signals/src/atr-calibration.ts`, applied only when calibration
confidence is `'low'`:

| Asset class | Default multiplier |
|---|---|
| Major FX (EURUSD, GBPUSD, USDJPY, AUDUSD) | 2.0 |
| Cross FX | 2.5 |
| Metals (XAUUSD) | 3.0 |
| Crypto majors (BTCUSD, ETHUSD) | 3.5 |
| Crypto alt | 4.0 |

These get **overridden** the moment a real calibration with `medium` or `high`
confidence is available (≥ MIN_CALIBRATION_SAMPLES outcomes). They do not
clamp the calibrated value — they only bias the fallback.

### Gap 3: Issue #53 is still open and misleading

The issue references a deleted file (`scripts/signal-engine.py`) and a
proposed artefact (`scripts/atr-multipliers.json`) that will never exist in
this codebase. Anyone reading the issue today will write the wrong patch.

Fix: close #53 with a comment pointing to `packages/signals/src/atr-calibration.ts`
and this plan doc. File a smaller issue for Gap 1 and Gap 2.

## Files this plan would touch

If approved, the implementation phases are:

**Phase 1 — Reconcile defaults (Gap 1)**
- `apps/web/lib/execution/sizing.ts` — drop local `DEFAULT_ATR_MULTIPLIER`,
  import from `@tradeclaw/signals`
- Verify with `rg "DEFAULT_ATR_MULTIPLIER"` — only one definition remains

**Phase 2 — Per-asset-class fallback (Gap 2)**
- `packages/signals/src/atr-calibration.ts` — add
  `getDefaultMultiplierForSymbol(symbol)` using `apps/web/app/lib/symbol-config.ts`
  asset-class metadata
- `apps/web/app/lib/atr-calibration-cache.ts` — replace bare
  `DEFAULT_ATR_MULTIPLIER` reads with the symbol-aware fallback
- Tests in `packages/signals/tests/atr-calibration.test.ts` covering all
  asset classes

**Phase 3 — Close out the issue**
- Comment on #53 with pointers, close
- File a follow-up issue per gap

## Verification before merging

1. **Backtest comparison** — run `runBacktest` from `packages/strategies/` over
   the last 90 days of `signal_history`, before and after the multiplier
   change, comparing per-symbol win-rate and EV. Output to
   `data/backtests/atr-stops-2026-05-05.json`.
2. **Smoke test** — generate signals for BTCUSD, EURUSD, XAUUSD locally, log
   the chosen multiplier and stop distance, confirm they match the new
   asset-class floor for cold-start symbols.
3. **No regression in win-rate columns** — `/api/cron/signals` continues to
   resolve outcomes; check the next 24h of new signals against the prior week.
4. **Build + type-check** — `npm run build -w apps/web` and the package build
   in `packages/signals/`.

## What I will NOT do

- Touch `signal-generator.ts` directly to add ad-hoc multipliers (that breaks
  the calibration abstraction)
- Resurrect `scripts/signal-engine.py` (CLAUDE.md says do not recreate)
- Add a JSON file at `scripts/atr-multipliers.json` (the cache is the source of truth)
- Bundle the three phases in one commit (per global rule: one concern per commit)

## Status — awaiting approval

This file is the plan. No code has changed. Approve to proceed with Phase 1.
