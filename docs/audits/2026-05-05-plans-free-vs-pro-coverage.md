# Audit — Plan Coverage for Free vs Pro User Journey

**Date:** 2026-05-05
**Auditor:** Claude (code-level, in-tree only)
**Scope:** Cross-check `docs/plans/*` against the 17 findings in `docs/audits/2026-05-05-free-vs-pro.md` and against the actual current code state in `apps/web/`.
**Goal:** Find which plans shipped, which drifted, which are stale, and which findings have no plan owner.

## TL;DR

- 14 plans touch the free/pro user journey. 9 shipped, 1 superseded, 4 partial / runbook / never-completed.
- Of the 17 audit findings, **only 1 has plan coverage** (F-015, partially). The other 16 — including all 5 fix-now items — have no owning plan; they live as "fix specs" in Section 8 of the audit only.
- One destructive phase (`monetization-consolidation` Phase E — drop license tables) was authored, gated on user sign-off, and never executed. The tables likely still exist in prod Postgres.
- Two billing-trust gaps (F-005 CSV export, F-014/F-017 stale JSDoc + missing test) trace to plans that explicitly deferred these to "follow-up" and never opened one.

## Method

1. Inventoried `docs/plans/*.md` (25 files), kept the 14 that touch free/pro user journey, billing, paywall, or onboarding.
2. For each plan, checked actual code state of the files it claimed to create or change. Concrete checks: existence of `lib/licenses.ts`, `app/unlock/`, `lib/web-push-server.ts`, `lib/transactional-email.ts`, `app/components/past-due-banner.tsx`, `app/components/trial-countdown.tsx`, `app/welcome/WelcomeClient.tsx`, `lib/telegram-link-token.ts`, `lib/signal-repo.ts`, migrations `019/021/023/024`.
3. Re-verified key audit findings against current code (post-finalization) to confirm fix-now items are still open.
4. Mapped each of the 17 audit findings (F-001..F-017) to the plan(s) — if any — that own remediation.

## 1. Plan Inventory and Ship Status

