export type Direction = 'BUY' | 'SELL';
export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
export type SignalStatus = 'active' | 'hit_tp1' | 'hit_tp2' | 'hit_tp3' | 'stopped' | 'expired';

export interface TradingSignal {
  id: string;
  symbol: string;
  direction: Direction;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  indicators: IndicatorSummary;
  timeframe: Timeframe;
  timestamp: string;
  status: SignalStatus;
  // Web-specific (optional)
  source?: 'real' | 'fallback';
  dataQuality?: 'real' | 'synthetic';
  // Agent-specific (optional)
  skill?: string;
}

export interface IndicatorSummary {
  rsi: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
  macd: { histogram: number; signal: 'bullish' | 'bearish' | 'neutral' };
  ema: { trend: 'up' | 'down' | 'sideways'; ema20: number; ema50: number; ema200: number };
  bollingerBands: { position: 'upper' | 'middle' | 'lower'; bandwidth: number };
  stochastic: { k: number; d: number; signal: 'oversold' | 'neutral' | 'overbought' };
  support: number[];
  resistance: number[];
  // Extended indicators (web TA engine)
  adx?: { value: number; trending: boolean; plusDI: number; minusDI: number };
  volume?: { current: number; average: number; ratio: number; confirmed: boolean };
}

export interface SymbolConfig {
  symbol: string;
  name: string;
  pip: number;
  basePrice: number;
  volatility: number;
}

export interface GatewayConfig {
  scanInterval: number;
  minConfidence: number;
  symbols: string[];
  timeframes: Timeframe[];
  channels: ChannelConfig[];
  skills: string[];
}

export interface ChannelConfig {
  type: 'telegram' | 'discord' | 'webhook';
  enabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
  webhookUrl?: string;
}

// ─── WebSocket Market Data Types ─────────────────────

export type SymbolCategory = 'crypto' | 'forex' | 'metals';

export interface NormalizedTick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
  provider: string;
}

export interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

export type WsClientMessage = SubscriptionMessage;

export type WsServerMessage =
  | { type: 'tick'; data: NormalizedTick }
  | { type: 'subscribed'; symbols: string[] }
  | { type: 'unsubscribed'; symbols: string[] }
  | { type: 'error'; message: string };

// ─── Utilities ─────────────────────────────────────────

/**
 * Generate a unique signal ID.
 */
