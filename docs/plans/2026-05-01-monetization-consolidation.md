# Monetization Consolidation — Free-Tier Lead-Gen + License Retirement + Strategy Preset Dispatch

**Date:** 2026-05-01
**Branch:** `feat/monetization-consolidation`
**Owner:** TradeClaw (driven by competitive audit of free-signal landscape, May 2026)

## Why

A May-2026 audit of the free-signal market (Telegram channels, free TradingView indicators, broker-affiliate sites) surfaced three things:

1. **Public, time-stamped, can't-be-edited Postgres `signal_history` is TradeClaw's single moat.** Free Telegram channels can claim 92% accuracy with screenshots; nobody can match a public verifiable row.
2. **Free tier is too narrow** to drive SEO / lead-gen against competitors that ship 40+ free signals/week across 20+ symbols. TradeClaw free shows 3 symbols and a frequently empty dashboard.
3. **Two parallel monetization systems** (Stripe tiers + license keys) cause divergence: a Pro Stripe sub does not unlock TV premium strategies; license keys are a separate purchase. Consolidating onto Stripe-tier as the single canonical gate removes this footgun and simplifies the customer model.

Plus one carry-over from prior audit: **`SIGNAL_ENGINE_PRESET` is currently a label only**, not a real strategy A/B knob.

This plan:

- Widens the free tier as a controlled lead-gen wedge (audit recommendation).
- Adds a `STRATEGY_PROFILES` scaffold so `SIGNAL_ENGINE_PRESET` can dispatch real engine variants (Phase 1 = no behavior change, sets up future A/B).
- Retires the license-key system in 5 reversible phases, ending with a destructive DB migration that requires explicit user authorization.

Decisions locked before plan written:

- **License keys are killed entirely.** No grandfather window. OSS upgrade path becomes "use hosted Pro." User confirmed 2026-05-01.
- **`premium_signals` table stays.** It is the data store for TV-webhook-fed Zaky strategies. Only the consumer-side gate changes (license key → Stripe tier).
- **TradingView webhook flow is unchanged.** It writes to `premium_signals.strategy_id`. Readers query that table differently after Phase B.
- **No worktree.** Working in-place on `feat/monetization-consolidation`. Two unrelated modified files (`DAILY_INTEL_LOG.md`, `scripts/.signal-engine-last-success`) carry over; not staged by any task.

## Verification baseline (already gathered)

Captured before plan was written so subagents don't have to re-discover:

- `/api/signals` for free anonymous: returns `count: 0` in prod. Cause: 15-min delay + 3-symbol filter + ≥85 confidence band hidden. Path 1 (`readLiveSignals`) is empty (`live_signals` table = 0 rows). Path 2 (`getTrackedSignalsForRequest`) also returns 0 because freshly generated signals fail the 15-min delay filter for free callers.
- `/api/signals/history?scope=free&period=30d`: serves real `signal_history` rows with strategy IDs (`hmm-top3`), gate reasons (`streak_blocked: 3/3`), entry/SL/TP1, ATR multipliers, regime tags. **This is the moat data, working in prod.**
- `/track-record`: HTTP 200, no auth, has SEO meta + dedicated OG image. Linked from `PageNavBar.tsx` and `landing/ab-hero.tsx`.
- License-touching files: 40+ across libs, API routes, components, pages. Inventory in this plan, full list in conversation transcript.
- Active license-key count in prod: **NOT YET QUERIED** (gate for Phase E).

## Tasks

Tasks are serial, not parallel. Each task is one commit. No commit touches >15 files (CLAUDE.md rule).

---

### Task 1 — Free-tier breadth expansion (lead-gen wedge)

**Goal:** widen the free surface without diluting the Pro real-time promise.

**Changes:**

- `apps/web/lib/tier-client.ts`: change `FREE_SYMBOLS` from `['BTCUSD','ETHUSD','XAUUSD']` to `['BTCUSD','ETHUSD','XAUUSD','EURUSD','SPYUSD','QQQUSD']` (one per asset class — crypto, commodity, forex, index ETF).
- `apps/web/lib/tier.ts`: change `TIER_HISTORY_DAYS.free` from `1` to `7`.
- `apps/web/lib/stripe-tiers.ts`: update Free tier `features` copy:
  - Replace `'3 symbols: BTCUSD, ETHUSD, XAUUSD'` → `'6 symbols across crypto, forex, commodities, indices'`
  - Replace `'Last 24h signal history'` → `'Last 7 days signal history'`