| Plan | Scope | Status | Verification |
|---|---|---|---|
| `2026-04-19-tier-segregation-backend-hardening.md` | `FREE_SYMBOLS` exported once, `filterSignalByTier`, fail-closed `getUserTier` | SHIPPED — superseded by `2026-05-01-monetization-consolidation` | `tier-client.ts:7` exports FREE_SYMBOLS; canonical |
| `2026-04-19-tier-segregation-ui-gates.md` | `lib/tier-client.ts`, lock badges, masked TP cells | SHIPPED | `LockedTP`, `TierBadge`, `LockedSignalCard` exist (audit §4) |
| `2026-04-19-tier-segregation-telegram-routing.md` | Public Telegram cron filtered to `FREE_SYMBOLS` | SHIPPED | sibling specs shipped; no audit finding contradicts |
| `2026-04-19-webhooks-db-migration.md` | User-scoped webhooks table | SHIPPED | mig 013 present |
| `2026-04-20-paid-funnel-and-proof.md` | Phase 1 funnel design + Phase 2 proof design | SHIPPED (design, paired with `-impl.md`) | `welcome/`, `pricing/PricingCards.tsx` exist; not marked SUPERSEDED but design-only |
| `2026-04-20-paid-funnel-and-proof-impl.md` | Step-by-step build of design above | SHIPPED | `WelcomeClient.tsx`, monthly/annual toggle, `signin?next=...` resume — confirmed |
| `2026-04-20-gate-blocked-recording.md` | `gate_blocked` column on `signal_history` | SHIPPED | mig 017 present |
| `2026-04-26-hourly-autonomous-build.md` | Meta-process: prompt for autonomous build loop | RUNBOOK (process doc, not implementation) | n/a |
| `2026-05-01-monetization-consolidation.md` | Free 3→6 symbols, history 1d→7d, retire license keys (Phases A–E) | **PARTIALLY SHIPPED** — Phases A–D done; **Phase E never run** | `lib/licenses.ts` MISSING (D done); `FREE_SYMBOLS` = 6 entries; **no `018_drop_license_tables.sql` migration exists** — tables likely live in prod |
| `2026-05-01-bot-signals-com-spinout.SUPERSEDED.md` | Spin-out narrative | **SUPERSEDED** (correctly named) | replaced by `2026-05-01-talkbot-and-botsignals-spinout.md` |
| `2026-05-01-talkbot-and-botsignals-spinout.md` | Spin-out replacement | OFF-SCOPE for this audit | n/a — separate domain |
| `2026-05-01-theme-light-dark-all-pages.md` | Theme toggle | OFF-SCOPE | n/a |
| `2026-05-01-tradeclaw-pilot-binance-futures.md` | Auto-execution pilot | OFF-SCOPE | mig 018 present |
| `2026-05-02-pro-paywall-hardening.md` | 9 paywall + webhook fixes | **PARTIALLY SHIPPED** — telegram link token, idempotent webhook (mig 019), past-due grace done; **task 1 (gate `/api/v1/signals` through tier filter) status unclear** — code still returns HTTP 200 on error path (audit F-009) | `lib/telegram-link-token.ts` exists; mig 019 exists; `Vary: Cookie` only on v1/signals (audit F-016 still open) |
| `2026-05-02-tradeclaw-eight-improvements.md` | 8 phases incl. Phase 6 free-tier countdown | SHIPPED (Phase 6 confirmed) | `DelayCountdown` exists; audit §4 confirms |
| `2026-05-02-countdown-timer.md` | `LockedSignalStub` + per-signal countdown | SHIPPED | `LockedSignalCard` (DashboardClient.tsx:348-397) confirmed; `LockedSignalStub` type at `tier.ts` |
| `2026-05-03-dunning-and-past-due-banner.md` | Resend dunning + red banner | SHIPPED | `lib/transactional-email.ts` + `app/components/past-due-banner.tsx` exist |
| `2026-05-03-trial-countdown-and-reminder.md` | T-1d email + amber countdown | SHIPPED | mig 023 + `app/components/trial-countdown.tsx` exist |
| `2026-05-03-pro-notification-journey.md` | Web push Layers 1 & 2 | SHIPPED | `lib/web-push-server.ts` exists |
| `2026-05-03-prod-smoke-test-runbook.md` | Manual prod smoke | RUNBOOK | n/a — verification doc |
| `2026-05-03-weekend-signals-and-detail-404.md` | Tangential | OFF-SCOPE | n/a |

## 2. Coverage Matrix — Audit Findings vs Plans

The 17 audit findings are listed left to right; the column is the plan (if any) that owns the fix.

| Finding | Severity | Owning plan | Code state |
|---|---|---|---|
| F-001 dashboard SSR LEAK (no `filterSignalByTier`/`splitDelayed`) | critical | **NONE** | `app/dashboard/page.tsx` calls `getTrackedSignals` directly; no tier mask. UNFIXED. |
| F-002 `/api/prices/stream` SSE no auth + premium-band leak | high | **NONE** | UNFIXED — confirmed in audit, no plan covers SSE auth |
| F-003 `/api/demo/telegram` no auth | high | **NONE** | UNFIXED |
| F-004 `stopLoss` not masked for free | high | **NONE** | `tier.ts` has no `result.stopLoss = ...` assignment for free; UNFIXED |
| F-005 CSV export advertised, not implemented | high (billing trust) | **NONE** | only `Content-Disposition` in `app/api/openapi/route.ts`. Both `monetization-consolidation` Task 1 and `paid-funnel-and-proof` explicitly *defer* landing/pricing copy fixes. Orphan. |
| F-006 `/api/signals/record` no write auth | medium | **NONE** | route at `app/api/signals/record/route.ts` accepts POST/GET with no guard. UNFIXED |
| F-007 `/api/premium-signals` returns 200, not 402 | medium | partially in `pro-paywall-hardening` (canonical 402 pattern), but premium-signals not in scope | route returns `{signals: [], locked: true}` HTTP 200. UNFIXED |
| F-008 `/api/premium-signals/chart` returns 403, not 402 | medium | **NONE** | UNFIXED |
| F-009 `/api/v1/signals` error path returns 200 | medium | `pro-paywall-hardening` task 1 (was supposed to apply tier filter); audit confirms still leaking on error | UNFIXED |
| F-010 `tier-banner.tsx:79` upgrade CTA missing `?from=` | medium | **NONE** | UNFIXED |
| F-011..F-013 three other CTAs missing `?from=` | low | **NONE** | UNFIXED |
| F-014 stale JSDoc on `PRO_STRATEGIES` referencing deleted `licenses.ts` | low | **flagged-as-deferred** in `monetization-consolidation` Phase D Deferred section, never followed up | UNFIXED |
| F-015 dead `signal-repo.ts` + `live_signals` table | low | **PARTIALLY** in `monetization-consolidation` cleanup queue (workspace `CLAUDE.md`) | `signal-repo.ts` already DELETED ✅; mig `021_drop_live_signals.sql` exists in repo but per workspace CLAUDE.md not applied to prod |
| F-016 `/api/v1/signals` missing `Vary: Authorization` | low | **NONE** | only `Vary: Cookie` at line 78. UNFIXED (latent until CDN added) |
| F-017 `PRO_STRATEGIES` cross-check test missing | low | **flagged-as-deferred** in `monetization-consolidation` Phase D Deferred section | tier.test.ts has zero `PRO_STRATEGIES` references. UNFIXED |

