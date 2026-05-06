# 2026-05-03 — Prod smoke test runbook

Goal: prove the **checkout → webhook → entitlement → Telegram → cancel** chain works end-to-end against live Stripe + live Postgres before pointing paid acquisition at `tradeclaw.win`.

Stripe livemode shows **0 monetization events in 14 days**. The next paid checkout will be the first integration test of the chain. Run it on yourself first.

---

## Step 0 — Confirm migrations 019 + 023 on prod Postgres

I could not verify these from outside Railway (internal hostname doesn't resolve, hooks block credential dump and SSH). One of:

**Option A — Railway dashboard (30 sec, no creds leave the browser):**

1. Open Railway → `tradeclaw` → `Postgres` → **Data** tab → **Query**.
2. Paste:
   ```sql
   SELECT 'mig_019' AS check, to_regclass('public.processed_stripe_events') IS NOT NULL AS present
   UNION ALL
   SELECT 'mig_023_trial_end',
     EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='subscriptions' AND column_name='trial_end')
   UNION ALL
   SELECT 'mig_023_reminder_sent_at',
     EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='subscriptions' AND column_name='trial_reminder_sent_at');
   ```
3. Expect three rows, all `present=true`.
4. If any row is `false`, stop. The next webhook will fail with `relation/column does not exist`. Apply via:
   ```bash
   railway run -s web -- bash -c 'psql "$DATABASE_URL" -f apps/web/migrations/019_processed_stripe_events.sql'
   railway run -s web -- bash -c 'psql "$DATABASE_URL" -f apps/web/migrations/023_subscription_trial_columns.sql'
   ```

**Option B — authorize me to run `railway connect Postgres`** (opens a TCP proxy locally, exposes the DB URL to my process for one query, then closes). I can run the schema check non-interactively if you say so.

---

## Step 1 — Open three watchers in three terminals

Before clicking checkout, have these tailing in parallel.

```bash
# Terminal A — webhook + telegram + dunning logs
railway logs -s web -f | grep --line-buffered -iE 'stripe-webhook|checkout|subscription|invoice|telegram|invite|past_due|dunning'

# Terminal B — Stripe events stream (uses railway-injected secret, no print)
railway run -s web -- node -e '
const Stripe = require("stripe");
const s = new Stripe(process.env.STRIPE_SECRET_KEY);
s.events.list({ limit: 1 }).then(r => console.log("most recent:", r.data[0]?.type, r.data[0]?.created));
'

# Terminal C — DB row inspection (run after each milestone)
# (Use Railway dashboard Data > Query. Queries are listed below per milestone.)
```

---

## Step 2 — Run the actual $29 checkout

1. Sign in at `https://tradeclaw.win/signin` with Google. Use a personal account, not your admin email (so the `PRO_EMAILS` grant doesn't mask the Stripe path).
2. Note your `users.id`:
   ```sql
   SELECT id, email, tier, stripe_customer_id, telegram_user_id
   FROM users WHERE email = '<your email>';
   ```
   Expected: `tier='free'`, `stripe_customer_id=NULL`, `telegram_user_id=NULL`.
3. Go to `/pricing` → click **Pro Monthly $29** → land on Stripe Checkout.
4. Pay with a real card. The 7-day trial means $0 charged today; subscription enters `trialing` immediately.

---

## Step 3 — Verify each link in the chain

Run each query immediately after the corresponding Stripe event fires (Terminal A will show it).

**3a. `checkout.session.completed` fired:**
```sql
SELECT event_id, event_type, processed_at
FROM processed_stripe_events
ORDER BY processed_at DESC LIMIT 5;
-- Expect: a row with event_type = 'checkout.session.completed' from the last minute.
-- If this query returns 0 rows OR `relation does not exist`, migration 019 is missing.
```

**3b. `users.tier` flipped to `pro`:**
```sql
SELECT id, email, tier, tier_expires_at, stripe_customer_id
FROM users WHERE email = '<your email>';
-- Expect: tier='pro', stripe_customer_id='cus_...', tier_expires_at = ~7 days out.
```

**3c. `subscriptions` row created with trial_end:**
```sql
SELECT id, user_id, stripe_subscription_id, tier, status, trial_end, current_period_end
FROM subscriptions WHERE user_id = '<your users.id>';
-- Expect: status='trialing', tier='pro', trial_end ~ NOW() + 7 days.
-- If trial_end column does not exist, migration 023 is missing.
```

**3d. Telegram invite delivered:**
- On the `/welcome` page, click "Open Telegram bot" → press **Start** in the bot DM.
- Within 2 seconds of pressing Start, the bot DMs you the Pro group invite link.
- If not, click **Resend**. After this commit's deploy, the error message tells you exactly what to do.
- DB check:
  ```sql
  SELECT user_id, tier, invite_link, is_active, expires_at
  FROM telegram_invites WHERE user_id = '<your users.id>'
  ORDER BY created_at DESC LIMIT 3;
  ```

**3e. `/dashboard/billing` reflects entitlement:**
- Visit `https://tradeclaw.win/dashboard/billing` while logged in.
- Expect: shows Pro tier, trial end date, "Manage in Stripe" button.

**3f. Idempotency holds — replay the event:**
- Stripe Dashboard → Developers → Events → your `checkout.session.completed` → **Resend**.
- Terminal A shows: `[stripe-webhook] received: true, duplicate: true` (or no error logged).
- DB check: `SELECT COUNT(*) FROM telegram_invites WHERE user_id = '<your id>'` should be unchanged.

---

## Step 4 — Test the cancel path

1. `/dashboard/billing` → **Manage in Stripe** → opens portal.
2. Click **Cancel subscription** → choose **Cancel immediately** (not at period end, so we exercise `subscription.deleted`).
3. Watch Terminal A for: `customer.subscription.deleted` event.
4. DB check:
   ```sql
   SELECT id, email, tier FROM users WHERE email = '<your email>';
   -- Expect: tier='free'.
   SELECT status FROM subscriptions WHERE user_id = '<your users.id>';
   -- Expect: status='canceled'.
   ```
5. Telegram: bot kicks you from the Pro group within seconds (banChatMember + unbanChatMember).
6. Refresh `/dashboard/billing` → shows "no active subscription".

---

## Step 5 — Refund

Stripe Dashboard → your test customer → **Refund $0** (since trial = $0 actually charged, this is a no-op for trial; if you skipped trial, refund the $29).

---

## Pass criteria

All ten of these pass:

- [ ] Step 3a: `processed_stripe_events` row appears
- [ ] Step 3b: `users.tier = 'pro'`
- [ ] Step 3c: `subscriptions.trial_end` populated
- [ ] Step 3d: bot DMs the invite link, you can join the Pro group
- [ ] Step 3e: `/dashboard/billing` shows Pro
- [ ] Step 3f: replay returns `duplicate:true`, no duplicate invites
- [ ] Step 4: cancel flips `tier='free'`, `status='canceled'`, kicks from Telegram
- [ ] No `[stripe-webhook] Error` lines in Terminal A
- [ ] No `relation/column does not exist` in Terminal A
- [ ] Stripe Dashboard → Webhook deliveries shows all events as **200**, none **failed**

If any fail, the failure point IS the bug. Fix and re-run before opening to the public.

---

## Common failure modes & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Webhook 500 with `relation "processed_stripe_events" does not exist` | Migration 019 not applied | Run Step 0 fix command |
| Webhook 500 with `column "trial_end" of relation "subscriptions" does not exist` | Migration 023 not applied | Run Step 0 fix command |
| Webhook 500 with `Unknown or non-purchasable price ID price_xxx` | Stripe price ID drifted from env | Update `STRIPE_PRO_*_PRICE_ID` in Railway, redeploy |
| `users.tier` stays `free` after webhook 200 | `checkout.session.completed` missing `client_reference_id` | Check `/api/stripe/checkout` is sending `client_reference_id: userId` (it is, in this codebase) |
| Telegram invite never arrives, log says `chat not found` | User never pressed Start in bot DM | After this commit's deploy, the resend page tells the user to press Start |
| Dunning email not received on a real `payment_failed` test | `RESEND_API_KEY` not set, or sender domain not verified | Check Resend dashboard |

---

## Out of scope for this runbook

- Annual checkout ($290/yr) — same chain, same code path. Verify after monthly passes.
- Elite tier — not yet wired (Stripe price IDs not set, returns 503 on checkout). Skip.
- EarningsEdge — separate Stripe account, separate webhook. Test independently.
