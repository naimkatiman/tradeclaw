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

function getEliteMonthlyPriceId(): string | null {
  return (
    process.env.STRIPE_ELITE_MONTHLY_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID ??
    null
  );
}

function getEliteAnnualPriceId(): string | null {
  return (
    process.env.STRIPE_ELITE_ANNUAL_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID ??
    null
  );
}

/**
 * Resolve the checkout price ID for a supported tier + interval.
 *
 * Elite returns null until STRIPE_ELITE_*_PRICE_ID is set on Railway. The
 * checkout route renders that as a 503 "temporarily unavailable" error,
 * which is the right shape for a tier that exists in the schema but isn't
 * yet wired up to a Stripe product.
 */
export function resolveStripePriceId(
  tier: import('./stripe-tiers').Tier,
  interval: BillingInterval
): string | null {
  if (tier === 'pro') {
    return interval === 'annual' ? getProAnnualPriceId() : getProMonthlyPriceId();
  }
  if (tier === 'elite') {
    return interval === 'annual' ? getEliteAnnualPriceId() : getEliteMonthlyPriceId();
  }
  return null;
}

/**
 * Map a Stripe price ID to the corresponding tier name.
 */
export function resolveTierFromPriceId(priceId: string): import('./stripe-tiers').Tier | null {
  const map: Record<string, import('./stripe-tiers').Tier> = {};
  const proMonthly = getProMonthlyPriceId();
  const proAnnual = getProAnnualPriceId();
  const eliteMonthly = getEliteMonthlyPriceId();
  const eliteAnnual = getEliteAnnualPriceId();
  if (proMonthly) map[proMonthly] = 'pro';
  if (proAnnual) map[proAnnual] = 'pro';
  if (eliteMonthly) map[eliteMonthly] = 'elite';
  if (eliteAnnual) map[eliteAnnual] = 'elite';
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
