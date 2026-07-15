import { alertToSignal, type TradingViewAlert } from '../webhook-server.js';

const complete: TradingViewAlert = {
  id: 'external-candidate-1',
  symbol: 'BTCUSD',
  action: 'BUY',
  price: 100,
  stopLoss: 98,
  takeProfit1: 102,
  takeProfit2: null,
  takeProfit3: null,
  confidence: 73,
  timeframe: 'H1',
  timestamp: '2026-07-15T00:00:00.000Z',
  source: 'real',
  dataQuality: 'real',
  indicators: {
    rsi: { value: 45, signal: 'neutral' },
    macd: { histogram: 1, signal: 'bullish' },
    ema: { trend: 'up', ema20: 99, ema50: 98, ema200: 95 },
    bollingerBands: { position: 'middle', bandwidth: 1 },
    stochastic: { k: 50, d: 50, signal: 'neutral' },
    support: [98],
    resistance: [102],
  },
};

describe('TradingView webhook candidate contract', () => {
  it('rejects a quote-only alert instead of fabricating a complete signal', () => {
    expect(alertToSignal({ symbol: 'BTCUSD', action: 'BUY', price: 100 })).toBeNull();
  });

  it('requires the caller to supply provenance, ID, score, levels, indicators, timeframe, and timestamp', () => {
    for (const key of [
      'id',
      'stopLoss',
      'takeProfit1',
      'confidence',
      'timeframe',
      'timestamp',
      'source',
      'dataQuality',
      'indicators',
    ] as const) {
      expect(alertToSignal({ ...complete, [key]: undefined })).toBeNull();
    }
  });

  it('preserves a complete observed candidate without generated market fields', () => {
    expect(alertToSignal(complete)).toEqual({
      id: complete.id,
      symbol: complete.symbol,
      direction: complete.action,
      confidence: complete.confidence,
      entry: complete.price,
      stopLoss: complete.stopLoss,
      takeProfit1: complete.takeProfit1,
      takeProfit2: null,
      takeProfit3: null,
      indicators: complete.indicators,
      timeframe: complete.timeframe,
      timestamp: complete.timestamp,
      status: 'active',
      source: 'real',
      dataQuality: 'real',
      skill: 'external-tradingview-webhook',
    });
  });
});
