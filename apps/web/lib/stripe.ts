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
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try TradeClaw with delayed signals on 3 symbols.',
    monthlyPriceLabel: 'Free',
    annualPriceLabel: '',
    kind: 'free',
    features: [
      '3 symbols (XAU, BTC, EUR)',
      '15-minute delayed signals',
      'TP1 level only',
      '24-hour signal history',
      'Public Telegram @tradeclawwin',
      'Self-host from GitHub (MIT)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time signals, all symbols, private Telegram group.',
    monthlyPriceLabel: '$29',
    annualPriceLabel: '$290/yr (save 17%)',
    kind: 'stripe',
    features: [
      'Real-time signal delivery',
      'All traded symbols',
      'TP1, TP2, TP3 + SL + trailing',
      'Premium MTF confluence signals',
      'Full signal history + CSV export',
      'Private Pro Telegram group',
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
 * Map a Stripe subscription's items to a tier.
 */
export function resolveTierFromSubscription(
  subscription: Stripe.Subscription
): Tier {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return 'free';
  return resolveTierFromPriceId(priceId) ?? 'free';
}