export function generateSignalId(): string {
  return `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Format a number with commas for display.
 */
export function formatNumber(value: number, decimals?: number): string {
  if (decimals !== undefined) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  if (value >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (value >= 1) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  } else {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    });
  }
}

/**
 * Format the price difference for display.
 */
export function formatDiff(entry: number, target: number): string {
  const diff = target - entry;
  const sign = diff >= 0 ? '+' : '-';
  return `${sign}$${formatNumber(Math.abs(diff))}`;
}

/**
 * Get the EMA trend display text.
 */
export function emaTrendText(trend: string): string {
  switch (trend) {
    case 'up': return 'Uptrend';
    case 'down': return 'Downtrend';
    default: return 'Sideways';
  }
}

// ─── Indicators ───────────────────────────────────────

/**
 * Technical indicator calculations using real mathematical formulas.
 * All functions operate on price arrays where index 0 is the oldest value.
 */

/**
 * Calculate Exponential Moving Average for a price series.
 * Returns the final EMA value.
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) {
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
  }

  const multiplier = 2 / (period + 1);

  // Start with SMA of first `period` values
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += prices[i];
  }
  ema /= period;

  // Apply EMA formula for remaining values
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Relative Strength Index.
 * Standard RSI with Wilder's smoothing method.
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // neutral default

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Initial average gain/loss over first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1) + 0) / period;
    } else {
      avgGain = (avgGain * (period - 1) + 0) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate MACD (Moving Average Convergence Divergence).
 * Uses 12-period fast EMA, 26-period slow EMA, 9-period signal line.
 */
export function calculateMACD(prices: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const macdValues: number[] = [];
  const fastPeriod = 12;
  const slowPeriod = 26;
  const signalPeriod = 9;

  for (let end = slowPeriod; end <= prices.length; end++) {
    const slice = prices.slice(0, end);
    const fastEma = calculateEMA(slice, fastPeriod);
    const slowEma = calculateEMA(slice, slowPeriod);
    macdValues.push(fastEma - slowEma);
  }

  const macdLine = macdValues[macdValues.length - 1];

  const signalLine = macdValues.length >= signalPeriod
    ? calculateEMA(macdValues, signalPeriod)
    : macdLine;

  const histogram = macdLine - signalLine;

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate Bollinger Bands.
 * Middle band = SMA, Upper/Lower = SMA +/- (stddev * multiplier).
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
} {
  if (prices.length < period) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { upper: avg, middle: avg, lower: avg, bandwidth: 0 };
  }

  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;

  const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  const bandwidth = middle !== 0 ? ((upper - lower) / middle) * 100 : 0;

  return { upper, middle, lower, bandwidth };
}

/**
 * Calculate Stochastic Oscillator (%K and %D).
 * %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = SMA of %K values
 */
export function calculateStochastic(
  high: number[],
  low: number[],
  close: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number; d: number } {
  if (high.length < kPeriod || low.length < kPeriod || close.length < kPeriod) {
    return { k: 50, d: 50 };
  }

  const kValues: number[] = [];

  for (let i = kPeriod - 1; i < close.length; i++) {
    const periodHigh = high.slice(i - kPeriod + 1, i + 1);
    const periodLow = low.slice(i - kPeriod + 1, i + 1);

    const highestHigh = Math.max(...periodHigh);
    const lowestLow = Math.min(...periodLow);

    const range = highestHigh - lowestLow;
    const k = range !== 0 ? ((close[i] - lowestLow) / range) * 100 : 50;
    kValues.push(k);
  }

  const currentK = kValues[kValues.length - 1];

  let currentD: number;
  if (kValues.length >= dPeriod) {
    const dSlice = kValues.slice(-dPeriod);
    currentD = dSlice.reduce((a, b) => a + b, 0) / dPeriod;
  } else {
    currentD = currentK;
  }

  return { k: currentK, d: currentD };
}

/**
 * Identify support levels from price data.
 */
export function findSupportLevels(low: number[], count: number = 3): number[] {
  if (low.length < 5) return [low[low.length - 1]];

  const pivots: number[] = [];
  for (let i = 2; i < low.length - 2; i++) {
    if (low[i] < low[i - 1] && low[i] < low[i - 2] && low[i] < low[i + 1] && low[i] < low[i + 2]) {
      pivots.push(low[i]);
    }
  }

  pivots.sort((a, b) => b - a);
  return pivots.slice(0, count);
}

/**
 * Identify resistance levels from price data.
 */
export function findResistanceLevels(high: number[], count: number = 3): number[] {
  if (high.length < 5) return [high[high.length - 1]];

  const pivots: number[] = [];
  for (let i = 2; i < high.length - 2; i++) {
    if (high[i] > high[i - 1] && high[i] > high[i - 2] && high[i] > high[i + 1] && high[i] > high[i + 2]) {
      pivots.push(high[i]);
    }
  }

  pivots.sort((a, b) => a - b);
  return pivots.slice(0, count);
}

/**
 * Calculate ADX (Average Directional Index) with +DI and -DI.
 * Measures trend strength (not direction): ADX >= 25 = trending.
 */
export function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): { value: number; plusDI: number; minusDI: number; trending: boolean } {
  const neutral = { value: 0, plusDI: 0, minusDI: 0, trending: false };

  if (high.length < period + 1 || low.length < period + 1 || close.length < period + 1) {
    return neutral;
  }

  const len = Math.min(high.length, low.length, close.length);

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < len; i++) {
    const highDiff = high[i] - high[i - 1];
    const lowDiff = low[i - 1] - low[i];

    const trueRange = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );

    tr.push(trueRange);
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }

  if (tr.length < period) return neutral;

  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];

  const firstPlusDI = smoothTR !== 0 ? clamp((smoothPlusDM / smoothTR) * 100, 0, 100) : 0;
  const firstMinusDI = smoothTR !== 0 ? clamp((smoothMinusDM / smoothTR) * 100, 0, 100) : 0;
  const firstDISum = firstPlusDI + firstMinusDI;
  if (firstDISum !== 0) {
    dxValues.push(clamp((Math.abs(firstPlusDI - firstMinusDI) / firstDISum) * 100, 0, 100));
  } else {
    dxValues.push(0);
  }

  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const pdi = smoothTR !== 0 ? clamp((smoothPlusDM / smoothTR) * 100, 0, 100) : 0;
    const mdi = smoothTR !== 0 ? clamp((smoothMinusDM / smoothTR) * 100, 0, 100) : 0;
    const diSum = pdi + mdi;
    const dx = diSum !== 0 ? clamp((Math.abs(pdi - mdi) / diSum) * 100, 0, 100) : 0;
    dxValues.push(dx);
  }

  let adx: number;
  if (dxValues.length < period) {
    adx = dxValues.reduce((a, b) => a + b, 0) / dxValues.length;
  } else {
    adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxValues.length; i++) {
      adx = (adx * (period - 1) + dxValues[i]) / period;
    }
  }

  const adxValue = clamp(adx, 0, 100);
  const finalPlusDI = clamp(
    smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0,
    0,
    100
  );
  const finalMinusDI = clamp(
    smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0,
    0,
    100
  );

  return { value: adxValue, plusDI: finalPlusDI, minusDI: finalMinusDI, trending: adxValue >= 25 };
}

// ─── Symbols ──────────────────────────────────────────


export const SYMBOLS: Record<string, SymbolConfig> = {
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Gold / US Dollar',
    pip: 0.01,
    basePrice: 3020.00,
    volatility: 0.008,
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    name: 'Silver / US Dollar',
    pip: 0.001,
    basePrice: 33.50,
    volatility: 0.012,
  },
  BTCUSD: {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    pip: 0.01,
    basePrice: 87000.00,
    volatility: 0.025,
  },
  ETHUSD: {
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    pip: 0.01,
    basePrice: 2050.00,
    volatility: 0.030,
  },
  SOLUSD: {
    symbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    pip: 0.01,
    basePrice: 140.00,
    volatility: 0.035,
  },
  DOGEUSD: {
    symbol: 'DOGEUSD',
    name: 'Dogecoin / US Dollar',
    pip: 0.00001,
    basePrice: 0.178,
    volatility: 0.040,
  },
  BNBUSD: {
    symbol: 'BNBUSD',
    name: 'BNB / US Dollar',
    pip: 0.01,
    basePrice: 608.50,
    volatility: 0.025,
  },
  XRPUSD: {
    symbol: 'XRPUSD',
    name: 'Ripple / US Dollar',
    pip: 0.0001,
    basePrice: 2.45,
    volatility: 0.028,
  },
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    pip: 0.0001,
    basePrice: 1.0790,
    volatility: 0.004,
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    pip: 0.0001,
    basePrice: 1.2920,
    volatility: 0.005,
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    pip: 0.01,
    basePrice: 150.30,
    volatility: 0.004,
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    pip: 0.0001,
    basePrice: 0.6290,
    volatility: 0.006,
  },
  USDCAD: {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    pip: 0.0001,
    basePrice: 1.3826,
    volatility: 0.005,
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    pip: 0.0001,
    basePrice: 0.5799,
    volatility: 0.004,
  },
  USDCHF: {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    pip: 0.0001,
    basePrice: 0.7922,
    volatility: 0.004,
  },
};

export function getSymbolConfig(symbol: string): SymbolConfig | undefined {
  return SYMBOLS[symbol.toUpperCase()];
}

export function getAllSymbols(): string[] {
  return Object.keys(SYMBOLS);
}

export function getSymbolCategory(symbol: string): SymbolCategory {
  const metals = ['XAUUSD', 'XAGUSD'];
  const crypto = [
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD',
    'ADAUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'MATICUSD', 'ATOMUSD',
    'UNIUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'APTUSD', 'ARBUSD',
    'OPUSD', 'FILUSD', 'INJUSD', 'SUIUSD', 'SEIUSD', 'TIAUSD',
    'RENDERUSD', 'FETUSD', 'AABORUSD', 'PEPEUSD', 'SHIBUSD', 'WIFUSD',
  ];
  const s = symbol.toUpperCase();
  if (metals.includes(s)) return 'metals';
  if (crypto.includes(s)) return 'crypto';
  return 'forex';
}

/**
 * Update a symbol's base price at runtime (e.g. after fetching live prices).
 */
export function updateBasePrice(symbol: string, price: number): void {
  const config = SYMBOLS[symbol.toUpperCase()];
  if (config && price > 0) {
    config.basePrice = price;
  }
}
