# Dunning email + past-due banner

**Date:** 2026-05-03
**Tickets:** P1 (HIGH) + P2 (HIGH) from churn-hole audit
**Goal:** Stop silent churn when a customer's card fails. They should (a) receive an email with a 1-click "update payment method" link within seconds of `invoice.payment_failed`, and (b) see a red past-due banner the next time they open the dashboard, with the same CTA.

## Problem (one sentence)

`apps/web/app/api/stripe/webhook/route.ts:245` carries a `// TODO: trigger dunning email via your email provider`, and the dashboard renders no warning when `subscription.status === 'past_due'`. A customer whose card expires loses access at the end of the 7-day grace window with zero in-app or out-of-band signal — invisible churn.

## Assumptions

- Provider: **Resend**. Already wired (`apps/web/lib/email-sender.ts`), env vars `RESEND_API_KEY` + `RESEND_FROM_EMAIL` present on Railway. No new dep.
- Stripe billing portal already exists (`/api/stripe/portal` → `createPortalSession`). Banner CTA opens portal; email CTA uses Stripe's `hosted_invoice_url` (works without an active logged-in session).
- Smart Retries already configured on Stripe side. We do not implement our own retry — Stripe sends `invoice.payment_failed` per attempt.
- `PAST_DUE_GRACE_DAYS = 7` is unchanged (`apps/web/lib/tier.ts:214`).
- `TierBanner` is dashboard-only (`DashboardClient.tsx:1050`). Past-due banner stacks above it, same scope. Other pages (signals API, /track-record, /pricing) are not in scope for this ticket.

## Decisions (with reasons)

1. **Resend, not SendGrid.** Existing infra. Adding SendGrid means another verified domain and another secret with no upside.
2. **Separate `lib/transactional-email.ts`, not extension of `lib/email-sender.ts`.** The signal sender is parameterised on `AlertSignal` and inlines RGB colours for BUY/SELL — wrong shape for a billing email. Keep transactional and product-alert email decoupled so future templates (welcome, trial-ending) plug in without changing the alert pipeline.
3. **Dedup on status transition, not on event id.** Stripe retries the same invoice up to 4 times under Smart Retries — without dedup the customer gets 4 emails. The webhook already idempotency-claims by `event.id` (so redelivery is safe), but invoice-retry attempts have *different* event ids. Solution: only send the email when status transitions `active|trialing → past_due`. Subsequent failures keep the row at `past_due` and skip the email.
4. **Add `subscriptionStatus` to the session payload, not a new `/api/billing/status` endpoint.** `/api/auth/session` already runs `getUserTier` which already loads `getUserSubscription`. The status is one extra field on the response, ~5 lines. A separate endpoint would mean a second roundtrip on every dashboard mount.
5. **New `<PastDueBanner>` component, not a new branch in `<TierBanner>`.** Different urgency colour (red vs amber), can render simultaneously with the paid-tier banner during grace, and trivially removable later.
6. **Banner CTA: Stripe portal.** Standard path. `hosted_invoice_url` is for email only — portal is the better in-app surface because it lets the user update the default payment method, not just retry the one failed invoice.
7. **Test-mode behaviour: silent.** When `RESEND_API_KEY` is unset (preview / CI), `sendPaymentFailedEmail` returns `{ok:false, reason:'no_api_key'}` and the webhook logs to console. Webhook still returns 200. We do **not** throw — Stripe would retry forever and the past-due status would still be saved correctly.

## Files to touch

| File | Action | LOC |
|---|---|---|
| `apps/web/lib/transactional-email.ts` | new | ~80 |
| `apps/web/lib/__tests__/transactional-email.test.ts` | new | ~60 |
| `apps/web/app/api/stripe/webhook/route.ts` | edit `handlePaymentFailed` (transition dedup + email) | ~25 |
| `apps/web/lib/db.ts` | edit: extend `getUserSubscription` to also lookup by stripeSubscriptionId, or add `getSubscriptionByStripeId` | ~15 |
| `apps/web/app/api/auth/session/route.ts` | edit: add `subscriptionStatus` to response | ~8 |
| `apps/web/lib/hooks/use-user-tier.ts` | edit: add `subscriptionStatus` to `ClientSession` | ~3 |
| `apps/web/app/components/past-due-banner.tsx` | new | ~70 |
| `apps/web/app/dashboard/DashboardClient.tsx` | edit: render `<PastDueBanner />` above `<TierBanner />` | ~3 |

Total: 8 files, ~260 LOC. Within the 15-file commit ceiling but past 150 LOC, so per CLAUDE.md split across two commits — see "Commit plan" below.

## Build sequence

1. **Layer 1 — DB lookup helper.** Add `getSubscriptionByStripeId(stripeSubscriptionId)` to `lib/db.ts`. Returns the full `SubscriptionRecord` (need `userId`, `status`, `tier`).

2. **Layer 2 — Transactional email module.** New `lib/transactional-email.ts`:
   - `sendPaymentFailedEmail(to: string, opts: { hostedInvoiceUrl: string | null; amountDueCents: number; currency: string; nextAttemptAt: Date | null })` → `EmailSendResult` shaped like `email-sender.ts`.
   - Subject: `Action needed: your TradeClaw payment failed`.
   - Body explains failure, gives the hosted_invoice_url button, mentions 7-day grace window, and points to `/dashboard/billing` for the portal flow if the URL is missing. Plaintext + HTML.
   - No SDK; uses `fetch` against Resend REST same as `email-sender.ts`.
   - Returns shape that lets the webhook log meaningfully.

