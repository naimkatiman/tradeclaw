# Trial countdown + day-6 reminder

**Date:** 2026-05-03
**Ticket:** P3 (Med) from churn-hole audit
**Goal:** Reduce surprise-charge refund disputes by warning the user 24 hours before the 7-day Stripe trial auto-converts. Two surfaces: (a) a dashboard countdown widget so the user sees "Trial ends in N days" every visit, and (b) an email at T-1d so the user gets nudged even if they don't open the app.

## Problem (one sentence)

A 7-day trial converts silently to a paid charge. Customers who forgot, didn't realise the card was already on file, or expected a "click to confirm" flow file refund disputes — bad reviews, chargebacks, and support load. Stripe sends no reminder by default; we send none either.

## Assumptions

- Trial config is fixed at `trial_period_days: 7` (`apps/web/app/api/stripe/checkout/route.ts:87`). Don't change it in this ticket.
- Existing self-scheduled cron in `instrumentation.ts` calls `/api/cron/sync` every 5 min, which fans out to sub-crons by hour-slot. Reuse this.
- Resend infra lives at `apps/web/lib/transactional-email.ts` from the dunning ticket — extend it; don't create a new module.
- `subscriptions` table doesn't have a `trial_end` column today. Need a migration.
- The full Stripe `Subscription` payload always carries `trial_end` (epoch seconds, nullable). We already retrieve the subscription in `handleCheckoutCompleted`.

## Decisions (with reasons)

1. **Cron at T-1d, not Stripe `customer.subscription.trial_will_end`.** Stripe's built-in fires at T-3d with no documented option to reschedule. The user explicitly asked for day-6 (T-1d) — when the charge actually feels imminent. A daily cron with a `BETWEEN NOW()+23h AND NOW()+25h` window is the smallest piece of code that gets the timing right.
2. **Add `trial_end` and `trial_reminder_sent_at` columns to `subscriptions`.** Both nullable, no default backfill needed. `trial_end` lets the cron query who's expiring; `trial_reminder_sent_at` is the dedup primary so we don't email twice if the cron overlaps a slot or runs late.
3. **Cron query uses a rolling window, not a calendar day.** `BETWEEN NOW() + 23h AND NOW() + 25h` catches anyone whose trial ends in roughly 24 hours, regardless of when the cron last ran. Combined with `trial_reminder_sent_at IS NULL`, idempotent.
4. **Backfill on-the-fly in the cron, not a one-shot script.** If the cron hits a row where `status='trialing' AND trial_end IS NULL`, it fetches the subscription from Stripe and updates the row before deciding whether to email. This handles the cohort of users who started a trial before this code shipped — without needing a separate migration script.
5. **Webhook handlers populate `trial_end` on every upsert/update.** `handleCheckoutCompleted` and `handleSubscriptionUpdated` already get the Stripe Subscription; one extra column write keeps the table fresh going forward.
6. **Surface `trialEnd` on session, not a separate hook.** Same precedent as the past-due banner. Adds one ISO string to `/api/auth/session`.
7. **`<TrialCountdown>` is a separate banner-style component, mounted alongside (above) `<TierBanner>` only when `subscriptionStatus === 'trialing'`.** Keeps each banner with one job.
8. **Email reuses `transactional-email.ts` — add `sendTrialEndingEmail`.** Same Resend env vars, same shape as `sendPaymentFailedEmail`. Don't fragment the transactional module.
9. **Migration ships in its own commit, ahead of code.** Lets us roll forward and back out independently if the column add hits a snag in prod.

## Files to touch

| File | Action | LOC |
|---|---|---|
| `apps/web/migrations/021_subscription_trial_columns.sql` | new migration | ~10 |
| `apps/web/lib/db.ts` | extend `SubscriptionRecord`, mappers, `upsertSubscription`, add `getTrialingExpiringWithin(hours)`, `markTrialReminderSent` | ~50 |
| `apps/web/app/api/stripe/webhook/route.ts` | populate `trialEnd` on checkout + subscription.updated | ~10 |
| `apps/web/lib/transactional-email.ts` | add `sendTrialEndingEmail` (subject, text, html, send) | ~80 |
| `apps/web/lib/__tests__/transactional-email.test.ts` | extend with trial-ending coverage | ~50 |
| `apps/web/app/api/cron/trial-reminders/route.ts` | new cron handler | ~80 |
| `apps/web/app/api/cron/sync/route.ts` | dispatch trial-reminders at 09:00 UTC | ~3 |
| `apps/web/app/api/auth/session/route.ts` | include `trialEnd` | ~3 |
| `apps/web/lib/hooks/use-user-tier.ts` | extend `ClientSession` with `trialEnd` | ~3 |
| `apps/web/app/components/trial-countdown.tsx` | new UI component | ~70 |
| `apps/web/app/dashboard/DashboardClient.tsx` | mount above `<TierBanner>` | ~3 |

Total: 11 files, ~360 LOC. Past 150 LOC, past 3 files → split into 3 commits.

## Build sequence

1. **Migration.** `subscriptions ADD COLUMN trial_end TIMESTAMPTZ NULL, ADD COLUMN trial_reminder_sent_at TIMESTAMPTZ NULL`. Backfill is unnecessary; cron handles that.

