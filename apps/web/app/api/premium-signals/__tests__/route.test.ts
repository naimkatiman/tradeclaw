/**
 * Premium-signals route gating tests — anchors the license→tier migration
 * (docs/plans/2026-05-01-monetization-consolidation.md, Phase B).
 *
 * Anonymous and free callers must see `{ signals: [], locked: true }`. Pro
 * callers must reach the DB query path with the full pro strategy set so a
 * Stripe Pro subscription unlocks premium_signals — replacing the previous
 * license-key gate.
 */

import { NextRequest } from 'next/server';

// Mock the premium-signal DB layer — we don't need real Postgres for this
// gating test; we only assert who gets through to it and what access shape
// arrives. jest.doMock is scoped per test file but applied module-globally.
jest.mock('../../../../lib/premium-signals', () => ({
  getPremiumSignalsFor: jest.fn(),
  listPremiumSignalsSince: jest.fn(),
}));

// Mock the access resolver. Each test sets the return value before importing
// the route handler so the per-test access posture takes effect.
jest.mock('../../../../lib/tier', () => ({
  resolveAccessContext: jest.fn(),
}));

import {
  getPremiumSignalsFor,
  listPremiumSignalsSince,
} from '../../../../lib/premium-signals';
import { resolveAccessContext } from '../../../../lib/tier';
import { GET } from '../route';

const mockedGetPremiumSignalsFor = getPremiumSignalsFor as jest.MockedFunction<
  typeof getPremiumSignalsFor
>;
const mockedListPremiumSignalsSince = listPremiumSignalsSince as jest.MockedFunction<
  typeof listPremiumSignalsSince
>;
const mockedResolveAccessContext = resolveAccessContext as jest.MockedFunction<
  typeof resolveAccessContext
>;

function makeReq(url = 'http://localhost/api/premium-signals'): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/premium-signals — tier gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('anonymous caller (free tier, classic only) → { signals: [], locked: true }', async () => {
    mockedResolveAccessContext.mockResolvedValueOnce({
      tier: 'free',
      unlockedStrategies: new Set(['classic']),
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body).toEqual({ signals: [], locked: true });
    expect(mockedGetPremiumSignalsFor).not.toHaveBeenCalled();
    expect(mockedListPremiumSignalsSince).not.toHaveBeenCalled();
  });

  it('free Stripe sub (classic only) → { signals: [], locked: true } (matches anonymous)', async () => {
    // Free tier carries the same single-strategy set as anonymous; the route
    // gates on size <= 1 so behavior must match.
    mockedResolveAccessContext.mockResolvedValueOnce({
      tier: 'free',
      unlockedStrategies: new Set(['classic']),
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.locked).toBe(true);
    expect(body.signals).toEqual([]);
  });

  it('pro Stripe sub → returns rows from premium_signals via getPremiumSignalsFor', async () => {
    // Behavior change: Pro Stripe sub now unlocks all premium strategies
    // (previously this was license-key gated). The route must reach the DB
    // layer and return the rows.
    const proStrategies = new Set([
      'classic',
      'regime-aware',
      'hmm-top3',
      'vwap-ema-bb',
      'full-risk',
      'tv-zaky-classic',
      'tv-hafiz-synergy',
      'tv-impulse-hunter',
    ]);
    mockedResolveAccessContext.mockResolvedValueOnce({
      tier: 'pro',
      unlockedStrategies: proStrategies,
    });
    const fakeSignal = {
      id: 'r-1',
      strategyId: 'tv-zaky-classic',
      symbol: 'EURUSD',
      timeframe: 'H1',
      direction: 'BUY' as const,
      confidence: 90,
      entry: 1.08,
    } as Parameters<typeof mockedGetPremiumSignalsFor>[0] extends never
      ? never
      : Awaited<ReturnType<typeof getPremiumSignalsFor>>[number];
    mockedGetPremiumSignalsFor.mockResolvedValueOnce([fakeSignal]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.locked).toBe(false);
    expect(body.signals).toHaveLength(1);
    expect(body.signals[0].symbol).toBe('EURUSD');
    expect(mockedGetPremiumSignalsFor).toHaveBeenCalledTimes(1);
    // Route forwards the access context (structural shape) — verify the
    // strategy set the DB layer receives is the pro set.
    const arg = mockedGetPremiumSignalsFor.mock.calls[0][0];
    expect(arg.unlockedStrategies).toBe(proStrategies);
  });

  it('pro caller with ?since=<ms> → uses listPremiumSignalsSince path', async () => {
    const proStrategies = new Set(['classic', 'tv-zaky-classic']);
    mockedResolveAccessContext.mockResolvedValueOnce({
      tier: 'pro',
      unlockedStrategies: proStrategies,
    });
    mockedListPremiumSignalsSince.mockResolvedValueOnce([]);

    const sinceMs = 1_700_000_000_000;
    const res = await GET(makeReq(`http://localhost/api/premium-signals?since=${sinceMs}`));
    const body = await res.json();

    expect(body.locked).toBe(false);
    expect(mockedListPremiumSignalsSince).toHaveBeenCalledWith(
      expect.objectContaining({ unlockedStrategies: proStrategies }),
      sinceMs,
    );
    expect(mockedGetPremiumSignalsFor).not.toHaveBeenCalled();
  });
});
