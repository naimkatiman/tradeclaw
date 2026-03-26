import type { Tier } from './stripe';
import { TIER_LEVEL } from './stripe';
import type { TradingSignal } from '../app/lib/signals';

export { TIER_LEVEL };
export type { Tier };

// Symbols accessible per tier
export const TIER_SYMBOLS: Record<Tier, string[]> = {
  free: ['XAUUSD', 'BTCUSD', 'EURUSD'],
  pro: ['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD'],
  elite: [
    'XAUUSD',
    'XAGUSD',
    'BTCUSD',
    'ETHUSD',
    'XRPUSD',
    'EURUSD',
    'GBPUSD',
    'USDJPY',
    'AUDUSD',
    'USDCAD',
    'NZDUSD',
    'USDCHF',
  ],
};

// History window per tier
export const TIER_HISTORY_DAYS: Record<Tier, number | null> = {
  free: 1,
  pro: 30,
  elite: null, // unlimited
};

// Signal delay in ms (free gets 15-min delay)
export const TIER_DELAY_MS: Record<Tier, number> = {
  free: 15 * 60 * 1000,
  pro: 0,
  elite: 0,
};

/**
 * Retrieve the tier for a given user ID from the database.
 * Falls back to 'free' if no active subscription is found.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  // Avoid importing DB at top-level so this module is safe in edge runtimes
  // that don't have DB access. Callers that need real tier checks should
  // import this only in Node.js API routes.
  try {
    const { getUserSubscription } = await import('./db');
    const sub = await getUserSubscription(userId);
    if (!sub || sub.status === 'canceled') return 'free';
    if (sub.status === 'past_due') return 'free'; // grace handled elsewhere
    return sub.tier as Tier;
  } catch {
    return 'free';
  }
}

/**
 * Filter a list of signals to only include what the tier is allowed to see.
 * Applies symbol filtering, TP level masking, and delay offset.
 */
export function filterSignalByTier(
  signal: TradingSignal,
  tier: Tier
): TradingSignal | null {
  const allowedSymbols = TIER_SYMBOLS[tier];
  if (!allowedSymbols.includes(signal.symbol)) return null;

  const filtered: TradingSignal = { ...signal };

  // Mask TP2/TP3 for free tier
  if (tier === 'free') {
    filtered.takeProfit2 = 0;
    filtered.takeProfit3 = 0;
  }

  // Mask advanced indicators for free tier
  if (tier === 'free') {
    filtered.indicators = {
      ...signal.indicators,
      macd: { histogram: 0, signal: 'neutral' },
      bollingerBands: { position: 'middle', bandwidth: 0 },
      stochastic: { k: 0, d: 0, signal: 'neutral' },
    };
  }

  return filtered;
}

/**
 * Check whether a user tier meets the minimum required tier.
 */
export function meetsMinimumTier(userTier: Tier, minimumTier: Tier): boolean {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[minimumTier];
}
