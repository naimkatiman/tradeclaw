import { NextRequest, NextResponse } from 'next/server';
import { verifyEEWebhookSignature, parseEEEvent } from '@/lib/earningsedge/stripe';
import { upsertUser, getUserByStripeCustomer, updateUserTier } from '@/lib/earningsedge/db';
import { tryClaimStripeEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Step 1: signature verification. Throws on bad signature OR when the
  // EE-specific webhook secret is unset (no fallback to the main secret —
  // that would let main-product events replay against EE).
  let event;
  try {
    event = verifyEEWebhookSignature(payload, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify_failed';
    if (message.includes('not configured')) {
      return NextResponse.json({ error: 'ee_webhook_not_configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // Step 2: idempotency. Stripe replays events on retry; without this gate
  // upsertUser/updateUserTier would re-fire on every redelivery. Namespace
  // the event id with `ee:` so the shared processed_stripe_events table
  // doesn't collide with TradeClaw-main event IDs across separate Stripe
  // accounts.
  const claimed = await tryClaimStripeEvent(`ee:${event.id}`, event.type);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Step 3: parse + side effects. Errors here surface as 500 so Stripe
  // retries; the idempotency table will let the retry through.
  try {
    const parsed = await parseEEEvent(event);

    if (parsed.type === 'checkout.session.completed' && parsed.email) {
      try {
        await upsertUser({
          email: parsed.email,
          tier: (parsed.tier as 'basic' | 'pro') || 'basic',
          stripe_customer_id: parsed.customerId,
          stripe_subscription_id: parsed.subscriptionId,
        });
      } catch {
        console.error('[earningsedge] Failed to upsert user after checkout');
      }
    }

    if (parsed.type === 'customer.subscription.deleted' && parsed.customerId) {
      try {
        const existing = await getUserByStripeCustomer(parsed.customerId);
        if (existing) {
          await updateUserTier(existing.email, 'free', parsed.customerId);
        }
      } catch {
        console.error('[earningsedge] Failed to downgrade user after subscription deletion');
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[earningsedge] handler error:', err);
    return NextResponse.json({ error: 'handler_error' }, { status: 500 });
  }
}
