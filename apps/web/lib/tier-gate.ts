import type { Tier } from './stripe';

/** Symbols available to free-tier users */
export const FREE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD'];

/** Signal delay in milliseconds for free-tier users (15 minutes) */
export const FREE_DELAY_MS = 15 * 60 * 1000;

/** Signal history window for free-tier users (24 hours) */
export const FREE_HISTORY_HOURS = 24;

export interface RawSignal {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry_price: number;
  tp1: number | null;
  tp2?: number | null;
  tp3?: number | null;
  sl: number | null;
  trailing_sl?: number | null;
  mode?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface ShapedSignal extends RawSignal {
  delayed: boolean;
}

/** Returns true if the tier has Pro-level access */
export function isPro(tier: Tier): boolean {
  return tier === 'pro' || tier === 'elite' || tier === 'custom';
}

/**
 * Shape a list of raw signals based on the caller's subscription tier.
 *
 * Free tier:
 * - Only FREE_SYMBOLS
 * - Signals younger than 15 min are dropped (delay gate)
 * - TP2, TP3, trailing_sl are nulled out
 * - Only swing mode (scalp signals dropped)
 *
 * Pro tier:
 * - All symbols, all modes, all TP/SL levels, no delay
 */
export function shapeSignalsForTier(
  signals: RawSignal[],
  tier: Tier,
): ShapedSignal[] {
  const now = Date.now();

  return signals
    .filter((s) => {
      if (!isPro(tier) && !FREE_SYMBOLS.includes(s.pair)) return false;
      if (!isPro(tier) && s.mode === 'scalp') return false;
      if (!isPro(tier)) {
        const age = now - new Date(s.created_at).getTime();
        if (age < FREE_DELAY_MS) return false;
      }
      return true;
    })
    .map((s) => {
      if (isPro(tier)) {
        return { ...s, delayed: false };
      }
      return {
        ...s,
        tp2: null,
        tp3: null,
        trailing_sl: null,
        delayed: true,
      };
    });
}

/**
 * Returns the signal history cutoff timestamp for the given tier.
 * Free: 24h ago. Pro: null (no cutoff).
 */
export function historyWindowCutoff(tier: Tier): Date | null {
  if (isPro(tier)) return null;
  return new Date(Date.now() - FREE_HISTORY_HOURS * 60 * 60 * 1000);
}
