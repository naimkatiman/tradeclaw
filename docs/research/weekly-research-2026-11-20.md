# TradeClaw weekly research — 2026-11-20

Mode: weekly (propose only). Branch: `feat/premium-ui-overhaul` @ `729308f1`, even with its upstream, 82 behind / 185 ahead of `origin/main` (`rev-list --left-right --count` after `git fetch origin`). Remote `main` is still `9ecee0a0` (PR #232, 2026-10-14). None of the three 11-06 proposals has landed.

Label convention, unchanged: `[PRODUCTION]` = read from a live public GET today. `[SOURCE]` = read from `9ecee0a0` (origin/main), file and line cited. `[DERIVED]` = arithmetic shown. `[INFERRED]` = reconstructed, not read.

---

## The organizing fact of this week

**Which signals count in the public win rate partly depends on which writer inserts the row first. The rule alone does not decide it.** The full-risk gate removes 1,832 of the 10,000 rows in the public window from every counted figure. It is evaluated only when the request path writes a row. When the cron writes the row first, that row is never gated, and no later write can flip it. The 11-06 weekly also said no named risk control fires in production. That was wrong. This gate fires on 18% of rows, and nobody has measured whether it helps.

---

## Method

Ground truth first. `continuous-improvement:reconcile` is not installed for loop sessions (the 11-19 daily recorded `Unknown skill` five days running), so the contract fallback ran instead: `git status --short --branch` (clean, even with upstream), `git rev-parse HEAD`, `git fetch origin`, `rev-list`. `safety-guard` ran first in guard mode. Writes were held to this file, and no destructive command ran.

Internal friction came from read-only `git show 9ecee0a0:<path>` and `git grep 9ecee0a0`. Production reads came from `WebFetch` GETs of `https://tradeclaw.win/api/signals/history`. PowerShell aggregation over the public CSV was refused by the harness: script blocks are not allowed, and writing to %TEMP% is out of scope. A `WebFetch` count over the CSV truncated at about 1,000 rows, and its per-class counts contradicted the row-level listing, so **it is discarded and none of its numbers appear below**. Every outcome count in this doc comes from one 60-row JSON page that was listed row by row and tallied by hand.

`/deep-research` and `/market-research` were not invoked. Their firecrawl/exa backends were unconfirmed on the previous seven runs, and this run held the 80-turn budget for code and production verification. The external sources are carried from the 11-06 run, where they were fetched and checked. They were not re-fetched today.

**This weekly covers 11-07 to 11-20.** The 11-13 weekly crashed (`weekly-2026-11-13_0800.log` line 2: `claude exit=-1073740791`, 0xC0000409, with no quota line). That is the crash variant in memory `loop-quota-death-is-not-a-project-failure`, not a project failure. No backfill was attempted.

---

## Proposal 1 — Whether a signal is gated depends on which writer inserts it first. Make the gate one stamped decision per bar

**What the code does.** [SOURCE]
- `apps/web/lib/tracked-signals.ts` (request path, "Writer A"): calls `fetchGateState()`. When `TRADECLAW_GATE_MODE=active` and `gatesAllow` is false, it stamps **every** row in that call `gateBlocked: true` with `gate.reason`, then calls `recordSignalsAsync`.
- `apps/web/app/api/cron/signals/route.ts:400` (cron, "Writer B"): calls `recordSignalAsync(...)` with the `gateBlocked` / `gateReason` positions `undefined`. `signal-history.ts` binds that as `args.gateBlocked ?? false`. The cron never calls `fetchGateState`.
- `signal-history.ts:584,640,675,703,725`: every `ON CONFLICT (id) DO UPDATE` sets `strategy_id`, broadcast, and calibration columns only. **No path updates `gate_blocked` or `gate_reason` after insert.**
- `signal-history.ts:56-61`, `isCountedResolved`: `if (r.gateBlocked) return false`. A gated row is removed from win rate, P&L, equity, streak, and calibration.

[DERIVED from the above] A row written first by the cron is permanently ungated. A row written first by a page view carries whatever the 60-second-cached gate state was at that moment. Request-path writes also happen per call, so a symbol-filtered `/api/signals?symbol=X` view records only symbol X, at that request's gate state.

**What production shows.** [PRODUCTION] `/api/signals/history?limit=60&offset=900`, read today. All 60 rows carry an observed `market-data-hub` 24h outcome. They span 2026-11-10T19:30Z to 11-11T11:30Z. The gate is portfolio-wide and all-or-nothing within one call, so one evaluation per bar would give every row in a bar the same flag. Fourteen bars on the page have two or more rows:

| Bar (UTC) | Rows | Gated | Not gated |
|---|---|---|---|
| 11-11 08:15 (`…MWBUFU00`) | 4 | XAGUSD SELL, EURUSD SELL | XAUUSD SELL (+0.27%), USDCAD BUY (+0.16%) |
| 11-10 23:00 (`…MWBAM3K0`) | 2 | EURUSD BUY | SOLUSD BUY (+0.85%) |
| 11-10 20:00 (`…MWB46M80`) | 5 | NVDAUSD, AUDUSD, NZDUSD, SOLUSD (all BUY) | XAGUSD BUY (+1.18%) |
| 11-10 19:30 (`…MWB341C0`) | 2 | NVDAUSD BUY, XAGUSD BUY | — |
| 10 other bars | 22 | — | all 22 |

Three of the four bars that contain a gated row are **mixed**. All four counted rows that sit beside gated rows in the same bar were wins, and they are inside the published win rate. Their gated neighbours are outside it. Every gated row on the page carries the same reason: `streak_blocked: 2/2 consecutive losses (regime=volatile)`.

[INFERRED] There are two possible mechanisms, and the code supports both: cron-first inserts, or separate request-path calls made under different gate states while the bar was live. This run did not separate them, because the public row does not show which writer inserted it. Either way, one bar's signals are split between counted and uncounted by write order and timing, not by one gate evaluation.

**Ask (each part ships alone):**
1. **One gate decision per cron tick.** Evaluate `fetchGateState()` in `cron/signals` before persistence, next to `computeBroadcastDecisions`. Stamp `gate_blocked` / `gate_reason` on every candidate in that tick. Add `gate_blocked` and `gate_reason` to the `ON CONFLICT` set with "cron decision wins", so a request-path insert cannot leave a bar half-gated.
2. **Stamp the evidence, not only the verdict.** Persist the `GateState` snapshot the decision used (`streakLossCount`, `currentDrawdownPct`, `regime`, `effectiveDrawdownThreshold`, `dataPoints`) on the row or in `gate-log`. That makes the exclusion reproducible from public data.
3. **Owner query, before any change:** the share of the 1,832 gated rows whose bar also contains counted rows, and the counted win rate of those same-bar neighbours. If the neighbours win more than the counted base, the current headline is flattered by write-order selection. The size and sign of that effect are **pending real data**.

Effort: small to medium. One gate call in the cron, one conflict-clause change, one snapshot column or log field, and a regression test showing that a request-first insert followed by a cron upsert gives a uniform flag per bar. Impact: high. This decides which trades are in the record at all.

**Brand-alignment:** "Every trade verified" and "no cherry-picking" require the rule that removes a trade from the record to be one deterministic, inspectable decision. Today it can depend on whether a page view beat the cron.

**Grill verdict:** SURVIVED. Objection one: "the gate state can legitimately change inside a 15-minute bar." It can. But then the published record must still say which state applied, and it doesn't (ask 2). A tick-level decision removes the ambiguity either way. Objection two: "one page is 60 rows." True, and the ask is the owner query over all 1,832. The page shows the mechanism, not its size, and no size is claimed. Objection three: "the mixed bars might come from the scanner and TA engine producing different ids." Every row in each mixed bar shares one id suffix (`MWBUFU00`, `MWB46M80`, `MWBAM3K0`), so they came from one generator pass.

---

## Proposal 2 — The live circuit breaker removes 18% of rows from the record and has no published counterfactual. Publish blocked-versus-passed, with a pre-registered keep-or-retire rule

**Correction to the 11-06 weekly, P3.** It said that, apart from the D1 stop, no risk control the brand names fires in production. That is wrong. [SOURCE] `apps/web/lib/full-risk-gates.ts` implements a regime-keyed streak and drawdown breaker over the newest resolved 24h outcomes, portfolio-wide: trend 4 losses / 15% DD / 30 lookback, volatile 2 / 5% / 15, range 3 / 10% / 20. [PRODUCTION] It is active: the newest row today is `SIG-AUDUSD-M15-BUY-MWO897S0` with `gateBlocked: true` and `streak_blocked: 3/3 consecutive losses (regime=range)`, and the window holds `gateBlocked: 1832`. The 11-06 table checked the `risk-pipeline.ts` `CircuitBreakerEngine` (still 0 evaluations: `broadcastBlockReason` on the same row reads `risk_account: Risk paper account unavailable; configure RISK_PAPER_USER_ID`) and missed this separate mechanism. That table's conclusion is retracted. The site still makes no public claim either way (11-06 `git grep`, unchanged on `main`).

**Why it needs a counterfactual.** [PRODUCTION] `/api/signals/history?limit=1` stats: resolved 8,063, wins 2,881, win rate 35.7%, gate-blocked 1,832 of 10,000. [DERIVED] At a 35.7% win rate, if outcomes are independent, the probability that the newest N resolved outcomes are all losses is 0.643^N: **41.3%** for N=2 (volatile), **26.6%** for N=3 (range), **17.1%** for N=4 (trend). A streak gate on independent outcomes would therefore fire about as often as this one does (1,832 / 10,000 = 18.3%) without selecting worse trades. The gate earns its exclusion only if losses cluster. This run did not test whether they do.

**The only measured sample.** [PRODUCTION, the P1 page, 60 rows, 11-10T19:30Z to 11-11T11:30Z] Gated: **6 wins / 12**, summed 24h P&L **+6.23%** (−0.26, +0.22, +0.16, −0.07, −0.07, −1.17, +3.54, +0.28, −0.13, −0.91, +3.69, +0.95). Not gated: **26 wins / 48** (54.2%). On this page the gate removed a 50% win-rate set from a 54% one, and it took out the page's two largest winners (NVDAUSD BUY +3.54% and +3.69%). **That is one page, all from one regime, and it supports no conclusion about the gate.** Its use here is to show the counterfactual can already be computed from public rows: gated rows keep observed outcomes because `selectResolvedForGate` deliberately includes them to avoid the April deadlock (`full-risk-gates.ts`, comment above `selectResolvedForGate`).

**Ask:**
1. **Pre-register the keep-or-retire rule before measuring.** For example: keep the gate only if the gated set's 24h expectancy is below the passed set's, with the interval excluding zero, over at least 1,000 gated rows. Otherwise retire it and count all rows. Write the rule into `/methodology` first.
2. **Publish the counterfactual as a standing line** on `/track-record` and in the history `stats`: gated n, win rate with a Wilson interval, mean 24h P&L, and the same for passed rows, split by `gate_reason` prefix (`streak_blocked` / `drawdown_blocked`) and regime. Every input is already stored.
3. **Fix P1 first.** The comparison is only clean once the gate decision is one stamped evaluation per tick.

Effort: small for part 2 (a read-only aggregation over columns the route already loads; `stats.gateBlocked` already counts the rows). Part 1 is an owner decision and one methodology paragraph. Impact: high. This is the only risk control that currently shapes the public record, and the brand names "disciplined risk management" as a pillar.

Evidence: the code and probes above. External, carried from 11-06 and not re-fetched: choosing a filter after seeing its results is the selection problem in [Bailey, Borwein, López de Prado, Zhu, "The Probability of Backtest Overfitting", Journal of Computational Finance (2015)](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting), which is why ask 1 comes before ask 2. As a principle, not a jurisdictional claim: [SEC Rule 15c3-5](https://www.sec.gov/rules-regulations/2011/06/risk-management-controls-brokers-or-dealers-market-access) requires "regularly reviewing the effectiveness" of risk controls.

**Brand-alignment:** "Disciplined risk management" and "measurable proof over marketing spin" mean the breaker reports its own effect. If it removes winners as often as losers, the record should say so and count them.

**Grill verdict:** SURVIVED. Objection one: "publishing that the gate removed +6.23% invites killing it on one page." The ask pre-registers the rule and sets a 1,000-row floor before anyone reads the full result. The page is labelled as supporting no conclusion. Objection two: "the gate exists to stop a bleeding streak, and expectancy is the wrong test." Then pre-register drawdown avoided as the test instead. Either way, the number is published, not assumed. Objection three: "this re-proposes 11-06 P3." It doesn't. 11-06 P3 audited a pipeline that never runs. This proposal concerns a different mechanism that runs constantly, and it retracts 11-06's conclusion about it.

---

## Proposal 3 (small) — Signals issued on the last bar before a market closes are recorded and never graded. Stop recording them, or grade them on market time

**What the code does.** [SOURCE] `cron/signals/route.ts`, `collectNewSignals`: the only market check is `if (!isMarketOpen(sig.symbol)) continue;` at record time. `resolveOldSignals` grades over wall-clock windows (`c.timestamp > record.timestamp && c.timestamp <= record.timestamp + 24h`). When that window holds no candles, it writes the `force-expired` placeholder (`pnlPct: 0, hit: false`) after 2× the horizon. `isRealOutcome` rejects that placeholder, so the row leaves every counted figure and lands in `stats.expired`.

**What production shows.** [PRODUCTION, 11-19 daily probe] There are 10 `force-expired` rows in the newest 800, **all of them Friday last-batch rows**: 11-13 EURUSD, AUDUSD, AMZNUSD; 11-06 GBPUSD, NZDUSD, EURUSD, MSFTUSD; 10-30 GOOGLUSD, JPMUSD, AMDUSD. The pattern held 18/18 on 11-11 (memory `force-expired-is-a-2x-horizon-fallback`). Today's `stats.expired` is 63. This run did not split that total by cause. D1 rows also land there (11-06 P2 part 4).

**Ask:**
1. **Do not record a signal whose first graded candle falls after the market closes.** This is one `isMarketOpen(symbol, at: timestamp + barLength)` check in `collectNewSignals`. The public endpoint then stops issuing signals the record will never score. That is the 09-18 P4 principle applied to the weekend close.
2. **Or grade on market time.** Extend the window to N trading hours so Friday rows resolve against Monday's candles, gap included. Pick one, pre-register it, and publish the existing 10 rows on their own line either way.

Effort: small (one predicate, or one window definition plus a test). Impact: low in count (10 of 800 rows, about 1.3%) but categorical: every pre-weekend signal for FX and US equities goes unscored, and the record does not say so.

**Brand-alignment:** "Wins AND losses, no cherry-picking" covers whole categories of trades as well as individual ones. A signal the product issues should either be scored or not issued, never quietly expired.

**Grill verdict:** SURVIVED. Objection one: "10 rows cannot move a 36% win rate." Agreed, and the impact line says so. The proposal is about completeness, not the headline. Objection two: "Monday-gap grading penalises the strategy unfairly." That gap is the real risk of holding a Friday signal. If the product does not want to own it, option 1 stops issuing the signal.

---

## Measured updates to carried items (not re-proposed)

- **Rolling 7-day win rate fell to 29.6% on 463 resolved** [PRODUCTION, today], from 38.3% on 509 at the 11-06 weekly. 30d is 36.4% on 2,317, and 90d is 36.2% on 6,255. [DERIVED] A naive z against the 90d rate is (0.296 − 0.362) / √(0.362 × 0.638 / 463) = −0.066 / 0.0223 = **−2.96**. That ignores repeated looks at a sliding window and the correlation within batches, so it is not a decay verdict. The current streak is −7. The decay monitor that should flag this is still anchored to `max_ts` and is now about 171 days stale (newest row 2026-06-02; memory `decay-monitor-cannot-see-its-own-staleness`). The carried 10-09 / 10-16 asks stand.
- **10,000-row window** [PRODUCTION]: `earliestTimestamp` 1785717000000 = 2026-08-03T00:30Z, `latestTimestamp` 1795133700000 = 2026-11-20T00:15Z. [DERIVED] 9,416,700,000 / 86,400,000 = **108.99 days**. Stats: resolved 8,063, expired 63, gate-blocked 1,832, pending 42. 8,063 + 63 + 1,832 + 42 = 10,000 ✓. 2,881 / 8,063 = 35.73% ✓.
- **D1 ledger, update to 11-06 P2** [PRODUCTION, 11-19 daily]: day 101, closedTrades 3, both legs FLAT, integrity pass on 102 rows. Max drawdown is **20.43% for the strategy vs 32.95% for hold**, so the drawdown check that 11-06 reported as FAIL by 3.38 now reads **PASS by 12.52**, entirely because the benchmark fell. Active return is +3.02 pt, and Calmar is −0.842 vs −0.799 (still FAIL). This supports 11-06 P2 part 3 (do not move the gate, do not read interim checks). The disclosure asks (full frozen rule text, a `/research` link to the live ledger) are unchanged and still unbuilt.
- **11-06 P1 (publish-time grading)**: unchanged on `main`, carried.
- **Pro conversion funnel seed**: not proposed. Migration `053_drop_monetization.sql` removed tiers, and `/pricing` redirects to `/track-record` (10-23 weekly). There is no funnel to harden.

---

## Findings that died under verification this run (recorded, not proposed)

1. **"Most gate-blocked rows never get a 24h outcome."** Dead. The truncated CSV summary claimed 147 of 207 gated rows were blank. The row-level JSON listing showed all 12 gated rows with observed outcomes, consistent with `selectResolvedForGate` keeping gated rows in the lookback. The CSV summary was discarded entirely.
2. **"No live risk control except the D1 stop"** (11-06 P3). Retracted. See P2.
3. **"The gate is evaluated once per bar."** Dead. See P1: 3 of 4 gated bars are mixed.

---

## Lessons and escalations

**State-file write:** this run did not attempt the `loops/state/tradeclaw.STATE.md` append. It has been refused as a sensitive-file edit on every run since 10-09 (11-06 weekly, 11-19 daily), and spending a turn on it would leave this doc short of budget. Lessons and escalations are recorded here, per contract.

### Lessons (durable)

1. **Before saying a control never fires, `git grep` for every writer of the column it sets.** 11-06 audited `risk-pipeline.ts` and missed `full-risk-gates.ts`, which writes `gate_blocked` on 18% of rows.
2. **For any exclusion flag, list every insert path and every `ON CONFLICT` set.** A flag stamped by one writer and defaulted by another makes the record depend on write order.
3. **Never take counts from a `WebFetch` summary of a large file.** It truncated at about 1,000 of 10,000 rows and mis-tallied the rows it did see. List rows and tally them by hand, or don't publish the count.
4. **Headless loop PowerShell refuses script blocks and out-of-scope `-OutFile`.** In-memory CSV aggregation is unavailable on this host's loop permissions. Plan probes as row listings, or as a Node script run by the daily, which has the wider allowlist.

### Escalations (owner decision required)

1. **NEW: gate membership depends on write order** (P1). Authorize the tick-level gate decision and the conflict-clause change. Run the same-bar-neighbour query over the 1,832 gated rows.
2. **NEW: the circuit breaker has no counterfactual** (P2). Pre-register the keep-or-retire rule, then authorize the blocked-vs-passed line. This also retracts 11-06 P3's "zero live controls".
3. **NEW, small: pre-close signals are never graded** (P3). Choose: don't issue, or grade on market time.
4. **Carried:** the three 11-06 proposals; supersede this branch (46 conflicts vs `origin/main`, unchanged for 34 days per the 11-19 daily); `gate.ps1` checks the working tree, not the committed artifact, the remote, or the exit code; `branchPattern: ""`; ISR caching of the calibration body; decay monitor anchor; 10-23 P1–P3.
5. **Harness, owner-side:** `continuous-improvement:reconcile` is not installed for loop sessions. `/deep-research` / `/market-research` backends are unconfirmed for headless runs. `log_assumption` / `shelve_idea` are not allowlisted. The 11-13 weekly died on 0xC0000409, and its root cause is unknown (check the Windows Application log for 11-13 08:00 +0800).
6. **Branch divergence:** 82 behind / 185 ahead. Any work on these proposals must branch from `origin/main`.

Assumptions (recorded here; the assumption tool is not on this run's allowlist): (1) the 60-row page at offset 900 is representative only of 11-10/11-11 and is used as mechanism evidence, not as a rate; (2) one shared id suffix within a bar means one generator pass.

---

## Sources

- Selection after seeing outcomes: [Bailey, Borwein, López de Prado, Zhu, "The Probability of Backtest Overfitting", Journal of Computational Finance (2015)](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting) (fetched on the 11-06 run)
- Control effectiveness review: [SEC, Risk Management Controls for Brokers or Dealers With Market Access (Rule 15c3-5)](https://www.sec.gov/rules-regulations/2011/06/risk-management-controls-brokers-or-dealers-market-access) (fetched on the 11-06 run)
- Production reads today: `https://tradeclaw.win/api/signals/history?limit=1`, `?limit=60&offset=900`; 11-19 daily probe results for the force-expired and D1 figures
- Repo reads (read-only, `9ecee0a0`): `apps/web/lib/tracked-signals.ts`, `apps/web/lib/full-risk-gates.ts`, `apps/web/lib/signal-history.ts` (`:56-61`, `:584`, `:640`, `:675`, `:703`, `:725`), `apps/web/app/api/cron/signals/route.ts` (`collectNewSignals`, `resolveOldSignals`, `:400`), `apps/web/app/api/signals/history/route.ts`, `apps/web/lib/outcome-provenance.ts`; `docs/research/weekly-research-2026-11-06.md`; `docs/automation/standups/2026-11-19.md`; `loops/logs/tradeclaw/weekly-2026-11-13_0800.log`; `loops/projects/tradeclaw.json`; `loops/state/tradeclaw.STATE.md`

## Status

**3 proposals, all new.** P1: the gate flag depends on which writer inserts the row first (cron never gates, no upsert corrects it, 3 of 4 gated bars mixed). Make it one stamped decision per tick. P2: the live streak/drawdown breaker removes 18.3% of rows with no counterfactual. Pre-register a keep-or-retire rule and publish blocked vs passed. This also retracts 11-06 P3's "zero live controls". P3 (small): pre-close Friday signals are issued and never graded. Stop issuing them, or grade on market time.

Seeds: signal quality gates → P1 and P2. Proof-chain / outcome verification → P1 and P3. Confidence calibration → carried, not re-measured. Pro conversion funnel → not proposed; there is no funnel.

**Propose-only compliance:** no product code edited, no test written, no migration, no deploy, no domain/claim/secret change, no PR opened, no write to Stripe or the signals table, no push to `main`, no force-push, no `git add -A`, no `--dangerously-skip-permissions`. Every number was read from a live GET, read from a cited line, or derived with the arithmetic shown. The two mechanisms offered without proof (which writer produced the mixed bars; whether losses cluster) are labelled `[INFERRED]` or left as owner queries. Single explicit-pathspec commit.

**Grill verdict: SURVIVED**
