/**
 * GET /api/signals ungated-contract tests. The tier system is gone — every
 * caller (anonymous included) receives the full signal payload: entry,
 * stopLoss, all takeProfit levels, and unmasked indicators. There is no
 * `tier` key and no `lockedSignals` array in the response.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../lib/signals-live', () => ({
  readLiveSignals: jest.fn(),
}));

jest.mock('../../../../lib/regime-resolution', () => ({
  fetchResolvedRegimeMap: jest.fn().mockResolvedValue({ regimes: new Map(), classTilts: new Map() }),
}));

jest.mock('../../../../lib/regime-filter', () => ({
  filterSignalsByRegime: jest.fn((signals: unknown[]) => signals),
  getDominantRegime: jest.fn().mockReturnValue(null),
}));

jest.mock('../../../../lib/tracked-signals', () => ({
  getTrackedSignalsForRequest: jest.fn().mockResolvedValue({ signals: [], syntheticSymbols: [] }),
}));

jest.mock('../../../../lib/signal-worker', () => ({
  getSignalsCached: jest.fn(),
}));

import { readLiveSignals } from '../../../../lib/signals-live';
import { getSignalsCached } from '../../../../lib/signal-worker';
import { GET } from '../route';

const mockedReadLive = readLiveSignals as jest.MockedFunction<typeof readLiveSignals>;
const mockedGetSignalsCached = getSignalsCached as jest.MockedFunction<typeof getSignalsCached>;

function makeRequest(url: string = 'http://localhost/api/signals'): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function fakeLiveSignal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sig-1',
    symbol: 'BTCUSD',
    signal: 'BUY',
    confidence: 78,
    timeframe: 'H1',
    entry: 50000,
    tp1: 51000,
    tp2: 52000,
    tp3: 53000,
    sl: 49000,
    reasons: ['rsi-oversold'],
    indicators: {
      rsi: 45,
      macd_histogram: 0.42,
      ema_trend: 'up' as const,
      stochastic_k: 60,
    },
    source: 'real',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    expires_in_minutes: 240,
    // Live-file coverage gate needs >= 8 symbols checked.
    ...overrides,
  };
}

function liveData(signals: unknown[]) {
  return {
    signals,
    isStale: false,
    generatedAt: new Date().toISOString(),
    stats: { symbols_checked: 20 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function fakeCachedSignal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cached-1',
    symbol: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 78,
    entry: 50000,
    stopLoss: 49000,
    takeProfit1: 51000,
    takeProfit2: 52000,
    takeProfit3: 53000,
    reasons: ['worker-cache'],
    indicators: {
      rsi: { value: 45, signal: 'neutral' },
      macd: { histogram: 0.42, signal: 'bullish' },
      bollingerBands: { position: 'upper', bandwidth: 1.2 },
      stochastic: { k: 60, d: 55, signal: 'bullish' },
    },
    source: 'fallback',
    dataQuality: 'fallback',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'active',
    ...overrides,
  };
}

describe('GET /api/signals — ungated (everything is free)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadLive.mockResolvedValue(liveData([fakeLiveSignal()]));
    mockedGetSignalsCached.mockResolvedValue({ signals: [], syntheticSymbols: [] });
  });

  it('anonymous caller receives entry, stopLoss, and all takeProfit levels unmasked', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signals.length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty('tier');
    expect(body).not.toHaveProperty('lockedSignals');

    const sig = body.signals[0];
    expect(sig.entry).toBe(50000);
    expect(sig.stopLoss).toBe(49000);
    expect(sig.takeProfit1).toBe(51000);
    expect(sig.takeProfit2).toBe(52000);
    expect(sig.takeProfit3).toBe(53000);

    // Unmasked indicators preserve raw values
    expect(sig.indicators.macd.histogram).toBeCloseTo(0.42);
    expect(sig.indicators.stochastic.k).toBe(60);
  });

  it('anonymous caller keeps premium-band (confidence >= 85) signals', async () => {
    mockedReadLive.mockResolvedValue(
      liveData([fakeLiveSignal({ id: 'premium-1', confidence: 92 })]),
    );

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.signals.length).toBe(1);
    expect(body.signals[0].confidence).toBe(92);
  });

  it('anonymous caller sees fresh signals immediately — no delay window', async () => {
    const publishedAt = new Date(Date.now() - 1_000).toISOString();
    mockedReadLive.mockResolvedValue(
      liveData([fakeLiveSignal({ id: 'fresh-1', timestamp: publishedAt })]),
    );

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.signals[0].id).toBe('fresh-1');
    expect(body).not.toHaveProperty('lockedSignals');
  });

  it('TA worker fallback path serves full trade details to anonymous callers', async () => {
    mockedReadLive.mockResolvedValue(null);
    mockedGetSignalsCached.mockResolvedValue({
      signals: [fakeCachedSignal({ id: 'fallback-1' })],
      syntheticSymbols: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetSignalsCached).toHaveBeenCalledWith({
      symbol: undefined,
      timeframe: undefined,
      direction: undefined,
      minConfidence: 0,
    });
    expect(body.engine.version).toBe('2.1.0');
    expect(body.engine.fallback).toBe(1);
    expect(body.count).toBe(1);
    expect(body).not.toHaveProperty('tier');
    expect(body).not.toHaveProperty('lockedSignals');

    const sig = body.signals[0];
    expect(sig.id).toBe('fallback-1');
    expect(sig.entry).toBe(50000);
    expect(sig.stopLoss).toBe(49000);
    expect(sig.takeProfit1).toBe(51000);
    expect(sig.takeProfit2).toBe(52000);
    expect(sig.takeProfit3).toBe(53000);
    expect(sig.reasons).toEqual(['worker-cache']);
    expect(sig.indicators.rsi.value).toBe(45);
    expect(sig.indicators.macd.histogram).toBeCloseTo(0.42);
    expect(sig.indicators.bollingerBands.bandwidth).toBe(1.2);
    expect(sig.indicators.stochastic.k).toBe(60);
  });

  it('TA worker fallback keeps premium-band signals for anonymous callers', async () => {
    mockedReadLive.mockResolvedValue(null);
    mockedGetSignalsCached.mockResolvedValue({
      signals: [fakeCachedSignal({ id: 'fallback-premium-1', confidence: 92 })],
      syntheticSymbols: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.signals[0].confidence).toBe(92);
    expect(body.signals[0].stopLoss).toBe(49000);
  });
});
