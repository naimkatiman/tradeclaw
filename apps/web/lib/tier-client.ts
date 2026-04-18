/**
 * Client-safe tier canon. Safe to import from both server and client code —
 * contains no DB, secrets, or server-only modules. Server-side tier resolution
 * (getUserTier, filterSignalByTier, etc.) lives in ./tier.ts.
 */

export const FREE_SYMBOLS = ['BTCUSD', 'ETHUSD', 'XAUUSD'] as const;
export type FreeSymbol = typeof FREE_SYMBOLS[number];

export function isFreeSymbol(symbol: string): boolean {
  return (FREE_SYMBOLS as readonly string[]).includes(symbol);
}
