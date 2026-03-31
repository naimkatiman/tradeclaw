/**
 * Live price fetcher with 30-second cache and graceful fallback.
 * Fetches real-time prices from free APIs:
 * - Crypto: CoinGecko
 * - Metals: metals.live
 * - Forex: ExchangeRate API (open.er-api.com)
 */
/**
 * Fetch live prices from all sources.
 * Returns a Map of symbol -> current USD price.
 * Falls back to seeded prices if any API fails (never crashes).
 * Caches results for 30 seconds to avoid rate limits.
 */
export declare function fetchLivePrices(): Promise<Map<string, number>>;
/**
 * Get a single live price for a symbol (uses cached batch).
 */
export declare function getLivePrice(symbol: string): Promise<number | undefined>;
/**
 * Force-clear the cache (useful for testing).
 */
export declare function invalidatePriceCache(): void;
//# sourceMappingURL=prices.d.ts.map