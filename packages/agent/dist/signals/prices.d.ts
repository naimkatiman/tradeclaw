/**
 * Provider-observed price fetcher with a 30-second cache.
 * Fetches current observations from public APIs:
 * - Crypto: CoinGecko
 * - Metals: metals.live
 * - Forex: ExchangeRate API (open.er-api.com)
 */
/**
 * Fetch current provider price observations.
 * Returns a Map of symbol -> current USD price.
 * Returns only values actually observed from a provider. Missing providers
 * produce missing symbols; no static quote is substituted.
 * Caches results for 30 seconds to avoid rate limits.
 */
export declare function fetchLivePrices(): Promise<Map<string, number>>;
/**
 * Get one current provider observation for a symbol (uses cached batch).
 */
export declare function getLivePrice(symbol: string): Promise<number | undefined>;
/**
 * Force-clear the cache (useful for testing).
 */
export declare function invalidatePriceCache(): void;
//# sourceMappingURL=prices.d.ts.map