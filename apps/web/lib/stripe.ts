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
    tagline: 'Start learning and validating signals at no cost.',
    monthlyPriceLabel: 'Free',
    annualPriceLabel: '',
    kind: 'free',
    features: [
      '3 symbols: XAUUSD, BTCUSD, EURUSD',
      '15-minute delayed signals',
      'Public Telegram channel',
      'Last 24h signal history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time premium signals on all major pairs.',
    monthlyPriceLabel: '$19',
    annualPriceLabel: '$190/yr — save $38',
    kind: 'stripe',
    features: [
      '6+ core symbols (FX, crypto, metals)',
      'Real-time signal delivery',
      'Full indicator suite (RSI, MACD, BB, Stoch)',
      'TP1, TP2, TP3 + Stop Loss',
      'Private Pro Telegram group',
      '30-day signal history',
      '7-day free trial',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'Everything in Pro + exclusive bot & auto-trade.',
    monthlyPriceLabel: '$49',
    annualPriceLabel: '$490/yr — save $98',
    kind: 'stripe',
    features: [
      'Everything in Pro',
      'Exclusive Elite Telegram bot',
      'One-click auto-trade on MT5 / cTrader',
      'MTF confluence + trailing SL',
      'REST API (100 req/min)',
      'CSV / JSON export',
      'Direct Telegram support (4h SLA)',
      '7-day free trial',
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    tagline: 'Bespoke strategies, brokers, and infra for funds & desks.',
    monthlyPriceLabel: "Let's talk",
    annualPriceLabel: '',
    kind: 'contact',
    features: [
      'Custom strategy development',
      'Your own Pine Script / TV alerts ingested',
      'Dedicated signal channel + white-label',
      'Private broker / prop-firm integration',
      'On-prem or dedicated cloud deployment',
      'SLA + priority engineering support',
    ],
  },
];

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
