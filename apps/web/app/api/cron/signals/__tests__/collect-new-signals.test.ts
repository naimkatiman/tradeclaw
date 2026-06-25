/**
 * Unit tests for collectNewSignals — verifies honest strategy attribution.
 *
 * Key invariant (D3): the fallback branch stamps the profile that ACTUALLY ran
 * (resolved via safeProfileId), not the raw env preset id.  Scanner branch
 * must still stamp 'scanner' regardless of the passed-in strategyId.
 *
 * Path notes (this file lives at __tests__/collect-new-signals.test.ts, one
 * level deeper than route.ts):
 *   route.ts '../../../lib/...'  →  test '../../../../lib/...'  (apps/web/app/lib)
 *   route.ts '../../../../lib/...' →  test '../../../../../lib/...' (apps/web/lib)
 */

// ── Mock all route-level imports so the module loads cleanly ─────────────────

// apps/web/app/lib
jest.mock('../../../../lib/signals', () => ({ getSignals: jest.fn() }));
jest.mock('../../../../lib/signal-generator', () => {
  // Keep real safeProfileId — that is the function under test
  const actual = jest.requireActual<typeof import('../../../../lib/signal-generator')>(
    '../../../../lib/signal-generator',
  );
  return actual;
});
jest.mock('../../../../lib/market-hours', () => ({
  isMarketOpen: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../../lib/ohlcv', () => ({ getOHLCV: jest.fn() }));

// apps/web/lib
jest.mock('../../../../../lib/signal-history', () => ({
  getRecentRecordForSymbolAsync: jest.fn().mockResolvedValue(null),
  recordSignalAsync: jest.fn().mockResolvedValue(undefined),
  getPendingRecordsAsync: jest.fn().mockResolvedValue([]),
  updateRecordsAsync: jest.fn().mockResolvedValue(0),
  updateBroadcastDecisionAsync: jest.fn().mockResolvedValue(undefined),
  markTelegramPosted: jest.fn().mockResolvedValue(undefined),
  resolveFromCandles: jest.fn().mockReturnValue(null),
  getOutcomeResolutionTimeframe: jest.fn().mockReturnValue('H1'),
  getUnpostedProSignalsAsync: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../../../lib/signal-thresholds', () => ({
  PUBLISHED_SIGNAL_MIN_CONFIDENCE: 65,
}));
jest.mock('../../../../../lib/telegram-pro-broadcast', () => ({
  broadcastSignalsToProGroup: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../../lib/broadcast-decision', () => ({
  computeBroadcastDecisions: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('../../../../../lib/signal-run-log', () => ({
  recordSignalRun: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../../../../lib/cron-auth', () => ({
  requireCronAuth: jest.fn().mockReturnValue(null),
}));
jest.mock('../../../../../lib/signal-worker', () => ({
  precomputeSignals: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../../lib/signals-live', () => ({
  readLiveSignals: jest.fn(),
}));

// preset-dispatch (same dir as route.ts)
jest.mock('../preset-dispatch', () => ({
  getActivePreset: jest.fn().mockReturnValue({ id: 'hmm-top3' }),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { collectNewSignals } from '../route';
import { getSignals } from '../../../../lib/signals';
import { readLiveSignals } from '../../../../../lib/signals-live';

const mockGetSignals = getSignals as jest.MockedFunction<typeof getSignals>;
const mockReadLiveSignals = readLiveSignals as jest.MockedFunction<typeof readLiveSignals>;

// ── Minimal signal fixture ────────────────────────────────────────────────────

function makeRawSignal(overrides: Partial<{
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: null;
  takeProfit3: null;
  indicators: object;
  status: string;
  dataQuality: string;
  timestamp: string;
  // Calibration MTF triple (D4) — typed here so a TradingSignal rename of these
  // fields breaks this test at compile time instead of silently passing.
  preBoostConfidence: number;
  mtfAgreement: number;
  confluenceBonus: number;
}> = {}) {
  return {
    id: 'sig-1',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY' as const,
    confidence: 80,
    entry: 2400,
    stopLoss: 2380,
    takeProfit1: 2420,
    takeProfit2: null,
    takeProfit3: null,
    indicators: {
      rsi: { value: 60, signal: 'bullish' },
      macd: { histogram: 1, signal: 'bullish' },
      ema: { trend: 'up', ema20: 2395, ema50: 2390, ema200: 2370 },
      bollingerBands: { position: 'upper', bandwidth: 5 },
      stochastic: { k: 70, d: 65, signal: 'bullish' },
      support: [],
      resistance: [],
    },
    status: 'active',
    dataQuality: 'real',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// Live scanner payload (drives the PRIMARY path). One adequate-coverage signal.
function makeLiveData(): NonNullable<Awaited<ReturnType<typeof readLiveSignals>>> {
  return {
    isStale: false,
    generatedAt: new Date().toISOString(),
    signals: [
      {
        id: 'live-1',
        symbol: 'XAUUSD',
        timeframe: 'H1',
        signal: 'BUY',
        confidence: 85,
        entry: 2400,
        tp1: 2420,
        tp2: 2440,
        sl: 2380,
        reasons: [],
        source: 'scanner',
        expires_in_minutes: 60,
        indicators: { rsi: 60, ema_trend: 'up' },
        timestamp: new Date().toISOString(),
      },
    ],
    stats: { symbols_checked: 10 },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('collectNewSignals — strategy attribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: live scanner unavailable → force fallback path
    mockReadLiveSignals.mockResolvedValue(null);
  });

  describe('FALLBACK path (live scanner unavailable)', () => {
    it('stamps effectiveStrategyId as "classic" when env preset is "hmm-top3"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetSignals.mockResolvedValue({ signals: [makeRawSignal() as any], syntheticSymbols: [] });

      const { effectiveStrategyId } = await collectNewSignals('hmm-top3');

      expect(effectiveStrategyId).toBe('classic');
      expect(effectiveStrategyId).not.toBe('hmm-top3');
    });

    it('stamps "classic" for other unknown env preset ids', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetSignals.mockResolvedValue({ signals: [makeRawSignal() as any], syntheticSymbols: [] });

      for (const unknownPreset of ['regime-aware', 'vwap-ema-bb', 'full-risk', 'bogus']) {
        mockGetSignals.mockClear();
        const { effectiveStrategyId } = await collectNewSignals(unknownPreset);
        expect(effectiveStrategyId).toBe('classic');
      }
    });

    it('passes the resolved profileId to getSignals so generation and stamp use the same profile', async () => {
      mockGetSignals.mockResolvedValue({ signals: [], syntheticSymbols: [] });

      await collectNewSignals('hmm-top3');

      expect(mockGetSignals).toHaveBeenCalledWith(
        expect.objectContaining({ profileId: 'classic' }),
      );
    });

    it('stamps "classic" when explicitly passed "classic"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetSignals.mockResolvedValue({ signals: [makeRawSignal() as any], syntheticSymbols: [] });

      const { effectiveStrategyId } = await collectNewSignals('classic');
      expect(effectiveStrategyId).toBe('classic');
    });
  });

  describe('PRIMARY path (live scanner available)', () => {
    it('stamps effectiveStrategyId as "scanner" regardless of passed-in strategyId', async () => {
      mockReadLiveSignals.mockResolvedValue(makeLiveData());

      const { effectiveStrategyId } = await collectNewSignals('hmm-top3');

      expect(effectiveStrategyId).toBe('scanner');
    });

    it('does NOT call getSignals on the primary path', async () => {
      mockReadLiveSignals.mockResolvedValue(makeLiveData());

      await collectNewSignals('hmm-top3');

      expect(mockGetSignals).not.toHaveBeenCalled();
    });
  });

  // Phase 4 D4: the MTF calibration triple is surfaced by the TA engine and must
  // flow onto fallback-path candidates, but is absent (undefined) on scanner rows.
  describe('calibration MTF triple (D4)', () => {
    it('carries preBoostConfidence / mtfAgreement / confluenceBonus onto fallback candidates', async () => {
      // No `as any` on the makeRawSignal argument: the three fields are typed in
      // its overrides, so a TradingSignal rename fails this at compile time. The
      // outer cast only coerces the fixture into the TradingSignal[] mock shape,
      // matching the other call sites in this file.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixture = makeRawSignal({ preBoostConfidence: 70, mtfAgreement: 4, confluenceBonus: 15 }) as any;
      mockGetSignals.mockResolvedValue({ signals: [fixture], syntheticSymbols: [] });

      const { candidates } = await collectNewSignals('classic');

      expect(candidates).toHaveLength(1);
      expect(candidates[0].preBoostConfidence).toBe(70);
      expect(candidates[0].mtfAgreement).toBe(4);
      expect(candidates[0].confluenceBonus).toBe(15);
    });

    it('leaves the MTF triple undefined on scanner candidates (recorded NULL)', async () => {
      mockReadLiveSignals.mockResolvedValue(makeLiveData());

      const { candidates } = await collectNewSignals('hmm-top3');

      expect(candidates).toHaveLength(1);
      expect(candidates[0].preBoostConfidence).toBeUndefined();
      expect(candidates[0].mtfAgreement).toBeUndefined();
      expect(candidates[0].confluenceBonus).toBeUndefined();
    });
  });
});
