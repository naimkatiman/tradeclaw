import type { TradingSignal } from '@tradeclaw/signals';
import {
  generateSignals,
  generateSignalsAsync,
  runScan,
  runScanAsync,
  SIGNAL_SCAN_AVAILABILITY,
} from '../engine.js';
import { fetchLivePrices, invalidatePriceCache } from '../prices.js';
import { isObservedSignal } from '../tracker.js';
import { isProviderObservedSignal } from '../../channels/base.js';

const candidate: TradingSignal = {
  id: 'observed-1',
  symbol: 'BTCUSD',
  direction: 'BUY',
  confidence: 72,
  entry: 100,
  stopLoss: 98,
  takeProfit1: 102,
  takeProfit2: null,
  takeProfit3: null,
  indicators: {
    rsi: { value: 45, signal: 'neutral' },
    macd: { histogram: 1, signal: 'bullish' },
    ema: { trend: 'up', ema20: 99, ema50: 98, ema200: 95 },
    bollingerBands: { position: 'middle', bandwidth: 1 },
    stochastic: { k: 50, d: 50, signal: 'neutral' },
    support: [98],
    resistance: [102],
  },
  timeframe: 'H1',
  timestamp: '2026-07-15T00:00:00.000Z',
  status: 'active',
  source: 'real',
  dataQuality: 'real',
};

describe('standalone agent availability gate', () => {
  it('reports that scanning is unavailable without observed OHLCV', () => {
    expect(SIGNAL_SCAN_AVAILABILITY).toEqual({
      available: false,
      dataQuality: 'unavailable',
      reason: 'observed-ohlcv-provider-not-configured',
    });
  });

  it('never expands a quote or base price into synthetic candles', async () => {
    const quotes = new Map([['BTCUSD', 123_456]]);

    expect(await generateSignalsAsync('BTCUSD', ['H1'], quotes)).toEqual([]);
    expect(generateSignals('BTCUSD', ['H1'])).toEqual([]);
    expect(await runScanAsync(['BTCUSD'], ['H1'], 0)).toEqual([]);
    expect(runScan(['BTCUSD'], ['H1'], 0)).toEqual([]);
  });

  it('returns no hardcoded prices when every provider is unavailable', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as typeof fetch;
    invalidatePriceCache();

    try {
      await expect(fetchLivePrices()).resolves.toEqual(new Map());
    } finally {
      global.fetch = originalFetch;
      invalidatePriceCache();
    }
  });

  it('allows history only for explicitly real, valid observations', () => {
    expect(isObservedSignal(candidate)).toBe(true);
    expect(isObservedSignal({ ...candidate, source: 'fallback' })).toBe(false);
    expect(isObservedSignal({ ...candidate, dataQuality: 'synthetic' })).toBe(false);
    expect(isObservedSignal({ ...candidate, entry: 0 })).toBe(false);
    expect(isObservedSignal({ ...candidate, timestamp: 'invalid' })).toBe(false);
    expect(isProviderObservedSignal(candidate)).toBe(true);
    expect(isProviderObservedSignal({ ...candidate, dataQuality: 'synthetic' })).toBe(false);
  });
});
