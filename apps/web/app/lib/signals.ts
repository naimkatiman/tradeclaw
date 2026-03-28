// Shared signal generation logic — used by both API route and server-side pre-rendering
// Now powered by real technical analysis from OHLCV data

import { getMultiOHLCV } from './ohlcv';
import { calculateAllIndicators } from './ta-engine';
import { generateSignalsFromTA } from './signal-generator';

// Signal types
export interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number; // 0-100
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  indicators: IndicatorSummary;
  timeframe: string;
  timestamp: string;
  status: 'active' | 'hit_tp1' | 'hit_tp2' | 'hit_tp3' | 'stopped' | 'expired';
  source?: 'real' | 'fallback'; // New field to indicate signal source
  dataQuality?: 'real' | 'synthetic';
}

export interface IndicatorSummary {
  rsi: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
  macd: { histogram: number; signal: 'bullish' | 'bearish' | 'neutral' };
  ema: { trend: 'up' | 'down' | 'sideways'; ema20: number; ema50: number; ema200: number };
  bollingerBands: { position: 'upper' | 'middle' | 'lower'; bandwidth: number };
  stochastic: { k: number; d: number; signal: 'oversold' | 'neutral' | 'overbought' };
  support: number[];
  resistance: number[];
  adx?: { value: number; trending: boolean; plusDI: number; minusDI: number };
  volume?: { current: number; average: number; ratio: number; confirmed: boolean };
}

// Symbol configurations with current market prices (Mar 2026)
export const SYMBOLS = [
  { symbol: 'XAUUSD', name: 'Gold', pip: 0.01, basePrice: 4505.0, volatility: 20 },
  { symbol: 'XAGUSD', name: 'Silver', pip: 0.001, basePrice: 71.36, volatility: 0.8 },
  { symbol: 'BTCUSD', name: 'Bitcoin', pip: 0.01, basePrice: 70798.0, volatility: 2000 },
  { symbol: 'ETHUSD', name: 'Ethereum', pip: 0.01, basePrice: 2147.53, volatility: 100 },
  { symbol: 'XRPUSD', name: 'XRP', pip: 0.0001, basePrice: 1.40, volatility: 0.03 },
  { symbol: 'EURUSD', name: 'EUR/USD', pip: 0.0001, basePrice: 1.1559, volatility: 0.005 },
  { symbol: 'GBPUSD', name: 'GBP/USD', pip: 0.0001, basePrice: 1.3352, volatility: 0.006 },
  { symbol: 'USDJPY', name: 'USD/JPY', pip: 0.01, basePrice: 159.53, volatility: 0.8 },
  { symbol: 'AUDUSD', name: 'AUD/USD', pip: 0.0001, basePrice: 0.6939, volatility: 0.004 },
  { symbol: 'USDCAD', name: 'USD/CAD', pip: 0.0001, basePrice: 1.3826, volatility: 0.005 },
  { symbol: 'NZDUSD', name: 'NZD/USD', pip: 0.0001, basePrice: 0.5799, volatility: 0.004 },
  { symbol: 'USDCHF', name: 'USD/CHF', pip: 0.0001, basePrice: 0.7922, volatility: 0.004 },
];

export const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

