# Phase 6a — Honesty Audit Findings

Date: 2026-06-13
Branch: `phase6-honest-regime-product`
Method: 7 read-only audit subagents, one per surface group (Task 1 of `docs/plans/2026-06-13-phase6a-honesty-sweep-plan.md`).
Status: complete — awaiting owner review before remediation (Task 3).

## Summary

~151 findings across 11 public surfaces. Counts by classification (approx):

| classification | count | meaning |
|---|---|---|
| already-honest | ~23 | declares provenance + N; no change |
| live-measured (missing N/date) | ~48 | real number, but no sample size or date range shown next to it |
| illustrative (label not inline) | ~30 | hand-authored; labeled only at section/hero level, not at the value |
| over-optimistic-framing | ~24 | real data shown misleadingly, OR a false "this is the real thing" claim |
| synthetic-fallback (weak label) | ~10 | simulated/estimated data with a missing or tiny label |
| unverifiable | ~14 | number cannot be traced to a source |

Per-surface totals: track-record ~44, results 30, benchmark 18, accuracy 16, allocation+ab-stats ~16, calibration 13, confidence+consensus ~14.

The single most honest surface is **calibration**. The single worst structural defect is the **track-record OG/embed inconsistency** (below). **benchmark** is a pricing/marketing page — its issues are marketing-claim honesty, not trading-measurement honesty (flagged separately for scope).

---

## Remediation priorities

### P0 — false claims and internal contradictions (fix first)

1. **track-record OG card + embed page use raw SQL that skips `isCountedResolved`** — they count auto-expired rows in the resolved denominator, so the social card and embed show a LOWER win-rate and different P&L than the page body, all under the same "Verified Track Record" banner. Two surfaces, same claim, contradictory numbers — this directly breaks "no hiding losses". Files: `apps/web/app/api/og/track-record/route.tsx:77-86`, `apps/web/app/embed/track-record/page.tsx:71-74`. Fix: route OG + embed through the same resolved-slice logic the page uses (`/api/signals/equity` or `getResolvedSlice`), so every surface shows identical numbers for the same window.
2. **"Verified" used 6+ times with no external verifier** — page title, OG heading, embed label, hero eyebrow, equity-curve heading, transparency note. Per decision 4, soften to "Recorded / Tracked … resolved against Binance/Yahoo OHLCV" everywhere. Files: `track-record/page.tsx:18,24`, `TrackRecordClient.tsx:552,1258`, `equity-curve.tsx:400`, `og/track-record/route.tsx:71`, `embed/track-record/page.tsx:64`.
3. **confidence page CODE_SNIPPET labeled "matches signal-generator.ts" but has wrong weights** — omits Volume, inflates MACD 20→25, and shows a `scaleConfidence` function the live calculator never calls. False "this is the real code" claim. File: `ConfidenceClient.tsx:149-157`. Fix: correct the snippet to the real weights, or drop the "matches" claim.
4. **consensus `trend24h` arrow is a deterministic char-code+hour formula**, not a real 24h change, rendered on EVERY row including live-sourced ones with no label. File: `ConsensusClient.tsx:38-42`, `consensus/route.ts:42-48`. Fix: label "algorithmically estimated, not a measured 24h change", compute a real trend, or remove.
5. **accuracy DataProvenanceBadge derived from the current 25-row page**, not full history — can show "Live verified" when the full record is "Mixed data". File: `AccuracyClient.tsx:171`. Fix: derive provenance from full-history stats.
6. **allocation Current Exposure / Headroom / snapshot come from a paper-trading demo account with no "demo" label** — a real-looking exposure % that is not live capital. File: `AllocationClient.tsx:166-167,187-193`. Fix: add a prominent "Paper / demo account" label.
7. **ab-stats "WINNING" badge fires on N=1** with no significance test or minimum sample gate. File: `ABStatsClient.tsx:95-98,117-119`. Fix: relabel "leading", add a min-impression gate, keep the existing "single-browser localStorage" caveat prominent.

