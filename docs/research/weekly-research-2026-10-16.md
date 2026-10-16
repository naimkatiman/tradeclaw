# TradeClaw weekly research — 2026-10-16

Mode: weekly (propose only). Branch: `feat/premium-ui-overhaul` @ `2755c59e`, 82 behind / 93 ahead of `origin/main`. `origin/main` moved once since the last weekly: `9ecee0a0` (PR #232, 2026-10-14, "Ship read-only research desk and admin screening queue", 229 files, +138,295/−100).

Label convention, unchanged from the corpus: `[PRODUCTION]` = read from a live public GET today. `[SOURCE]` = read from a git ref, file and line cited. `[DERIVED]` = arithmetic shown. `[INFERRED]` = reconstructed, not read.

---

## The organizing fact of this week

**Every public "overall" accuracy number is computed over the most recent 10,000 history rows, not over the record. The window slides about a day per day, no endpoint says so, and last week's headline finding was built on treating it as cumulative.**

[SOURCE] `apps/web/lib/signal-history.ts:255` on `origin/main`: `export const SIGNAL_HISTORY_READ_LIMIT = 10_000;`. `readHistoryAsync()` (`:375-410`) reads `ORDER BY created_at DESC LIMIT $1` with that constant. `/api/calibration` (`route.ts:46`) and `/api/v1/win-rates` (`route.ts:35`) both call it with no `sinceMs`, then filter to counted-resolved rows. The cap was introduced in `40dd669c` (2026-07-15, "fix(integrity): require reproducible trading evidence") and is present at `51f94081`, the `main` that both the 09-18 and 10-09 weeklies measured against.

[PRODUCTION] The window is visibly sliding. Three reads of `/api/calibration`:

| Body | `updatedAt` | `windowStart` | `windowEnd` | span | total | wins |
|---|---|---|---|---|---|---|
| 10-09 weekly | 2026-10-08T22:49:42Z | 2026-06-16T00:30Z | 2026-10-08T20:45Z | 114.84 d | 7,487 | 2,692 |
| today, probe 1 (stale ISR) | 2026-10-15T01:31:16.820Z | 2026-06-23T21:00Z | 2026-10-15T01:00Z | 113.17 d | 7,634 | 2,767 |
| today, probe 2 (fresh) | 2026-10-16T00:26:46.545Z | 2026-06-24T17:45Z | 2026-10-15T20:45Z | 113.13 d | 7,668 | 2,777 |

[DERIVED] Between the two probes today, `windowEnd` advanced 19h45m and `windowStart` advanced **20h45m**. Week over week, `windowEnd` advanced 7.00 days and `windowStart` advanced **8.72 days**. A cumulative record cannot have a moving start. Timestamps decoded from the epoch-ms values the endpoint returns (e.g. 1782323100000 − 1781569800000 = 753,300,000 ms = 8d 17h 15m after 2026-06-16T00:30Z).

---

## Method

Ground truth first (`continuous-improvement:reconcile` + `safety-guard` discipline): branch and HEAD snapshotted, `git update-index --refresh` before reading drift, real drift via `git diff --stat` (130 files, +9272/−5343, byte-identical to the last 16 standups, untouched by this run), index empty, two August stashes on unrelated branches, `origin/main` fetched. HEAD re-verified immediately before commit.

Internal friction via `/continuous-improvement` and direct `git show origin/main:<path>` reads. External evidence via `WebSearch`/`WebFetch`. **Declared substitution, fifth consecutive run:** `/deep-research` and `/market-research` depend on firecrawl/exa MCP servers; `ToolSearch` for "firecrawl exa" returned neither in this headless session. Read-only on code throughout; no product file edited.

Scope check on PR #232 first, because a moved `main` could have fixed or invalidated carried items. [SOURCE] `git diff --name-only 51f94081 origin/main` matched none of `compute-strategy-decay`, `strategy-decay`, `calibration`, `ta-engine`, `signal-generator`, `d1-alpha`, `api/signals`, `signal-history`, `track-record`. Every carried mechanism below is unchanged in code.

---

## Proposal 1 — Disclose and then remove the 10,000-row window behind every public accuracy figure

**What is published.** [PRODUCTION] `/api/v1/win-rates` today: `overall` total **7,668**, wins **2,777**, `win_rate` **36.2**, `generated_at` 2026-10-15T23:35:58.211Z, 50 per-symbol entries. Its `methodology` object lists `horizon`, `population`, `excluded` ("simulated, gate-blocked, unresolved, force-expired, and legacy outcomes without approved source provenance") and `limitation`. **It contains no window, no start date, and no row cap.** The word "overall" is unqualified. `/api/calibration` does publish `windowStart`/`windowEnd`, but as two raw epoch integers with nothing stating that they are an artifact of a row limit rather than a chosen period.

**Integrity check before use.** [DERIVED] Fresh calibration body: bands 70–79 n=4,663 × 0.3707913360497534 = **1,729.000**, 80–89 n=3,005 × 0.3487520798668885 = **1,048.000**, both exact integers; 4,663 + 3,005 = 7,668 ✓; 1,729 + 1,048 = 2,777 ✓; 2,777/7,668 = 0.3621544 against published `overallAccuracy` 0.36215440792905584 ✓. `/api/v1/win-rates` reports the identical 7,668 / 2,777, which is expected: same reader, same filter.

**Why it matters.**
1. "Every trade verified" is a claim about the record. The published figure silently forgets every row older than ~113 days. [DERIVED] 10,000 rows over a 113.13-day span ≈ 88 raw rows/day; as signal volume rises the window shrinks, and nothing tells the reader.
2. It makes week-over-week comparison impossible without the reader knowing the start moved. Today's accuracy (36.215%) and last week's (35.956%) cover different populations; neither the rise nor any trend is claimed here.
3. It already misled this corpus. See Correction 1: the 10-09 weekly's 9.50-point "out-of-sample decline" was derived by differencing two capped snapshots.
4. [SOURCE] Other public readers use the same uncapped-looking call: `api/live/stats/route.ts:10`, `api/signals/accuracy-context/route.ts:16`, `api/v1/leaderboard/route.ts:13`, `feed.json`, `feed.xml`, `atom.xml`, `rss/page.tsx`, `lib/leaderboard-cache.ts`, `lib/weekly-digest.ts`, `lib/email-digest.ts`. `lib/wrapped-stats.ts:214` passes `sinceMs: Date.UTC(year, 0, 1)` but the same `LIMIT` still applies (`signal-history.ts:395`), so a "since January 1" figure is also capped. [INFERRED] Whether the year figure is actually truncated depends on how many non-simulated rows exist before late June; not measured this run.

Scope boundary, stated so it is not overread: `/track-record` labels its broadcast population as "gate decisions recorded since 2026-06-10" (`lib/product-i18n/track-record.ts:155-163`) and was not traced to this reader this run. `lib/full-risk-gates.ts:273` reads capped history but selects by `thresholds.lookback`, so the cap is plausibly harmless there; not verified.

**Ask (three parts, each shippable alone):**
1. **Disclose now.** Add `window: { start, end, rowCap: 10000, capBinding: true|false }` to every public payload that calls `readHistoryAsync()` without `sinceMs`, starting with `/api/v1/win-rates`, and render "most recent ~113 days" next to any "overall" figure. One shared helper, no data change.
2. **Remove the cap from accuracy aggregates.** Accuracy, Brier and band counts are sums. Compute them in SQL (`COUNT`/`SUM ... GROUP BY band`) over the full counted history instead of reading 10,000 rows into memory. The real cost is reproducing `isCountedResolved` (provenance, gate-blocked, force-expiry rules) in SQL; that is the design work, and it needs a parity test against the in-memory filter.
3. **Publish weekly cohorts by `created_at`.** A cohort table (week, n, wins, accuracy, per band) is the correct form of the out-of-sample series the 10-09 weekly tried to build by differencing. Cohorts do not shift when old rows leave a window.

Effort: part 1 small; part 2 medium (SQL parity with the TS filter); part 3 small once part 2 exists. Impact: high. This is the population definition under every accuracy number the product publishes.

Evidence: `signal-history.ts:255,375-410`, `api/calibration/route.ts:46,82-85`, `api/v1/win-rates/route.ts:35,82-87` (all `origin/main`); three live GETs above. External: GIPS requires that each presented data point clearly specify the period it covers and forbids presenting selected periods; partial periods are allowed only for inception or year-to-date ([GIPS Q&A database](https://www.gipsstandards.org/?p=4927); secondary summary at [pastpaperhero GIPS presentation notes](https://www.pastpaperhero.com/resources/cfa-level2-gips-standards-advanced-presentation-reporting-and-verification)). TradeClaw is not a GIPS firm and does not claim to be; the principle about labelling the measurement period is what transfers.

**Brand-alignment:** "Every trade verified" and "no cherry-picking" both require the reader to know which trades are in the number. A window the reader cannot see is selection, even when the selection rule is mechanical and nobody chose it for effect.

**Grill verdict:** SURVIVED. Objection one: "the cap is a performance guard, not a disclosure choice." Accepted, and the ask keeps a performance answer: aggregates belong in SQL, which removes the need for a row read entirely. Objection two: "calibration already publishes `windowStart`/`windowEnd`, so this is disclosed." Partly: two epoch integers are machine-readable, not disclosure, and `/api/v1/win-rates` publishes neither. Objection three: "a recent window may be the better metric." Possibly, which is why part 3 publishes cohorts. Either way the window must be chosen and labelled, not inherited from a constant named for something else.

---

## Proposal 2 — Decay monitor: ship the wall-clock freshness term alone (136 days stale)

Carried from 10-09 P1, narrowed to its smallest part. PR #232 did not touch `scripts/compute-strategy-decay.py` or `apps/web/data/strategy-decay-metrics.json`.

[SOURCE] Unchanged: `compute-strategy-decay.py:27` anchors the window at `max_ts − days`, so the window can never empty and `insufficient_sample` can never trip on staleness; `:39-40` demotes on win rate only. [DERIVED] Newest row 2026-06-02 → 2026-10-16 = **136 days** (28 + 31 + 31 + 30 + 16). `auto_demote: false` on all three strategies; hmm-top3's realized R is negative on mean and median (10-09 measurement, file unchanged since).

This week's P1 finding is the same defect class: in both cases the window is defined by whatever data happens to be present (newest timestamp here, newest 10,000 rows there) instead of by a declared period measured against `now()`. A monitor and a public metric built that way both stay quiet when the input stops changing.

**Ask, narrowed:** add `generated_at` and `data_age_days = now() − max_ts` to the artifact, and publish `stale: true` above a stated budget. Parts 2 (expectancy-based demote) and 3 (repoint at production outcomes) stay on the 10-09 record as owner decisions and are not re-argued here.

Effort: small (one script, two JSON keys, one badge). Impact: turns a silent 136-day outage into a visible one.

**Brand-alignment:** "auto-demote strategies that lose edge" is a public claim backed by a mechanism that cannot report that it has stopped seeing data. The cheapest honest fix is for the monitor to say how old its data is.

**Grill verdict:** SURVIVED. Objection: "this is the sixth weekly to carry the decay monitor." True, and that is why the ask is cut to its smallest shippable piece and the larger parts are explicitly not re-proposed. Objection: "the file is labelled LOCAL." Correct and intact; the public claim it supports does not carry that label.

---

## Proposal 3 — D1 alpha gate: two of four performance verdicts are now computable from the page, and both fail

Carried from 10-09 P4 / 09-18 P3, advanced by inputs that are now on the rendered page.

[PRODUCTION] `/track-record/alpha` today: latest bar **2026-10-15**, committed **2026-10-16T00:00:48.470Z**, 68 verified snapshots, ledger integrity **pass**, cadence gaps **0/0 PASS**, calendar days **67/365 OPEN**, consecutive snapshots **68/365 OPEN**, closed sleeve trades **0/12 OPEN**, strategy net **+8.22%**, benchmark net **+24.24%**, strategy max DD **9.93%**, Calmar **5.42 (benchmark 22.60)**, NAV **1.082 / 1.242**, positions BTCUSD LONG / ETHUSD LONG, **NOT-PROMOTED**. The page text states the strategy "underperformed its benchmark by 16.01 percentage points." Whether the benchmark Calmar was rendered on 10-09 and missed then, or is new, was not determined; PR #232 did not touch the alpha files.

**Identities re-checked.** [DERIVED] `snapshots` = `calendarDays` + 1: 68 = 67 + 1 ✓ (fourth confirmation). Strategy Calmar with the corpus's established `365/calendarDays` annualisation: 1.0822^(365/67) − 1 = 0.5377; 0.5377/0.0993 = **5.415** vs published 5.42 ✓.

**What the withheld verdicts would say** (non-binding, inputs as shown):

| Check | Inputs | Result |
|---|---|---|
| Calmar ≥ hold | 5.42 vs 22.60 | **FAIL** [DERIVED] |
| Active return ≥ 0 | 8.22 − 24.24 = **−16.02 pt** | **FAIL** [DERIVED] (page says 16.01; rounding on unrounded inputs) |
| Drawdown no worse than hold | strategy 9.93% vs benchmark ≈ **10.01%** | **PASS by ~0.08 pt** [INFERRED: benchmark DD backed out as (1.2424^(365/67) − 1)/22.60 = 2.2622/22.60 = 0.1001; not read directly] |
| Fourth performance check | not on page | not claimed |

Reported in full because one inferred check passes. Publishing only the two failures would be the cherry-pick in the other direction.

Movement since 10-09: strategy DD worsened **8.75% → 9.93% (+1.18 pt)**; active return moved −16.14 → −16.02 (**+0.12 pt**, flat). Calmar 7.69 → 5.42 is mostly the annualisation window moving (60 → 67 days), per the 09-18 counter-argument, and is not presented as a trend. **Zero exits in 67 days.** Both sleeves have been LONG since genesis; `closedTrades` 0/12 is tracking below even the ~8.4/yr historical yield in memory.

**Ask, unchanged in substance:** render the performance checks as a marked non-binding preview with inputs shown (two are now computable from data already on the page), and add a terminal `insufficient-activity` outcome so a rule that structurally cannot reach 12 closes resolves instead of sitting OPEN to day 365. The frozen rule is not touched. Effort: small. Impact: medium.

**Brand-alignment:** the page already prints the numbers that fail the gate. Withholding the verdict those numbers imply, while printing four observation checks as PASS/OPEN, selects which half of the evaluation the public sees.

**Grill verdict:** SURVIVED. Objection: "at day 67 of 365 any verdict is premature." That is why the ask is a non-binding preview and not promotion or demotion. Objection: "the drawdown pass is inferred from a rounded Calmar." Conceded and labelled; the sensitivity of the back-out to the rounding of 22.60 (±0.005) is ±0.02% relative, far below the 0.08 pt margin, but the benchmark DD itself was not read.

---

## Carried but deliberately not re-proposed

- **EMA200 published as the entry price** (09-18 P1, 10-09 P3). [SOURCE] `ta-engine.ts` and `signal-generator.ts` untouched by #232. [PRODUCTION] `/api/signals` today returned **count 0** with the note "TA engine fallback (live signals file not present — expected on Railway, written only by local Python scanner)". No sample was measurable today, so nothing new is claimed. Owner call from 10-09 stands.
- **D1 alpha stall alarm has no test** (09-18 P2). Unchanged; owner-side by contract.
- **Provenance badge unmounted on `/track-record` and `/calibration`.** Unchanged. Folds naturally into P1 part 1.

---

## Corrections

1. **Retracting the 10-09 weekly's headline (P2, "out-of-sample accuracy fell 9.50 points on 1,194 fresh signals").** That number was computed by subtracting the 09-18 snapshot (6,293 signals) from the 10-09 snapshot (7,487). [SOURCE] Both snapshots were produced by `readHistoryAsync()` under the 10,000-row cap, present at `51f94081`. So 7,487 − 6,293 = 1,194 is net window growth (rows added minus rows that aged out of the bottom), not a set of new signals, and 383/1,194 is not the accuracy of any defined population. The 09-18 artifact did not record `windowStart`, so the size of the dropped set cannot be reconstructed. **The 9.50-point decline is unsupported. It is not shown false; its direction is unknown.** The 10-09 run's objection two ("differencing assumes no backfill or restatement") flagged the right risk and then accepted it on the evidence that both band counts grew; growth is exactly what a sliding cap also produces. Illustration of why the method fails, using this week's numbers: 7,668 − 7,487 = 181 and 2,777 − 2,692 = 85 would give "47.0% on 181 fresh signals," a figure that describes nothing. It is shown here so it is never quoted.
2. **Retracting the 10-09 Correction 2 residue** ("`MIN_CALIBRATION_CONFIDENCE` = 0.5 against a 0–100 field is a dead guard or scale mismatch"). [SOURCE] `api/calibration/route.ts` maps `normalizeConfidence` (0–100 → 0–1) **before** the `>= MIN_CALIBRATION_CONFIDENCE` filter, and the comment at the bucket definitions documents exactly this fix. The guard is live and correctly scaled. The 10-09 run read the constant and the filter line but not the `.map` immediately above it.
3. **The 10-09 P2 text called `overallAccuracy` "one cumulative number"** while giving its 114-day window in the same proposal. It is a sliding window, not cumulative. P1 above replaces that framing.

---

## Findings that died under verification this run (recorded, not proposed)

1. **"PR #232 shipped a marketing pipeline that will publish headline backtest returns."** Dead. [PRODUCTION] `/api/research/intake` lists 61 candidates; of 4 replicated, verdicts are **0 PASS, 3 FAIL, 1 INCONCLUSIVE**, and every performance figure sits next to its verdict and the verbatim boundary "TradeClaw replication records are modeled historical research, not live performance or broker fills." [SOURCE] `docs/research/experiments/REGISTRY.md` records the +3,917.50% term-premium headline next to "VERDICT FAIL" and the failed holdout. This is the on-brand pattern, not a risk.
2. **"Propose that the live engine get the same FAIL-verdict treatment as external papers."** Killed before drafting: the OSS pivot already publishes "short-term loses after costs" (memory `oss-transparency-pivot`), and REGISTRY's 2026-08-05 entry records the live record at net −0.5019R. Re-proposing it would be the 08-21 "already shipped" error. The live page wording was not re-read this run.
3. **"Production signal generation is down" (from `/api/signals` count 0).** Not claimed. The payload labels the empty fallback as expected on Railway, and `/api/calibration`'s `windowEnd` advanced to 2026-10-15T20:45Z, so resolved signals are still being written.
4. **"The calibration endpoint has regressed again" (first probe `updatedAt` ~23h old).** Dead. Second probe returned `updatedAt` 2026-10-16T00:26:46.545Z. Third confirmation of the ISR behaviour in memory `calibration-endpoint-is-isr`. The stale body (7,634 / 2,767) is byte-for-byte the 10-15 standup's figure, which confirms that first-hit reads after idle return the previous day's body.

---

## Lessons and escalations

**State-file write re-tested this run, not inherited.** `gateguard-clear.mjs` returned `Cleared 1: c:/Users/User/.claude/loops/state/tradeclaw.STATE.md`; the retried append was refused with "Claude requested permissions to edit ... which is a sensitive file." Same two-layer block the 10-09 weekly predicted. Lessons are recorded here per contract.

### Lessons (durable)

1. **Before differencing two snapshots of an endpoint, read the query behind it.** A `LIMIT` turns "new minus old" into "added minus aged-out." The 10-09 run read the route but not the reader one call down; that one call held the cap.
2. **A window defined by the data is not a window.** `max_ts − 90d` (decay monitor) and `newest 10,000 rows` (public accuracy) fail the same way: neither can say what period it covers or report that its input stopped moving. Ask "what period, measured from `now()`?" of every rolling metric.
3. **Read the line above the filter.** The 10-09 run's "scale mismatch" died on a `.map(normalizeConfidence)` one line earlier. Reading the declaration was not enough; the data path into the comparison mattered as much.
4. **When a page gains or shows inputs, compute the verdicts they imply, all of them.** Two D1 checks fail and one inferred check passes. Reporting only the fails would have been as selective as the page's current omission.

### Escalations (owner decision required)

1. **NEW, highest: public accuracy is a silent 10,000-row sliding window** (P1). Owner calls: (a) ship disclosure metadata now; (b) authorize SQL aggregation over full counted history with a parity test; (c) publish weekly cohorts.
2. **NEW: the 10-09 weekly's 9.50-point decline is retracted** (Correction 1). Anyone who acted on it should know it is unsupported, not reversed.
3. **Decay monitor 136 days stale, structurally unable to report it** (P2, carried). Owner call: authorize `generated_at` + `data_age_days` as a standalone change.
4. **D1 alpha verdict preview** (P3, carried): at day 67, two computable checks fail, one inferred check passes, 0/12 closes, zero exits.
5. **EMA200 = entry price** (carried, not re-measurable today, code unchanged).
6. **D1 alpha stall alarm untested** (carried, owner-side).
7. **Fifth consecutive run without `/deep-research` / `/market-research` backends** (firecrawl/exa absent from the headless session). Owner call: provision them, or amend the contract to name `WebSearch`/`WebFetch` as the fallback.
8. **Branch divergence:** 82 behind / 93 ahead. Work arising from these proposals must branch from `origin/main`; this tree lacks the d1-alpha and decay files cited above and still carries the uncommitted `STATE.yaml` edit the 10-14/10-15 standups flagged as destructive against `origin/main`. Not touched by this run.

---

## Sources

- GIPS period-specification and no-selected-periods principle: [GIPS Standards Q&A database](https://www.gipsstandards.org/?p=4927), [pastpaperhero GIPS presentation and reporting notes](https://www.pastpaperhero.com/resources/cfa-level2-gips-standards-advanced-presentation-reporting-and-verification) (secondary)
- Production reads today: `https://tradeclaw.win/api/calibration` (two probes), `https://tradeclaw.win/api/v1/win-rates`, `https://tradeclaw.win/api/signals`, `https://tradeclaw.win/api/research/intake`, `https://tradeclaw.win/track-record`, `https://tradeclaw.win/track-record/alpha`
- Repo reads (read-only, `origin/main` unless noted): `apps/web/lib/signal-history.ts`, `apps/web/app/api/calibration/route.ts`, `apps/web/app/api/v1/win-rates/route.ts`, `apps/web/lib/full-risk-gates.ts`, `docs/research/experiments/REGISTRY.md`, `git log -S` on `SIGNAL_HISTORY_READ_LIMIT`, `git diff --name-only 51f94081 origin/main`; `docs/research/weekly-research-2026-10-09.md` and `apps/web/lib/product-i18n/track-record.ts` (working tree); `loops/state/tradeclaw.STATE.md`

## Status

**3 proposals.** P1 the 10,000-row sliding window under every public accuracy figure (**new**, and it retracts last week's headline). P2 the decay monitor's freshness term, narrowed to its smallest shippable part (carried, 136 days). P3 the D1 alpha verdict preview, advanced by inputs now on the page: two FAIL, one inferred PASS (carried). A fourth slot was deliberately left empty: the only candidate (live-engine verdict) was already shipped in substance.

**3 corrections**, the first retracting the 10-09 weekly's 9.50-point decline. **4 findings killed under verification**, including two that would have been false production alarms. **8 escalations, 2 new.**

Seeds: weak-pair suppression → P2; proof-chain / outcome provenance → P1; confidence calibration / expectancy transparency → P1 part 3. **Pro conversion funnel hardening is not proposed:** `/pricing` redirects to `/track-record` and migration `053_drop_monetization.sql` removed tiers (shipped OSS pivot); there is no funnel to harden.

**Propose-only compliance:** no product code edited, no test written, no migration, no deploy, no domain/claim/secret change, no PR opened, no write to Stripe or the signals table, no push to `main`, no force-push, no `git add -A`, no `--dangerously-skip-permissions`. Every number is read from a live GET, read from a cited line, or derived with arithmetic shown; the one inferred value (benchmark DD) is labelled. Single explicit pathspec commit.

**Grill verdict: SURVIVED**
