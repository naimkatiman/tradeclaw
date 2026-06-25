/**
 * Tests for regime-resolution.ts — the D9 bridge between the algorithmic
 * market_regimes map and the weekly-regime card operator override.
 *
 * Plan: docs/plans/2026-06-11-phase3-regime-engine.md (D9)
 */

// Mock regime-filter BEFORE any imports that transitively pull it.
jest.mock('../regime-filter', () => ({
  fetchRegimeMap: jest.fn(),
}));

// Mock weekly-regime/service (server-only — stubbed by jest.stubs, but the
// DB internals still need to be inert).
jest.mock('../weekly-regime/service', () => ({
  getCurrentWeeklyRegime: jest.fn(),
}));

import { fetchRegimeMap } from '../regime-filter';
import { getCurrentWeeklyRegime } from '../weekly-regime/service';
import { fetchResolvedRegimeMap } from '../regime-resolution';
import type { WeeklyRegimeCard, ClassRegime } from '../weekly-regime/types';
import type { MarketRegime } from '@tradeclaw/signals';

const mockedFetchRegimeMap = fetchRegimeMap as jest.MockedFunction<typeof fetchRegimeMap>;
const mockedGetCurrentWeeklyRegime = getCurrentWeeklyRegime as jest.MockedFunction<typeof getCurrentWeeklyRegime>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClassRegime(
  bias: 'LONG' | 'SHORT' | 'NONE',
  conviction: 0 | 1 | 2 | 3,
): ClassRegime {
  const regime = bias === 'NONE' || conviction === 0 ? 'NEUTRAL' : 'TRENDING';
  return {
    bias,
    conviction,
    regime,
    thesis: 'test thesis',
    set_by: 'test',
    set_at: '2026-06-09T00:00:00.000Z',
  };
}

