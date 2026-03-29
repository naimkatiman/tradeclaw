/**
 * Live price fetcher with 30-second cache and graceful fallback.
 * Fetches real-time prices from free APIs:
 * - Crypto: CoinGecko
 * - Metals: metals.live
 * - Forex: ExchangeRate API (open.er-api.com)
 */

interface PriceCache {
  prices: Map<string, number>;
  timestamp: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds
let cache: PriceCache | null = null;

/** CoinGecko ID mapping for crypto symbols */
const COINGECKO_MAP: Record<string, string> = {
  BTCUSD: 'bitcoin',
  ETHUSD: 'ethereum',
  XRPUSD: 'ripple',
  SOLUSD: 'solana',
};

/** Fallback prices — used when all APIs are unreachable. Never crash. */
const FALLBACK_PRICES: Record<string, number> = {
  XAUUSD: 4505.0,
  XAGUSD: 71.36,
  BTCUSD: 70798.0,
  ETHUSD: 2147.53,
  XRPUSD: 1.40,
  SOLUSD: 91.37,
  EURUSD: 1.1559,
  GBPUSD: 1.3352,
  USDJPY: 159.53,
  AUDUSD: 0.6939,
};

/**
 * Fetch a URL with a timeout. Uses the global `fetch` (Node 18+).
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCryptoPrices(prices: Map<string, number>): Promise<void> {
  const ids = Object.values(COINGECKO_MAP).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return;

  const data = (await res.json()) as Record<string, { usd?: number }>;
  for (const [symbol, coinId] of Object.entries(COINGECKO_MAP)) {
    const usd = data[coinId]?.usd;
    if (typeof usd === 'number' && usd > 0) {
      prices.set(symbol, usd);
    }
  }
}

async function fetchStooqPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(`https://stooq.com/q/l/?s=${symbol.toLowerCase()}&f=c&h&e=csv`);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const val = parseFloat(lines[1].trim());
    return isNaN(val) || val <= 0 ? null : val;
  } catch {
    return null;
  }
}

async function fetchGoldPrice(prices: Map<string, number>): Promise<void> {
  const stooqPrice = await fetchStooqPrice('XAUUSD');
  if (stooqPrice) { prices.set('XAUUSD', stooqPrice); return; }
  try {
    const res = await fetchWithTimeout('https://api.metals.live/v1/spot/gold');
    if (!res.ok) return;
    const data = (await res.json()) as Array<{ price?: number }>;
    if (Array.isArray(data) && data.length > 0 && typeof data[0].price === 'number') {
      prices.set('XAUUSD', data[0].price);
    }
  } catch { /* use fallback */ }
}

async function fetchSilverPrice(prices: Map<string, number>): Promise<void> {
  const stooqPrice = await fetchStooqPrice('XAGUSD');
  if (stooqPrice) { prices.set('XAGUSD', stooqPrice); return; }
  try {
    const res = await fetchWithTimeout('https://api.metals.live/v1/spot/silver');
    if (!res.ok) return;
    const data = (await res.json()) as Array<{ price?: number }>;
    if (Array.isArray(data) && data.length > 0 && typeof data[0].price === 'number') {
      prices.set('XAGUSD', data[0].price);
    }
  } catch { /* use fallback */ }
}

async function fetchForexPrices(prices: Map<string, number>): Promise<void> {
  const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) return;

  const data = (await res.json()) as { rates?: Record<string, number> };
  const rates = data.rates;
  if (!rates) return;

  if (rates.EUR) prices.set('EURUSD', Number((1 / rates.EUR).toFixed(5)));
  if (rates.GBP) prices.set('GBPUSD', Number((1 / rates.GBP).toFixed(5)));
  if (rates.JPY) prices.set('USDJPY', Number(rates.JPY.toFixed(3)));
  if (rates.AUD) prices.set('AUDUSD', Number((1 / rates.AUD).toFixed(5)));
}

/**
 * Fetch live prices from all sources.
 * Returns a Map of symbol -> current USD price.
 * Falls back to seeded prices if any API fails (never crashes).
 * Caches results for 30 seconds to avoid rate limits.
 */
export async function fetchLivePrices(): Promise<Map<string, number>> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return new Map(cache.prices);
  }

  const prices = new Map<string, number>();

  for (const [symbol, price] of Object.entries(FALLBACK_PRICES)) {
    prices.set(symbol, price);
  }

  await Promise.allSettled([
    fetchCryptoPrices(prices),
    fetchGoldPrice(prices),
    fetchSilverPrice(prices),
    fetchForexPrices(prices),
  ]);

  cache = { prices: new Map(prices), timestamp: Date.now() };

  return prices;
}

/**
 * Get a single live price for a symbol (uses cached batch).
 */
export async function getLivePrice(symbol: string): Promise<number | undefined> {
  const prices = await fetchLivePrices();
  return prices.get(symbol.toUpperCase());
}

/**
 * Force-clear the cache (useful for testing).
 */
export function invalidatePriceCache(): void {
  cache = null;
}
