/**
 * Request-path writer (getTrackedSignals) strategy-attribution test.
 *
 * Twin of the cron-path collect-new-signals test. Both writers stamp the
 * signal_history.strategy_id column and must agree: the stamp is the profile
 * that actually generated the rows (safeProfileId of the env preset), NOT the
 * raw env preset label. Today env preset 'hmm-top3' resolves to 'classic'
 * because it is not yet a STRATEGY_PROFILES entry.
 *
 * getTrackedSignals records fire-and-forget via recordSignalsAsync; we mock
 * that and capture the payload, then flush microtasks before asserting.
 */

jest.mock('../../app/lib/signals', () => ({ getSignals: jest.fn() }));
jest.mock('../../app/lib/signal-generator', () => {
  // safeProfileId is the function under test — keep it real
  const actual = jest.requireActual<typeof import('../../app/lib/signal-generator')>(
    '../../app/lib/signal-generator',
  );
  return actual;
});
jest.mock('../../app/api/cron/signals/preset-dispatch', () => ({
  getActivePreset: jest.fn(),
}));
jest.mock('../premium-signals', () => ({ getPremiumSignalsFor: jest.fn().mockResolvedValue([]) }));
jest.mock('../signal-history', () => ({ recordSignalsAsync: jest.fn().mockResolvedValue(1) }));
jest.mock('../signal-history-cache', () => ({ invalidateHistoryCache: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../social-queue', () => ({ enqueueSignalPost: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../full-risk-gates', () => ({
  fetchGateState: jest.fn().mockResolvedValue({ gatesAllow: true, reason: null }),
  getGateMode: jest.fn().mockReturnValue('off'),
}));
jest.mock('../gate-log', () => ({
  logGateDecision: jest.fn().mockResolvedValue(undefined),
  buildGateLogEntry: jest.fn().mockReturnValue({}),
}));
jest.mock('../winning-cells', () => ({
  getWinningCellsMode: jest.fn().mockReturnValue('off'),
  isWinningCell: jest.fn().mockReturnValue(true),
  WINNING_CELLS_GATE_REASON: 'winning_cells',
}));

import { getTrackedSignals } from '../tracked-signals';
import { getSignals } from '../../app/lib/signals';
import { getActivePreset } from '../../app/api/cron/signals/preset-dispatch';
import { recordSignalsAsync } from '../signal-history';

const mockGetSignals = getSignals as jest.MockedFunction<typeof getSignals>;
const mockGetActivePreset = getActivePreset as jest.MockedFunction<typeof getActivePreset>;
const mockRecordSignalsAsync = recordSignalsAsync as jest.MockedFunction<typeof recordSignalsAsync>;

const ORIG_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function makeSignal() {
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
  };
}

describe('getTrackedSignals — strategy attribution (request-path writer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // No dispatch/social side-effects: keep the test to the recording seam.
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (ORIG_APP_URL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = ORIG_APP_URL;
  });

  it('stamps strategy_id as the resolved profile ("classic"), not the env preset id ("hmm-top3")', async () => {
    mockGetActivePreset.mockReturnValue({ id: 'hmm-top3' } as ReturnType<typeof getActivePreset>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetSignals.mockResolvedValue({ signals: [makeSignal() as any], syntheticSymbols: [] });

    await getTrackedSignals({});
    // recordSignalsAsync is fire-and-forget — flush microtasks
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRecordSignalsAsync).toHaveBeenCalledTimes(1);
    const payload = mockRecordSignalsAsync.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0].strategyId).toBe('classic');
    expect(payload[0].strategyId).not.toBe('hmm-top3');
  });

  it('passes the resolved profileId to getSignals so generation and stamp match', async () => {
    mockGetActivePreset.mockReturnValue({ id: 'hmm-top3' } as ReturnType<typeof getActivePreset>);
    mockGetSignals.mockResolvedValue({ signals: [], syntheticSymbols: [] });

    await getTrackedSignals({});

    expect(mockGetSignals).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'classic' }),
    );
  });
});