### P1 — live-measured numbers missing N / date range

Add sample size (N) and date range adjacent to each. Concentrations:
- **track-record:** headline total return + win-rate (no "since <date>"), equity Sharpe (no N-days — a 5-day Sharpe looks like a 500-day one), avgRWin/avgRLoss/expectancy (no SL-subset N), per-symbol hit-rates, trailing-week band cards. Files across `TrackRecordClient.tsx`, `equity-curve.tsx`, `trailing-week-band-callout.tsx`.
- **accuracy:** win-rate, avg P&L, total P&L cards — no date range; "Avg Confidence" uses a DIFFERENT denominator (all records) than win-rate (resolved) — `AccuracyClient.tsx:208`; loss% bar is residual `100−winRate` not `losses/resolved` — `AccuracyClient.tsx:328`. Fix denominators + show N/date.
- **calibration:** Brier/ECE/win-rate cards have N but no date range — `CalibrationClient.tsx:257-273`.
- **consensus:** bullish %, buy/sell counts, avg confidences — no time window shown — `ConsensusClient.tsx:82-210`.

### P1.5 — real-but-thin data mislabeled as simulated

- **calibration / accuracy:** when 1–19 real resolved signals exist, the API sets `isSimulated: true` and the UI shows a "Demo data / simulated signal history" banner over REAL (thin) numbers. Files: `calibration/route.ts:112`, `CalibrationClient.tsx:243-251`, `accuracy` provenance. Fix: distinguish "insufficient live data (N=<n>)" from the true simulated case (N=0 catch-block fallback).

### P2 — illustrative labels not inline at the value

- **results:** page-level disclosure (hero badge, paragraph, disclaimer bar) is solid, but all ~27 rendered values — 5 MetricCards, the 5×5 comparison table, the PRNG equity curve (with hardcoded `Mar/Jun/Sep/Dec/Feb` axis labels implying real calendar data), the monthly heatmap — carry the "illustrative" tag only at section/hero level. A skim reader mid-page sees compelling green +41.3% / Sharpe 2.05 with no inline provenance. Fix: add an inline "illustrative" marker at the value/card/table level; watermark the PRNG chart.
- **confidence:** interactive calculator labeled weakly; presets ("Perfect Setup" rsi:95) not marked invented. `ConfidenceClient.tsx:79-93,229`.
- **synthetic-fallback weak labels:** consensus "ESTIMATED" badge is `text-[10px]` — easy to miss (`ConsensusClient.tsx:54-55`); allocation paper-account values unlabeled (see P0.6); calibration catch-block demo values labeled only in secondary text.

### Scope flag — benchmark

`benchmark` is a pricing/competitor-comparison page, not a trading-performance page. Its findings (the "$200/mo" headline that no listed SaaS matches; competitor prices with no source/date; "Join 1,000-star mission" implying a near-1000 star count; pre-written social posts asserting savings as fact) are real but are marketing-claim honesty, a different category from the measurement honesty that is the product moat. Owner decision: fold benchmark into Phase 6a, or split it into a marketing-honesty follow-up.

---

## Per-surface findings tables

### track-record (+ OG + embed)

Summary: already-honest 12 · live-measured 22 · over-optimistic-framing 10.

