/**
 * /api/v1/signals tier-gating tests — anchors the paywall hardening for the
 * public v1 API. Pre-fix this route served the unfiltered live-file path to
 * any caller, leaking premium-band Pro signals to free / anonymous callers
 * with no auth.
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

jest.mock('../../../../../lib/tier', () => {
  const actual = jest.requireActual('../../../../../lib/tier');
  return {
    ...actual,
    getTierFromRequest: jest.fn(),
    resolveAccessContext: jest.fn().mockResolvedValue({
      tier: 'free',
      unlockedStrategies: new Set(['classic']),
    }),
  };
});

import { readLiveSignals } from '../../../../../lib/signals-live';
import { getTierFromRequest } from '../../../../../lib/tier';
import { GET } from '../route';

const mockedReadLiveSignals = readLiveSignals as jest.MockedFunction<typeof readLiveSignals>;
const mockedGetTier = getTierFromRequest as jest.MockedFunction<typeof getTierFromRequest>;

// Default to 30 min ago so the free-tier 15-min delay never accidentally
// hides a signal we expect a free caller to see. Tests that exercise the
// delay filter explicitly override `timestamp`.
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
    timestamp: OLD_TIMESTAMP,
    expires_in_minutes: 60,
    ...overrides,
  };
}

function makeReq(url = 'http://localhost/api/v1/signals'): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/v1/signals — tier gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('free caller never sees a Pro-only symbol on the live-file path', async () => {
    mockedGetTier.mockResolvedValueOnce('free');
    mockedReadLiveSignals.mockResolvedValueOnce({
      signals: [
        makeSignal({ id: 'btc', symbol: 'BTCUSD', confidence: 80 }),
        makeSignal({ id: 'nvda', symbol: 'NVDAUSD', confidence: 80 }),
        makeSignal({ id: 'tsla', symbol: 'TSLAUSD', confidence: 78 }),
      ],
      isStale: false,
      generatedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.tier).toBe('free');
    const symbols = body.signals.map((s: { pair: string }) => s.pair);
    expect(symbols).toContain('BTCUSD');
    expect(symbols).not.toContain('NVDAUSD');
    expect(symbols).not.toContain('TSLAUSD');
  });

  it('free caller never sees a premium-band signal (>=85 confidence)', async () => {
    mockedGetTier.mockResolvedValueOnce('free');
    mockedReadLiveSignals.mockResolvedValueOnce({
      signals: [
        makeSignal({ id: 'std', confidence: 80 }),
        makeSignal({ id: 'prem', confidence: 90 }),
        makeSignal({ id: 'prem-edge', confidence: 85 }),
      ],
      isStale: false,
      generatedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq());
    const body = await res.json();

    const ids = body.signals.map((s: { id: string }) => s.id);
    expect(ids).toContain('std');
    expect(ids).not.toContain('prem');
    expect(ids).not.toContain('prem-edge');
  });

  it('free caller does not see signals fresher than the 15-min delay', async () => {
    mockedGetTier.mockResolvedValueOnce('free');
    const now = Date.now();
    mockedReadLiveSignals.mockResolvedValueOnce({
      signals: [
        makeSignal({
          id: 'fresh',
          timestamp: new Date(now - 60_000).toISOString(),
        }),
        makeSignal({
          id: 'old',
          timestamp: new Date(now - 30 * 60_000).toISOString(),
        }),
      ],
      isStale: false,
      generatedAt: new Date(now).toISOString(),
    });

    const res = await GET(makeReq());
    const body = await res.json();

    const ids = body.signals.map((s: { id: string }) => s.id);
    expect(ids).not.toContain('fresh');
    expect(ids).toContain('old');
  });

  it('pro caller sees premium symbols, premium band, and real-time (no delay)', async () => {
    mockedGetTier.mockResolvedValueOnce('pro');
    mockedReadLiveSignals.mockResolvedValueOnce({
      signals: [
        makeSignal({ id: 'btc', confidence: 90, timestamp: new Date().toISOString() }),
        makeSignal({ id: 'nvda', symbol: 'NVDAUSD', confidence: 92 }),
      ],
      isStale: false,
      generatedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.tier).toBe('pro');
    const ids = body.signals.map((s: { id: string }) => s.id);
    expect(ids).toContain('btc');
    expect(ids).toContain('nvda');
  });

  it('free tier: public CDN cache, no tier header leak, Vary: Cookie + Authorization', async () => {
    mockedGetTier.mockResolvedValueOnce('free');
    mockedReadLiveSignals.mockResolvedValueOnce({
      signals: [makeSignal()],
      isStale: false,
      generatedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq());
    expect(res.headers.get('Vary')).toBe('Cookie, Authorization');
    // X-TradeClaw-Tier was a CORS-readable cross-origin tier oracle. Stripped.
    expect(res.headers.get('X-TradeClaw-Tier')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });

  it('paid tier: private no-store, no tier header leak', async () => {
    mockedGetTier.mockResolvedValueOnce('pro');
    mockedReadLiveSignals.mockResolvedValueOnce({
      signals: [makeSignal()],
      isStale: false,
      generatedAt: new Date().toISOString(),
    });

    const res = await GET(makeReq());
    expect(res.headers.get('X-TradeClaw-Tier')).toBeNull();
    expect(res.headers.get('Vary')).toBe('Cookie, Authorization');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns 503 on upstream failure instead of masking as 200 + empty list', async () => {
    mockedGetTier.mockResolvedValueOnce('free');
    mockedReadLiveSignals.mockRejectedValueOnce(new Error('boom'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(makeReq());
    consoleSpy.mockRestore();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('upstream_unavailable');
    expect(body.tier).toBe('free');
    // Cache headers must still be set so CDN doesn't blanket-cache a 503.
    expect(res.headers.get('Vary')).toBe('Cookie, Authorization');
  });
});
