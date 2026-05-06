# TradeClaw Pro — Paywall & Webhook Hardening

**Date:** 2026-05-02
**Branch:** `main` (in-place, surgical commits)
**Driver:** Audit of TradeClaw Pro surfaced paywall leak, impersonation, and webhook idempotency gaps.

## Why

Audit on 2026-05-02 surfaced 3 critical/high issues that allow free callers to read Pro signal data, allow impersonation via the Telegram bot deep-link, and allow gifting / customer-record clobber via the Stripe checkout body fallback. Plus 3 high/medium issues that cause silent paid-customer churn and webhook side-effect duplication. All listed in the audit response on 2026-05-02.

## Scope

One commit per concern. No commit touches >15 files.

### Immediate (paywall leaks + impersonation)

1. **fix(billing): gate /api/v1/signals through tier filter**
   - `apps/web/app/api/v1/signals/route.ts` — apply `filterSignalByTier`, `TIER_DELAY_MS`, symbol allowlist, ≥85 band hide on the live-file path. Add `apps/web/app/api/v1/signals/__tests__/route.test.ts`.
   - **Reconcile note (2026-05-05):** initial commit shipped tier filter + `Vary: Cookie`. Audit `2026-05-05-plans-free-vs-pro-coverage.md` flagged two residual gaps:
     - **F-009** — error catch returned HTTP 200 + empty signals list (silent failure).
     - **F-016** — missing `Vary: Authorization` (latent CDN poisoning between cookie-auth and bearer-token callers).
     - Both closed 2026-05-05 in the same route + test: catch now returns 503 with `error: "upstream_unavailable"`, `Vary` set to `Cookie, Authorization`. Verification: `npm test -- apps/web/app/api/v1/signals/__tests__/route.test.ts`.

2. **fix(billing): drop body-userId fallback in /api/stripe/checkout**
   - `apps/web/app/api/stripe/checkout/route.ts` — read session only.
   - `apps/web/app/dashboard/billing/page.tsx` — drop `userId` from request bodies.

3. **feat(telegram): token-based bot link**
   - `apps/web/lib/telegram-link-token.ts` — HMAC-signed, single-use, 10-min TTL.
   - `apps/web/app/api/telegram/link-token/route.ts` — issuance.
   - `apps/web/app/api/telegram/route.ts` — `/start <token>` validation.
   - `apps/web/app/welcome/WelcomeClient.tsx` + `apps/web/app/dashboard/billing/page.tsx` — fetch token before deep-linking.
   - Tests for token sign/verify + replay rejection.

### This week (webhook hardening)

4. **feat(billing): idempotent stripe webhook ledger**
   - Migration `019_processed_stripe_events.sql`.
   - `apps/web/app/api/stripe/webhook/route.ts` — short-circuit on processed `event.id`.
   - Test for double-delivery.

5. **fix(billing): past_due grace window**
   - `apps/web/lib/tier.ts` + `apps/web/lib/db.ts` — keep paid access through `current_period_end + 7d` while past_due.
   - Tests.

6. **fix(billing): subscription_updated unknown priceId hardening**
   - `apps/web/app/api/stripe/webhook/route.ts` — throw on unmapped priceId in `handleSubscriptionUpdated`, mirror checkout.
   - Test.

### Billing UI

7. **fix(ui): pricing copy sync + currentTier narrowing**
   - `apps/web/app/pricing/page.tsx` — comparison table reads from `TIER_DEFINITIONS`.
   - `apps/web/app/dashboard/billing/page.tsx` — narrow with `meetsMinimumTier`.

### Cleanup

8. **chore(telegram): scope manual-send mode to self-host**
   - `apps/web/app/api/telegram/route.ts` — keep mode-2 (self-host UI uses it) but require an explicit `X-TradeClaw-Self-Host: 1` header so it's not exposed under hosted Pro.

9. **refactor(billing): subscriptions canonical, drop unused users.tier readers**
   - `apps/web/lib/db.ts` — remove `getUserTierFromSession` (zero callers).
   - Note: `users.tier` stays as denormalized read-cache for admin list views; webhook is the only writer.

## Verification per task

- Each task: `npm run build -w apps/web` passes.
- New tests added per task pass: `npx jest <pattern>` from repo root.
- No commit > 15 files.

## Out of scope

- Marketing copy changes beyond pricing-table sync.
- Email dunning for `payment_failed` (TODO in webhook stays).
- Real-time strategy A/B via `SIGNAL_ENGINE_PRESET` (covered in 2026-05-01 plan).
- Migration 010 prod-state verification — separate ops task.
