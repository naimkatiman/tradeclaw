# TradeClaw weekly research — 2026-11-06

Mode: weekly (propose only). Branch: `feat/premium-ui-overhaul` @ `1f548d1f`, even with its upstream (`git ls-remote` = HEAD), 82 behind / 157 ahead of `origin/main`. Remote `main` is still `9ecee0a0` (PR #232, 2026-10-14). Seven open PRs, unchanged: #198, #184 and #170 CONFLICTING; #174, #160, #149 and #143 MERGEABLE; none updated after 2026-08-29.

Label convention, unchanged: `[PRODUCTION]` = read from a live public GET today. `[SOURCE]` = read from a git ref, file and line cited. `[DERIVED]` = arithmetic shown. `[INFERRED]` = reconstructed, not read.

---

## The organizing fact of this week

**Three things TradeClaw publishes don't match what the code does.** The track record grades each signal from its bar, not from when anyone could see it. The D1 ledger's public rule text leaves out the stop that produced one of its three closes. The risk controls the brand names have no live mechanism behind them in production. None of these is a fabricated number. Each one is a gap between the description and the mechanism, and "every trade verified" depends on closing it.

---

## Method

Ground truth first (`continuous-improvement:reconcile` + `safety-guard`): branch and HEAD snapshotted, `git update-index --refresh` before reading drift, `git diff --stat` empty, `git status --short --branch` clean and even with upstream, no `MERGE_HEAD` / `rebase-merge` / `rebase-apply`, two August stashes on unrelated branches, 89 worktrees untouched. Write scope held to this file and the loop state file.

Internal friction via read-only `git show origin/main:<path>` and `git grep origin/main`. External evidence via `WebSearch` / `WebFetch`. `/deep-research` and `/market-research` were not invoked this run. Their firecrawl/exa backends were missing on the previous six runs, and this run did not re-test that. No product file was edited.

**This weekly covers 10-24 to 11-06.** The 10-30 weekly FAILed(2). Line 2 of `loops/logs/tradeclaw/weekly-2026-10-30_0800.log` reads "You've hit your session limit · resets 9:40am". That is account quota, not a project failure. No backfill was attempted (memory `loop-quota-death-is-not-a-project-failure`).

Assumptions recorded here because the assumption tool is not on this headless run's allowlist: (1) OHLCV candles are stamped by open time (Binance convention), which P1's latency arithmetic relies on; (2) `d1-slow-gate` rows are the only non-M15/H1 rows in the public history.

---

## Proposal 1 — Outcomes are graded from the bar, not from publication. Grade a parallel "actionable" outcome and pre-register a lateness rule

**What the code does.** [SOURCE] `origin/main:apps/web/lib/signal-history.ts:1067-1068` and `:1078-1079`: the 4h and 24h windows are `candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd)`, with `windowEnd = r.timestamp + 4h | 24h`. `r.timestamp` comes from `created_at` (`:302`), which holds the bar time. The wall-clock stamp is a separate column: `published_at`, "DB-defaulted NOW() on insert, distinct from bar-time `timestamp`" (`:97`), mapped to `publishedAt` at `:323`. The resolver never reads it. Entry is the signal's `entry`, which is the signal bar's close.

**What publication looks like.** [PRODUCTION] `/api/signals/history?limit=60&offset=400`, read today. All 60 rows are resolved, covering 2026-11-01T22:15Z to 2026-11-02T14:30Z. [DERIVED] lag = `publishedAt − timestamp` per row, then minus one bar (15 min) to get the time since the first graded candle opened. The strict `>` excludes the candle stamped at `r.timestamp`, so under either bar-stamp convention the first graded candle opens 15 minutes after `r.timestamp`.

| Group | n | lag from `timestamp` | after first graded candle opened |
|---|---|---|---|
| M15, not gate-blocked | 19 | 17.01–17.21 min | 2.0–2.2 min |
| M15, not gate-blocked | 29 | 21.98–22.38 min | 7.0–7.4 min |
| M15, not gate-blocked | 5 | 26.15–32.84 min | 11.2–17.8 min |
| M15, gate-blocked (not counted) | 6 | 25.46–30.84 min | 10.5–15.8 min |
| H1, not gate-blocked | 1 | 67.17 min | 7.2 min (60-min bar) |

The median counted-eligible M15 row (position 27 of 53) sits in the 22-minute group. It was published about **7 minutes after its first graded candle opened**. In **2 of 53** rows, publication came after the first graded candle had already closed: GBPUSD M15 BUY at 11-02T07:00Z (32.01 min; TP1 hit at 4h and 24h, +0.18%) and BTCUSD M15 BUY at 11-02T04:00Z (32.84 min; SL at 4h and 24h, −0.61%). That is one win and one loss, and both are shown.

**The extreme case.** [PRODUCTION, from the 10-31 daily] `SIG-AAPLUSD-M15-SELL-MVTYD3S0` and `SIG-AMZNUSD-M15-BUY-MVTYD3S0`, timestamped 10-29T19:45Z and published 10-30T13:46:54Z (1,081.9 min). [DERIVED from `:1067-1086`] The 4h window (19:45Z to 23:45Z) holds no candles after the 20:00Z close. It is force-expired at 8h and excluded as not a real outcome, which is correct. The 24h window runs to 10-30T19:45Z and includes the 13:30Z opening candle. That candle closed at 13:45Z, before the row was published at 13:46:54Z. The 24h outcome for both rows therefore grades the overnight gap against the prior day's 19:45Z close, a fill no subscriber could have got. Whether the gap touched TP or SL is **pending real data** (the rows are outside today's page).

