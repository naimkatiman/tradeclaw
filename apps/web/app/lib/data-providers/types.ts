/**
 * Unified Data Provider Types
 * All free market data providers implement these interfaces
 */

export interface PriceQuote {
  symbol: string;
  price: number;
  change24h?: number;
  volume24h?: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
  source: string;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ForexRate {
  pair: string;
  rate: number;
  timestamp: number;
  source: string;
}

export interface MacroDataPoint {
  seriesId: string;
  name: string;
  value: number;
  date: string;
  unit: string;
  source: string;
}

export interface DeFiProtocol {
  name: string;
  tvl: number;
  change24h: number;
  category: string;
  chain: string;
  url?: string;
}

export interface DeFiYield {
  pool: string;
  project: string;
  chain: string;
  apy: number;
  tvl: number;
  symbol: string;
}

export interface SentimentData {
  value: number;
  label: string; // e.g. "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: number;
  source: string;
}

export interface OnChainData {
  mempoolSize: number;
  feeEstimate: { fast: number; medium: number; slow: number };
  blockHeight: number;
  hashRate?: number;
  difficulty?: number;
  timestamp: number;
  source: string;
}

export interface GoldHistorical {
  date: string;
  price: number;
  currency: string;
}

export interface ProviderStatus {
  name: string;
  category: string;
  status: 'ok' | 'degraded' | 'down';
  lastCheck: number;
  latencyMs?: number;
  requiresKey: boolean;
  rateLimit: string;
  docs: string;
}

export type ProviderCategory =
  | 'crypto'
  | 'forex'
  | 'stocks'
  | 'commodities'
  | 'macro'
  | 'defi'
  | 'sentiment'
  | 'onchain';

/** Shared fetch helper with timeout and error handling */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T | null> {
  try {
    const { timeoutMs = 8000, ...fetchOpts } = options ?? {};
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      ...fetchOpts,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Fetch text content with timeout */
export async function safeFetchText(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