**Score:** 0 of 5 fix-now findings have a current plan. 0 of 4 fix-soon findings have a current plan. 1 of 8 deferred findings (F-015) has partial plan coverage.

## 3. Plan Health Issues

### 3.1 Phase E never executed (destructive cleanup pending)

`2026-05-01-monetization-consolidation.md` Task 7 was a gated drop of `strategy_licenses` and `strategy_license_grants` tables, contingent on three pre-flight checks. The repo migration list shows `017` → `018_pilot_executions.sql` → `019_processed_stripe_events.sql` — **`018_drop_license_tables.sql` is absent**. The license code has been removed (`lib/licenses.ts` is gone, confirmed) but the underlying tables almost certainly still exist in Railway Postgres. This is a process gap, not a code bug — but Phase E either needs running or the plan needs a "Phase E deliberately abandoned" footer.

### 3.2 Two findings flagged as "Deferred" with no follow-up plan

`monetization-consolidation` Phase D Deferred section explicitly flags:

- **stale JSDoc lines 71-77** of `tier.ts` referencing the deleted `./licenses` (audit F-014).
- (implied) **missing PRO_STRATEGIES drift test** (audit F-017).

Both showed up in the new audit four days later as standalone findings. The deferred-list mechanism is not converting to action; nothing in `docs/plans/` since 2026-05-01 picks them up.

### 3.3 Two plans address per-signal countdown without coordination

- `2026-05-02-countdown-timer.md`: per-signal `LockedSignalStub` cards with countdown to `availableAt`.
- `2026-05-02-tradeclaw-eight-improvements.md` Phase 6: a global `DelayCountdown` ticker showing time until next 15-min refresh.

Both shipped. They are complementary surfaces (per-card vs. global ticker) but neither plan cross-references the other — so a future reader may assume one supersedes the other. Add a one-line link between them, or note the layering.

### 3.4 `pro-paywall-hardening` Task 1 status diverged from plan

Plan task 1 was: "gate `/api/v1/signals` through tier filter, apply `filterSignalByTier`, `TIER_DELAY_MS`, symbol allowlist, ≥85 band hide on the live-file path". Audit F-009 shows the route still returns HTTP 200 + empty set on error path, and F-016 shows it has no `Vary: Authorization`. Either task 1 partially shipped, or its definition-of-done was narrower than the audit's bar. Reconcile in the plan or open a remediation ticket.

### 3.5 Design and impl plans not cross-linked

`2026-04-20-paid-funnel-and-proof.md` (design) and `2026-04-20-paid-funnel-and-proof-impl.md` (62 KB step-by-step) sit side-by-side with no DESIGN/IMPL marker. The design doc has no "see -impl.md for execution" header, and the impl doc has no "supersedes design" header. Future readers will read both. Add a one-line backref in each.

### 3.6 No plan owns marketing-copy ↔ feature-delivery alignment