| metric / claim | file:line | data source | classification | required fix |
|---|---|---|---|---|
| title "Verified Signal Track Record" | page.tsx:18 | marketing claim | over-optimistic-framing | no external verifier; soften wording / define "verified" |
| OG desc "Real performance data / No hiding losses" | page.tsx:24 | marketing claim | over-optimistic-framing | claim weakened by gate/expired exclusions; add caveat |
| hero eyebrow "Verified Track Record" | TrackRecordClient.tsx:552 | copy | over-optimistic-framing | scope label or remove "Verified" |
| headline total return "+X%" | TrackRecordClient.tsx:561 | /api/signals/history totalPnlPct | live-measured | add "(since <date>)" adjacent |
| headline win-rate "X%" | TrackRecordClient.tsx:571 | /api/signals/history winRate | live-measured | show break-even win-rate at headline level |
| resolved-signals count | TrackRecordClient.tsx:583 | /api/signals/history resolved | already-honest | — |
| rolling 7d/30d/90d win rates | TrackRecordClient.tsx:633-658 | /api/signals/equity rollingWinRates | live-measured | label thin windows (7d on <7d data) |
| "Resolved" stat card | TrackRecordClient.tsx:822-828 | history resolved | already-honest | — |
| "Avg P&L" per resolved | TrackRecordClient.tsx:829-835 | history avgPnlPct | live-measured | co-locate N + date |
| "Total P&L" stat card | TrackRecordClient.tsx:836-842 | history totalPnlPct (raw sum) | live-measured | hint says "Sum at fixed 1R" but value is raw market pnl sum — mislabel; fix wording |
| "Streak" | TrackRecordClient.tsx:843-849 | history streak | already-honest | — |
| expired/gate-blocked/pending counters | TrackRecordClient.tsx:851-871 | history | already-honest | — |
| category win-rate (All/Majors/Thematic) | TrackRecordClient.tsx:363 | /api/signals/equity winRate | live-measured | n= shown; add date range |
| category expectancyR | TrackRecordClient.tsx:373-376 | equity expectancyR | live-measured | add date range |
| category break-even win-rate | TrackRecordClient.tsx:378-380 | equity breakEvenWinRate | already-honest | — |
| Pro scope banner | TrackRecordClient.tsx:769-773 | copy | live-measured | scope label, acceptable |
| broadcast disclaimer "recorded since 2026-06-10" | TrackRecordClient.tsx:728-729 | equity scope=broadcast | already-honest | — |
| per-symbol totalSignals | TrackRecordClient.tsx:993 | /api/leaderboard | already-honest | — |
| per-symbol hitRate4h/24h | TrackRecordClient.tsx:994-995 | /api/leaderboard | live-measured | add date range for selected period |
| per-symbol avgPnl/totalPnl | TrackRecordClient.tsx:999-1004 | /api/leaderboard | live-measured | N via row, ok |
| all-signals per-row P&L | TrackRecordClient.tsx:1168 | history outcomes 24h pnlPct | already-honest | OHLCV-sourced |
| all-signals "expired" label | TrackRecordClient.tsx:1164 | history | already-honest | — |
| pagination "X–Y of Z" | TrackRecordClient.tsx:1042 | history total | already-honest | — |
| transparency note (OHLCV providers) | TrackRecordClient.tsx:1255-1259 | resolution | already-honest | — |
| "No cherry-picking, no hidden losses" | TrackRecordClient.tsx:1258 | copy | over-optimistic-framing | smooth-outliers toggle weakens; add caveat |
| equity Total Return (compounded) | equity-curve.tsx:479 | equity totalReturn | live-measured | add date range |
| equity Max Drawdown | equity-curve.tsx:492 | equity maxDrawdown | live-measured | add N/date |
| equity Win Rate | equity-curve.tsx:511 | equity winRate | already-honest | break-even adjacent |
| equity Sharpe (annualized) | equity-curve.tsx:541 | equity sharpeRatio | live-measured | show N days (a 5-day Sharpe ≠ 500-day) |
| equity Avg R per Win/Loss | equity-curve.tsx:551-559 | equity avgRWin/Loss | live-measured | show SL-subset N |
| equity Expectancy | equity-curve.tsx:572 | equity expectancyR | live-measured | show SL-subset N |
| smooth-outliers (P95) toggle | equity-curve.tsx:449-462 | clips P95 of R-dist | over-optimistic-framing | flattering shareable curve; persist/label when active |
| trailing-week 7d returns (all/premium) | trailing-week-band-callout.tsx:123 | equity 7d | live-measured | surface "premium = conf≥85"; show window |
| trailing-week win-rate/expectancy | trailing-week-band-callout.tsx:129-141 | equity | live-measured | break-even + SL-subset N |
| OG "VERIFIED TRACK RECORD — 30 DAYS" | og/track-record/route.tsx:71 | hardcoded | over-optimistic-framing | "verified" + OG window (30d) differs from page default (all) |
| OG signal count (30d) | og/track-record/route.tsx:77 | raw SQL, NO isCountedResolved | live-measured | includes auto-expired — inconsistent with page |
| OG win rate (30d) | og/track-record/route.tsx:81 | raw SQL win_rate | over-optimistic-framing | denominator includes expired → differs from page |
| OG total P/L (30d) | og/track-record/route.tsx:85-86 | raw SQL total_pnl | over-optimistic-framing | sums expired rows → differs from page |
| embed "verified track record (30d)" | embed/track-record/page.tsx:64 | hardcoded | over-optimistic-framing | "verified" gap |
| embed signals/wins (30d) | embed/track-record/page.tsx:71 | raw SQL | live-measured | same denominator gap as OG |
| embed win rate (30d) | embed/track-record/page.tsx:73 | raw SQL win_rate | over-optimistic-framing | inconsistent with page |
| embed Σ PnL (30d) | embed/track-record/page.tsx:74 | raw SQL total_pnl | over-optimistic-framing | inconsistent with page; no N |
| equity heading "Verified against real market data" | equity-curve.tsx:400 | copy | over-optimistic-framing | reword to "resolved against Binance/Yahoo OHLCV" |

