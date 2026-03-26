export interface TelegramSubscriber {
  chatId: string;
  username?: string;
  firstName?: string;
  /** Array of symbol strings like ['XAUUSD','BTCUSD'] or the string 'all' */
  subscribedPairs: string[] | 'all';
  minConfidence: number; // 0-100
  createdAt: string; // ISO 8601
}

export interface SignalForBot {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe: string;
  indicators?: {
    rsi?: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
    macd?: { signal: 'bullish' | 'bearish' | 'neutral' };
    ema?: { trend: 'up' | 'down' | 'sideways' };
  };
}

export interface TelegramApiResult {
  ok: boolean;
  result?: unknown;
  description?: string;
}
