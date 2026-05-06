import { NextRequest, NextResponse } from 'next/server';
import {
  getTrialingExpiringWithin,
  getTrialingMissingTrialEnd,
  getUserById,
  markTrialReminderSent,
  setTrialEnd,
} from '../../../../lib/db';
import { sendTrialEndingEmail } from '../../../../lib/transactional-email';
import { getStripe } from '../../../../lib/stripe';
import { requireCronAuth } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';

// Window for "trial ends in roughly 24 hours" — wide enough that a once-daily
// cron always catches the cohort, regardless of clock alignment between when
// the customer started the trial and when the cron runs. Combined with
// trial_reminder_sent_at IS NULL, it stays idempotent.
const REMIND_FROM_HOURS = 12;
const REMIND_TO_HOURS = 30;

interface ReminderSummary {
  checked: number;
  sent: number;
  failed: number;
  backfilled: number;
}

async function backfillMissingTrialEnds(): Promise<number> {
  // Subscriptions that started trialing before the trial_end column shipped
  // arrive here with status='trialing' but trial_end IS NULL. Pull the
  // subscription from Stripe once, persist, then continue. Bounded by the
  // small number of in-flight trials, so a per-row Stripe call is fine.
  const orphans = await getTrialingMissingTrialEnd();
  let backfilled = 0;
  for (const sub of orphans) {
    try {
      const stripeSub = await getStripe().subscriptions.retrieve(sub.stripeSubscriptionId);
      const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
      if (trialEnd) {
        await setTrialEnd(sub.stripeSubscriptionId, trialEnd);
        backfilled += 1;
      }
    } catch (err) {
      console.error(
        '[cron/trial-reminders] backfill failed for sub:',
        sub.stripeSubscriptionId,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return backfilled;
}

async function runReminderSweep(): Promise<ReminderSummary> {
  const backfilled = await backfillMissingTrialEnds();
  const due = await getTrialingExpiringWithin(REMIND_FROM_HOURS, REMIND_TO_HOURS);

  let sent = 0;
  let failed = 0;

  for (const sub of due) {
    if (!sub.trialEnd) continue;
    try {
      const user = await getUserById(sub.userId);
      if (!user?.email) {
        console.warn('[cron/trial-reminders] user has no email:', sub.userId);
        continue;
      }

      // Resolve the upcoming charge amount from Stripe so the email shows the
      // exact figure the customer's card will be hit for. Fail-soft: if the
      // lookup throws, send the email without the amount line rather than
      // skipping the reminder entirely.
      let amountCents = 0;
      let currency = 'usd';
      try {
        const stripeSub = await getStripe().subscriptions.retrieve(sub.stripeSubscriptionId);
        const item = stripeSub.items.data[0];
        amountCents = item?.price?.unit_amount ?? 0;
        currency = item?.price?.currency ?? 'usd';
      } catch (err) {
        console.error(
          '[cron/trial-reminders] price lookup failed:',
          sub.stripeSubscriptionId,
          err instanceof Error ? err.message : err,
        );
      }

      const result = await sendTrialEndingEmail(user.email, {
        trialEndsAt: sub.trialEnd,
        amountCents,
        currency,
      });

      if (result.ok) {
        await markTrialReminderSent(sub.stripeSubscriptionId);
        sent += 1;
      } else {
        console.error('[cron/trial-reminders] send failed:', result.reason, sub.stripeSubscriptionId);
        failed += 1;
      }
    } catch (err) {
      console.error(
        '[cron/trial-reminders] handler threw:',
        sub.stripeSubscriptionId,
        err instanceof Error ? err.message : err,
      );
      failed += 1;
    }
  }

  return { checked: due.length, sent, failed, backfilled };
}

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  try {
    const summary = await runReminderSweep();
    return NextResponse.json({ ...summary, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reminder sweep failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST exists so the cron-sync dispatcher and the /admin manual-trigger button
// can share the same handler. Same auth, same body.
export const POST = GET;