### results

Summary: already-honest 3 · illustrative 27. All numbers come from hand-authored `SEED_DATA` / `VALIDATION_SUMMARY` and PRNG-generated curves (`backtest-results.ts`). Page-level disclosure is solid; per-value inline labels are missing.

| metric / claim | file:line | classification | required fix |
|---|---|---|---|
| "Illustrative Examples" badge | ResultsClient.tsx:220-223 | already-honest | — |
| disclosure paragraph | ResultsClient.tsx:227-232 | already-honest | — |
| disclaimer bar | ResultsClient.tsx:261-264 | already-honest | — |
| example window dates | ResultsClient.tsx:237-239 | illustrative | inline qualifier |
| coverage strategy-runs (15) | ResultsClient.tsx:244 | illustrative | inline qualifier |
| coverage total trades (2,821) | ResultsClient.tsx:244 | illustrative | inline qualifier |
| coverage asset count (3) | ResultsClient.tsx:246 | illustrative | inline qualifier |
| weighted win rate (62.4%) | ResultsClient.tsx:251 | illustrative | inline qualifier |
| average Sharpe (1.50) | ResultsClient.tsx:251 | illustrative | inline qualifier |
| best Sharpe call-out (2.05) | ResultsClient.tsx:254 | illustrative | inline qualifier |
| best return (+41.3%) | ResultsClient.tsx:259 | illustrative | inline qualifier |
| avg drawdown (-13.8%) | ResultsClient.tsx:259 | illustrative | inline qualifier |
| MetricCard Total Return | ResultsClient.tsx:321-327 | illustrative | inline label on card |
| MetricCard Win Rate | ResultsClient.tsx:328-333 | illustrative | inline label on card |
| MetricCard Sharpe | ResultsClient.tsx:334-339 | illustrative | inline label on card |
| MetricCard Max Drawdown | ResultsClient.tsx:340-346 | illustrative | inline label on card |
| MetricCard Total Trades | ResultsClient.tsx:347-352 | illustrative | inline label on card |
| equity curve (PRNG) | ResultsClient.tsx:356-364 | illustrative | watermark chart body |
| equity curve date axis (Mar..Feb) | ResultsClient.tsx:143 | illustrative | axis implies real calendar — most misleading element |
| monthly returns heatmap | ResultsClient.tsx:369-381 | illustrative | per-cell qualifier |
| avg hold time | ResultsClient.tsx:386-394 | illustrative | inline qualifier |
| example period card | ResultsClient.tsx:395-404 | already-honest | labeled "Example Period" inline |
| comparison table Return/WinRate/Sharpe/MaxDD/Trades (5 cols × rows) | ResultsClient.tsx:455-469 | illustrative | table-level qualifier; emerald Sharpe highlight draws attention |

