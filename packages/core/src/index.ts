// @tradeclaw/core — shared types and utilities

<<<<<<< HEAD
=======
// Plugin system
export type { OHLCV, IndicatorResult, IndicatorPlugin } from './plugins/types';
export { PluginRegistry, pluginRegistry } from './plugins/registry';
export type { AggregatedResult } from './plugins/registry';

>>>>>>> origin/main
/** User roles for access control */
export type UserRole = 'public' | 'registered' | 'admin';

/** Supported trading symbols */
export type TradingSymbol =
  | 'XAUUSD'
  | 'BTCUSD'
  | 'ETHUSD'
  | 'EURUSD'
  | 'GBPUSD'
  | 'USDJPY'
  | 'AUDUSD'
  | 'USDCAD'
  | 'SOLUSD'
  | 'BNBUSD'
<<<<<<< HEAD
=======
  | 'DOGEUSD'
>>>>>>> origin/main
  | 'ADAUSD'
  | 'DOTUSD'
  | 'LINKUSD';

/** Signal direction */
export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';

/** Confidence level for signals */
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

/** A trading signal emitted by the engine */
export interface TradeSignal {
  id: string;
  symbol: TradingSymbol;
  direction: SignalDirection;
  confidence: Confidence;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  indicators: IndicatorSnapshot;
  timestamp: string; // ISO 8601
}

/** Technical indicator snapshot */
export interface IndicatorSnapshot {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ema: { ema9: number; ema21: number; ema50: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  stochastic: { k: number; d: number };
}

/** Role-based access limits */
export const ROLE_LIMITS: Record<UserRole, {
  maxSymbols: number;
  realtime: boolean;
  paperTrading: boolean;
  liveConfig: boolean;
  userManagement: boolean;
  delayMinutes: number;
}> = {
  public: {
    maxSymbols: 3,
    realtime: false,
    paperTrading: false,
    liveConfig: false,
    userManagement: false,
    delayMinutes: 15,
  },
  registered: {
    maxSymbols: 10,
    realtime: true,
    paperTrading: true,
    liveConfig: false,
    userManagement: false,
    delayMinutes: 0,
  },
  admin: {
    maxSymbols: Infinity,
    realtime: true,
    paperTrading: true,
    liveConfig: true,
    userManagement: true,
    delayMinutes: 0,
  },
};
