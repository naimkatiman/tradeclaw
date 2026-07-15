import { normalizeObservedSignal, parseSignalResponse } from '../signal-contract';

const observed = {
  id: 'candidate-1',
  symbol: 'BTCUSD',
  direction: 'BUY',
  confidence: 74,
  entry: 100,
  stopLoss: 98,
  takeProfit1: 102,
  takeProfit2: null,
  takeProfit3: null,
  timeframe: 'H1',
  timestamp: '2026-07-15T00:00:00.000Z',
  source: 'real',
  dataQuality: 'real',
};

describe('mobile signal contract', () => {
  it('accepts a complete provider-observed candidate', () => {
    expect(normalizeObservedSignal(observed)).toEqual(observed);
    expect(parseSignalResponse({ signals: [observed] })).toEqual({
      available: true,
      signals: [observed],
      reason: null,
    });
  });

  it('rejects fallback and synthetic candidates', () => {
    expect(normalizeObservedSignal({ ...observed, source: 'fallback' })).toBeNull();
    expect(normalizeObservedSignal({ ...observed, dataQuality: 'synthetic' })).toBeNull();
    expect(parseSignalResponse({ signals: [{ ...observed, source: 'fallback' }] })).toEqual({
      available: false,
      signals: [],
      reason: 'no-provider-observed-candidates',
    });
  });

  it('rejects missing prices and timestamps instead of filling them', () => {
    expect(normalizeObservedSignal({ ...observed, entry: undefined })).toBeNull();
    expect(normalizeObservedSignal({ ...observed, stopLoss: 0 })).toBeNull();
    expect(normalizeObservedSignal({ ...observed, timestamp: undefined })).toBeNull();
  });

  it('preserves explicit upstream unavailability', () => {
    expect(parseSignalResponse({
      available: false,
      reason: 'observed-ohlcv-provider-not-configured',
      signals: [observed],
    })).toEqual({
      available: false,
      signals: [],
      reason: 'observed-ohlcv-provider-not-configured',
    });
  });
});
