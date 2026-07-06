/**
 * Client-safe tier definitions. No Node.js / Stripe SDK imports.
 * Import from here in client components (`'use client'`).
 * Server code can import from `./stripe` which re-exports these.
 */

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
  /**
   * Truthful anchor shown struck-through above the price. We anchor against
   * the real market — comparable hosted signal/scanner dashboards cost
   * $200-500/mo (cited in pre-launch content). This is NOT a fake former
   * price for this product; do not invent a "was $X" here.
   */
  anchorLabel?: string;
  /**
   * Affordability framing: annual cost expressed per day, e.g. "$0.79/day".
   * Derived from the annual price / 365. Undefined for non-paid tiers.
   */
  perDayLabel?: string;
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
      'Free forever — public @tradeclawwin signals and our public track record',
      '6 symbols across crypto, forex, commodities, indices',
      '30-minute delayed signals',
      'TP1 target only',
      'Last 7 days signal history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time signal delivery with full analytics.',
    monthlyPriceLabel: '$29',
    annualPriceLabel: '$290/yr — save $58',
    anchorLabel: 'Comparable SaaS dashboards: $200-500/mo',
    perDayLabel: '$0.79/day billed annually',
    kind: 'stripe',
    monthlyPriceIdEnv: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID',
    annualPriceIdEnv: 'NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID',
    features: [
      'Real-time delivery — no 30-minute delay',
      'Full symbol coverage — FX, crypto, metals, oil, US mega-caps, and indices',
      'Confluence across H1/H4/D1 before a signal fires',
      'TP1, TP2, TP3, and Stop Loss on every Pro signal',
      'Pro alerts in a private Telegram group',
      'Unlimited signal history for backtests and audits',
      'Audit every entry, exit, and outcome in our public Postgres archive',
      'Cancel anytime',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'Everything in Pro plus priority alerts, direct access, and advanced tooling.',
    monthlyPriceLabel: '$99',
    annualPriceLabel: '$990/yr — save $198',
    anchorLabel: 'Comparable SaaS dashboards: $200-500/mo',
    perDayLabel: '$2.71/day billed annually',
    kind: 'stripe',
    monthlyPriceIdEnv: 'NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID',
    annualPriceIdEnv: 'NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID',
    features: [
      'Everything in Pro',
      'Priority alert delivery',
      'Strategy builder — compose and backtest custom indicator rules',
      '1-on-1 Telegram group with Zaky for setup and review',
      'Webhook forwarding — pipe signals to your own broker or bot',
      'Priority email support with same-day response',
    ],
  },
];

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
    NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID,
  };
  return known[envName] ?? null;
}
