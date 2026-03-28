/**
 * Crypto Data Providers — CoinCap, Kraken, CryptoCompare
 * All free, no API key required (CryptoCompare optional key for higher limits)
 */

import { type PriceQuote, type OHLCV, safeFetch } from './types';

// ─── CoinCap ───────────────────────────────────────────────────────────────
// https://docs.coincap.io/ — 200 req/min without key, WebSocket available

const COINCAP_MAP: Record<string, string> = {
  BTCUSD: 'bitcoin',
  ETHUSD: 'ethereum',
  XRPUSD: 'ripple',
  SOLUSD: 'solana',
  ADAUSD: 'cardano',
  BNBUSD: 'binance-coin',
  DOTUSD: 'polkadot',
  DOGEUSD: 'dogecoin',
  AVAXUSD: 'avalanche',
  LINKUSD: 'chainlink',
  MATICUSD: 'polygon',
  ATOMUSD: 'cosmos',
};

interface CoinCapAsset {
  id: string;
  priceUsd: string;
  changePercent24Hr: string;
  volumeUsd24Hr: string;
  marketCapUsd: string;
}

export async function fetchCoinCapPrices(): Promise<PriceQuote[]> {
  const ids = Object.values(COINCAP_MAP).join(',');
  const data = await safeFetch<{ data: CoinCapAsset[] }>(
    `https://api.coincap.io/v2/assets?ids=${ids}`,
  );
  if (!data?.data) return [];

  const reverseMap = Object.fromEntries(
    Object.entries(COINCAP_MAP).map(([k, v]) => [v, k]),
  );

  return data.data.map((asset) => ({
    symbol: reverseMap[asset.id] ?? asset.id.toUpperCase(),
    price: parseFloat(asset.priceUsd),
    change24h: +parseFloat(asset.changePercent24Hr).toFixed(2),
    volume24h: parseFloat(asset.volumeUsd24Hr),
    marketCap: parseFloat(asset.marketCapUsd),
    timestamp: Date.now(),
    source: 'coincap',
  }));
}

export async function fetchCoinCapHistory(
  symbol: string,
  interval: 'h1' | 'h2' | 'h6' | 'h12' | 'd1' = 'd1',
): Promise<OHLCV[]> {
  const coinCapId = COINCAP_MAP[symbol];
  if (!coinCapId) return [];

  const data = await safeFetch<{
    data: Array<{ time: number; priceUsd: string }>;
  }>(`https://api.coincap.io/v2/assets/${coinCapId}/history?interval=${interval}`);
  if (!data?.data) return [];

  // CoinCap only returns price (no OHLCV), so we approximate
  return data.data.map((d) => {
    const price = parseFloat(d.priceUsd);
    return {
      timestamp: d.time,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    };
  });
}

// ─── Kraken ────────────────────────────────────────────────────────────────
// https://docs.kraken.com/api/ — no key needed for public endpoints

const KRAKEN_MAP: Record<string, string> = {
  BTCUSD: 'XXBTZUSD',
  ETHUSD: 'XETHZUSD',
  XRPUSD: 'XXRPZUSD',
  SOLUSD: 'SOLUSD',
  ADAUSD: 'ADAUSD',
  DOTUSD: 'DOTUSD',
  DOGEUSD: 'XDGUSD',
  LINKUSD: 'LINKUSD',
  AVAXUSD: 'AVAXUSD',
  ATOMUSD: 'ATOMUSD',
  MATICUSD: 'MATICUSD',
};

interface KrakenTicker {
  a: [string, string, string]; // ask
  b: [string, string, string]; // bid
  c: [string, string]; // last trade
  v: [string, string]; // volume [today, 24h]
  h: [string, string]; // high [today, 24h]
  l: [string, string]; // low [today, 24h]
  o: string; // open
}

export async function fetchKrakenPrices(): Promise<PriceQuote[]> {
  const pairs = Object.values(KRAKEN_MAP).join(',');
  const data = await safeFetch<{
    error: string[];
    result: Record<string, KrakenTicker>;
  }>(`https://api.kraken.com/0/public/Ticker?pair=${pairs}`);
  if (!data?.result || data.error?.length > 0) return [];

  const reverseMap = Object.fromEntries(
    Object.entries(KRAKEN_MAP).map(([k, v]) => [v, k]),
  );

  return Object.entries(data.result).map(([pair, ticker]) => {
    const lastPrice = parseFloat(ticker.c[0]);
    const openPrice = parseFloat(ticker.o);
    const change = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;

    return {
      symbol: reverseMap[pair] ?? pair,
      price: lastPrice,
      change24h: +change.toFixed(2),
      volume24h: parseFloat(ticker.v[1]),
      high24h: parseFloat(ticker.h[1]),
      low24h: parseFloat(ticker.l[1]),
      timestamp: Date.now(),
      source: 'kraken',
    };
  });
}

const KRAKEN_INTERVALS: Record<string, number> = {
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};

export async function fetchKrakenOHLCV(
  symbol: string,
  timeframe: string,
): Promise<OHLCV[]> {
  const krakenPair = KRAKEN_MAP[symbol];
  const interval = KRAKEN_INTERVALS[timeframe];
  if (!krakenPair || !interval) return [];

  const data = await safeFetch<{
    error: string[];
    result: Record<string, Array<[number, string, string, string, string, string, string, number]>>;
  }>(`https://api.kraken.com/0/public/OHLC?pair=${krakenPair}&interval=${interval}`);
  if (!data?.result || data.error?.length > 0) return [];

  // Result key may differ from input pair name
  const entries = Object.entries(data.result).find(([k]) => k !== 'last');
  if (!entries) return [];

  return entries[1].map((candle) => ({
    timestamp: candle[0] * 1000,
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[6]),
  }));
}

// ─── CryptoCompare ─────────────────────────────────────────────────────────
// https://min-api.cryptocompare.com/ — free tier: 100k calls/month

const CC_MAP: Record<string, string> = {
  BTCUSD: 'BTC',
  ETHUSD: 'ETH',
  XRPUSD: 'XRP',
  SOLUSD: 'SOL',
  ADAUSD: 'ADA',
  BNBUSD: 'BNB',
  DOTUSD: 'DOT',
  DOGEUSD: 'DOGE',
  AVAXUSD: 'AVAX',
  LINKUSD: 'LINK',
  MATICUSD: 'MATIC',
  ATOMUSD: 'ATOM',
};

interface CCHistoEntry {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumefrom: number;
}

export async function fetchCryptoCompareOHLCV(
  symbol: string,
  timeframe: string,
): Promise<OHLCV[]> {
  const fsym = CC_MAP[symbol];
  if (!fsym) return [];

  const apiKey = process.env.CRYPTOCOMPARE_API_KEY ?? '';
  const headers: Record<string, string> = {};
  if (apiKey) headers['authorization'] = `Apikey ${apiKey}`;

  // Map timeframe to endpoint
  let endpoint: string;
  let limit: number;
  switch (timeframe) {
    case 'M15':
      endpoint = 'histominute';
      limit = 300;
      break;
    case 'H1':
      endpoint = 'histohour';
      limit = 300;
      break;
    case 'H4':
      endpoint = 'histohour';
      limit = 300;
      break;
    case 'D1':
      endpoint = 'histoday';
      limit = 365;
      break;
    default:
      return [];
  }

  const data = await safeFetch<{ Data: { Data: CCHistoEntry[] } }>(
    `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${fsym}&tsym=USD&limit=${limit}`,
    { headers },
  );
  if (!data?.Data?.Data) return [];

  return data.Data.Data.map((d) => ({
    timestamp: d.time * 1000,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volumefrom,
  }));
}
