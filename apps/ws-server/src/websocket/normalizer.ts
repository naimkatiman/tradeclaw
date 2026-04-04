import { getAllSymbols, type NormalizedTick } from '@tradeclaw/signals';

// Binance symbol mapping: TradeClaw -> Binance
const TC_TO_BINANCE: Record<string, string> = {
  BTCUSD: 'btcusdt',
  ETHUSD: 'ethusdt',
  SOLUSD: 'solusdt',
  DOGEUSD: 'dogeusdt',
  BNBUSD: 'bnbusdt',
  XRPUSD: 'xrpusdt',
};

const BINANCE_TO_TC: Record<string, string> = Object.fromEntries(
  Object.entries(TC_TO_BINANCE).map(([tc, bn]) => [bn, tc])
);

const validSymbols = new Set(getAllSymbols());

export function toBinanceSymbol(tcSymbol: string): string | undefined {
  return TC_TO_BINANCE[tcSymbol.toUpperCase()];
}

export function fromBinanceSymbol(binanceSymbol: string): string | undefined {
  return BINANCE_TO_TC[binanceSymbol.toLowerCase()];
}

export function getBinanceCryptoSymbols(): string[] {
  return Object.keys(TC_TO_BINANCE);
}

export interface BinanceMiniTicker {
  e: '24hrMiniTicker';
  s: string;  // Symbol e.g. "BTCUSDT"
  c: string;  // Close price
  o: string;  // Open price
  h: string;  // High price
  l: string;  // Low price
  E: number;  // Event time
}

export interface BinanceTrade {
  e: 'trade';
  s: string;  // Symbol
  p: string;  // Price
  q: string;  // Quantity
  T: number;  // Trade time
}

export function normalizeBinanceMiniTicker(raw: BinanceMiniTicker): NormalizedTick | null {
  const symbol = fromBinanceSymbol(raw.s.toLowerCase());
  if (!symbol || !validSymbols.has(symbol)) return null;

  const close = parseFloat(raw.c);
  if (isNaN(close) || close <= 0) return null;

  // Estimate spread as 0.01% of price
  const spread = close * 0.0001;

  return {
    symbol,
    bid: close - spread / 2,
    ask: close + spread / 2,
    mid: close,
    timestamp: raw.E || Date.now(),
    provider: 'binance',
  };
}

export function normalizeBinanceTrade(raw: BinanceTrade): NormalizedTick | null {
  const symbol = fromBinanceSymbol(raw.s.toLowerCase());
  if (!symbol || !validSymbols.has(symbol)) return null;

  const price = parseFloat(raw.p);
  if (isNaN(price) || price <= 0) return null;

  const spread = price * 0.0001;

  return {
    symbol,
    bid: price - spread / 2,
    ask: price + spread / 2,
    mid: price,
    timestamp: raw.T || Date.now(),
    provider: 'binance',
  };
}

export function isValidSymbol(symbol: string): boolean {
  return validSymbols.has(symbol.toUpperCase());
}
