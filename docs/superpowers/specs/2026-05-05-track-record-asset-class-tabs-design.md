# Track Record — Asset-Class Tabs (Display-Only Segmentation)

**Status:** Draft → pending user approval
**Owner:** Zaky
**Date:** 2026-05-05
**Related work:** Pro/Free scope tabs (2026-04-19), tier-segregation-delta

## Problem

`/track-record` pools 27 instruments across 5 asset classes (metals, crypto, forex majors, commodities, US stocks/ETFs) into one win-rate / total-return number. The same TA engine (RSI/MACD/EMA/BB/Stoch/ADX in `signal-generator.ts`) runs uniformly on Dogecoin and EURUSD. Pooling hides the gap: high-quality signals on liquid majors get averaged with noisy signals on low-liquidity narrative trades, dragging the headline number down and weakening the marketing pitch.

## Goal

Slice the existing track record into **All / Majors / Thematic** tabs on `/track-record` so each tab shows its own win rate, total return, equity curve, and per-asset table — without changing signal generation, filtering, or paper-trading execution.

This is **display-only segmentation**. Same signals get generated, same outcomes get resolved, same rows live in `signal_history`. The only change is server-side filtering by category before computing stats.

Out of scope (explicitly deferred):
- ⚠️ Deferred: gating signal generation by category (requires engine change — see "Follow-ups")
- ⚠️ Deferred: paper-trading bot category filter (requires execution-layer change)
- ⚠️ Deferred: splitting Thematic into AI Stocks / Alt Crypto / Forex Minors sub-tabs (do after we see real data per bucket)

## Asset Bucketing (v1)

Defined as a `category: 'majors' | 'thematic'` field on each entry in `apps/web/app/lib/symbol-config.ts`. The "All" tab is implicit — no filter applied.

**Majors (8 symbols)** — highest-liquidity institutional instruments
- Metals: XAUUSD
- Crypto: BTCUSD, ETHUSD
- Forex: EURUSD, GBPUSD, USDJPY
- Indices: SPY, QQQ

**Thematic (19 symbols)** — narrative-driven, lower-liquidity, more noise
- AI/Tech stocks: NVDA, TSLA, AAPL, MSFT, GOOGL, AMZN, META
- Alt crypto: SOLUSD, DOGEUSD, BNBUSD, XRPUSD
- Other metals/commodities: XAGUSD, WTIUSD, BNOUSD
- Minor forex: AUDUSD, USDCAD, NZDUSD, USDCHF

The full list of 27 = 8 majors + 19 thematic. The bucketing lives in code, not the database — change requires a deploy. That's intentional for v1; we'll move to a table only if we start A/B-ing buckets.

## Architecture

### Layer 1 — Symbol config (1 file, ~30 lines changed)

`apps/web/app/lib/symbol-config.ts`
- Add `category: 'majors' | 'thematic'` to each entry in `SYMBOLS`.
- Export a typed helper:
  ```ts
  export type SymbolCategory = 'majors' | 'thematic';
  export type CategoryFilter = 'all' | SymbolCategory;
  export const MAJORS_SYMBOLS: readonly string[];
  export const THEMATIC_SYMBOLS: readonly string[];
  export function symbolsForCategory(c: CategoryFilter): readonly string[];
  ```
- Single source of truth — every server/client filter reads from here.

### Layer 2 — API filter (2 routes touched)

Both routes already accept `?pair=` for single-symbol filter. Add an orthogonal `?category=majors|thematic|all` (default `all`).

**`apps/web/app/api/signals/history/route.ts`**
- Read `category` from `searchParams`.
- After loading history, filter `records` where `category !== 'all'` using `symbolsForCategory(category)`.
- Recompute `stats` from the filtered set (existing code already recomputes when `filtersApplied` — extend the gate to include the category filter).

**`apps/web/app/api/leaderboard/route.ts`**
- Read `category`. After fetching the cached leaderboard, if `category !== 'all'`:
  - Filter `data.assets` to those whose `pair` is in `symbolsForCategory(category)`.
  - **Recompute `data.overall`** from the filtered assets. Specifically:
    - `totalSignals` = sum of `assets[].totalSignals`
    - `resolvedSignals` = sum of resolved counts derived from the filtered subset (use existing logic — extract a helper `recomputeOverall(assets: AssetStats[]): LeaderboardData['overall']` in `signal-history.ts` and call it from both the original `computeLeaderboard` and this filter path)
    - `overallHitRate4h` / `overallHitRate24h` = weighted by `totalSignals` per asset
    - `totalPnl` = sum of `assets[].totalPnl`
    - `topPerformer` / `worstPerformer` = max/min by hit rate over the filtered set
    - `lastUpdated` = passthrough
  - Failing to recompute `overall` is the foot-gun here — the headline number on the page reads from `overall`, not from `.assets[]`. Get this wrong and Majors tab shows the All-tab headline.
- **Do not invalidate the underlying cache** — filter on the way out.

Cache key handling: leave the existing `period:sortBy` cache key alone. Category filter is post-cache; cheap (filter + recompute over ≤27 rows).

### Layer 3 — UI tab strip (TrackRecordClient.tsx, ~60 lines added)

Add a second tab strip below the existing Pro/Free scope tabs:

```
[ All ]  [ Majors ]  [ Thematic ]
```

State:
- `const [category, setCategory] = useState<CategoryFilter>('all');`
- Pass `category` into `fetchData`. Append to URLSearchParams when not `'all'`.
- Reset `offset` when category changes (mirror existing reset effect for `period/pairFilter/directionFilter/scope`).

