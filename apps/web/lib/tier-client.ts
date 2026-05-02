/**
 * Client-safe tier canon. Safe to import from both server and client code —
 * contains no DB, secrets, or server-only modules. Server-side tier resolution
 * (getUserTier, filterSignalByTier, etc.) lives in ./tier.ts.
 */

export const FREE_SYMBOLS = [
  'BTCUSD',
  'ETHUSD',
  'XAUUSD',
  'EURUSD',
  'SPYUSD',
  'QQQUSD',
] as const;
export type FreeSymbol = typeof FREE_SYMBOLS[number];

export function isFreeSymbol(symbol: string): boolean {
  return (FREE_SYMBOLS as readonly string[]).includes(symbol);
}

/**
 * Free-tier history window in days. Single source of truth for both server
 * gating (TIER_HISTORY_DAYS.free in ./tier.ts) and client-rendered marketing
 * copy (pricing page, track-record disclaimer). Bumping this here updates
 * both code paths and all visible labels in lockstep.
 */
export const FREE_HISTORY_DAYS = 7;