**What this is not.** Nothing here shows look-ahead in signal generation. Each signal uses its own bar. The problem is in grading: part of the graded path comes before anyone could act on the signal. The size and sign of that effect on the published win rate are **pending real data**. The first graded candle is 1 of 16 in the 4h window and 1 of 96 in the 24h window.

**What is disclosed today.** [SOURCE] `methodology/page.tsx:393` names "latency" as unmodeled, but only for the modeled study. `git grep -i "latency|published|bar close|next bar|bar time"` on that file finds no sentence saying the observed record grades from the bar rather than from publication.

**Ask (each part ships alone):**
1. **Grade a parallel actionable outcome.** For every row with `published_at` (all rows since migration 048), grade a second 4h/24h outcome starting at the first candle that opens at or after `published_at`, with entry at that candle's open. Publish both outcomes on each row and label the current one "bar-close basis".
2. **Pre-register a lateness rule before measuring the gap between the two bases.** A row is *late* if it was published after its first graded candle closed. Late rows stay public and scored, are excluded from the counted win rate, and are reported on their own line. Today's sample has 2 late rows of 53, plus the 10-29 pair.
3. **Disclose it.** Add one line to `/methodology` with the measured lag distribution, for example "graded from the bar close; publication follows by a median of N minutes", with N computed from the window, not typed in.
4. **Owner query:** the 24h outcomes of the two 10-29 rows, and the win-rate difference between the two bases over the current window.

Effort: medium (a second window in the resolver, one outcome column or JSON key, one methodology line). Impact: high. "Every trade verified" should mean verified *as published*, not as it looked from inside the bar.

