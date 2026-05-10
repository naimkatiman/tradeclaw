import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, resolveTierFromPriceId, resolveStripePriceId } from '../../../../lib/stripe';
import {
  getUserById,
  updateUserStripeCustomerId,
} from '../../../../lib/db';
import { readSessionFromRequest } from '../../../../lib/user-session';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';

type BillingInterval = 'monthly' | 'annual';
type PurchasableTier = 'pro' | 'elite';

function normalizeInterval(value: unknown): BillingInterval | null {
  return value === 'monthly' || value === 'annual' ? value : null;
}

function normalizeTier(value: unknown): PurchasableTier | null {
  return value === 'pro' || value === 'elite' ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      priceId?: unknown;
      tier?: unknown;
      interval?: unknown;
    };
    const rawPriceId = body.priceId;
    const tier = normalizeTier(body.tier);
    const interval = normalizeInterval(body.interval);

    // userId is always sourced from the signed session cookie. Trusting a
    // body-supplied userId would let any caller create a paid checkout
    // bound to another user's stripe_customer_id (gifting / impersonation).
    const userSession = readSessionFromRequest(request);
    const userId = userSession?.userId;

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json(
        { error: 'Not signed in — sign in with Google at /signin first' },
        { status: 401 },
      );
    }

    let resolvedPriceId: string | null = null;
    let resolvedTier: PurchasableTier | null = null;

    if (typeof rawPriceId === 'string' && rawPriceId) {
      const tierFromPrice = resolveTierFromPriceId(rawPriceId);
      if (tierFromPrice !== 'pro' && tierFromPrice !== 'elite') {
        return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 });
      }
      resolvedTier = tierFromPrice;
      resolvedPriceId = rawPriceId;
    } else if (tier && interval) {
      resolvedTier = tier;
      resolvedPriceId = resolveStripePriceId(tier, interval);
      if (!resolvedPriceId) {
        return NextResponse.json(
          {
            error: `Checkout is temporarily unavailable for ${tier} ${interval} billing. Please contact support.`,
          },
          { status: 503 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'tier and interval are required when priceId is not provided' },
        { status: 400 },
      );
    }

    // Defense in depth: even after resolving the price ID, verify it maps
    // back to the requested tier. Catches misconfigured env vars where
    // STRIPE_PRO_*_PRICE_ID points at an Elite product (or vice versa) —
    // would otherwise charge the customer for the wrong tier and have the
    // webhook persist whatever tier the price actually maps to.
    const verifiedTier = resolveTierFromPriceId(resolvedPriceId);
    if (verifiedTier !== resolvedTier) {
      console.error(
        `[stripe-checkout] price→tier mismatch: priceId=${resolvedPriceId} ` +
          `requested=${resolvedTier} resolved=${verifiedTier ?? 'null'}`,
      );
      return NextResponse.json(
        { error: 'Checkout is temporarily unavailable. Please contact support.' },
        { status: 503 },
      );
    }

    // Retrieve existing Stripe customer ID if the user already has one
    let stripeCustomerId: string | undefined;
    const user = await getUserById(userId);
    if (user?.stripeCustomerId) {
      stripeCustomerId = user.stripeCustomerId;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${BASE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/pricing`,
      client_reference_id: userId,
      metadata: { tier: resolvedTier, userId },
      subscription_data: {
        metadata: { userId, tier: resolvedTier },
        trial_period_days: 7,
      },
      allow_promotion_codes: true,
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    // Store the Stripe customer ID on the user record for future sessions
    if (session.customer && typeof session.customer === 'string' && !stripeCustomerId) {
      await updateUserStripeCustomerId(userId, session.customer);
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
