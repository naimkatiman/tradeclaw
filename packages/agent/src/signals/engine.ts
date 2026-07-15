import {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic,
  findSupportLevels,
  findResistanceLevels,
  calculateADX,
} from '@tradeclaw/signals';
import { SYMBOLS } from '@tradeclaw/signals';
import type {
  TradingSignal,
  IndicatorSummary,
  Direction,
  Timeframe,
  SymbolConfig,
} from '@tradeclaw/signals';

export const SIGNAL_SCAN_AVAILABILITY = Object.freeze({
  available: false as const,
  dataQuality: 'unavailable' as const,
  reason: 'observed-ohlcv-provider-not-configured' as const,
});

function roundPrice(price: number, symbol: SymbolConfig): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(symbol.pip)));
  return Number(price.toFixed(decimals));
}

/**
 * Compute full indicator summary from price data.
 * Exported for unit testing of the indicator-to-signal threshold mapping.
 */
export function computeIndicators(
  prices: { open: number[]; high: number[]; low: number[]; close: number[] },
  symbol: SymbolConfig
): IndicatorSummary {
  const { high, low, close } = prices;

  const rsiValue = calculateRSI(close, 14);
  const rsiSignal: IndicatorSummary['rsi']['signal'] =
    rsiValue < 30 ? 'oversold' : rsiValue > 70 ? 'overbought' : 'neutral';

  const macdResult = calculateMACD(close);
  const macdSignal: IndicatorSummary['macd']['signal'] =
    macdResult.histogram > 0 ? 'bullish' : macdResult.histogram < 0 ? 'bearish' : 'neutral';

  const ema20 = calculateEMA(close, 20);
  const ema50 = calculateEMA(close, 50);
  const ema200 = calculateEMA(close, 200);
  const currentPrice = close[close.length - 1];
  const emaTrend: IndicatorSummary['ema']['trend'] =
    currentPrice > ema20 && ema20 > ema50 ? 'up' :
    currentPrice < ema20 && ema20 < ema50 ? 'down' : 'sideways';

  const bb = calculateBollingerBands(close, 20);
  const bbPosition: IndicatorSummary['bollingerBands']['position'] =
    currentPrice > bb.upper ? 'upper' :
    currentPrice < bb.lower ? 'lower' : 'middle';

  const stoch = calculateStochastic(high, low, close, 14, 3);
  const stochSignal: IndicatorSummary['stochastic']['signal'] =
    stoch.k < 20 ? 'oversold' : stoch.k > 80 ? 'overbought' : 'neutral';

  const support = findSupportLevels(low, 3).map((p: number) => roundPrice(p, symbol));
  const resistance = findResistanceLevels(high, 3).map((p: number) => roundPrice(p, symbol));

  const adxResult = calculateADX(high, low, close, 14);

  return {
    rsi: { value: Number(rsiValue.toFixed(1)), signal: rsiSignal },
    macd: { histogram: Number(macdResult.histogram.toFixed(4)), signal: macdSignal },
    ema: {
      trend: emaTrend,
      ema20: roundPrice(ema20, symbol),
      ema50: roundPrice(ema50, symbol),
      ema200: roundPrice(ema200, symbol),
    },
    bollingerBands: { position: bbPosition, bandwidth: Number(bb.bandwidth.toFixed(2)) },
    stochastic: {
      k: Number(stoch.k.toFixed(1)),
      d: Number(stoch.d.toFixed(1)),
      signal: stochSignal,
    },
    support,
    resistance,
    adx: {
      value: Number(adxResult.value.toFixed(1)),
      trending: adxResult.trending,
      plusDI: Number(adxResult.plusDI.toFixed(1)),
      minusDI: Number(adxResult.minusDI.toFixed(1)),
    },
  };
}

/**
 * Determine signal direction and confidence from indicators.
 * Exported for unit testing of the vote aggregator and confidence calculation.
 */
export function evaluateSignal(indicators: IndicatorSummary): {
  direction: Direction;
  confidence: number;
} | null {
  let buyScore = 0;
  let sellScore = 0;

  const rsi = indicators.rsi.value;
  if (rsi < 30) buyScore += 25;
  else if (rsi < 40) buyScore += 15;
  else if (rsi < 50) buyScore += 5;
  else if (rsi > 70) sellScore += 25;
  else if (rsi > 60) sellScore += 15;
  else if (rsi > 50) sellScore += 5;

  if (indicators.macd.signal === 'bullish') buyScore += 20;
  else if (indicators.macd.signal === 'bearish') sellScore += 20;

  if (indicators.ema.trend === 'up') buyScore += 20;
  else if (indicators.ema.trend === 'down') sellScore += 20;
  else if (indicators.ema.ema20 > indicators.ema.ema50) buyScore += 8;
  else sellScore += 8;

  if (indicators.bollingerBands.position === 'lower') buyScore += 15;
  else if (indicators.bollingerBands.position === 'upper') sellScore += 15;
  else if (indicators.bollingerBands.bandwidth > 2) {
    buyScore += 5;
    sellScore += 5;
  }

  const stochK = indicators.stochastic.k;
  if (stochK < 20) buyScore += 20;
  else if (stochK < 35) buyScore += 12;
  else if (stochK < 50) buyScore += 4;
  else if (stochK > 80) sellScore += 20;
  else if (stochK > 65) sellScore += 12;
  else if (stochK > 50) sellScore += 4;

  const maxScore = Math.max(buyScore, sellScore);
  if (maxScore < 20) return null;

  const direction: Direction = buyScore >= sellScore ? 'BUY' : 'SELL';
  const confidence = Math.min(Math.round(40 + (maxScore - 20) * (58 / 80)), 98);

  return { direction, confidence };
}

/**
 * Signal generation is disabled until an observed OHLCV provider is wired in.
 * A spot quote is not a candle series and must not be expanded into synthetic
 * history. The legacy function remains for API compatibility and fails closed.
 */
export async function generateSignalsAsync(
  symbolName: string,
  timeframes: Timeframe[],
  livePrices: Map<string, number>,
  skillName?: string
): Promise<TradingSignal[]> {
  void symbolName;
  void timeframes;
  void livePrices;
  void skillName;
  return [];
}

/**
 * Synchronous legacy entry point. Without observed OHLCV it fails closed.
 */
export function generateSignals(
  symbolName: string,
  timeframes: Timeframe[],
  skillName?: string
): TradingSignal[] {
  void symbolName;
  void timeframes;
  void skillName;
  return [];
}

/**
 * Run a full scan. Disabled until observed OHLCV is configured.
 */
export async function runScanAsync(
  symbols: string[],
  timeframes: Timeframe[],
  minConfidence: number = 70,
  skillName?: string
): Promise<TradingSignal[]> {
  void symbols;
  void timeframes;
  void minConfidence;
  void skillName;
  return [];
}

/**
 * Synchronous legacy scan. Disabled until observed OHLCV is configured.
 */
export function runScan(
  symbols: string[],
  timeframes: Timeframe[],
  minConfidence: number = 70,
  skillName?: string
): TradingSignal[] {
  void symbols;
  void timeframes;
  void minConfidence;
  void skillName;
  return [];
}

/**
 * Get all available symbol names.
 */
export function getAvailableSymbols(): string[] {
  return Object.keys(SYMBOLS);
}