function makeCard(
  classOverrides: Partial<Record<'crypto' | 'commodities' | 'stocks' | 'forex' | 'indices', ClassRegime>> = {},
): WeeklyRegimeCard {
  const defaults: Record<'crypto' | 'commodities' | 'stocks' | 'forex' | 'indices', ClassRegime> = {
    crypto: makeClassRegime('NONE', 0),
    commodities: makeClassRegime('NONE', 0),
    stocks: makeClassRegime('NONE', 0),
    forex: makeClassRegime('NONE', 0),
    indices: makeClassRegime('NONE', 0),
  };
  return {
    week_start: '2026-06-09',
    classes: { ...defaults, ...classOverrides },
    locked: false,
    override_used: false,
    override_reason: null,
    set_by: 'test',
    set_at: '2026-06-09T00:00:00.000Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedFetchRegimeMap.mockResolvedValue(new Map<string, MarketRegime>());
  mockedGetCurrentWeeklyRegime.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchResolvedRegimeMap', () => {
  describe('null card — pure algo passthrough', () => {
    it('returns algo map labels unchanged when no card is set', async () => {
      const algoMap = new Map<string, MarketRegime>([
        ['BTCUSD', 'trend'],
        ['EURUSD', 'volatile'],
        ['XAUUSD', 'range'],
      ]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockResolvedValue(null);

      const result = await fetchResolvedRegimeMap();

      expect(result.regimes.get('BTCUSD')).toBe('trend');
      expect(result.regimes.get('EURUSD')).toBe('volatile');
      expect(result.regimes.get('XAUUSD')).toBe('range');
      // No tilts applied
      expect(result.classTilts.size).toBe(0);
    });
  });

  describe('NEUTRAL classes — passthrough', () => {
    it('keeps algo labels when all card classes are NEUTRAL', async () => {
      const algoMap = new Map<string, MarketRegime>([['BTCUSD', 'volatile']]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ crypto: makeClassRegime('NONE', 0) }),
      );

      const result = await fetchResolvedRegimeMap();

      expect(result.regimes.get('BTCUSD')).toBe('volatile');
    });
  });

  describe('TRENDING conviction 3 — hard override on crypto', () => {
    it('forces all crypto symbols to trend while forex and metals stay on algo', async () => {
      const algoMap = new Map<string, MarketRegime>([
        ['BTCUSD', 'range'],
        ['ETHUSD', 'volatile'],
        ['EURUSD', 'range'],
        ['XAUUSD', 'volatile'],
      ]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ crypto: makeClassRegime('LONG', 3) }),
      );

      const result = await fetchResolvedRegimeMap();

      // Crypto overridden → trend
      expect(result.regimes.get('BTCUSD')).toBe('trend');
      expect(result.regimes.get('ETHUSD')).toBe('trend');

      // Non-crypto classes unchanged
      expect(result.regimes.get('EURUSD')).toBe('range');
      expect(result.regimes.get('XAUUSD')).toBe('volatile');
    });

    it('forces crypto symbols to trend even when absent from algo map', async () => {
      // Algo map empty — no DB entries yet
      mockedFetchRegimeMap.mockResolvedValue(new Map());
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ crypto: makeClassRegime('SHORT', 3) }),
      );

      const result = await fetchResolvedRegimeMap();

      // BTCUSD not in algo map but gets injected by override
      expect(result.regimes.get('BTCUSD')).toBe('trend');
      expect(result.regimes.get('SOLUSD')).toBe('trend');
    });

    it('records override tilt metadata for conviction 3', async () => {
      mockedFetchRegimeMap.mockResolvedValue(new Map());
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ crypto: makeClassRegime('LONG', 3) }),
      );

      const result = await fetchResolvedRegimeMap();

      const cryptoTilt = result.classTilts.get('crypto');
      expect(cryptoTilt).toBeDefined();
      expect(cryptoTilt?.hardOverride).toBe(true);
      expect(cryptoTilt?.bias).toBe('LONG');
      expect(cryptoTilt?.conviction).toBe(3);
      expect(cryptoTilt?.weeklyRegime).toBe('TRENDING');
      expect(cryptoTilt?.assetClass).toBe('crypto');
    });
  });

  describe('TRENDING conviction 1–2 — tilt metadata only, no label change', () => {
    it('leaves labels unchanged for conviction 1', async () => {
      const algoMap = new Map<string, MarketRegime>([
        ['BTCUSD', 'volatile'],
        ['ETHUSD', 'range'],
      ]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ crypto: makeClassRegime('LONG', 1) }),
      );

      const result = await fetchResolvedRegimeMap();

      expect(result.regimes.get('BTCUSD')).toBe('volatile');
      expect(result.regimes.get('ETHUSD')).toBe('range');
    });

    it('leaves labels unchanged for conviction 2', async () => {
      const algoMap = new Map<string, MarketRegime>([['EURUSD', 'trend']]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ forex: makeClassRegime('SHORT', 2) }),
      );

      const result = await fetchResolvedRegimeMap();

      expect(result.regimes.get('EURUSD')).toBe('trend');
    });

    it('records tilt metadata with hardOverride=false for conviction 1–2', async () => {
      mockedFetchRegimeMap.mockResolvedValue(new Map());
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ forex: makeClassRegime('LONG', 2) }),
      );

      const result = await fetchResolvedRegimeMap();

      const forexTilt = result.classTilts.get('forex');
      expect(forexTilt).toBeDefined();
      expect(forexTilt?.hardOverride).toBe(false);
      expect(forexTilt?.bias).toBe('LONG');
      expect(forexTilt?.conviction).toBe(2);
      expect(forexTilt?.weeklyRegime).toBe('TRENDING');
    });
  });

  describe('card-read throw — passthrough (fail-safe)', () => {
    it('falls back to pure algo map when getCurrentWeeklyRegime throws', async () => {
      const algoMap = new Map<string, MarketRegime>([['BTCUSD', 'trend']]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockRejectedValue(new Error('redis timeout'));

      const result = await fetchResolvedRegimeMap();

      expect(result.regimes.get('BTCUSD')).toBe('trend');
      expect(result.classTilts.size).toBe(0);
    });

    it('never throws when both sources fail', async () => {
      mockedFetchRegimeMap.mockRejectedValue(new Error('db down'));
      mockedGetCurrentWeeklyRegime.mockRejectedValue(new Error('cache down'));

      await expect(fetchResolvedRegimeMap()).resolves.toBeDefined();
    });
  });

  describe('algo-empty + hard override — override still applies', () => {
    it('builds regime entries from universe when algo map is empty', async () => {
      mockedFetchRegimeMap.mockResolvedValue(new Map());
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({
          crypto: makeClassRegime('LONG', 3),
          commodities: makeClassRegime('SHORT', 3),
        }),
      );

      const result = await fetchResolvedRegimeMap();

      // Crypto universe symbols get trend
      expect(result.regimes.get('BTCUSD')).toBe('trend');
      // Commodities (metals: XAUUSD, XAGUSD) get trend
      expect(result.regimes.get('XAUUSD')).toBe('trend');
      expect(result.regimes.get('XAGUSD')).toBe('trend');
      // Forex symbols NOT in algo map and no forex override → undefined
      expect(result.regimes.get('EURUSD')).toBeUndefined();
    });
  });

  describe('TRENDING conviction 3 on a class with no universe symbols', () => {
    it('records the tilt with hardOverride=true but leaves regimes untouched (stocks has zero universe symbols)', async () => {
      const algoMap = new Map<string, MarketRegime>([
        ['BTCUSD', 'range'],
        ['EURUSD', 'volatile'],
      ]);
      mockedFetchRegimeMap.mockResolvedValue(algoMap);
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ stocks: makeClassRegime('LONG', 3) }),
      );

      const result = await fetchResolvedRegimeMap();

      // No universe symbol maps to 'stocks' → labels are a no-op.
      expect(result.regimes.get('BTCUSD')).toBe('range');
      expect(result.regimes.get('EURUSD')).toBe('volatile');
      expect(result.regimes.size).toBe(2);

      // The tilt still faithfully records operator intent.
      const stocksTilt = result.classTilts.get('stocks');
      expect(stocksTilt).toBeDefined();
      expect(stocksTilt?.hardOverride).toBe(true);
      expect(stocksTilt?.bias).toBe('LONG');
      expect(stocksTilt?.conviction).toBe(3);
      expect(stocksTilt?.weeklyRegime).toBe('TRENDING');
    });
  });

  describe('metals → commodities mapping', () => {
    it('applies commodities override to XAUUSD and XAGUSD', async () => {
      mockedFetchRegimeMap.mockResolvedValue(
        new Map<string, MarketRegime>([['XAUUSD', 'range'], ['XAGUSD', 'volatile']]),
      );
      mockedGetCurrentWeeklyRegime.mockResolvedValue(
        makeCard({ commodities: makeClassRegime('LONG', 3) }),
      );

      const result = await fetchResolvedRegimeMap();

      expect(result.regimes.get('XAUUSD')).toBe('trend');
      expect(result.regimes.get('XAGUSD')).toBe('trend');
    });
  });
});
