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
 * Canonical format: SIG-{SYMBOL}-{TF}-{DIRECTION}-{timestamp36}{rand4}
 * When called without args, falls back to timestamp-only format for backward compat.
 */
export function generateSignalId(symbol?: string, timeframe?: string, direction?: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  if (symbol && timeframe && direction) {
    return `SIG-${symbol.toUpperCase()}-${timeframe.toUpperCase()}-${direction.toUpperCase()}-${ts}${rand}`;
  }
  return `SIG-${ts}-${rand}`;
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
// Canonical indicator implementations live in apps/web/app/lib/ta-engine.ts
// Re-export from packages/signals/src/indicators.ts for backward compat with tests.
export {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  findSupportLevels,
  findResistanceLevels,
} from './indicators';

// ADX is only in ta-engine.ts — re-export the local scalar version for tests
export { calculateADX } from './indicators-adx';

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
