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
  takeProfit2: number | null;
  takeProfit3: number | null;
  indicators: IndicatorSummary;
  timeframe: Timeframe;
  timestamp: string;
  status: SignalStatus;
  // Web-specific (optional)
  source?: 'real' | 'fallback';
  dataQuality?: 'real' | 'synthetic';
  /** ATR stop calibration metadata — shows whether SL uses a per-symbol calibrated multiplier or the global default. */
  atrCalibration?: { multiplier: number; confidence: 'low' | 'medium' | 'high' };
  // Agent-specific (optional)
  skill?: string;
  /** Which strategy preset generated this signal. Matches SIGNAL_ENGINE_PRESET env var. */
  strategyId?: string;
}

export interface IndicatorSummary {
  rsi: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
  macd: { histogram: number; signal: 'bullish' | 'bearish' | 'neutral' };
  ema: { trend: 'up' | 'down' | 'sideways'; ema20: number; ema50: number; ema200: number };
  bollingerBands: { position: 'upper' | 'middle' | 'lower'; bandwidth: number; squeeze?: boolean };
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
