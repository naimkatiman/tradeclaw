import 'server-only';
import Stripe from 'stripe';

export { TIER_LEVEL, TIER_DEFINITIONS, getClientPriceId } from './stripe-tiers';
export type { Tier, TierDefinition } from './stripe-tiers';

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

/**
 * Map a Stripe price ID to the corresponding tier name.
 */
export function resolveTierFromPriceId(priceId: string): import('./stripe-tiers').Tier | null {
  const map: Record<string, import('./stripe-tiers').Tier> = {};
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (proMonthly) map[proMonthly] = 'pro';
  if (proAnnual) map[proAnnual] = 'pro';
  return map[priceId] ?? null;
}

/**
 * Map a Stripe subscription's items to a tier.
 */
export function resolveTierFromSubscription(
  subscription: Stripe.Subscription
): import('./stripe-tiers').Tier {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return 'free';
  return resolveTierFromPriceId(priceId) ?? 'free';
}
