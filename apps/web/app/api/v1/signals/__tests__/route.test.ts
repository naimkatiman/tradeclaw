/**
 * /api/v1/signals ungated-contract tests. The tier system is gone: the
 * public v1 API serves the same full payload to every caller — all symbols,
 * the premium band included, with no delay window and no tier key.
 */

import { NextRequest } from 'next/server';
import type { LiveSignal } from '../../../../../lib/signals-live';

jest.mock('../../../../../lib/signals-live', () => {
  const actual = jest.requireActual('../../../../../lib/signals-live');
  return {
    ...actual,
    readLiveSignals: jest.fn(),
  };
});

jest.mock('../../../../../lib/tracked-signals', () => ({
  getTrackedSignals: jest.fn().mockResolvedValue({ signals: [] }),
}));

import { readLiveSignals } from '../../../../../lib/signals-live';
import { GET } from '../route';

const mockedReadLiveSignals = readLiveSignals as jest.MockedFunction<typeof readLiveSignals>;

const OLD_TIMESTAMP = new Date(Date.now() - 30 * 60_000).toISOString();

function makeSignal(overrides: Partial<LiveSignal> = {}): LiveSignal {
  return {
    id: 's1',
    symbol: 'BTCUSD',
    signal: 'BUY',
    confidence: 80,
    timeframe: 'H1',
    entry: 50000,
    tp1: 51000,
    tp2: 52000,
    sl: 49000,
    reasons: ['rsi_oversold'],
    indicators: { rsi: 28, ema_trend: 'up' },
    source: 'real',
    signalSource: 'algo',
    timestamp: OLD_TIMESTAMP,
    expires_in_minutes: 60,
    ...overrides,
  };
}

function liveData(signals: LiveSignal[]) {
  return {
    signals,
    isStale: false,
    generatedAt: new Date().toISOString(),
    stats: { symbols_checked: 20 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeReq(url = 'http://localhost/api/v1/signals'): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/v1/signals — ungated (everything is free)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('anonymous caller sees every symbol on the live-file path', async () => {
    mockedReadLiveSignals.mockResolvedValueOnce(
      liveData([
        makeSignal({ id: 'btc', symbol: 'BTCUSD', confidence: 80 }),
        makeSignal({ id: 'nvda', symbol: 'NVDAUSD', confidence: 80 }),
        makeSignal({ id: 'tsla', symbol: 'TSLAUSD', confidence: 78 }),
      ]),
    );

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body).not.toHaveProperty('tier');
    const symbols = body.signals.map((s: { pair: string }) => s.pair);
    expect(symbols).toContain('BTCUSD');
    expect(symbols).toContain('NVDAUSD');
    expect(symbols).toContain('TSLAUSD');
  });

  it('anonymous caller sees premium-band signals (>=85 confidence)', async () => {
    mockedReadLiveSignals.mockResolvedValueOnce(
      liveData([
        makeSignal({ id: 'std', confidence: 80 }),
        makeSignal({ id: 'prem', confidence: 90 }),
        makeSignal({ id: 'prem-edge', confidence: 85 }),
      ]),
    );

    const res = await GET(makeReq());
    const body = await res.json();

    const ids = body.signals.map((s: { id: string }) => s.id);
    expect(ids).toContain('std');
    expect(ids).toContain('prem');
    expect(ids).toContain('prem-edge');
  });

  it('anonymous caller sees fresh signals — no delay filter', async () => {
    const now = Date.now();
    mockedReadLiveSignals.mockResolvedValueOnce(
      liveData([
        makeSignal({ id: 'fresh', timestamp: new Date(now - 60_000).toISOString() }),
        makeSignal({ id: 'old', timestamp: new Date(now - 30 * 60_000).toISOString() }),
      ]),
    );

    const res = await GET(makeReq());
    const body = await res.json();

    const ids = body.signals.map((s: { id: string }) => s.id);
    expect(ids).toContain('fresh');
    expect(ids).toContain('old');
  });

  it('serves shared CDN cache headers and no tier header', async () => {
    mockedReadLiveSignals.mockResolvedValueOnce(liveData([makeSignal()]));

    const res = await GET(makeReq());
    expect(res.headers.get('X-TradeClaw-Tier')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns 503 on upstream failure instead of masking as 200 + empty list', async () => {
    mockedReadLiveSignals.mockRejectedValueOnce(new Error('boom'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(makeReq());
    consoleSpy.mockRestore();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('upstream_unavailable');
    // Cache headers must still be set so CDN doesn't blanket-cache a 503.
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });
});
