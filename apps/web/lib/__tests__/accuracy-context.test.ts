import { computeAccuracyContext } from '../accuracy-context';
import type { SignalHistoryRecord } from '../signal-history';

function row(
  pair: string,
  timeframe: string,
  hit: boolean,
  timestamp: number,
  overrides: Partial<SignalHistoryRecord> = {},
): SignalHistoryRecord {
  return {
    id: `${pair}-${timestamp}`,
    pair,
    timeframe,
    direction: 'BUY',
    confidence: 75,
    entryPrice: 100,
    timestamp,
    isSimulated: false,
    gateBlocked: false,
    outcomes: {
      '4h': null,
      '24h': { price: hit ? 101 : 99, hit, pnlPct: hit ? 1.2 : -0.8, source: 'binance' },
    },
    ...overrides,
  };
}

describe('computeAccuracyContext', () => {
  it('returns correct stats and ISO bounds for a symbol with history', () => {
    const now = Date.now();
    const rows = [
      row('BTCUSD', 'H1', true, now - 3_600_000),
      row('BTCUSD', 'H1', true, now - 7_200_000),
      row('BTCUSD', 'H1', false, now - 10_800_000),
    ];
    const ctx = computeAccuracyContext(rows, 'BTCUSD', 'H1');
    expect(ctx).not.toBeNull();
    expect(ctx!.winRate).toBeCloseTo(66.67, 0);
    expect(ctx!.sampleSize).toBe(3);
    expect(ctx!.windowLabel).toBe('24h');
    expect(ctx!.oldestSampleTs).toBe(new Date(rows[2].timestamp).toISOString());
    expect(ctx!.newestSampleTs).toBe(new Date(rows[0].timestamp).toISOString());
  });

  it('returns null when no matching rows exist', () => {
    expect(computeAccuracyContext([], 'XAUUSD', 'H4')).toBeNull();
  });

  it('uses the canonical denominator, including drift closes and excluding non-counted rows', () => {
    const now = Date.now();
    const rows = [
      row('BTCUSD', 'H1', true, now - 1_000),
      row('BTCUSD', 'H1', false, now - 2_000, {
        outcomes: {
          '4h': null,
          '24h': { price: 99.5, hit: false, pnlPct: -0.5, target: 'expired', source: 'binance' },
        },
      }),
      row('BTCUSD', 'H1', false, now - 3_000, {
        outcomes: {
          '4h': null,
          '24h': { price: 100, hit: false, pnlPct: 0, target: 'expired', source: 'force-expired' },
        },
      }),
      row('BTCUSD', 'H1', true, now - 4_000, { isSimulated: true }),
      row('BTCUSD', 'H1', true, now - 5_000, { gateBlocked: true }),
      row('BTCUSD', 'H1', true, now - 6_000, {
        outcomes: { '4h': null, '24h': null },
      }),
    ];

    const ctx = computeAccuracyContext(rows, 'BTCUSD', 'H1');
    expect(ctx).toMatchObject({ sampleSize: 2, winRate: 50 });
  });
});
