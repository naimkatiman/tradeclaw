import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() for lazy initialization */
export const stripe = undefined as unknown as Stripe;

export type Tier = 'free' | 'pro' | 'elite';

export const TIER_LEVEL: Record<Tier, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

/**
 * Map a Stripe price ID to the corresponding tier name.
 */
export function resolveTierFromPriceId(priceId: string): Tier | null {
  const pro = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  ];
  const elite = [
    process.env.STRIPE_ELITE_MONTHLY_PRICE_ID,
    process.env.STRIPE_ELITE_ANNUAL_PRICE_ID,
  ];

  if (pro.includes(priceId)) return 'pro';
  if (elite.includes(priceId)) return 'elite';
  return null;
}

/**
 * Map a Stripe subscription's items to a tier.
 */
export function resolveTierFromSubscription(
  subscription: Stripe.Subscription
): Tier {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return 'free';
  return resolveTierFromPriceId(priceId) ?? 'free';
}