F-005 (CSV export advertised, not built) is the canonical billing-trust example. The closest owning surface — `TIER_DEFINITIONS[1].features` in `lib/stripe-tiers.ts` — is mutated by `monetization-consolidation` Task 1 ("update Free tier features copy") and by `paid-funnel-and-proof-impl` (pricing toggle), but no plan has ever audited the *full Pro feature list* against actual code. CSV export is the symptom; the absent process is the root cause. Recommend a one-shot plan: "Pro feature copy ↔ delivery audit (each bullet has a code citation or comes off the card)".

### 3.7 No plan owns `?from=` upgrade attribution

F-010..F-013 are four CTAs missing `?from=` query param. Audit §4 documented them but no plan exists. Single-commit fix candidate; needs an owner.

## 4. Recommendations

| # | Action | Owner | Acceptance |
|---|---|---|---|
| 1 | Open `docs/plans/2026-05-05-fix-now-free-vs-pro.md` covering F-001..F-005. Each finding gets one task with the spec from audit §8 already drafted. | engineering | five tasks, each ≤2 files, each with verification command |
| 2 | Decide Phase E (drop `strategy_licenses` tables) — either run it or amend `monetization-consolidation.md` with "Phase E abandoned" footer. | Zaky | DB inspection shows the tables either gone or explicitly retained |
| 3 | Add a one-shot "Pro feature copy ↔ delivery" plan: every bullet in `TIER_DEFINITIONS[1].features` must cite a route/component that delivers it. CSV export either ships behind `/api/signals/export?format=csv` gated to Pro, or comes off the card. | engineering | grep of pricing card ↔ codebase has zero orphan claims |
| 4 | Cross-link `paid-funnel-and-proof.md` ↔ `paid-funnel-and-proof-impl.md` and `countdown-timer.md` ↔ `tradeclaw-eight-improvements.md` Phase 6 with one-line headers. | engineering | both pairs have backref headers |
| 5 | Reconcile `pro-paywall-hardening` Task 1 vs audit F-009/F-016. Either close the gap in code, or update the plan's verification criteria to match what shipped. | engineering | audit F-009 + F-016 closed or explicitly accepted |
| 6 | Convert `monetization-consolidation` Phase D **Deferred** entries into `docs/plans/2026-05-05-tier-cleanup.md` (covers F-014, F-015 migration application, F-017). | engineering | new plan exists, items removed from monetization Deferred section |
| 7 | Single attribution-cleanup commit covering F-010..F-013 (four `href="/pricing"` → `href="/pricing?from=<surface>"`). No new plan needed; track as a one-line item in `STATE.yaml`. | engineering | grep `href="/pricing"` returns zero non-attributed CTAs |

## 5. What this audit does not say

- Does not verify Stripe live env var values (price IDs) — same deferral as the parent audit Section 5.
- Does not run the prod smoke runbook (`2026-05-03-prod-smoke-test-runbook.md`); that's a separate manual procedure.
- Does not audit plans for spin-out / pilot / theme work — out of scope (free/pro user journey only).
- Does not re-derive the 17 findings; relies on the parent audit's findings register as ground truth, then verifies each against current code.

## 6. Verification commands used

```bash
# Plan inventory
ls docs/plans/

# Phase D / E completion checks
test -f apps/web/lib/licenses.ts                       # MISSING — Phase D done
test -d apps/web/app/unlock                            # MISSING — Phase D done
test -f apps/web/lib/signal-repo.ts                    # MISSING — F-015 partial
ls apps/web/migrations/ | grep -E '^(018|019|021|023|024)_' # 019, 021, 023, 024 present; no 018_drop_license_tables

# Fix-now still-open
grep -n "filterSignalByTier\|splitDelayed" apps/web/app/dashboard/page.tsx        # nothing → F-001 open
grep -n "stopLoss\s*=" apps/web/lib/tier.ts                                       # nothing → F-004 open
grep -rn "Content-Disposition" apps/web/app/api/                                  # only openapi → F-005 open
head -20 apps/web/app/api/signals/record/route.ts                                  # no guard → F-006 open
head -15 apps/web/app/api/premium-signals/route.ts                                 # 200 + locked:true → F-007 open
grep -n "Vary" apps/web/app/api/v1/signals/route.ts                               # only Cookie → F-016 open
grep -n "PRO_STRATEGIES\|ALLOWED_PREMIUM_STRATEGIES" apps/web/lib/__tests__/tier.test.ts  # nothing → F-017 open
```
