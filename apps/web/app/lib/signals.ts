// Shared signal generation logic — used by both API route and server-side pre-rendering
// Now powered by real technical analysis from OHLCV data

import { getMultiOHLCV } from './ohlcv';
import { calculateAllIndicators } from './ta-engine';
import { generateSignalsFromTA } from './signal-generator';

// Signal types — shared from @tradeclaw/signals
import type { TradingSignal, IndicatorSummary } from '@tradeclaw/signals';
import { generateSignalId, clamp } from '@tradeclaw/signals';
export type { TradingSignal, IndicatorSummary } from '@tradeclaw/signals';
export { generateSignalId, clamp } from '@tradeclaw/signals';

// Symbol configs live in symbol-config.ts (client-safe, no server imports).
// Re-export here for backward compatibility with existing server-side consumers.
export { SYMBOLS, TIMEFRAMES } from './symbol-config';
import { SYMBOLS } from './symbol-config';

// generateSignalId and clamp are now imported from @tradeclaw/signals

// ─── Live Price Fetching ─────────────────────────────────────

async function fetchStooq(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${symbol.toLowerCase()}&f=c&h&e=csv`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const val = parseFloat(lines[1].trim());
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

export async function getLivePrices(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  const [cryptoResult, forexResult, xauResult, xagResult] = await Promise.allSettled([
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,dogecoin,binancecoin&vs_currencies=usd', {
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() as Promise<Record<string, {usd: number}>> : null),
    fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() as Promise<{rates: Record<string, number>}> : null),
    fetchStooq('XAUUSD'),
    fetchStooq('XAGUSD'),
  ]);

  if (cryptoResult.status === 'fulfilled' && cryptoResult.value) {
    const data = cryptoResult.value;
    if (data.bitcoin?.usd) map.set('BTCUSD', data.bitcoin.usd);
    if (data.ethereum?.usd) map.set('ETHUSD', data.ethereum.usd);
    if (data.ripple?.usd) map.set('XRPUSD', data.ripple.usd);
    if (data.solana?.usd) map.set('SOLUSD', data.solana.usd);
    if (data.dogecoin?.usd) map.set('DOGEUSD', data.dogecoin.usd);
    if (data['binancecoin']?.usd) map.set('BNBUSD', data['binancecoin'].usd);
  }

  if (forexResult.status === 'fulfilled' && forexResult.value) {
    const r = forexResult.value.rates || {};
    if (r.EUR) map.set('EURUSD', +(1 / r.EUR).toFixed(5));
    if (r.GBP) map.set('GBPUSD', +(1 / r.GBP).toFixed(5));
    if (r.JPY) map.set('USDJPY', +r.JPY.toFixed(3));
    if (r.AUD) map.set('AUDUSD', +(1 / r.AUD).toFixed(5));
    if (r.CAD) map.set('USDCAD', +r.CAD.toFixed(5));
    if (r.NZD) map.set('NZDUSD', +(1 / r.NZD).toFixed(5));
    if (r.CHF) map.set('USDCHF', +r.CHF.toFixed(5));
  }

  if (xauResult.status === 'fulfilled' && xauResult.value) map.set('XAUUSD', xauResult.value);
  if (xagResult.status === 'fulfilled' && xagResult.value) map.set('XAGUSD', xagResult.value);

  return map;
}

// ─── Main Signal Generation (Real TA Engine) ─────────────────

/**
 * Generate signals using real technical analysis.
 * Skips symbols with insufficient data — never produces synthetic signals.
 */
async function generateRealSignals(
  symbols: typeof SYMBOLS,
  timeframe: string,
): Promise<{ signals: TradingSignal[]; syntheticSymbols: string[] }> {
  const symbolNames = symbols.map(s => s.symbol);

  // Fetch OHLCV data for all symbols in parallel
  const ohlcvData = await getMultiOHLCV(symbolNames, timeframe);

  const signals: TradingSignal[] = [];
  const syntheticSymbols: string[] = [];

  for (const sym of symbols) {
    const data = ohlcvData.get(sym.symbol);

    if (!data || data.candles.length < 50) {
      // Not enough data — skip this symbol entirely
      continue;
    }

    if (data.source === 'synthetic') {
      syntheticSymbols.push(sym.symbol);
    }

    // Calculate indicators and generate signals with source transparency
    const indicators = calculateAllIndicators(data.candles);
    const signalSource = data.source === 'synthetic' ? 'synthetic' : 'real';
    const signalTimestamp = data.candles[data.candles.length - 1]?.timestamp ?? Date.now();
    const realSignals = generateSignalsFromTA(
      sym.symbol,
      indicators,
      timeframe,
      signalSource,
      signalTimestamp,
    );

    for (const sig of realSignals) {
      sig.source = signalSource === 'synthetic' ? 'fallback' : 'real';
      // dataQuality is already set by generateSignalsFromTA based on actual data source
    }

    signals.push(...realSignals);
  }
  return { signals, syntheticSymbols };
}

/**
 * Main signal generation function — used by both API route and server components.
 * Uses real TA engine only. Returns empty if no data available.
 */
export async function getSignals(params: {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}): Promise<{ signals: TradingSignal[]; syntheticSymbols: string[] }> {
  const { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence = 0 } = params;

  let symbols = SYMBOLS;
  if (symbolFilter) {
    const upper = symbolFilter.toUpperCase();
    symbols = SYMBOLS.filter(s => s.symbol === upper);
    if (symbols.length === 0) {
      return { signals: [], syntheticSymbols: [] };
    }
  }

  // Determine timeframes to analyze
  const timeframesToCheck = timeframeFilter
    ? [timeframeFilter.toUpperCase()]
    : ['M15', 'H1', 'H4', 'D1']; // Default: check all timeframes

  let allSignals: TradingSignal[] = [];
  const allSyntheticSymbols = new Set<string>();

  try {
    const settled = await Promise.allSettled(
      timeframesToCheck.map(async (tf) => {
        const result = await generateRealSignals(symbols, tf);
        return { timeframe: tf, ...result };
      }),
    );

    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      allSignals.push(...result.value.signals);
      for (const s of result.value.syntheticSymbols) allSyntheticSymbols.add(s);
    }
  } catch {
    // TA engine crashed — return empty rather than misleading random signals
  }

  // Apply filters
  if (timeframeFilter) {
    const upper = timeframeFilter.toUpperCase();
    allSignals = allSignals.filter(s => s.timeframe === upper);
  }
  if (directionFilter) {
    const upper = directionFilter.toUpperCase();
    allSignals = allSignals.filter(s => s.direction === upper);
  }
  if (minConfidence > 0) {
    allSignals = allSignals.filter(s => s.confidence >= minConfidence);
  }

  // Sort by confidence descending
  allSignals.sort((a, b) => b.confidence - a.confidence);

  return { signals: allSignals, syntheticSymbols: [...allSyntheticSymbols] };
}