export function generateSignalId(): string {
  return `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Fallback: Random signal generation (original code) ─────

export function generateIndicators(price: number, direction: 'BUY' | 'SELL', volatility: number): IndicatorSummary {
  const rsiValue = direction === 'BUY'
    ? clamp(25 + Math.random() * 20, 15, 45)
    : clamp(60 + Math.random() * 25, 55, 85);

  const macdHist = direction === 'BUY'
    ? +(Math.random() * 0.5 + 0.1).toFixed(4)
    : +(-Math.random() * 0.5 - 0.1).toFixed(4);

  const ema20 = direction === 'BUY' ? price * (1 - Math.random() * 0.005) : price * (1 + Math.random() * 0.005);
  const ema50 = direction === 'BUY' ? price * (1 - Math.random() * 0.01) : price * (1 + Math.random() * 0.01);
  const ema200 = direction === 'BUY' ? price * (1 - Math.random() * 0.02) : price * (1 + Math.random() * 0.02);

  const stochK = direction === 'BUY'
    ? clamp(15 + Math.random() * 15, 5, 30)
    : clamp(70 + Math.random() * 20, 70, 95);

  const support1 = price - volatility * (1 + Math.random());
  const support2 = price - volatility * (2 + Math.random());
  const resistance1 = price + volatility * (1 + Math.random());
  const resistance2 = price + volatility * (2 + Math.random());

  return {
    rsi: {
      value: +rsiValue.toFixed(2),
      signal: rsiValue < 30 ? 'oversold' : rsiValue > 70 ? 'overbought' : 'neutral',
    },
    macd: {
      histogram: macdHist,
      signal: macdHist > 0 ? 'bullish' : macdHist < 0 ? 'bearish' : 'neutral',
    },
    ema: {
      trend: direction === 'BUY' ? 'up' : 'down',
      ema20: +ema20.toFixed(5),
      ema50: +ema50.toFixed(5),
      ema200: +ema200.toFixed(5),
    },
    bollingerBands: {
      position: direction === 'BUY' ? 'lower' : 'upper',
      bandwidth: +(volatility * 2 / price * 100).toFixed(4),
    },
    stochastic: {
      k: +stochK.toFixed(2),
      d: +(stochK - 2 + Math.random() * 4).toFixed(2),
      signal: stochK < 20 ? 'oversold' : stochK > 80 ? 'overbought' : 'neutral',
    },
    support: [+support1.toFixed(5), +support2.toFixed(5)],
    resistance: [+resistance1.toFixed(5), +resistance2.toFixed(5)],
  };
}

export function generateSignal(symbolConfig: typeof SYMBOLS[0], livePrice?: number): TradingSignal {
  const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const base = livePrice ?? symbolConfig.basePrice;
  const priceOffset = (Math.random() - 0.5) * symbolConfig.volatility * 2;
  const currentPrice = base + priceOffset;
  const riskReward = 1.5 + Math.random() * 1.5;

  const slDistance = symbolConfig.volatility * (0.3 + Math.random() * 0.4);
  const tp1Distance = slDistance * riskReward;
  const tp2Distance = tp1Distance * 1.618;
  const tp3Distance = tp1Distance * 2.618;

  const entry = +currentPrice.toFixed(5);
  const stopLoss = direction === 'BUY'
    ? +(entry - slDistance).toFixed(5)
    : +(entry + slDistance).toFixed(5);
  const takeProfit1 = direction === 'BUY'
    ? +(entry + tp1Distance).toFixed(5)
    : +(entry - tp1Distance).toFixed(5);
  const takeProfit2 = direction === 'BUY'
    ? +(entry + tp2Distance).toFixed(5)
    : +(entry - tp2Distance).toFixed(5);
  const takeProfit3 = direction === 'BUY'
    ? +(entry + tp3Distance).toFixed(5)
    : +(entry - tp3Distance).toFixed(5);

  const confidence = Math.floor(55 + Math.random() * 40);
  const timeframe = TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)];

  return {
    id: generateSignalId(),
    symbol: symbolConfig.symbol,
    direction,
    confidence,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    indicators: generateIndicators(currentPrice, direction, symbolConfig.volatility),
    timeframe,
    timestamp: new Date().toISOString(),
    status: 'active',
    source: 'fallback',
  };
}

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
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana&vs_currencies=usd', {
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
 * Generate signals using real technical analysis
 * Falls back to random generation if TA engine fails
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

    // Calculate indicators and generate signals (generateSignalsFromTA returns [] for synthetic)
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
      sig.source = 'real';
      sig.dataQuality = 'real';
    }

    signals.push(...realSignals);
  }
  return { signals, syntheticSymbols };
}

/**
 * Main signal generation function — used by both API route and server components.
 * Now uses real TA when possible, falls back to random when not.
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