Rules:
- Tab strip visible on **both** Pro and Free scopes. (Free × Majors = 4 symbols, Free × Thematic = 2 symbols. Small samples are fine — we already show small-sample warnings via existing `STAT_HINTS`.)
- Default tab: `All`. (Marketing default stays the existing headline number — we don't quietly inflate it.)
- Each tab gets its own short caption beneath the strip:
  - **All** — current copy (every symbol, full archive)
  - **Majors** — "8 highest-liquidity instruments. The cleanest read on strategy quality."
  - **Thematic** — "19 narrative-driven symbols. Wider coverage, more noise — useful for breadth, not for headline win rate."

### Layer 4 — Engine path: untouched

Confirmed against the load-bearing comment in workspace `CLAUDE.md`:
- `signal-generator.ts` → no change
- `ta-engine.ts` → no change
- `tracked-signals.ts` (Writer A) → no change
- `/api/cron/signals/route.ts` (Writer B) → no change
- `signal_history` schema → no change

The only thing that changes about `signal_history` is which rows get **read** by the two API routes when `?category=` is non-default.

## Data Flow

```
SYMBOLS (with category) ──┐
                          │
                          ▼
            symbolsForCategory(c) ──► used by both APIs as a Set<string> filter
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
    /api/signals/history     /api/leaderboard
    (filter records,         (filter assets,
     recompute stats)         recompute aggregates)
              │                       │
              └─────────┬─────────────┘
                        ▼
              TrackRecordClient
              (passes ?category= per tab)
```

## Edge Cases & Decisions

1. **Free tier × category tabs.** Allowed. The free symbol whitelist (`FREE_SYMBOLS` in `tier-client.ts`) intersects with each category — render whatever is in the intersection. If a category's intersection with `FREE_SYMBOLS` is empty (won't happen with current lists, but guard anyway), show an empty-state: "No free-tier symbols in this category."

2. **Pair filter + category filter together.** Pair filter wins (it's narrower). When `?pair=BTCUSD` is set, ignore `?category` server-side. Client should clear `pairFilter` when `category` changes (mirror existing UX patterns).

3. **Scope (Pro/Free) + category combine independently.** Both filters apply on the server: `scope=free` narrows to `FREE_SYMBOLS` and the 24h window; `category=majors` narrows further to the intersection. Order doesn't matter — both produce a `Set<string>` and the final filter is the intersection. The two tab strips are orthogonal axes in the UI.

4. **Period × category small samples.** A 7d × Majors window may have <10 signals. The existing leaderboard / track record UI already handles small samples without special-casing — keep that behavior.

5. **`SYMBOLS` is the source of truth, not `signal_history`.** If `signal_history` contains a row for a symbol not in `SYMBOLS` (e.g. a deleted instrument), it will never appear in Majors/Thematic — only in All. Acceptable: deleted symbols shouldn't pollute the curated tabs.

6. **Cache invalidation.** Not needed. Category filter is post-cache. Adding/removing a symbol from a category is a code change → deploy → restart → cache rebuilds. No runtime invalidation hook.

## Testing

Tight scope, no engine touch — keep tests proportional:

1. **Unit (Vitest)** — `symbol-config.test.ts` (new file)
   - `MAJORS_SYMBOLS.length === 8`, `THEMATIC_SYMBOLS.length === 19`
   - Every symbol in `SYMBOLS` has exactly one category
   - `symbolsForCategory('all')` returns all 27
   - `symbolsForCategory('majors')` and `'thematic'` are disjoint and union to all 27
2. **API unit tests** — extend existing route tests if any; otherwise add light integration tests:
   - `/api/leaderboard?category=majors` returns only majors in `data.assets`
   - `/api/signals/history?category=thematic` returns no records with `pair` in `MAJORS_SYMBOLS`
   - `?pair=BTCUSD&category=thematic` (conflict) → returns BTC records (pair wins, BTC is in majors)
3. **Manual smoke** — load `/track-record`, click each tab, verify:
   - Headline number changes
   - Equity curve redraws
   - Asset table shows only that category's symbols
   - URL doesn't break refresh (acceptable if category isn't in URL for v1 — see follow-ups)
4. **No E2E.** Display-only change with existing test coverage on the underlying APIs.

## Verification (post-merge)

After deploy, on `tradeclaw.win/track-record`:
- All tab matches the current pre-deploy headline (same number — proves no regression)
- Majors win rate ≥ All win rate (hypothesis check; if it isn't, the bucketing is wrong and we revisit before doing follow-ups B/C)
- Thematic win rate ≤ All win rate (corollary)

## Follow-ups (logged, not in this spec)

- ⚠️ Deferred: persist `category` in URL query string for shareability + page refresh
- ⚠️ Deferred: split Thematic into sub-tabs once we have ≥30 days of resolved outcomes per sub-bucket
- ⚠️ Deferred: paper-trading bot category filter (per-user toggle "trade Majors only")
- ⚠️ Deferred: signal-generation gating (drop high-noise symbols from the universe entirely) — requires audit of subscriber demand by symbol first

## Files touched (estimate)

| File | Change | Lines |
|---|---|---|
| `apps/web/app/lib/symbol-config.ts` | add `category` field + helpers | ~40 |
| `apps/web/app/api/signals/history/route.ts` | accept `?category` | ~15 |
| `apps/web/app/api/leaderboard/route.ts` | accept `?category` | ~15 |
| `apps/web/app/track-record/TrackRecordClient.tsx` | add tab strip + state | ~60 |
| `apps/web/app/lib/__tests__/symbol-config.test.ts` (new) | unit tests | ~40 |

Total: 5 files, ~170 LOC. Well under the 15-file / 500-LOC commit gate. Single concern (display-only category segmentation). Ships as one commit.

## Commit message (planned)

```
feat(track-record): segment by asset class (All / Majors / Thematic)
```
