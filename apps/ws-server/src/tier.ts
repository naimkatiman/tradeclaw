/**
 * Tier-aware symbol gate for the WebSocket relay.
 *
 * apps/web/lib/tier-client.ts is the canonical source for FREE_SYMBOLS;
 * this module duplicates the constant so apps/ws-server stays a self-
 * contained workspace. Drift is caught by the pin in
 * src/__tests__/tier.test.ts — bumping FREE_SYMBOLS here without bumping
 * the web side (or vice versa) fails CI.
 */

export type Tier = 'free' | 'pro' | 'elite' | 'custom';

export const FREE_SYMBOLS: readonly string[] = [
  'BTCUSD',
  'ETHUSD',
  'XAUUSD',
  'EURUSD',
  'SPYUSD',
  'QQQUSD',
];

const FREE_SYMBOL_SET = new Set(FREE_SYMBOLS);

/**
 * True when `tier` is allowed to subscribe to live ticks for `symbol`.
 *
 * Pro/Elite/Custom inherit Elite's coverage by default — every traded
 * symbol. Free is restricted to FREE_SYMBOLS. Comparison is case-
 * insensitive so callers can pass user-supplied casing through.
 */
export function isAllowedForTier(symbol: string, tier: Tier): boolean {
  if (tier !== 'free') return true;
  return FREE_SYMBOL_SET.has(symbol.toUpperCase());
}

/**
 * Splits a list of symbol strings into the subset the tier may subscribe
 * to and the subset it may not. Both lists return uppercased symbols so
 * the caller can treat them consistently with the rest of the relay's
 * uppercased symbol bookkeeping.
 */
export function partitionByTier(
  symbols: string[],
  tier: Tier,
): { allowed: string[]; blocked: string[] } {
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const raw of symbols) {
    const sym = raw.toUpperCase();
    if (isAllowedForTier(sym, tier)) allowed.push(sym);
    else blocked.push(sym);
  }
  return { allowed, blocked };
}
