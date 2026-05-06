# Pro user journey — E2E coverage close-out

Date: 2026-05-06
Slug: `pro-journey-e2e-coverage`

## Problem

The anon side of the pro funnel is well-covered (pricing, locked detail, signin redirect, public teaser API). The authenticated half is dark:

- `paywall-pro.spec.ts` is `test.fixme`'d behind two env vars that don't exist anywhere (`E2E_FORCE_PRO_TIER`, `STRIPE_TEST_PRO_USER_ID`) — comment in file confirms this is a known gap.
- No test exercises the Stripe checkout 200 happy path (only the 401 → signin redirect).
- `/welcome`, `/api/telegram/link-token`, `/api/stripe/portal`, Pro `/api/signals` payload, Pro `/dashboard` render — all untested.
- `signin.spec.ts:137` assumes prod has no `GOOGLE_OAUTH_CLIENT_ID` and fails on the prod URL.

Source: audit report in conversation 2026-05-06.

## Approach

Single low-blast stub in `lib/tier.ts::getUserTier` activated by `E2E_FORCE_PRO_TIER=true` + `NODE_ENV !== 'production'`. All Pro-side tests forge an HMAC session for a known userId and rely on this stub. No DB writes, no Stripe network calls — Stripe + Telegram side-effect routes are mocked at Playwright's network layer.

## Sequence (one concern per commit)

1. `fix(e2e): scope OAuth-not-configured test to dev env` — `signin.spec.ts:137` skip when OAuth is configured.
2. `feat(tier): E2E_FORCE_PRO_TIER stub for getUserTier in non-prod` — `lib/tier.ts` only.
3. `test(e2e): pricing checkout 200 happy path` — extend `pricing.spec.ts`.
4. `test(e2e): welcome page authed render` — extend `welcome.spec.ts` with forged session.
5. `test(e2e): telegram link-token round-trip` — new `tests/e2e/features/telegram-link.spec.ts`.
6. `test(e2e): stripe portal redirect for pro user` — new `tests/e2e/features/billing-portal.spec.ts`.
7. `test(e2e): pro-tier /api/signals payload` — new `tests/e2e/api/pro-signals-payload.spec.ts`.
8. `test(e2e): pro user dashboard renders unmasked` — new `tests/e2e/features/pro-dashboard.spec.ts`.
9. `test(e2e): activate paywall-pro suite via tier stub` — drop `test.fixme` guards once stub is in.

## Verification

- Each commit ships with a local Playwright run target + expected pass/skip count.
- Final run command:
  ```
  USER_SESSION_SECRET=test-secret-min-16-chars E2E_FORCE_PRO_TIER=true \
    npx playwright test
  ```
- All Pro-side tests must pass against `npm run dev`.
- Prod config (`playwright.prod.config.ts`) keeps current behavior — stub only fires on dev.

## Out of scope (deferred)

- P3 mobile project — separate config edit.
- P3 webhook signed-event integration test — needs Stripe CLI; logged in `TODO.md`.
- P3 cancellation downgrade flow.
- P3 promo code path.