### accuracy

Summary: already-honest 5 · live-measured 6 · over-optimistic-framing 3 · synthetic-fallback 1 · illustrative 1 · unverifiable 1.

| metric / claim | file:line | data source | classification | required fix |
|---|---|---|---|---|
| Total Signals | AccuracyClient.tsx:197 | history records.length (incl pending/expired) | live-measured | clarify includes pending/expired |
| Win Rate | AccuracyClient.tsx:200 | history wins/resolved (isCountedResolved) | live-measured | show resolved N + date |
| Avg P&L | AccuracyClient.tsx:205 | history avgPnlPct | live-measured | show N/date |
| Avg Confidence | AccuracyClient.tsx:208 | history over ALL records (≠ win-rate denom) | over-optimistic-framing | align denominator / label |
| Wins / Losses | AccuracyClient.tsx:209-210 | history | live-measured | show date |
| Total P&L | AccuracyClient.tsx:213 | history flat sum | live-measured | "Total P&L" implies compounding; clarify |
| Resolved X/Y | AccuracyClient.tsx:216 | history | already-honest | — |
| win% bar label | AccuracyClient.tsx:327 | winRate | live-measured | N adjacent |
| loss% bar label | AccuracyClient.tsx:328 | 100−winRate residual | over-optimistic-framing | compute from losses/resolved; pending not shown |
| per-row confidence badge | AccuracyClient.tsx:527-529 | model-emitted | unverifiable | document meaning/calibration |
| per-row 4h/24h result | AccuracyClient.tsx:443-543 | resolveFromCandles | already-honest | labeled live/example |
| per-row P&L% | AccuracyClient.tsx:451 | resolveFromCandles/expired placeholder | synthetic-fallback | label expired rows in P&L cell |
| MetricMeta n=X | AccuracyClient.tsx:179 | resolved | already-honest | — |
| Recent Outcomes n shown | AccuracyClient.tsx:231 | display slice | already-honest | — |
| DataProvenanceBadge | AccuracyClient.tsx:171 | current 25-row page only | over-optimistic-framing | derive from full history |
| transparency note | AccuracyClient.tsx:504-508 | prose (refs JSON path; prod is Postgres) | illustrative | correct path; raise prominence |

### benchmark (pricing/marketing — scope flag)

Summary: illustrative 3 · over-optimistic-framing 5 · unverifiable 10. All from hand-authored `SAAS_OPTIONS`/`VPS_OPTIONS`/`FEATURE_ROWS` constants.

| metric / claim | file:line | classification | required fix |
|---|---|---|---|
| "$200/mo" headline | BenchmarkClient.tsx:205 | over-optimistic-framing | no listed SaaS = $200; ground or relabel |
| "$0 TradeClaw/mo" | BenchmarkClient.tsx:214 | illustrative | note "+~$4 VPS" |
| "Average SaaS/mo" | BenchmarkClient.tsx:218 | over-optimistic-framing | disclose N=4 curated plans |
| 4 SaaS prices | BenchmarkClient.tsx:235 | unverifiable | source + last-verified date |
| TradeClaw "$0 (or $4 VPS)" bar | BenchmarkClient.tsx:254 | illustrative | prominence |
| savings calculator output | BenchmarkClient.tsx:327 | unverifiable | source prices |
| "{freeVPSMonths} months of VPS" | BenchmarkClient.tsx:334 | illustrative | label $4/mo basis |
| 4 VPS prices | BenchmarkClient.tsx:42-45 | unverifiable | source + date |
| feature comparison rows | BenchmarkClient.tsx:60-70 | unverifiable | methodology/tier/date |
| feature-table cost row | BenchmarkClient.tsx:412-414 | unverifiable | source/date |
| "Join 1,000-star mission" | BenchmarkClient.tsx:539 | over-optimistic-framing | fetch live star count or remove |
| pre-written social posts ("saves me $X/yr") | BenchmarkClient.tsx:187-189 | over-optimistic-framing | unverified savings asserted as fact |

