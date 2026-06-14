# Phase 6a — Honesty Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public measurement surface provably honest — each displayed number declares its provenance and sample size, no unbacked claim ships — before Phase 6b promotes regime context to the public hero.

**Architecture:** A read-only parallel audit fans out one subagent per surface, each classifying every displayed metric against a fixed schema; results merge into one findings table. A one-page honesty contract codifies the rule. Remediation then runs as a per-finding loop — TDD where a measurement number is computed, wording/labeling edits otherwise — one commit per finding.

**Tech Stack:** Next.js App Router (`apps/web`), React client components, TypeScript, the `signal-history` / `signal-slice` / equity API libs, Jest (`*.test.ts`), the 5 required CI checks.

**Spec:** `docs/plans/2026-06-13-phase6-honest-regime-product.md` (decisions 1–4 govern this plan; decision 4 = soften unbacked claims to what the data supports).

**Branch:** `phase6-honest-regime-product` (already created off `origin/main` `b0a344b`; spec committed at `d1b7bbd`).

---

## File structure

- **Create (Task 1 output):** `docs/plans/2026-06-13-phase6a-audit-findings.md` — the merged findings table.
- **Create (Task 2 output):** `docs/operators/honesty-contract.md` — the one-page contract.
- **Modify (Task 3, per finding):** the flagged client/lib files under `apps/web/app/<surface>/*Client.tsx` and their API/lib feeders. Exact files are unknown until Task 1; each finding row names its own `file:line`.

### In-scope surfaces → entry files (audit targets)

| Surface | Page | Client | Primary data source |
|---|---|---|---|
| track-record | `apps/web/app/track-record/page.tsx` | `track-record/TrackRecordClient.tsx` | `/api/signals/equity`, `/api/signals/history` |
| results | `apps/web/app/results/page.tsx` | `results/ResultsClient.tsx` | hand-authored `VALIDATION_SUMMARY` (illustrative) |
| accuracy | `apps/web/app/accuracy/page.tsx` | `accuracy/AccuracyClient.tsx` | `/api/signals/accuracy-context` |
| benchmark | `apps/web/app/benchmark/page.tsx` | `benchmark/BenchmarkClient.tsx` | (audit to trace) |
| calibration | `apps/web/app/calibration/page.tsx` | `calibration/CalibrationClient.tsx` | `/api/calibration` |
| confidence | `apps/web/app/confidence/page.tsx` | (audit to locate client) | (audit to trace) |
| consensus | `apps/web/app/consensus/page.tsx` | (audit to locate client) | (audit to trace) |
| allocation | `apps/web/app/allocation/page.tsx` | (audit to locate client) | (audit to trace) |
| ab-stats | `apps/web/app/ab-stats/page.tsx` | (audit to locate client) | (audit to trace) |
| og/embed | `apps/web/app/api/og/track-record/route.tsx`, `apps/web/app/embed/track-record/page.tsx` | — | mirror of track-record |

---

### Task 1: Honesty audit (read-only fan-out → findings table)

**Files:**
- Create: `docs/plans/2026-06-13-phase6a-audit-findings.md`

This task is discovery, not TDD. Its "test" is the completeness check in Step 4.

- [ ] **Step 1: Freeze the audit row schema**

Every flagged item is one row. Classifications are exactly these six (no others):
- `already-honest` — declares provenance + sample size; no change needed
- `live-measured` — from a recorded source but MISSING a visible sample size or date range
- `synthetic-fallback` — shown without a visible "simulated / API unavailable" label
- `illustrative` — hand-authored, label present but not prominent at a skim
- `over-optimistic-framing` — real data shown misleadingly (cherry-picked window, hidden denominator, win-rate with no N, win-rate not compared to break-even)
- `unverifiable` — cannot trace the number to any source

Row format:

```
| surface | metric / claim | file:line | data source | classification | required fix |
```

- [ ] **Step 2: Dispatch one audit subagent per surface (parallel)**

Use `superpowers:dispatching-parallel-agents`. One read-only subagent per row of the in-scope table above (≈10). Each subagent receives this exact charter:

> Read the page, its client component, and every data source it fetches. For EACH number, percentage, equity curve, or performance claim rendered to the user, emit one row in the frozen schema. Classify against the six categories. Quote the `file:line`. Trace each number to its source (API route, lib function, or hand-authored constant) and state whether a sample size (N) and date range are shown next to it. Do NOT propose UI redesigns. Do NOT edit files. Return only the rows.

- [ ] **Step 3: Merge + dedup the rows**

Concatenate all subagent rows into one table, grouped by surface. Drop exact duplicates. Do not re-summarize — keep each subagent's `file:line` verbatim.

- [ ] **Step 4: Completeness check**

Verify every in-scope surface produced ≥1 row (a surface with zero flagged items still gets one `already-honest` row stating so). Verify no row has an empty `data source` or `classification`. If a surface was skipped, re-dispatch its subagent. This is the task's pass condition.

- [ ] **Step 5: Write + commit the findings doc**

Write the merged table to `docs/plans/2026-06-13-phase6a-audit-findings.md` with a one-paragraph summary (counts per classification). Then:

```bash
git add docs/plans/2026-06-13-phase6a-audit-findings.md
git commit -m "docs(audit): Phase 6a honesty audit — measurement-surface findings table"
```

---

### Task 2: Honesty contract doc

**Files:**
- Create: `docs/operators/honesty-contract.md`

- [ ] **Step 1: Write the contract**

The full content (this is the deliverable, not a placeholder):