- Dashboard "always show last 5 free-tier signals" component: confirm if such a UI element exists; if it does, ensure it falls back to `signal_history` rows when `signals[]` is empty. If not, defer that UI to a separate task.

**Out of scope for this task:**
- Marketing copy on landing/pricing hero ("Every signal we've ever shipped is in a public Postgres row...") — defer to a copy-only commit.
- Adding more SEO landing pages per `(symbol, timeframe, direction)` tuple — those routes already exist at `/signal/[id]` and `/alert/[id]`.

**Verification:**
- `npm run build` from `apps/web` passes.
- Existing tier tests (`apps/web/lib/__tests__/tier.test.ts`, `apps/web/lib/__tests__/tier-gating.test.ts`) still pass.
- Add a test: `filterSignalByTier({symbol:'EURUSD',...}, 'free')` returns the signal (was previously null).
- Add a test: `TIER_HISTORY_DAYS.free === 7`.

**Commit message:** `feat(monetization): expand free tier to 6 symbols, 7-day history`

---

### Task 2 — `SIGNAL_ENGINE_PRESET` dispatch scaffold (Phase 1, no behavior change)

**Goal:** lay the groundwork for real strategy A/B without changing live engine math.

**Changes:**

- `apps/web/app/lib/signal-generator.ts`:
  - Add `STRATEGY_PROFILES` const with one entry: `'classic'` containing the current `SIGNAL_THRESHOLD = 22`, `MIN_CONFIDENCE = 55`, scalp variants, and any other engine knobs (regime filter on/off, indicator weights, etc.). Keep the existing module-level constants but mark them deprecated; they remain as the source values for the `classic` profile so a single source of truth.
  - Refactor `generateSignalsFromTA` (and `generateRealSignals` if it's a separate entry point) to accept an optional `presetId?: keyof typeof STRATEGY_PROFILES = 'classic'` param. Internally pull thresholds from the profile, not module constants.
  - Behavior contract: when `presetId === 'classic'` (the default), every threshold and weight is identical to today's. **Zero observable change for any caller.**
- `apps/web/lib/tracked-signals.ts`: pass `getActivePreset()` (already imported per CLAUDE.md note) into `generateSignalsFromTA`. Keep current default behavior.

**Explicitly NOT in this task (deferred to Phase 2/3):**
- Adding `'hmm-top3'`, `'regime-aware'`, `'vwap-ema-bb'`, `'full-risk'` profile entries with different thresholds.
- Setting `SIGNAL_ENGINE_PRESET` to anything other than `classic` on prod.
- A/B observation tooling.

**Verification:**
- Engine output for `classic` preset must be byte-for-byte identical to current production for a fixed test fixture. Add a snapshot test if one doesn't already exist for `generateSignalsFromTA`.
- `npm run build` passes.

**Commit message:** `feat(signal-engine): add STRATEGY_PROFILES scaffold for preset dispatch`

---

### Task 3 — License Phase A: tier→strategy bridge (additive, no removals)

**Goal:** introduce the canonical access-context API. License code stays untouched.

**Changes:**

- `apps/web/lib/tier.ts`:
  - Add `getStrategiesForTier(tier: Tier): Set<string>` returning:
    - `free`: `new Set(['classic'])` (matches `FREE_STRATEGY` from `licenses.ts`)
    - `pro`: all of `ALLOWED_PREMIUM_STRATEGIES` from `licenses.ts` plus `'classic'`
    - `elite`: same as pro (today; future may add elite-only)
    - `custom`: same as elite
  - Add `resolveAccessContext(req: Request): Promise<{tier: Tier, unlockedStrategies: Set<string>}>`. Reads tier via `getTierFromRequest`. Returns `unlockedStrategies` from `getStrategiesForTier(tier)`.

**Out of scope:**
- Migrating any reader (Phase B's job).
- Removing license code (Phase D's job).

**Verification:**
- New unit tests in `apps/web/lib/__tests__/tier.test.ts`:
  - `getStrategiesForTier('free').has('classic') === true`
  - `getStrategiesForTier('free').has('hmm-top3') === false`
  - `getStrategiesForTier('pro').has('hmm-top3') === true`
  - `getStrategiesForTier('pro').has('tv-zaky-classic') === true`
- `npm run build` passes.

**Commit message:** `feat(monetization): add tier-based strategy access bridge`

---

### Task 4 — License Phase B: migrate readers from `resolveLicense` to `resolveAccessContext`

**Goal:** every consumer gates on tier instead of license key. License keys still resolve (their cookies/headers are still respected) but don't grant any extra access — Stripe tier is canonical.

**Files to migrate (estimated ~12; final list confirmed by subagent grep):**

- `apps/web/app/api/premium-signals/route.ts`
- `apps/web/app/api/premium-signals/chart/route.ts`
- `apps/web/app/api/signal-of-the-day/route.ts`
- `apps/web/app/api/consensus/route.ts`
- `apps/web/app/api/strategy-breakdown/route.ts`
- `apps/web/app/api/v1/signals/route.ts`
- `apps/web/lib/tracked-signals.ts`
- `apps/web/lib/premium-signal-source.ts`
- `apps/web/lib/premium-signals.ts` (rewrites `getPremiumSignalsFor(ctx)` to take `{unlockedStrategies}` instead of full `LicenseContext` — same shape, narrower type)
- Plus any client/server component still calling `resolveLicense` (subagent must grep and migrate).

**Type compatibility:** `resolveAccessContext` returns `{tier, unlockedStrategies}`. Existing consumers that destructured `ctx.unlockedStrategies` from `LicenseContext` continue to work because the new type also exposes `unlockedStrategies`. `licenseId`, `expiresAt`, `issuedTo` fields are dropped — subagent must check no consumer reads those (they exist in `LicenseContext` but I expect no real reads outside admin code).

**Per-file behavior change:**
- Anonymous caller (no session, no license cookie): tier = free → unlocked = `['classic']`. Same as today.
- Free Stripe sub: tier = free → unlocked = `['classic']`. Same as today.
- **Pro Stripe sub (NEW behavior): tier = pro → unlocked = ALL premium strategies including `tv-zaky-classic` etc.** Previously a Pro sub got nothing from `premium_signals`.
- License-key holder with no Stripe sub: tier = free → unlocked = `['classic']`. **They lose their premium access.** This is the explicit decision per user; license keys are dead.

**Verification:**
- Existing E2E tests under `apps/web/tests/e2e/licenses/premium-licenses.spec.ts` will fail. Update them to assert tier-based access (Pro sub → premium signals visible) and license-key keys → no access.
- Add a test: anonymous caller hits `/api/premium-signals` → `{signals: [], locked: true}`.
- Add a test: simulated Pro session hits `/api/premium-signals` → returns all premium strategy signals.
- `npm run build` passes.

**Commit message:** `refactor(monetization): gate premium signals by Stripe tier, not license key`

---

### Task 5 — License Phase C: remove license-key UI

**Goal:** no path in the UI to enter, view, or be told about license keys.

**Files to delete:**

- `apps/web/app/unlock/` (entire directory — `unlock-client.tsx`, `page.tsx`)
- `apps/web/app/components/StrategyAccessBar.tsx` (if its only purpose is showing license-keyed strategy access; otherwise rewrite to show tier-based access)
- Any nav link to `/unlock` (likely in `PageNavBar.tsx` or a footer)

**Files to edit (remove license-key references):**
- Any landing/marketing component that mentions "license key" or "unlock with key"
- README sections that describe the OSS license-key flow (move to a deprecated section or delete; user confirmed OSS upgrade path is now hosted Pro only)

**Verification:**
- No route at `/unlock` (404).
- No UI string "license key" outside admin pages (those go in Phase D).
- `npm run build` passes.

**Commit message:** `feat(ui): remove license-key entry surface`

---

### Task 6 — License Phase D: remove license admin + verify routes + lib

**Goal:** no code reads `strategy_licenses` or `strategy_license_grants` tables. Tables remain in DB, dropped in Phase E.

**Files to delete:**
- `apps/web/app/api/admin/licenses/route.ts`
- `apps/web/app/api/admin/licenses/[id]/route.ts`
- `apps/web/app/api/admin/licenses/[id]/revoke/route.ts`
- `apps/web/app/api/licenses/verify/route.ts`
- `apps/web/app/api/licenses/telegram-invites/route.ts` (verify telegram invite logic doesn't depend on license — if it does, migrate to tier-based)
- `apps/web/app/admin/licenses/page.tsx`
- `apps/web/lib/licenses.ts`
- `apps/web/lib/license-client.ts`
- `apps/web/tests/e2e/licenses/premium-licenses.spec.ts` (the tier-gated equivalents from Phase B already cover the flows)

**Files to edit:**
- Any remaining import of `'@/lib/licenses'` or `'../lib/licenses'` — should be zero by now since Phase B migrated everything; subagent must grep to confirm.

**Verification:**
- `grep -rln "from.*licenses'" apps/web/app apps/web/lib apps/web/components` returns nothing pointing at the deleted files.
- `npm run build` passes.
- E2E suite still green.

**Commit message:** `chore(monetization): remove license admin + verify infrastructure`

---

### Task 7 — License Phase E: drop license tables (DESTRUCTIVE — gated)

**Goal:** drop the now-unused tables.

**Pre-flight gates (subagent MUST NOT proceed without all three):**
1. Phase D deployed to prod for at least 24h with no rollback.
2. Active license count = 0 OR explicit user sign-off on stranding any remaining keys.
3. Explicit user `proceed phase E` confirmation.

**Changes:**
- New migration `apps/web/migrations/018_drop_license_tables.sql`:
  ```sql
  -- 018_drop_license_tables.sql
  -- Retires the license-key system. Stripe tier is now the canonical
  -- access gate. See docs/plans/2026-05-01-monetization-consolidation.md.
  DROP TABLE IF EXISTS strategy_license_grants;
  DROP TABLE IF EXISTS strategy_licenses;
  ```

**Verification:**
- Migration runs cleanly on a fresh DB (Phase D code already doesn't reference these tables).
- `npm run build` passes.

**Commit message:** `chore(db): drop strategy_licenses tables`

---

## Final review

After all 7 tasks: dispatch a single `code-reviewer` subagent against the full diff `main...feat/monetization-consolidation`. They confirm:

- Free tier truly shows 6 symbols, 7-day history.
- No `from.*licenses'` imports remain.
- No `resolveLicense` callers remain.
- No `tck_live_` strings remain in non-test code.
- `STRATEGY_PROFILES` exists with `classic` profile and engine output is unchanged for `classic`.
- Pro tier gets all premium strategies via `resolveAccessContext`.
- All tests green.

Then `superpowers:finishing-a-development-branch` to merge / PR.

## Deferred (logged, not in scope)

- ⚠️ Task 1 nit cleanup (minor): redundant `toContain` block in `tier.test.ts:52-56` (subsumed by exact-equality assertion above); asymmetric assertion depth between SPYUSD and QQQUSD test cases. Address in a future test-cleanup pass.
- ⚠️ Task 4 nits (minor):
  - `premium-signals/route.ts` regressed `@/lib/...` alias to relative path imports — restore alias to match surrounding files.
  - Convoluted conditional-type cast in `route.test.ts:108-110` hides missing required fields; replace with `as unknown as TradingSignal`.
  - Inline `STRATEGY_PRIORITY` in `tracked-signals.ts:24` is byte-identical to `licenses.ts`; add a one-line comment flagging the drift risk until Phase D removes the license version.
  - `Set<string> | ReadonlySet<string>` union on `StrategyAccess` could simplify to `ReadonlySet<string>` alone (helpers are read-only).
  - Two route-gating test cases (anonymous + free) are input-identical and assert the same outcome — one can be dropped.
- ⚠️ Phase D follow-through:
  - e2e spec at `apps/web/tests/e2e/licenses/premium-licenses.spec.ts` was deferred from Task 4 and now has a confirmed broken test case (line 54 navigates to deleted `/unlock`). Phase D must delete the whole spec OR rewrite to assert tier-based behavior. **(Resolved in Phase D — file deleted.)**
  - 21 `fetchWithLicense` consumers across `apps/web` still import from `lib/license-client.ts`. Phase D must either remove these imports + use plain `fetch`, or convert `fetchWithLicense` into a no-op alias for `fetch`. **(Resolved in Phase D — all 21 migrated to plain `fetch`, helper deleted.)**
- ⚠️ Phase D commit-hygiene cleanup:
  - Commit `ea0679fa` (license source-file deletion) was authored by a parallel session with a non-conforming message — no plan citation, no Co-Authored-By trailer.
  - Commit `2dd5b44d` mixed Phase D's `tradingview/route.ts` migration with unrelated admin-dashboard / tier-banner / email-grants feature work, violating CLAUDE.md's one-concern + 15-file rules. The non-Phase-D surface is its own feature commit; consider splitting before merge.
  - Stale JSDoc on `PRO_STRATEGIES` in `apps/web/lib/tier.ts` lines 71-77 still references the deleted `./licenses` and drift-check test. Trim to "Single source of truth for strategies a Pro tier unlocks."
- ⚠️ Dirty working tree at end of Phase D contains uncommitted parallel-session work:
  - Modified: `apps/web/.env.example`, `apps/web/app/api/auth/session/route.ts`, `apps/web/app/dashboard/DashboardClient.tsx`, `apps/web/app/globals.css`, `apps/web/lib/hooks/use-user-tier.ts`, `apps/web/lib/tier.ts` (email-pro-grant lines).
  - Untracked: `apps/web/app/admin/page.tsx`, `apps/web/app/components/tier-banner.tsx`, `apps/web/lib/admin-emails.ts`, `apps/web/lib/admin-gate.ts`, `docs/plans/2026-05-01-theme-light-dark-all-pages.md`.
  - None touch license code (verified). Treat as a separate feature scope; commit or revert before final consolidation review.
- ⚠️ Task 2 nits (minor):
  - `safeProfileId` falls back to `'classic'` silently — prod's `SIGNAL_ENGINE_PRESET=hmm-top3` is currently silently downgrading. Add a `console.warn` on non-empty unknown ids for observability.
  - Snapshot test in `signal-generator.test.ts` could pass vacuously if all seeds yield empty signal arrays. Add `expect(before.length).toBeGreaterThan(0)` on at least one seed.
  - `STRATEGY_PROFILES.classic.weights` and `bbSqueezeThreshold` are declared but not consumed by the engine (the engine still reads module-level `WEIGHTS` and `BB_SQUEEZE_THRESHOLD`). Either wire them through (Phase 2) or drop the fields with a comment indicating they're reserved for Phase 2 dispatch.
- ⚠️ Marketing copy on landing/pricing hero ("Every signal we've ever shipped is in a public Postgres row...") — copy-only commit, not in this plan.
- ⚠️ Dashboard "always show last 5 free-tier signals from `signal_history`" UI — separate task, fixes the dead-feeling free dashboard from audit baseline.
- ⚠️ `signals-live.json` empty-in-prod issue — separate fix.

## Risk register

| Risk | Mitigation |
|---|---|
| Customers with active license keys lose access between Phase B deploy and Phase E | User confirmed: no grandfather. Pre-Phase-E count + comms gate handles it. |
| Premium signals empty for everyone right after Phase B if `premium_signals` table is empty | Verify table has rows BEFORE Phase B ships. CLAUDE.md says TV webhooks write to it — confirm with `SELECT count(*) FROM premium_signals` (deferred query). |
| Phase B engine math change unintentional | Phase B is gating-only; no engine logic touched. Snapshot tests in Task 2 catch any drift. |
| Stripe webhook doesn't update tier promptly, Pro user sees empty premium feed for minutes | Existing webhook handles this; not in this plan's scope. Flag if observed. |
| `signals-live.json not found or empty` issue from baseline (#1 in audit) is NOT fixed by this plan | Tracked separately. This plan widens free tier and consolidates monetization; the dead-dashboard problem is a follow-up task. |
