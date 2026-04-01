import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/earningsedge/stripe';
import { upsertUser, getUserByStripeCustomer, updateUserTier } from '@/lib/earningsedge/db';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = await handleWebhookEvent(payload, signature);

    if (event.type === 'checkout.session.completed' && event.email) {
      // Upsert user with new tier
      try {
        await upsertUser({
          email: event.email,
          tier: (event.tier as 'basic' | 'pro') || 'basic',
          stripe_customer_id: event.customerId,
          stripe_subscription_id: event.subscriptionId,
        });
      } catch {
        // DB might not be configured — log and continue
        console.error('[earningsedge] Failed to upsert user after checkout');
      }
    }

    if (event.type === 'customer.subscription.deleted' && event.customerId) {
      try {
        // Look up user by Stripe customer ID, then downgrade to free
        const existing = await getUserByStripeCustomer(event.customerId);
        if (existing) {
          await updateUserTier(existing.email, 'free', event.customerId);
        }
      } catch {
        console.error('[earningsedge] Failed to downgrade user after subscription deletion');
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