### calibration

Summary: live-measured 8 · over-optimistic-framing 1 · synthetic-fallback 1 · already-honest 3. The most honest surface.

| metric / claim | file:line | data source | classification | required fix |
|---|---|---|---|---|
| Total Signals | CalibrationClient.tsx:257 | /api/calibration isCountedResolved | live-measured | add date range |
| Overall Win Rate | CalibrationClient.tsx:261 | /api/calibration | live-measured | add date range |
| Brier + quality label | CalibrationClient.tsx:265-266 | /api/calibration | live-measured | N/date; document thresholds |
| ECE + verdict | CalibrationClient.tsx:271-273 | /api/calibration | live-measured | N/date adjacent |
| calibration curve | CalibrationClient.tsx:299 | per-bucket winRate | live-measured | bucket N drawn; add date |
| bucket "Actual" win rate | CalibrationClient.tsx:338 | /api/calibration | live-measured | N present; add date |
| bucket "Error" diff | CalibrationClient.tsx:341 | derived | live-measured | N present; add date |
| bucket "Status" badge | CalibrationClient.tsx:344-358 | derived (5pp threshold) | live-measured | show threshold inline |
| "Demo data" banner on 1–19 real signals | CalibrationClient.tsx:243-251 + route.ts:112 | real thin data | over-optimistic-framing | distinguish "insufficient live data (N=x)" from simulated |
| catch-block fallback demo values | CalibrationClient.tsx:173-188 | hardcoded | synthetic-fallback | raise label prominence per-card |
| footer "Updated:" | CalibrationClient.tsx:384 | data.updatedAt | already-honest | — |
| footer "N signals analyzed" | CalibrationClient.tsx:384 | totalSignals | already-honest | — |
| methodology + data-source line | CalibrationClient.tsx:375-378 | prose, toggles with isSimulated | already-honest | — |

### confidence + consensus

confidence summary: over-optimistic-framing 2 · unverifiable 2 · illustrative 3. consensus summary: live-measured 5 · synthetic-fallback 4.

| surface | metric / claim | file:line | data source | classification | required fix |
|---|---|---|---|---|---|
| confidence | live confidence score (giant number) | ConfidenceClient.tsx:229 | in-browser weighted sum | illustrative | prominent "interactive demo, not a live signal" label |
| confidence | tier thresholds (55..90) | ConfidenceClient.tsx:96-104 | hardcoded constants | unverifiable | cite verified commit/version |
| confidence | "+15% confluence boost / capped at 70" claims | ConfidenceClient.tsx:418-420 | prose | unverifiable | cite code path or remove |
| confidence | CODE_SNIPPET weights (RSI20/MACD25/EMA20/STOCH15/BB10) | ConfidenceClient.tsx:149-152 | hardcoded string ≠ actual INDICATORS | over-optimistic-framing | omits Volume, MACD wrong; "matches signal-generator.ts" misleading |
| confidence | scaleConfidence (48–95) in snippet | ConfidenceClient.tsx:155-157 | string; calculator never calls it | over-optimistic-framing | remove/correct |
| confidence | presets "Strong BUY"/"Perfect Setup" | ConfidenceClient.tsx:79-93 | hardcoded | illustrative | note presets are invented examples |
| confidence | per-indicator contribution bars | ConfidenceClient.tsx:332-334 | in-browser sum | illustrative | covered by page-level label |
| consensus | overallBullish % gauge | ConsensusClient.tsx:16 | /api/consensus H1+H4 | live-measured | show time window |
| consensus | total buy/sell signal counts | ConsensusClient.tsx:208-210 | /api/consensus | live-measured | show lookback window |
| consensus | per-asset buy/sell counts+% | ConsensusClient.tsx:82-93 | /api/consensus | live-measured | show window |
| consensus | per-asset avg buy/sell confidence | ConsensusClient.tsx:100-105 | /api/consensus | live-measured | show N averaged |
| consensus | trend24h arrow (every row) | ConsensusClient.tsx:38-42 + route.ts:42-48 | deterministic char-code+hour, NOT real 24h | synthetic-fallback | label "algorithmically estimated" or compute real |
| consensus | synthetic fallback counts/confidences | ConsensusClient.tsx:54-55 + route.ts:68-88 | deterministic seed | synthetic-fallback | "ESTIMATED" badge is text-[10px] — raise prominence |
| consensus | mostBullish/Bearish/Conflicted tickers | ConsensusClient.tsx:190-202 | signal pool | live-measured | show N (N=1 looks like N=20) |
| consensus | "updated every 60s from live signal engine" | ConsensusClient.tsx:177 + page.tsx:6 | partly false when synthetic active | synthetic-fallback | qualify "or estimated when live unavailable" |