```markdown
# Honesty Contract — public measurement surfaces

Every public surface that renders a performance number must satisfy ALL of:

1. Provenance label. Each number is one of: `live-measured`, `synthetic`, `illustrative`. The label is visible without hover, at skim distance.
2. Sample size + window. Every win-rate / return / Sharpe shows N (resolved signals) and the date range it covers.
3. No fabricated curve. No simulated or hand-authored equity curve is presented as real performance.
4. Win-rate context. A win-rate is shown alongside its break-even win-rate; "above/below break-even" is explicit.
5. Cost honesty. Returns are net of the stated round-trip cost (currently 2bps); the cost is disclosed.
6. Claim backing. Any headline word like "verified" maps to a named recorded source that INCLUDES losses and no-edge periods. If the data cannot back the word, the word is softened to what the data supports (Phase 6 decision 4) — never the reverse.
7. Fallback labeling. Synthetic-fallback data (shown when an upstream API fails) is visibly marked "simulated — live data unavailable".

A surface passes only when every rendered number satisfies 1–7.
```

- [ ] **Step 2: Commit**

```bash
git add docs/operators/honesty-contract.md
git commit -m "docs(honesty): contract for public measurement surfaces"
```

---

### Task 3: Remediation loop (one pass per finding row)

Drive this from the Task 1 table. Process every row whose classification is NOT `already-honest`. Order: `track-record` rows first (highest liability), then `over-optimistic-framing`, then `unverifiable`, then the rest. Use `superpowers:subagent-driven-development` — one task per finding.

For EACH finding, pick the matching recipe. Each recipe is concrete; the row supplies the `file:line`.

- [ ] **Recipe A — `over-optimistic-framing` or `live-measured` missing N (measurement-visible):** TDD.
  1. Write a failing test asserting the rendered/returned payload includes the sample size and (where applicable) break-even comparison. Example for an equity-style endpoint:
     ```ts
     it('exposes resolvedSignals (N) and breakEvenWinRate alongside winRate', async () => {
       const res = await GET(makeReq('/api/signals/equity?scope=pro&period=all'));
       const body = await res.json();
       expect(body.summary.resolvedSignals).toBeGreaterThanOrEqual(0);
       expect(body.summary).toHaveProperty('breakEvenWinRate');
     });
     ```
  2. Run it: `npm test -- <path>` → expect FAIL.
  3. Add the field to the payload / surface it in the client next to the number.
  4. Run it → expect PASS.
  5. Commit: `git add <files> && git commit -m "fix(<surface>): show N + break-even alongside win-rate"`.

- [ ] **Recipe B — `illustrative` not prominent:** wording/labeling, no test.
  1. Add a visible inline badge next to the metric block, e.g. `<span className="...">Illustrative — hand-authored, not engine output</span>` (match the page's existing badge styling; do not invent a component).
  2. Manual check: load the page, confirm the badge is visible at skim distance above the fold.
  3. Commit: `git add <file> && git commit -m "fix(<surface>): make illustrative label prominent"`.

- [ ] **Recipe C — `synthetic-fallback` unlabeled:** labeling.
  1. Where the fallback path is taken, set a flag and render "simulated — live data unavailable" near the affected numbers.
  2. Manual check: force the fallback (mock the API to fail) and confirm the label renders.
  3. Commit: `git add <files> && git commit -m "fix(<surface>): label synthetic fallback data"`.

- [ ] **Recipe D — `unverifiable`:** remove or label.
  1. If the number has no source, remove the element OR replace it with an explicit "unverified / illustrative" label. Default to removal unless the row's required-fix says otherwise.
  2. Manual check: page renders without the unbacked number.
  3. Commit: `git add <file> && git commit -m "fix(<surface>): remove unverifiable metric"`.

- [ ] **Recipe E — unbacked "verified" claim (track-record headline):** soften wording (decision 4).
  1. Change the claim to what the recorded data supports. Concrete before/after:
     - Before: `"Verified Signal Track Record … Real performance data. No cherry-picking, no hiding losses."`
     - After: `"Tracked Signal Record — recorded outcomes for N resolved signals since <date>, net of 2bps cost. Includes losses and break-even periods."`
     Update `metadata` (title/description/openGraph/twitter) in `apps/web/app/track-record/page.tsx` AND the in-page hero copy in `TrackRecordClient.tsx`, AND the mirror in `apps/web/app/api/og/track-record/route.tsx`.
  2. Manual check: grep the three files for "Verified"/"verified" — none remain unless backed.
  3. Commit: `git add <files> && git commit -m "fix(track-record): soften headline claim to recorded-outcomes wording"`.

- [ ] **Final step: full verification before PR**
  1. `npm run -w apps/web type-check` (or repo's type-check script) → green.
  2. `npm test` for touched packages → green.
  3. Confirm every non-`already-honest` row has a corresponding commit.
  4. Push branch, open PR titled `Phase 6a: honesty sweep — every public metric declares provenance + sample size`. Required CI (Lint&Type, Build, Unit Tests, Strategy Backtests, Docker Build) green; E2E non-required.

---

## Self-review

**Spec coverage:** 6a.1 audit → Task 1; 6a.2 contract → Task 2; 6a.3 remediation → Task 3 (recipes cover all six classifications and decision 4). Phase 6b is intentionally a separate plan (independent subsystem, not findings-gated).

**Placeholder scan:** Task 1/2 content is fully written. Task 3 recipes are concrete with worked code/wording; the only deferred specifics (exact `file:line`) are supplied by Task 1's table at execution time — a real data dependency, not a placeholder.

**Type consistency:** classifications are the same six names in Step 1, the contract, and the recipes. Field names (`resolvedSignals`, `breakEvenWinRate`, `winRate`) match the verified `/api/signals/equity` payload.

## Gate to Phase 6b

Phase 6b (public regime view + "tested & killed" panel + hero reframe) gets its own plan after 6a's PR merges. It does not depend on the audit findings, but it must sit on the honest base 6a produces.