3. **Layer 3 — Webhook handler.** Rewrite `handlePaymentFailed`:
   ```
   const sub = await getSubscriptionByStripeId(subscriptionId);
   const wasAlreadyPastDue = sub?.status === 'past_due';
   await updateSubscriptionStatus(subscriptionId, 'past_due');
   if (wasAlreadyPastDue) return;          // dedup: skip email on retry attempts
   if (!sub) return;                        // can't email without user lookup
   const user = await getUserById(sub.userId);
   if (!user?.email) return;
   const result = await sendPaymentFailedEmail(user.email, {
     hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
     amountDueCents: invoice.amount_due ?? 0,
     currency: invoice.currency ?? 'usd',
     nextAttemptAt: invoice.next_payment_attempt
       ? new Date(invoice.next_payment_attempt * 1000) : null,
   });
   if (!result.ok) console.error('[webhook] dunning email failed:', result.reason);
   ```
   Wrapped in try/catch — never let email failures bubble to a 500 (Stripe would retry the whole webhook).

4. **Layer 4 — Session route.** `/api/auth/session` already imports `getUserTier`. Add a parallel call to `getUserSubscription(user.id)` and include `subscriptionStatus: sub?.status ?? null` on the response. Keep `tier` resolution as-is — they answer different questions (effective access vs raw billing state).

5. **Layer 5 — Client session hook.** Add `subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | null` to `ClientSession` in `use-user-tier.ts`.

6. **Layer 6 — Banner component.** `<PastDueBanner>`:
   - Renders nothing unless `subscriptionStatus === 'past_due'`.
   - Red border + bg, `AlertTriangle` icon (lucide).
   - Copy: "Your last payment failed. Update your card before {date} to avoid losing Pro access."
   - Date = grace deadline = `currentPeriodEnd + 7d`. Need to expose `gracePeriodEndsAt` from session too — see open question below.
   - CTA: "Update payment method" → calls `/api/stripe/portal`, opens returned URL.

7. **Layer 7 — Mount.** `DashboardClient.tsx`: render `<PastDueBanner />` immediately above the existing `<TierBanner />` (line ~1050).

## Verification steps

1. Type-check: `npx tsc --noEmit -p apps/web/tsconfig.json` clean.
2. Unit: new test `transactional-email.test.ts` covering `no_api_key`, `no_from_address`, `provider_error`, success path with mocked `fetch` (mirror `email-sender.test.ts`).
3. Webhook integration: trigger via Stripe CLI in dev:
   ```
   stripe trigger invoice.payment_failed
   ```
   Assert: `subscriptions.status` flips to `past_due`, dunning email sent (verify in Resend dashboard), second `stripe trigger` of the same invoice does **not** send a second email.
4. Banner: in dev DB, `UPDATE subscriptions SET status='past_due' WHERE user_id='<test>'`, hit `/dashboard`, confirm red banner above amber Pro banner. Click CTA, confirm Stripe portal opens.
5. Test-mode: unset `RESEND_API_KEY`, repeat (3). Webhook still returns 200, status flips, email path logs `no_api_key` and short-circuits. No exception.

## Open questions

1. **Grace deadline display.** Banner copy says "before {date}" — that requires `currentPeriodEnd` on the session payload. Adding it is one more line in `/api/auth/session` and `ClientSession`, but every dashboard mount now ships a date that could leak billing-cycle info to a logged-in user (acceptable — they see this in the portal anyway). **Default: yes, ship it.**
2. **Multi-currency formatting.** `invoice.currency` from Stripe is lowercase ISO; we display in email. Use `Intl.NumberFormat(currency.toUpperCase())`. Most accounts are USD today, but TradeClaw Pro takes other currencies via Stripe's currency conversion. Don't hardcode `$`.
3. **Templating.** Inline strings vs a template lib. With one transactional template I'll inline it. Add a `templates/` dir only when the second template (welcome / trial-ending) lands.

## Commit plan (split per CLAUDE.md "one concern per commit")

- **Commit 1 — `feat(billing): send dunning email on invoice.payment_failed`**
  - `lib/transactional-email.ts` + test
  - `lib/db.ts` (add `getSubscriptionByStripeId`)
  - `app/api/stripe/webhook/route.ts` (wire handler)
  - Verifiable in isolation: Stripe CLI trigger emails the user.

- **Commit 2 — `feat(dashboard): show past-due banner with portal CTA`**
  - `app/api/auth/session/route.ts` (extend payload)
  - `lib/hooks/use-user-tier.ts` (extend `ClientSession`)
  - `app/components/past-due-banner.tsx`
  - `app/dashboard/DashboardClient.tsx` (mount)
  - Verifiable in isolation against the DB row written by commit 1.

## Out of scope (deferred)

- ⚠️ Deferred: trial countdown widget + day-6 reminder (P3) — separate ticket.
- ⚠️ Deferred: webhook retries on `sendInvite` (P5) — separate ticket.
- ⚠️ Deferred: a "second nudge" dunning email at day 4/5 of grace. Stripe Smart Retries fire their own webhook events; if we want a *time-based* nudge (rather than retry-driven) it needs a cron job. Not in this PR.
- ⚠️ Deferred: SMS / push channels.
- ⚠️ Deferred: migrating signal-alert email under the same transactional module.
