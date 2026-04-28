import 'server-only';
import Stripe from 'stripe';

export { TIER_LEVEL, TIER_DEFINITIONS, getClientPriceId } from './stripe-tiers';
export type { Tier, TierDefinition } from './stripe-tiers';

export type BillingInterval = 'monthly' | 'annual';

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

function getProMonthlyPriceId(): string | null {
  return (
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ??
    null
  );
}

function getProAnnualPriceId(): string | null {
  return (
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ??
    null
  );
}

/**
 * Resolve the checkout price ID for a supported tier + interval.
 */
export function resolveStripePriceId(
  tier: import('./stripe-tiers').Tier,
  interval: BillingInterval
): string | null {
  if (tier !== 'pro') return null;
  return interval === 'annual' ? getProAnnualPriceId() : getProMonthlyPriceId();
}

/**
 * Map a Stripe price ID to the corresponding tier name.
 */
export function resolveTierFromPriceId(priceId: string): import('./stripe-tiers').Tier | null {
  const map: Record<string, import('./stripe-tiers').Tier> = {};
  const proMonthly = getProMonthlyPriceId();
  const proAnnual = getProAnnualPriceId();
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
