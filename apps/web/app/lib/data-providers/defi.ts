/**
 * DeFi Data Provider — DeFi Llama
 * https://api.llama.fi/ — completely open, no key, no rate limits
 */

import { type DeFiProtocol, type DeFiYield, type PriceQuote, safeFetch } from './types';

// ─── DeFi Llama TVL & Protocol Data ───────────────────────────────────────

interface LlamaProtocol {
  name: string;
  tvl: number;
  change_1d: number;
  category: string;
  chains: string[];
  url: string;
}

export async function fetchDeFiProtocols(limit: number = 50): Promise<DeFiProtocol[]> {
  const data = await safeFetch<LlamaProtocol[]>(
    'https://api.llama.fi/protocols',
    { timeoutMs: 15000 },
  );
  if (!data) return [];

  return data
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, limit)
    .map((p) => ({
      name: p.name,
      tvl: p.tvl,
      change24h: +(p.change_1d ?? 0).toFixed(2),
      category: p.category ?? 'Unknown',
      chain: p.chains?.[0] ?? 'Multi-chain',
      url: p.url,
    }));
}

// ─── Total DeFi TVL ───────────────────────────────────────────────────────

export async function fetchTotalTVL(): Promise<{
  total: number;
  chains: Array<{ name: string; tvl: number }>;
} | null> {
  const data = await safeFetch<Array<{ name: string; tvl: number }>>(
    'https://api.llama.fi/v2/chains',
  );
  if (!data) return null;

  const chains = data
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 20)
    .map((c) => ({ name: c.name, tvl: c.tvl }));

  const total = data.reduce((sum, c) => sum + c.tvl, 0);

  return { total, chains };
}

// ─── DeFi Yields ──────────────────────────────────────────────────────────

interface LlamaYield {
  pool: string;
  project: string;
  chain: string;
  apy: number;
  tvlUsd: number;
  symbol: string;
  stablecoin: boolean;
}

export async function fetchDeFiYields(
  options: { minTvl?: number; stableOnly?: boolean; limit?: number } = {},
): Promise<DeFiYield[]> {
  const { minTvl = 1_000_000, stableOnly = false, limit = 50 } = options;

  const data = await safeFetch<{ data: LlamaYield[] }>(
    'https://yields.llama.fi/pools',
    { timeoutMs: 15000 },
  );
  if (!data?.data) return [];

  return data.data
    .filter((p) => p.tvlUsd >= minTvl && (!stableOnly || p.stablecoin))
    .sort((a, b) => b.apy - a.apy)
    .slice(0, limit)
    .map((p) => ({
      pool: p.pool,
      project: p.project,
      chain: p.chain,
      apy: +p.apy.toFixed(2),
      tvl: p.tvlUsd,
      symbol: p.symbol,
    }));
}

// ─── DeFi Token Prices ────────────────────────────────────────────────────

const DEFI_TOKENS: Record<string, string> = {
  'ethereum:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVEUSD',
  'ethereum:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNIUSD',
  'ethereum:0xc00e94cb662c3520282e6f5717214004a7f26888': 'COMPUSD',
  'ethereum:0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'MKRUSD',
  'ethereum:0x6b175474e89094c44da98b954eedeac495271d0f': 'DAIUSD',
};

export async function fetchDeFiTokenPrices(): Promise<PriceQuote[]> {
  const coins = Object.keys(DEFI_TOKENS).join(',');
  const data = await safeFetch<{
    coins: Record<string, { price: number; confidence: number }>;
  }>(`https://coins.llama.fi/prices/current/${encodeURIComponent(coins)}`);
  if (!data?.coins) return [];

  return Object.entries(data.coins).map(([addr, info]) => ({
    symbol: DEFI_TOKENS[addr] ?? addr,
    price: info.price,
    timestamp: Date.now(),
    source: 'defillama',
  }));
}

// ─── Stablecoin Data ──────────────────────────────────────────────────────

export async function fetchStablecoinData(): Promise<
  Array<{ name: string; symbol: string; peg: number; mcap: number; chain: string }>
> {
  const data = await safeFetch<{
    peggedAssets: Array<{
      name: string;
      symbol: string;
      price: number;
      circulating: { peggedUSD: number };
      chains: string[];
    }>;
  }>('https://stablecoins.llama.fi/stablecoins?includePrices=true');
  if (!data?.peggedAssets) return [];

  return data.peggedAssets
    .slice(0, 20)
    .map((s) => ({
      name: s.name,
      symbol: s.symbol,
      peg: s.price ?? 1,
      mcap: s.circulating?.peggedUSD ?? 0,
      chain: s.chains?.[0] ?? 'Multi-chain',
    }));
}
