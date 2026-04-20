import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, resolveTierFromPriceId } from '../../../../lib/stripe';
import {
  getUserById,
  updateUserStripeCustomerId,
} from '../../../../lib/db';
import { readSessionFromRequest } from '../../../../lib/user-session';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      priceId?: unknown;
      userId?: unknown;
    };
    const priceId = body.priceId;

    // userId comes from the signed session cookie by default; the body value
    // is honored only as a fallback for scripted / server-to-server callers.
    const userSession = readSessionFromRequest(request);
    const userId =
      userSession?.userId ?? (typeof body.userId === 'string' ? body.userId : undefined);

    if (typeof priceId !== 'string' || !priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json(
        { error: 'Not signed in — POST /api/auth/session first' },
        { status: 401 },
      );
    }

    const tier = resolveTierFromPriceId(priceId);
    if (!tier) {
      return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 });
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
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/pricing`,
      client_reference_id: userId,
      metadata: { tier, userId },
      subscription_data: {
        metadata: { userId, tier },
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
