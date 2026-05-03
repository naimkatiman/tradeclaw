import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, resolveTierFromPriceId } from '../../../../lib/stripe';
import {
  getUserByStripeCustomerId,
  getUserById,
  updateUserTier,
  upsertSubscription,
  cancelSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
  setTrialEnd,
  tryClaimStripeEvent,
} from '../../../../lib/db';
import { sendInviteWithRetry, revokeAccess } from '../../../../lib/telegram';
import { sendPaymentFailedEmail } from '../../../../lib/transactional-email';

// Must read raw body for Stripe signature verification
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 500 }
    );
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // Idempotency gate. Stripe replays events on retry / redelivery; our
    // upserts are idempotent at the DB level but the Telegram side-effects
    // in handleCheckoutCompleted are not. Claim the event id first; if a
    // prior delivery already processed it, return 200 so Stripe stops.
    const claimed = await tryClaimStripeEvent(event.id, event.type);
    if (!claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        // Unhandled event type — acknowledge without error
        break;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Handler error';
    console.error(`[stripe-webhook] Error handling ${event.type}:`, message);
    // Return 500 so Stripe retries with exponential backoff. Handlers
    // (upsertSubscription, updateUserTier) are idempotent — ON CONFLICT
    // DO UPDATE on stripe_subscription_id — so replays are safe.
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id;
  if (!userId) {
    console.error('[webhook] checkout.session.completed: missing client_reference_id');
    return;
  }

  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null;

  if (!stripeSubscriptionId || !stripeCustomerId) {
    console.error('[webhook] checkout.session.completed: missing customer/subscription IDs');
    return;
  }

  // Fetch full subscription to get tier + period info
  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? resolveTierFromPriceId(priceId) : null;

  // Fail loud on unknown or non-purchasable price. Silently defaulting to
  // 'free' would mean "customer paid, got nothing" — a misconfigured env
  // var must not degrade paid users. Throwing returns 500 → Stripe retries
  // once the env is fixed. Only 'pro' and 'elite' are Stripe-sold today.
  if (tier !== 'pro' && tier !== 'elite') {
    throw new Error(
      `Unknown or non-purchasable price ID ${priceId} on subscription ` +
        `${stripeSubscriptionId} — resolved tier: ${tier ?? 'null'}.`,
    );
  }

  // In Stripe API 2025-01-27.acacia, current_period_end/start moved to SubscriptionItem
  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null;
  const periodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  // Update user tier
  await updateUserTier(userId, tier, periodEnd);

  // Persist subscription record
  await upsertSubscription({
    userId,
    stripeSubscriptionId,
    stripeCustomerId,
    tier,
    status: subscription.status as 'active' | 'past_due' | 'canceled' | 'trialing',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd ?? new Date(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd,
  });

  // Send Telegram invite if user has linked their Telegram account.
  // sendInviteWithRetry handles transient Telegram API failures internally
  // (3x exponential backoff). Permanent failures (e.g. user blocked the bot)
  // short-circuit; the user can self-serve via /api/telegram/resend-invite
  // from the welcome page.
  const user = await getUserByStripeCustomerId(stripeCustomerId);
  if (user?.telegramUserId) {
    const result = await sendInviteWithRetry(userId, user.telegramUserId.toString(), tier);
    if (!result.ok) {
      console.error(
        '[webhook] sendInvite failed after retries:',
        `attempts=${result.attempts} retryable=${result.retryable} err=${result.error}`,
      );
    }
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Mirror handleCheckoutCompleted: an unknown priceId means the env vars
  // (STRIPE_PRO_*_PRICE_ID) drifted, a price was archived, or Stripe
  // migrated the price. Silently downgrading a paying user to 'free' is
  // worse than throwing — Stripe will retry once the env is fixed, and
  // the customer keeps their access via the past_due grace window in the
  // meantime.
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? resolveTierFromPriceId(priceId) : null;
  if (tier !== 'pro' && tier !== 'elite') {
    throw new Error(
      `Unknown or non-purchasable price ID ${priceId} on subscription ` +
        `${subscription.id} — refusing to downgrade silently. ` +
        `Resolved tier: ${tier ?? 'null'}.`,
    );
  }

  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  await updateUserTier(userId, tier, periodEnd);

  await updateSubscriptionStatus(
    subscription.id,
    subscription.status as 'active' | 'past_due' | 'canceled' | 'trialing',
    periodEnd ?? undefined
  );

  // Keep trial_end in sync — promo extensions, manual edits in the Stripe
  // dashboard, and trial-to-paid conversions all flow through this event.
  await setTrialEnd(subscription.id, trialEnd);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await updateUserTier(userId, 'free', null);
  await cancelSubscription(subscription.id);

  // Revoke Telegram group access
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : null;
  if (!stripeCustomerId) return;

  const user = await getUserByStripeCustomerId(stripeCustomerId);
  if (user?.telegramUserId) {
    // Source the tier from subscription metadata (set at checkout creation)
    // rather than re-resolving the priceId, which may have been archived
    // by the time delete fires. Default to 'pro' if metadata is missing.
    const metaTier = subscription.metadata?.tier;
    const tier: 'pro' | 'elite' = metaTier === 'elite' ? 'elite' : 'pro';
    try {
      await revokeAccess(user.telegramUserId.toString(), tier);
    } catch (err) {
      console.error('[webhook] Failed to revoke Telegram access:', err);
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // In Stripe API 2026-03-25.dahlia, subscription is at invoice.parent.subscription_details.subscription
  const sub = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof sub === 'string' ? sub : sub?.id ?? null;
  if (!subscriptionId) return;

  await updateSubscriptionStatus(subscriptionId, 'active');
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const sub = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof sub === 'string' ? sub : sub?.id ?? null;
  if (!subscriptionId) return;

  // Stripe Smart Retries fire invoice.payment_failed once per attempt (up to 4).
  // Dedup the dunning email on the active|trialing → past_due transition so the
  // customer doesn't receive 3-4 identical emails in a week. The webhook itself
  // is already idempotent on event.id via tryClaimStripeEvent — that handles
  // redelivery; this guards against retry-attempt spam.
  const existing = await getSubscriptionByStripeId(subscriptionId);
  const wasAlreadyPastDue = existing?.status === 'past_due';

  await updateSubscriptionStatus(subscriptionId, 'past_due');

  if (wasAlreadyPastDue || !existing) return;

  try {
    const user = await getUserById(existing.userId);
    if (!user?.email) return;

    const result = await sendPaymentFailedEmail(user.email, {
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      amountDueCents: invoice.amount_due ?? 0,
      currency: invoice.currency ?? 'usd',
      nextAttemptAt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000)
        : null,
    });
    if (!result.ok) {
      console.error('[stripe-webhook] dunning email failed:', result.reason, 'user:', user.id);
    }
  } catch (err) {
    // Email is a side-effect; do not surface failure as a 500 — Stripe would
    // retry the whole webhook, the past_due status is already saved above,
    // and the dunning email would still be missing on retry.
    console.error('[stripe-webhook] dunning email threw:', err);
  }
}
