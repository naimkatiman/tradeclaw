import {
  isCountedOutcome,
  isCountedResolved,
  isRealOutcome,
  computeLeaderboard,
  type SignalHistoryRecord,
  type SignalOutcome,
} from '../signal-history';

function record(overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 100,
    timestamp: 1_700_000_000_000,
    isSimulated: false,
    gateBlocked: false,
    outcomes: {
      '4h': null,
      '24h': { price: 105, pnlPct: 5, hit: true, target: 'TP1', source: 'binance' },
    },
    ...overrides,
  };
}

function withOutcome(outcome: SignalOutcome | null): SignalHistoryRecord {
  return record({ outcomes: { '4h': null, '24h': outcome } });
}

describe('canonical counted outcome denominator', () => {
  it.each([
    ['profitable', { price: 101, pnlPct: 1, hit: true, target: 'expired', source: 'binance' }],
    ['losing', { price: 99, pnlPct: -1, hit: false, target: 'expired', source: 'binance' }],
  ] as const)('counts a %s drift-expired 24h close', (_label, outcome) => {
    expect(isRealOutcome(outcome)).toBe(true);
    expect(isCountedResolved(withOutcome(outcome))).toBe(true);
  });

  it('excludes a missing 24h outcome even when the 4h outcome exists', () => {
    expect(isCountedResolved(record({
      outcomes: {
        '4h': { price: 101, pnlPct: 1, hit: true, target: 'expired' },
        '24h': null,
      },
    }))).toBe(false);
  });

  it.each([
    ['explicit force-expiry', { price: 100, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' }],
    ['legacy zero sentinel', { price: 100, pnlPct: 0, hit: false, target: 'expired' }],
  ] as const)('excludes a %s placeholder', (_label, outcome) => {
    expect(isRealOutcome(outcome)).toBe(false);
    expect(isCountedResolved(withOutcome(outcome))).toBe(false);
  });

  it('excludes simulated and gate-blocked rows with otherwise real outcomes', () => {
    expect(isCountedResolved(record({ isSimulated: true }))).toBe(false);
    expect(isCountedResolved(record({ gateBlocked: true }))).toBe(false);
  });

  it.each([
    ['missing', undefined],
    ['synthetic', 'synthetic'],
    ['unknown', 'unknown'],
    ['force-expired', 'force-expired'],
    ['trade-close', 'trade-close'],
  ])('excludes a nonzero outcome with %s provenance', (_label, source) => {
    const outcome: SignalOutcome = {
      price: 105,
      pnlPct: 5,
      hit: true,
      target: 'TP1',
      ...(source ? { source } : {}),
    };

    expect(isRealOutcome(outcome)).toBe(true);
    expect(isCountedOutcome(outcome)).toBe(false);
    expect(isCountedResolved(withOutcome(outcome))).toBe(false);
  });

  it.each(['market-data-hub', 'binance', 'stooq', 'kraken', 'cryptocompare'])(
    'counts an otherwise valid outcome from observed provider %s',
    (source) => {
      const outcome: SignalOutcome = {
        price: 105,
        pnlPct: 5,
        hit: true,
        target: 'TP1',
        source,
      };
      expect(isCountedOutcome(outcome)).toBe(true);
      expect(isCountedResolved(withOutcome(outcome))).toBe(true);
    },
  );

  it('ties leaderboard freshness to counted evidence instead of request time', () => {
    const resolvedAt = '2026-07-14T05:00:00.000Z';
    const counted = record({
      outcomes: {
        '4h': null,
        '24h': {
          price: 105,
          pnlPct: 5,
          hit: true,
          target: 'TP1',
          source: 'binance',
          resolvedAt,
        },
      },
    });

    expect(computeLeaderboard([counted], 'all').overall.lastUpdated).toBe(Date.parse(resolvedAt));
    expect(computeLeaderboard([
      record({
        outcomes: {
          '4h': null,
          '24h': { price: 105, pnlPct: 5, hit: true, target: 'TP1' },
        },
      }),
    ], 'all').overall.lastUpdated).toBe(0);
  });
});