2. **DB layer.** Update `SubscriptionRecord`, row mapper, `upsertSubscription` parameter list. Add helpers:
   - `getTrialingExpiringWithin(hoursFrom, hoursTo): Promise<SubscriptionRecord[]>` — `WHERE status='trialing' AND trial_end BETWEEN NOW()+$1h AND NOW()+$2h AND trial_reminder_sent_at IS NULL`
   - `markTrialReminderSent(stripeSubscriptionId)`
   - `setTrialEnd(stripeSubscriptionId, trialEnd)` — for cron-side backfill

3. **Webhook patch.** In `handleCheckoutCompleted` and `handleSubscriptionUpdated`, derive `trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null` and pass through to `upsertSubscription`.

4. **Email module.** `sendTrialEndingEmail(to, opts: { trialEndsAt: Date; amountCents: number; currency: string })`:
   - Subject: `Your TradeClaw Pro trial ends tomorrow`.
   - Body: explains charge will run on `<date>` for `<amount>`, gives portal link, reassures cancel-anytime.
   - Same Resend POST as `sendPaymentFailedEmail`.

5. **Cron handler.** New `app/api/cron/trial-reminders/route.ts`:
   - Auth guard via `CRON_SECRET`.
   - Query `getTrialingExpiringWithin(23, 25)`.
   - For each row: if `trial_end` is null but row is trialing, fetch Stripe subscription, write `trial_end`. Then if it now falls in the 23-25h window, proceed.
   - Look up user, send email, mark `trial_reminder_sent_at = NOW()`.
   - Return `{ checked: N, sent: M, failed: K }`.

6. **Cron dispatch.** In `/api/cron/sync`, add at hour 9 UTC: `if (hour === 9 && minute < 10) results.trialReminders = await callInternal('/api/cron/trial-reminders', request);`. Single fire per day.

7. **Session payload.** `/api/auth/session` returns `trialEnd: sub?.trialEnd?.toISOString() ?? null`. Hook + `ClientSession` extended.

8. **Trial countdown UI.** `<TrialCountdown>`:
   - Renders only when `subscriptionStatus === 'trialing' && trialEnd` is in the future.
   - Color: amber (urgent but not red — different from past-due).
   - Copy: "Trial ends in N day(s) — Manage in billing portal" or "Trial ends today" if <24h.
   - CTA: "Manage billing" → `/api/stripe/portal`.

9. **Mount.** Above `<PastDueBanner>` (or below — should not stack with past-due since the states are mutually exclusive; trialing → past_due requires a full state transition).

## Verification steps

1. `npx tsc --noEmit -p apps/web/tsconfig.json` clean.
2. `npx jest --testPathPattern "transactional-email|stripe/webhook"` — all green.
3. Manual cron: `curl -H "Authorization: Bearer $CRON_SECRET" $BASE_URL/api/cron/trial-reminders`. With a seeded row at `trial_end = NOW() + 24h`, response shows `sent: 1`, second call shows `sent: 0` (dedup).
4. Manual UI: `UPDATE subscriptions SET status='trialing', trial_end = NOW() + INTERVAL '3 days'`. Reload `/dashboard`. Amber "Trial ends in 3 days" banner visible. Click → portal opens.
5. Migration: run `psql $DATABASE_URL -f apps/web/migrations/021_subscription_trial_columns.sql` against a copy of prod schema; existing rows still selectable, no default required, no constraint violation.

## Open questions

1. **Day-of-week / time-of-day sensitivity.** Cron runs at 09:00 UTC. A trial that started at 23:00 UTC on day 0 ends at 23:00 UTC on day 7 — the 09:00 cron on day 6 fires when it's only T-14h, missing the 23-25h window. The next cron is 24h later (T+10h). Solution: widen window to `BETWEEN NOW()+12h AND NOW()+30h`. Simpler than running the cron multiple times a day. **Default: widen window.**
2. **Stripe trial_end after metadata change.** If a user uses a promo code that extends trial, `customer.subscription.updated` fires and the webhook updates `trial_end`. As long as `trial_reminder_sent_at` was not set, the email fires at the new T-1d. If it was already sent, we don't re-send — acceptable.
3. **Trial canceled mid-flight.** If the user cancels during trial, `subscription.deleted` fires and `cancelSubscription` flips status to `canceled`. The cron query filters by `status='trialing'`, so canceled users are skipped. ✓
4. **Backfilling existing trialing users.** First cron run after deploy hits any active trial with `trial_end IS NULL`, calls Stripe to populate the column, then proceeds. No separate backfill script needed. **Confirmed in build sequence step 5.**

## Commit plan

- **Commit 1 — `feat(billing): persist trial_end on subscription rows`**
  - migration + db.ts schema/mappers + webhook population
  - Verifiable: run migration, confirm new checkout populates trial_end.

- **Commit 2 — `feat(billing): send trial-ending reminder email at T-1d`**
  - extend transactional-email.ts (+ tests)
  - new cron handler + dispatch in sync
  - Verifiable: manual curl returns sent count, no email on second call.

- **Commit 3 — `feat(dashboard): trial countdown banner with portal CTA`**
  - session route + hook + new component + mount
  - Verifiable: row with status='trialing' renders amber banner.

## Out of scope (deferred)

- ⚠️ Deferred: card-last-4 in the email body (requires fetching PaymentMethod; one extra Stripe call per email — fine for low volume but skip until requested).
- ⚠️ Deferred: trial-extension promo path (pre-charge "extend my trial" CTA).
- ⚠️ Deferred: localised email body (English only for now).
- ⚠️ Deferred: SMS / push reminders.
