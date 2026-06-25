/**
 * GET /api/signals tier-gating tests. The route runs filterSignalByTier on
 * every signal before returning — these tests assert the integration: a Pro
 * user receives entry, stopLoss, and takeProfit{1,2,3} unmasked, while an
 * anonymous (free) caller receives stopLoss=null and takeProfit{2,3}=null
 * and a coarsened indicator block.
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

jest.mock('../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../lib/tier', () => {
  const actual = jest.requireActual('../../../../lib/tier');
  return {
    ...actual,
    getUserTier: jest.fn(),
  };
});

jest.mock('../../../../lib/tracked-signals', () => ({
  getTrackedSignalsForRequest: jest.fn().mockResolvedValue({ signals: [], syntheticSymbols: [] }),
}));

jest.mock('../../../../lib/signal-worker', () => ({
  getSignalsCached: jest.fn(),
}));

import { readLiveSignals } from '../../../../lib/signals-live';
import { getSignalsCached } from '../../../../lib/signal-worker';
import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserTier } from '../../../../lib/tier';
import { GET } from '../route';

const mockedReadLive = readLiveSignals as jest.MockedFunction<typeof readLiveSignals>;
const mockedGetSignalsCached = getSignalsCached as jest.MockedFunction<typeof getSignalsCached>;
const mockedReadSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;

function makeRequest(url: string = 'http://localhost/api/signals'): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function fakeLiveSignal(overrides: Record<string, unknown> = {}) {
  // BTCUSD is a free-tier symbol; using it so anon tests are not filtered out
  // by the symbol-allow-list before masking even runs.
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
    ...overrides,
  };
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

describe('GET /api/signals — tier gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadLive.mockResolvedValue({
      signals: [fakeLiveSignal()],
      isStale: false,
      generatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedGetSignalsCached.mockResolvedValue({ signals: [], syntheticSymbols: [] });
  });

  it('anonymous caller receives free tier with masked stopLoss / takeProfit2 / takeProfit3', async () => {
    mockedReadSession.mockReturnValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe('free');
    expect(body.signals.length).toBeGreaterThan(0);

    const sig = body.signals[0];
    expect(sig.entry).toBe(50000);
    expect(sig.takeProfit1).toBe(51000);
    expect(sig.stopLoss).toBeNull();
    expect(sig.takeProfit2).toBeNull();
    expect(sig.takeProfit3).toBeNull();

    // Masked indicators: macd histogram zeroed, stochastic k=0, BB neutralized
    expect(sig.indicators.macd.histogram).toBe(0);
    expect(sig.indicators.stochastic.k).toBe(0);
  });

  it('Pro user receives entry, stopLoss, and all takeProfit levels unmasked', async () => {
    mockedReadSession.mockReturnValue({ userId: 'pro-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValueOnce('pro');

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe('pro');
    expect(body.signals.length).toBeGreaterThan(0);

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

  it('Pro user keeps premium-band (confidence ≥ 85) signals that free tier would lose', async () => {
    mockedReadLive.mockResolvedValue({
      signals: [fakeLiveSignal({ id: 'premium-1', confidence: 92 })],
      isStale: false,
      generatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue({ userId: 'pro-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValueOnce('pro');

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.tier).toBe('pro');
    expect(body.signals.length).toBe(1);
    expect(body.signals[0].confidence).toBe(92);
  });

  it('free tier drops premium-band (confidence ≥ 85) signals entirely', async () => {
    mockedReadLive.mockResolvedValue({
      signals: [fakeLiveSignal({ id: 'premium-1', confidence: 92 })],
      isStale: false,
      generatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.tier).toBe('free');
    expect(body.signals.length).toBe(0);
  });

  it('free tier returns fresh standard-band signals only as public-safe locked stubs', async () => {
    const publishedAt = new Date(Date.now() - 1_000).toISOString();
    mockedReadLive.mockResolvedValue({
      signals: [fakeLiveSignal({ id: 'fresh-standard-1', timestamp: publishedAt })],
      isStale: false,
      generatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe('free');
    expect(body.count).toBe(0);
    expect(body.signals).toEqual([]);
    expect(body.lockedSignals).toEqual([
      {
        id: 'fresh-standard-1',
        symbol: 'BTCUSD',
        direction: 'BUY',
        timeframe: 'H1',
        confidence: 78,
        availableAt: new Date(new Date(publishedAt).getTime() + 30 * 60 * 1000).toISOString(),
        locked: true,
      },
    ]);

    const locked = body.lockedSignals[0];
    expect(Object.keys(locked).sort()).toEqual([
      'availableAt',
      'confidence',
      'direction',
      'id',
      'locked',
      'symbol',
      'timeframe',
    ]);
    expect(locked).not.toHaveProperty('entry');
    expect(locked).not.toHaveProperty('stopLoss');
    expect(locked).not.toHaveProperty('takeProfit1');
    expect(locked).not.toHaveProperty('takeProfit2');
    expect(locked).not.toHaveProperty('takeProfit3');
    expect(locked).not.toHaveProperty('indicators');
    expect(locked).not.toHaveProperty('reasons');
  });

  it('free tier returns TA worker fallback fresh standard-band signals only as public-safe locked stubs', async () => {
    const publishedAt = new Date(Date.now() - 1_000).toISOString();
    mockedReadLive.mockResolvedValue(null);
    mockedGetSignalsCached.mockResolvedValue({
      signals: [fakeCachedSignal({ id: 'fallback-fresh-standard-1', timestamp: publishedAt })],
      syntheticSymbols: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue(null);

    const res = await GET(makeRequest());

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetSignalsCached).toHaveBeenCalledWith({
      symbol: undefined,
      timeframe: undefined,
      direction: undefined,
      minConfidence: 0,
    });
    expect(body.tier).toBe('free');
    expect(body.engine.version).toBe('2.1.0');
    expect(body.count).toBe(0);
    expect(body.signals).toEqual([]);
    expect(body.lockedSignals).toEqual([
      {
        id: 'fallback-fresh-standard-1',
        symbol: 'BTCUSD',
        direction: 'BUY',
        timeframe: 'H1',
        confidence: 78,
        availableAt: new Date(new Date(publishedAt).getTime() + 30 * 60 * 1000).toISOString(),
        locked: true,
      },
    ]);

    const locked = body.lockedSignals[0];
    expect(Object.keys(locked).sort()).toEqual([
      'availableAt',
      'confidence',
      'direction',
      'id',
      'locked',
      'symbol',
      'timeframe',
    ]);
    expect(locked).not.toHaveProperty('entry');
    expect(locked).not.toHaveProperty('stopLoss');
    expect(locked).not.toHaveProperty('takeProfit1');
    expect(locked).not.toHaveProperty('takeProfit2');
    expect(locked).not.toHaveProperty('takeProfit3');
    expect(locked).not.toHaveProperty('indicators');
    expect(locked).not.toHaveProperty('reasons');
  });

  it('free tier drops TA worker fallback premium-band signals entirely', async () => {
    const publishedAt = new Date(Date.now() - 1_000).toISOString();
    mockedReadLive.mockResolvedValue(null);
    mockedGetSignalsCached.mockResolvedValue({
      signals: [fakeCachedSignal({ id: 'fallback-premium-1', confidence: 92, timestamp: publishedAt })],
      syntheticSymbols: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetSignalsCached).toHaveBeenCalledWith({
      symbol: undefined,
      timeframe: undefined,
      direction: undefined,
      minConfidence: 0,
    });
    expect(body.tier).toBe('free');
    expect(body.engine.version).toBe('2.1.0');
    expect(body.count).toBe(0);
    expect(body.signals).toEqual([]);
    expect(body.lockedSignals).toEqual([]);
  });

  it('Pro user receives TA worker fallback signals with full trade details unmasked', async () => {
    const publishedAt = new Date(Date.now() - 1_000).toISOString();
    mockedReadLive.mockResolvedValue(null);
    mockedGetSignalsCached.mockResolvedValue({
      signals: [fakeCachedSignal({ id: 'fallback-pro-standard-1', timestamp: publishedAt })],
      syntheticSymbols: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue({ userId: 'pro-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValueOnce('pro');

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetSignalsCached).toHaveBeenCalledWith({
      symbol: undefined,
      timeframe: undefined,
      direction: undefined,
      minConfidence: 0,
    });
    expect(body.tier).toBe('pro');
    expect(body.engine.version).toBe('2.1.0');
    expect(body.engine.fallback).toBe(1);
    expect(body.count).toBe(1);
    expect(body.lockedSignals).toEqual([]);

    const sig = body.signals[0];
    expect(sig.id).toBe('fallback-pro-standard-1');
    expect(sig.entry).toBe(50000);
    expect(sig.stopLoss).toBe(49000);
    expect(sig.takeProfit1).toBe(51000);
    expect(sig.takeProfit2).toBe(52000);
    expect(sig.takeProfit3).toBe(53000);
    expect(sig.reasons).toEqual(['worker-cache']);
    expect(sig.source).toBe('fallback');
    expect(sig.dataQuality).toBe('fallback');
    expect(sig.indicators.rsi.value).toBe(45);
    expect(sig.indicators.macd.histogram).toBeCloseTo(0.42);
    expect(sig.indicators.bollingerBands.bandwidth).toBe(1.2);
    expect(sig.indicators.stochastic.k).toBe(60);
  });

  it('Pro user keeps TA worker fallback premium-band signals with full trade details', async () => {
    const publishedAt = new Date(Date.now() - 1_000).toISOString();
    mockedReadLive.mockResolvedValue(null);
    mockedGetSignalsCached.mockResolvedValue({
      signals: [fakeCachedSignal({ id: 'fallback-pro-premium-1', confidence: 92, timestamp: publishedAt })],
      syntheticSymbols: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedReadSession.mockReturnValue({ userId: 'pro-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValueOnce('pro');

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetSignalsCached).toHaveBeenCalledWith({
      symbol: undefined,
      timeframe: undefined,
      direction: undefined,
      minConfidence: 0,
    });
    expect(body.tier).toBe('pro');
    expect(body.engine.version).toBe('2.1.0');
    expect(body.engine.fallback).toBe(1);
    expect(body.count).toBe(1);
    expect(body.lockedSignals).toEqual([]);

    const sig = body.signals[0];
    expect(sig.id).toBe('fallback-pro-premium-1');
    expect(sig.confidence).toBe(92);
    expect(sig.entry).toBe(50000);
    expect(sig.stopLoss).toBe(49000);
    expect(sig.takeProfit1).toBe(51000);
    expect(sig.takeProfit2).toBe(52000);
    expect(sig.takeProfit3).toBe(53000);
    expect(sig.reasons).toEqual(['worker-cache']);
    expect(sig.source).toBe('fallback');
    expect(sig.dataQuality).toBe('fallback');
    expect(sig.indicators.rsi.value).toBe(45);
    expect(sig.indicators.macd.histogram).toBeCloseTo(0.42);
    expect(sig.indicators.bollingerBands.bandwidth).toBe(1.2);
    expect(sig.indicators.stochastic.k).toBe(60);
  });
});
