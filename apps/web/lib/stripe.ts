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

export type Tier = 'free' | 'pro' | 'elite' | 'custom';

export const TIER_LEVEL: Record<Tier, number> = {
  free: 0,
  pro: 1,
  elite: 2,
  custom: 3,
};

export interface TierDefinition {
  id: Tier;
  name: string;
  tagline: string;
  monthlyPriceLabel: string;
  annualPriceLabel: string;
  features: string[];
  kind: 'free' | 'stripe' | 'contact';
  /** Name of the NEXT_PUBLIC_ env var holding the monthly priceId. Undefined for non-Stripe tiers. */
  monthlyPriceIdEnv?: string;
  /** Name of the NEXT_PUBLIC_ env var holding the annual priceId. Undefined for non-Stripe tiers. */
  annualPriceIdEnv?: string;
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start learning and validating signals at no cost.',
    monthlyPriceLabel: 'Free',
    annualPriceLabel: '',
    kind: 'free',
    features: [
      '3 symbols: BTCUSD, ETHUSD, XAUUSD',
      '15-minute delayed signals',
      'TP1 target only',
      'Public Telegram channel',
      'Last 24h signal history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time premium signals with full analytics.',
    monthlyPriceLabel: '$29',
    annualPriceLabel: '$290/yr — save $58',
    kind: 'stripe',
    monthlyPriceIdEnv: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID',
    annualPriceIdEnv: 'NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID',
    features: [
      'All traded symbols',
      'Real-time signal delivery',
      'Premium high-confidence signals + MTF confluence',
      'TP1, TP2, TP3 + Stop Loss',
      'Private Pro Telegram group',
      'Full signal history + CSV export',
      '7-day free trial',
    ],
  },
];

/**
 * Map a Stripe price ID to the corresponding tier name.
 */
export function resolveTierFromPriceId(priceId: string): Tier | null {
  const map: Record<string, Tier> = {};
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (proMonthly) map[proMonthly] = 'pro';
  if (proAnnual) map[proAnnual] = 'pro';
  return map[priceId] ?? null;
}

/**
 * Resolve the client-side priceId for a tier + billing interval.
 * Returns null if the tier isn't a Stripe tier or the env var isn't set.
 * Reads `process.env[<name>]` directly so Next.js inlines the NEXT_PUBLIC_ value at build time.
 */
export function getClientPriceId(
  def: TierDefinition,
  interval: 'monthly' | 'annual'
): string | null {
  const envName = interval === 'annual' ? def.annualPriceIdEnv : def.monthlyPriceIdEnv;
  if (!envName) return null;
  // Must reference NEXT_PUBLIC_ vars by literal name for Next.js to inline them.
  // So we cannot use `process.env[envName]` directly — we dispatch on the known names.
  const known: Record<string, string | undefined> = {
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
  };
  return known[envName] ?? null;
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