### allocation + ab-stats

allocation summary: live-measured 2 · illustrative 4 · synthetic-fallback 3. ab-stats summary: live-measured 5 · over-optimistic-framing 3.

| surface | metric / claim | file:line | data source | classification | required fix |
|---|---|---|---|---|---|
| allocation | Active Regime label | AllocationClient.tsx:157-159 | /api/v1/regime DB | live-measured | show N symbols + detectedAt |
| allocation | Max Exposure rule values | AllocationClient.tsx:45-47 | hardcoded ALLOCATION_RULES (display mirror) | illustrative | "(policy rules — not fetched live)" note |
| allocation | Leverage rule values | AllocationClient.tsx:45-47 | hardcoded | illustrative | same |
| allocation | Max Position rule values | AllocationClient.tsx:45-47 | hardcoded | illustrative | same |
| allocation | Current Exposure % | AllocationClient.tsx:166-167 | /api/widget/portfolio paper-demo user | synthetic-fallback | "Paper / demo account" label |
| allocation | Headroom % | AllocationClient.tsx:187-188 | paper-demo vs hardcoded max | synthetic-fallback | demo label + denominator note |
| allocation | snapshot sub-line | AllocationClient.tsx:191-193 | paper-demo DB | synthetic-fallback | demo label inline |
| allocation | per-symbol regime tag | AllocationClient.tsx:279 | /api/v1/regime DB | live-measured | show detectedAt per card |
| allocation | per-symbol Max pos/Dir | AllocationClient.tsx:283-284 | hardcoded rules | illustrative | tooltip "policy rule, not live" |
| ab-stats | Total Impressions | ABStatsClient.tsx:74 | localStorage single-browser | live-measured | add first-seen date |
| ab-stats | Total GitHub Clicks | ABStatsClient.tsx:77 | localStorage | live-measured | add date |
| ab-stats | Overall CTR % | ABStatsClient.tsx:82-84 | localStorage, no min N | over-optimistic-framing | show N fraction; caveat below threshold |
| ab-stats | per-variant impressions | ABStatsClient.tsx:141-143 | localStorage | live-measured | add date |
| ab-stats | per-variant clicks | ABStatsClient.tsx:142-144 | localStorage | live-measured | add date |
| ab-stats | per-variant CTR % | ABStatsClient.tsx:93,149 | localStorage, no N gate | over-optimistic-framing | show N; suppress/caveat below 30 |
| ab-stats | "WINNING" badge | ABStatsClient.tsx:95-119 | max-clicks, fires on N=1 | over-optimistic-framing | "leading" + min-sample gate + no-stat-test note |