Evidence: `signal-history.ts:97,302,323,1067-1086`; the 60-row page above; the 10-31 daily for the 10-29 pair. External: the standard backtest default is "Decide on the previous bar; execute next bar open", with "ambiguous OHLC intrabar paths" modeled "conservatively" ([joor0x, "Look-Ahead Traps in Backtesting (Backtrader, MQL, PineScript)"](https://joor0x.github.io/posts/lookahead-traps-backtesting)). TradeClaw's resolver decides on the bar and fills at that same bar's close, inside a candle that was already running when the signal went out.

**Brand-alignment:** "Every trade verified" and "distinguish LOCAL from production" both mean grading the trade a reader could actually take. A record graded from before publication is a backtest of the published feed, not the feed itself, and it should say so.

**Grill verdict:** SURVIVED. Objection one: "seven minutes on a four-hour window is noise." Possibly, and the ask settles it with a published number instead of an opinion. If it is noise, the record says so with evidence. Objection two: "the bar-stamp convention is unknown, so the lag figures are wrong." The resolver's strict `>` means that under either convention the first graded candle opens 15 minutes after `r.timestamp`. The figures rely only on candles being stamped by open time, and that assumption is stated above. Objection three: "excluding late rows hides losses." The ask keeps them public and scored on their own line, so nothing leaves the record. Of today's two late rows, one is a loss.

---

## Proposal 2 — The D1 ledger's drawdown check flipped to FAIL, its public rule text omits the stop that produced a close, and `/research` cites a sandbox result for a different rule without linking the live test

**The ledger, measured.** [PRODUCTION] `/track-record/alpha` today: version `d1-slow-gate-v1-2026-08-09`, rule "close above EMA200, long/flat", source binance, latest commit 2026-11-06T00:02:20.389Z, integrity pass (89 rows), cadence gaps 0/0, NOT-PROMOTED.

| Metric | 10-23 (day 74, weekly) | 11-04 (day 86, daily) | **11-06 (day 88)** |
|---|---|---|---|
| Strategy net return | +6.29% | +0.40% | **−5.09%** |
| Benchmark net return | +22.00% | +15.70% | **+13.67%** |
| Active return | −15.71 pt | −15.30 pt | **−18.77 pt** |
| Max drawdown, strategy vs hold | 10.88% vs 10.98% (PASS by 0.10) | 16.16% vs 16.30% | **20.43% vs 17.05% (FAIL by 3.38)** |
| Calmar, strategy / hold | 3.23 / 15.19 | 0.106 / 5.257 | **−0.95 / 4.11** |
| Closed trades | 0 / 12 | 1 / 12 | **3 / 12** |
| Positions BTC / ETH | LONG / LONG | LONG / FLAT | **FLAT / FLAT** |

[DERIVED] Strategy: 0.9491^(365/88) − 1 = −0.1948, divided by 0.2043 = **−0.95** ✓. Hold: 1.1367^(365/88) − 1 = 0.7014, divided by 0.1705 = **4.11** ✓. Active: −5.09 − 13.67 = −18.76 against a published −18.77 (input rounding). Snapshots 89 = 88 days + 1 ✓. First bar: 2026-11-05 − 88 d = **2026-08-09**, matching the version stamp.

All three performance properties the page lists (`alpha/page.tsx:239`: "positive active return, no worse drawdown, and Calmar at least equal to the benchmark") now read FAIL on today's numbers. **This is not a verdict.** The protocol keeps every performance check `null` until 365 days, 365 snapshots and 12 closes (`d1-alpha-protocol.ts`, `evaluateD1AlphaGate`). That design is correct, and this proposal does not touch it.

**The three closes.** ETHUSD `EXIT_GATE` on the 10-29 bar (2,252.80 → 2,253.13, +0.0146% gross, per the 10-30 daily). Then two exits on the 11-05 bar: [PRODUCTION] `d1-slow-gate:BTCUSD:EXIT_GATE:1793836800000` at 76,088.01 and `d1-slow-gate:ETHUSD:EXIT_STOP:1793836800000` at 2,207.7117857142866, both published 140 s after their 11-06T00:00Z timestamp. [DERIVED from `d1-alpha-protocol.ts` `advanceStrategySleeve`] `EXIT_STOP` can only fire while long, and ETH was FLAT at the 11-03 bar (11-04 daily). So ETH entered on the 11-04 bar and was stopped out on the 11-05 bar, a one-bar hold. [SOURCE] `packages/strategies/src/d1-slow-gate.ts`: the stop sits at entry − max(2.5 × ATR14, 4.0% floor) (`stopGeometry`, `D1_SLOW_GATE_STOP_FLOOR_PCT`) and fills at `Math.min(stopLoss, candle.open)`. That round trip therefore lost at least 4.0% of the ETH sleeve, plus 0.40% modeled round-trip cost.

**What the public text omits.** The page's rule line is "close above EMA200, long/flat". [SOURCE] The frozen rule also: enters only on a fresh cross (`rawGate && !previousRawGate && !blockedUntilFlat`); exits intraday on the ATR stop with a gap-aware fill; and blocks re-entry after a stop until the gate turns off (`blockedUntilFlat`). `git grep stop` on `alpha/page.tsx` returns zero hits. A reader replaying "close above EMA200, long/flat" on Binance daily closes would not reproduce the 11-05 ETH exit.

**What `/research` says.** [SOURCE] `research/page.tsx:274` states the sandbox hypothesis as a close-above-EMA200 long/flat gate "with size scaled by the existing HMM structural-regime classifier". `:307` reports the drawdown result for the "50/50 vol-targeted portfolio" (max drawdown 37.4% vs 86.5%). The file contains no `track-record/alpha` link. [SOURCE] The prospective ledger holds a fixed 0.5 per sleeve with exposure 0 or 1 (`initialSleeve`, `engineExposure: 0 | 1`), and `runD1SlowGate` applies no volatility scaling. [INFERRED] The live test corresponds to the sandbox's plain EMA200 gate, not the vol-targeted overlay whose drawdown figure `/research` quotes. This run did not check whether the sandbox plain gate carried the same ATR stop.

**Ask:**
1. **Publish the full frozen rule** on `/track-record/alpha`: fresh-cross entry, close-below-EMA200 exit, intraday stop at entry − max(2.5 × ATR14, 4.0%) with a gap-aware fill, no re-entry after a stop until the gate resets, 0.05% fee + 0.15% slippage per side, 0.01% funding per 8h. Copy only. `D1_ALPHA_RULE_SHA256` does not change.
2. **Link `/research` to the live test.** On the slow-gate card, say which sandbox variant the prospective ledger runs, link `/track-record/alpha`, and show the current day with the drawdown pair labelled "interim, not a verdict". The page already publishes those numbers; the ask is to put them next to the claim they test.
3. **Do not move the gate.** Performance checks stay `null` until day 365, and the rule is not edited. The 12-close floor is not amended either. The 09-14 memory note called it unreachable at ~8.4 closes a year, and it now reads 3 at day 88, two of them on one bar. Amending it now would mean choosing a rule after seeing its outcomes, which is the selection problem in [Bailey, Borwein, López de Prado, Zhu, "The Probability of Backtest Overfitting", Journal of Computational Finance (2015)](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting).
4. **Small, carried from the 11-03 daily:** take `d1-slow-gate` rows out of the 15-minute `stats` (the resolver skips them at `signal-history.ts:1031` because they have no `tp1`/`sl`, and history stats then count them as `expired` after 24h), or give them their own bucket. Label exit rows "rule exit" instead of `confidence: 100`. [SOURCE] Exit transitions carry `confidence: 1` in `d1-slow-gate.ts`. [PRODUCTION] The history shows 100.

Falsifiable check for the next daily: after 11-07T00:00Z, both 11-05-bar exit rows still have null 4h and 24h outcomes.

Effort: small (two copy blocks and one link; part 4 is one filter). Impact: high. This is TradeClaw's only prospective, hash-chained test, and its public description currently cannot reproduce its own trades.

**Brand-alignment:** "Wins AND losses, no cherry-picking" covers the result the research page is built on. A sandbox drawdown win shown without its live test, which currently reads worse than hold, is a cherry-pick by omission. "Every trade verified" means a trade can be reproduced from the rule as published.

**Grill verdict:** SURVIVED. Objection one: "showing interim numbers invites optional stopping." The page already shows every number. The ask adds no metric and changes no gate. It adds the rule text and a link. Objection two: "the drawdown flipped in two bars, so it's noise." Agreed that it is not evidence of failure, and the proposal says so. It is still the current state of the only live test, and `/research` presents the hypothesis without it. Objection three: "the stop is an implementation detail." It produced one of three closes. A rule summary that cannot reproduce a third of the ledger's trades leaves out a material fact.

---

## Proposal 3 — None of the risk controls the brand names is live in production. Publish their liveness from data, then configure or retire them

**The brand constraint** lists "disciplined risk management (auto-demote strategies that lose edge)". Each mechanism, checked:

| Control | Code | Production state |
|---|---|---|
| Risk account + circuit breakers | [SOURCE] `risk-pipeline.ts:81` returns early with veto `risk_account` when the risk state is not portfolio-backed, before `CircuitBreakerEngine.evaluateForRegime` at `:106` | [PRODUCTION] `?scope=broadcast&limit=1` today: `total: 0`, `available: false`. 909 of 909 decided rows in the newest 1,000 vetoed `risk_account` (11-04 daily; not re-paged this run). The breakers have not been evaluated on a single published signal. |
| LLM advisory step | [SOURCE] Header `:9`: "Apply LLM adjustments (can only reduce, never increase)". Code `:224-233`: on `halt` with no concurrence, it logs and "We still allow signals through". | Never reached in production (see row 1). If it were reached, it changes nothing. |
| Decay monitor | [SOURCE] `apps/web/data/strategy-decay-metrics.json`, newest row 2026-06-02, last changed in `59ccb823` | [DERIVED] **157 days** stale (June 28 + 31 + 31 + 30 + 31 + 6). Its window is anchored to `max_ts`, so `insufficient_sample` stays false (10-09 weekly P1). |
| Auto-demote | `decay_status` / `auto_demote` | `false` for all three strategies, on a win-rate-only criterion (10-09 weekly P1; not re-read). |
| D1 slow-gate stop | `d1-slow-gate.ts` `stopGeometry` | **Live.** It fired on the 11-05 bar (P2). In this window it is the only risk control observed firing in production. |

**What is not wrong.** [SOURCE] `git grep -i "circuit|demot|risk (management|gate|control|pipeline)"` across `README.md`, `methodology/`, `research/`, `track-record/` and `docs/` on `origin/main` finds no public claim that breakers or auto-demote are live. The only hit is the internal admin page (`admin/strategy-library/page.tsx:85`, "auto-demoted"). The site does not overclaim. The gap is between the brand positioning and the mechanism, and the site says nothing either way.

**Ask:**
1. **Owner decision, carried from the 11-02 daily:** (a) configure the risk paper account and confirm `getRiskState()` returns a portfolio source, so the breakers run; or (b) retire the broadcast scope and its veto as leftovers of the removed paid tier, and drop "auto-demote" from the brand line until a mechanism backs it.
2. **Whichever is chosen, publish liveness from data.** One block on `/methodology` (and in a JSON route), generated rather than typed: risk pipeline decided / vetoed-by counts over the newest 1,000 rows and the count of breaker evaluations; decay monitor newest-row date and age in days; auto-demote criterion and last firing; D1 stop last firing. Every line is a count or a date the product already stores.
3. **Make the code match its header.** Either implement the LLM "reduce" step or rewrite `risk-pipeline.ts:9` to say the LLM output is logged only.

Effort: small for part 2 (read-only aggregation over existing columns) and part 3 (one comment or one branch); part 1 is an owner call. Impact: high. A pillar of the brand currently has zero firing mechanisms, and nobody outside the repo can see that.

Evidence: the code lines and probes above. External, as a principle and not a jurisdictional claim (TradeClaw is not a broker-dealer): SEC Rule 15c3-5 requires firms to "establish, document, and maintain a system of risk management controls" and a system "for regularly reviewing the effectiveness" of them ([SEC, Risk Management Controls for Brokers or Dealers With Market Access](https://www.sec.gov/rules-regulations/2011/06/risk-management-controls-brokers-or-dealers-market-access)). A control that never runs passes no effectiveness review.

**Brand-alignment:** "Disciplined risk management" and "measurable proof over marketing spin" mean the risk pillar gets the same treatment as the win rate: a measured, public line, including when that line reads "0 evaluations".

**Grill verdict:** SURVIVED. Objection one: "this is the 11-02 daily item again." The daily flagged one control. This proposal audits every control the brand names, adds the LLM no-op, and identifies the one control that does fire. The owner decision has been open for four days and stays open here. Objection two: "publishing '0 evaluations' is self-harm." It is the brand. The site already publishes "−100% modeled equity" in the README (`README.md:44`). Objection three: "909/909 was not re-measured today." Correct, and it is labelled. Today's `scope=broadcast` total of 0 is consistent with it.

---

## Carried but deliberately not re-proposed (measured updates only)

- **10,000-row window** (10-16 P1). [PRODUCTION] `earliestTimestamp` 1784736900000 = 2026-07-22T16:15Z, `latestTimestamp` 1793923200000 = 2026-11-06T00:00Z (a D1 row). [DERIVED] 9,186,300,000 / 86,400,000 = **106.32 days**, down from 108.32 on 10-23. Stats: resolved 8,031, wins 2,923, losses 5,108, win rate 36.4%, expired 58, gate-blocked 1,884, pending 27. 8,031 + 58 + 1,884 + 27 = 10,000 ✓, and 2,923 / 8,031 = 36.40% ✓. Rolling: 7d 38.3% on 509 resolved, 30d 36.7% on 2,406, 90d 36.0% on 6,531. Code unchanged; the owner call stands.
- **Confidence-band inversion** (80–89 below 70–79). Not re-measured. The 11-04 daily read z −2.00 on a daily sliding window and made no call because the isotonic split disagrees. Not proposed.
- **`/api/v1/win-rates` intervals, winning-cells verdict, outbound "NN% confidence"** (10-23 P1–P3). No change on `main`; carried.
- **Pro conversion funnel seed.** Not proposed and not re-verified this run. Migration `053_drop_monetization.sql` removed tiers, and the 10-23 weekly found `/pricing` redirecting to `/track-record`. There is no funnel to harden.

---

## Findings that died under verification this run (recorded, not proposed)

1. **"Median publish lag is 22 minutes, more than one M15 bar"** (the dailies' framing). Corrected, not killed. The 22 minutes is measured from the bar timestamp and includes the bar's own 15 minutes. Measured from the first graded candle, the median is about 7 minutes. P1 uses the corrected figure.
2. **"Confidence-100 D1 rows distort `avgConfidence`."** Dead. [DERIVED] 3 × (100 − 77.1) / 10,000 = 0.0069 pt. P2 part 4 is a labelling fix, not an accuracy fix.
3. **"Public copy claims live circuit breakers or auto-demote."** Dead. The only hit is the admin page.
4. **"The D1 12-close floor is unreachable"** (memory, 09-14). Weakened: 3 closes at day 88. Two of those came on one bar, so this is not a pace. Not proposed for amendment in either direction (P2 part 3).
5. **Harvey, "The Scientific Outlook in Financial Economics" (JF 72(4), 2017)** as a citation for P2. Dropped. The fetched page carried only bibliographic metadata, so its content could not be confirmed.

---

## Lessons and escalations

**State-file write re-tested this run, not inherited.** `gateguard-clear.mjs` returned "Cleared 2: ... tradeclaw.STATE.md, ... weekly-research-2026-11-06.md". The append that followed was refused: "Claude requested permissions to edit ... which is a sensitive file." Same two-layer block as on every run since 10-09. Lessons and escalations are recorded here, per contract.

### Lessons (durable)

1. **Measure latency from the first graded candle, not from the row timestamp.** The bar's own length is not delay. Getting this wrong overstated the publish lag threefold in the dailies.
2. **Check a strategy's public rule summary against its frozen code before reading its exits.** "Close above EMA200, long/flat" hid an ATR stop, a fresh-cross entry, and a re-entry block.
3. **A claim that a counter is unreachable expires when events arrive.** D1 closed trades went from 0 to 3 in 14 days. Re-read before citing the 09-14 note.
4. **Read the code paths after an early return.** The 11-02 daily found the early return. Reading past it showed a second step (LLM) that is a no-op even when it is reached.

### Escalations (owner decision required)

1. **NEW: outcomes graded from bar time, not publication** (P1). Owner calls: authorize the parallel actionable outcome and the lateness rule; run the query for the 24h outcomes of the 10-29 AAPLUSD/AMZNUSD pair.
2. **NEW: D1 rule disclosure, and a link from `/research` to the live ledger** (P2). Owner call: authorize the copy and the link. Keep the gate frozen.
3. **NEW (consolidates 11-02 daily NEXT 10): risk-control liveness** (P3). Owner call: configure or retire, then publish liveness.
4. **10-30 weekly gap.** Cause: account session limit. Recommendation: record it as skipped. This weekly covers its period. Owner to confirm.
5. **Carried:** supersede this branch (46 conflicts vs `origin/main`, unchanged since 10-17 per the 11-05 daily); `gate.ps1` checks the working tree, not the committed artifact or remote; `branchPattern: ""`; ISR caching of the fail-closed calibration body; decay monitor anchor; 10-23 P1–P3.
6. **Harness, owner-side:** `/deep-research` / `/market-research` backends are unconfirmed for headless runs (not re-tested this run); `log_assumption` and `shelve_idea` are not allowlisted; and the `Bash(git branch -D worktree-agent-*:*)` rule mixes `*` with `:*` (10-30 log line 4).
7. **Branch divergence:** 82 behind / 157 ahead. Work from these proposals must branch from `origin/main`.

---

## Sources

- Bar-close decision, next-bar-open fill: [joor0x, "Look-Ahead Traps in Backtesting (Backtrader, MQL, PineScript)"](https://joor0x.github.io/posts/lookahead-traps-backtesting)
- Selection after seeing outcomes: [Bailey, Borwein, López de Prado, Zhu, "The Probability of Backtest Overfitting", Journal of Computational Finance (2015)](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting)
- Risk-control documentation and effectiveness review: [SEC, Risk Management Controls for Brokers or Dealers With Market Access (Rule 15c3-5)](https://www.sec.gov/rules-regulations/2011/06/risk-management-controls-brokers-or-dealers-market-access)
- Production reads today: `https://tradeclaw.win/api/signals/history?limit=2`, `?limit=60&offset=400`, `?scope=broadcast&limit=1`, `https://tradeclaw.win/track-record/alpha`
- Repo reads (read-only, `origin/main`): `apps/web/lib/signal-history.ts`, `apps/web/lib/risk-pipeline.ts`, `apps/web/lib/d1-alpha-protocol.ts`, `packages/strategies/src/d1-slow-gate.ts`, `apps/web/app/lib/signal-generator.ts`, `apps/web/app/research/page.tsx`, `apps/web/app/methodology/page.tsx`, `apps/web/app/track-record/alpha/page.tsx`, `README.md`; working-tree standups 2026-10-30 through 2026-11-05; `docs/research/weekly-research-2026-10-{09,23}.md`; `loops/logs/tradeclaw/weekly-2026-10-30_0800.log`; `loops/projects/tradeclaw.json`; `loops/state/tradeclaw.STATE.md`

## Status

**3 proposals, all new.** P1: the resolver grades from the bar, and publication lands about 7 minutes into the first graded candle (2 of 53 rows after it closed; the 10-29 pair graded across an overnight gap). Grade a parallel actionable outcome and pre-register a lateness rule. P2: the D1 ledger's drawdown check flipped to FAIL at day 88 (20.43% vs 17.05%), the public rule omits the stop behind one of three closes, and `/research` quotes a sandbox result for a different variant without linking the live test. P3: every risk control the brand names has zero firings in production except the D1 stop. Publish liveness, then configure or retire. A fourth slot was left empty on purpose.

Seeds: proof-chain / outcome verification → P1 and P2. Signal quality gates / decay → P3 (consolidated). Confidence calibration → carried, not re-measured. Pro conversion funnel → not proposed; there is no funnel.

**Propose-only compliance:** no product code edited, no test written, no migration, no deploy, no domain/claim/secret change, no PR opened, no write to Stripe or the signals table, no push to `main`, no force-push, no `git add -A`, no `--dangerously-skip-permissions`. Every number was read from a live GET, read from a cited line, or derived with the arithmetic shown. The one mechanism offered without proof (P2, which sandbox variant the ledger corresponds to) is labelled `[INFERRED]`. Single explicit-pathspec commit.

**Grill verdict: SURVIVED**
