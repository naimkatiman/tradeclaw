/**
 * TradingView Scanner Data Provider — unofficial scanner API
 * No API key required. Covers forex, metals, commodities, and indices.
 *
 * ⚠️ UNDOCUMENTED API — may break without notice. Use as a supplementary
 * source with proper fallbacks, never as the sole provider.
 *
 * https://scanner.tradingview.com/global/scan
 */

import { type PriceQuote, safeFetch } from './types';

const TV_SCANNER_URL = 'https://scanner.tradingview.com/global/scan';

// ─── Symbol mapping: our symbols → TradingView tickers ───────────────────

const TV_TICKERS: Record<string, string> = {
  // Metals
  XAUUSD: 'OANDA:XAUUSD',
  XAGUSD: 'OANDA:XAGUSD',
  // Forex majors
  EURUSD: 'FOREXCOM:EURUSD',
  GBPUSD: 'FOREXCOM:GBPUSD',
  USDJPY: 'FOREXCOM:USDJPY',
  AUDUSD: 'FOREXCOM:AUDUSD',
  USDCAD: 'FOREXCOM:USDCAD',
  NZDUSD: 'FOREXCOM:NZDUSD',
  USDCHF: 'FOREXCOM:USDCHF',
  // Forex crosses
  EURGBP: 'FOREXCOM:EURGBP',
  EURJPY: 'FOREXCOM:EURJPY',
  GBPJPY: 'FOREXCOM:GBPJPY',
  // Commodities
  WTIUSD: 'TVC:USOIL',
  BRNUSD: 'TVC:UKOIL',
  NGUSD: 'NYMEX:NG1!',
  HGUSD: 'COMEX:HG1!',
  PLUSD: 'NYMEX:PL1!',
  PAUSD: 'NYMEX:PA1!',
  // Indices
  SPX: 'SP:SPX',
  NDX: 'NASDAQ:NDX',
  DJI: 'DJ:DJI',
  DAX: 'XETR:DAX',
  FTSE: 'FTSE:UKX',
  NKX: 'TVC:NI225',
  HSI: 'TVC:HSI',
  VIX: 'TVC:VIX',
};

const TV_COLUMNS = ['close', 'change', 'change_abs', 'high', 'low', 'volume'] as const;

interface TVScanResult {
  data: Array<{
    s: string; // ticker e.g. "OANDA:XAUUSD"
    d: (number | null)[]; // column values in order of TV_COLUMNS
  }>;
}

/**
 * Fetch live prices from the TradingView Scanner API.
 * Batches all requested symbols into a single POST request.
 */
export async function fetchTradingViewPrices(
  symbols?: string[],
): Promise<PriceQuote[]> {
  const requested = symbols ?? Object.keys(TV_TICKERS);
  const tickers = requested
    .map((s) => TV_TICKERS[s])
    .filter(Boolean);
  if (tickers.length === 0) return [];

  const reverseMap = Object.fromEntries(
    Object.entries(TV_TICKERS).map(([k, v]) => [v, k]),
  );

  const body = JSON.stringify({
    symbols: {
      tickers,
      query: { types: [] },
    },
    columns: [...TV_COLUMNS],
  });

  const data = await safeFetch<TVScanResult>(TV_SCANNER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeoutMs: 8000,
    body,
  });
  if (!data?.data) return [];

  const quotes: PriceQuote[] = [];
  for (const item of data.data) {
    const symbol = reverseMap[item.s];
    if (!symbol) continue;

    const [close, changePct, , high, low, vol] = item.d;
    if (close == null || close <= 0) continue;

    quotes.push({
      symbol,
      price: +close.toFixed(5),
      change24h: changePct != null ? +changePct.toFixed(2) : undefined,
      high24h: high != null ? +high.toFixed(5) : undefined,
      low24h: low != null ? +low.toFixed(5) : undefined,
      volume24h: vol != null ? vol : undefined,
      timestamp: Date.now(),
      source: 'tradingview',
    });
  }

  return quotes;
}

/** Check whether a symbol is supported by this provider */
export function isTradingViewSymbol(symbol: string): boolean {
  return symbol in TV_TICKERS;
}

/** Get the list of all supported commodity symbols */
export function getTVCommoditySymbols(): string[] {
  return ['WTIUSD', 'BRNUSD', 'NGUSD', 'HGUSD', 'PLUSD', 'PAUSD'];
}

/** Get the list of all supported index symbols */
export function getTVIndexSymbols(): string[] {
  return ['SPX', 'NDX', 'DJI', 'DAX', 'FTSE', 'NKX', 'HSI', 'VIX'];
}
