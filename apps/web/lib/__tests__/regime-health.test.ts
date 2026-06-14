/**
 * Regime/candle freshness health-check tests — Phase 3 regime engine, plan D8
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 */

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

import { query, queryOne } from '../db-pool';
import { checkRegimeHealth } from '../regime-health';
import { REGIME_CANDLE_UNIVERSE } from '../candle-store';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;

const HOUR_MS = 3_600_000;

interface AggRow {
  rows_24h: number;
  distinct_symbols: number;
  distinct_labels: number;
  one_label: string | null;
}

function choreograph(opts: {
  agg: AggRow;
  latestDetectedAt: string | null;
  candleMaxTs: Map<string, number>;
}): void {
  mockedQueryOne.mockImplementation((async (sql: string) => {
    if (sql.includes('COUNT(')) return opts.agg;
    if (sql.includes('detected_at')) {
      return opts.latestDetectedAt ? { detected_at: opts.latestDetectedAt } : null;
    }
    return null;
  }) as typeof queryOne);

  mockedQuery.mockImplementation((async () =>
    Array.from(opts.candleMaxTs, ([symbol, maxTs]) => ({
      symbol,
      max_ts: String(maxTs), // pg returns BIGINT aggregates as strings
    }))) as typeof query);
}

function freshCandles(): Map<string, number> {
  const map = new Map<string, number>();
  for (const symbol of REGIME_CANDLE_UNIVERSE) {
    map.set(symbol, Date.now() - 1.5 * HOUR_MS); // newest closed H1 bar
  }
  return map;
}

beforeEach(() => {
  mockedQuery.mockReset();
  mockedQueryOne.mockReset();
});

describe('checkRegimeHealth', () => {
  it('flags an empty table as stale with every universe symbol candle-missing', async () => {
    choreograph({
      agg: { rows_24h: 0, distinct_symbols: 0, distinct_labels: 0, one_label: null },
      latestDetectedAt: null,
      candleMaxTs: new Map(),
    });

    const health = await checkRegimeHealth();

    expect(health.regimeRows24h).toBe(0);
    expect(health.distinctSymbols24h).toBe(0);
    expect(health.latestDetectedAt).toBeNull();
    expect(health.staleRegime).toBe(true);
    expect(health.allOneLabel24h).toEqual({ allOne: false, label: null });
    expect(health.staleCandles).toHaveLength(REGIME_CANDLE_UNIVERSE.length);
    expect(health.staleCandles.every((c) => c.latestTs === null)).toBe(true);
  });

  it('reports healthy when rows are fresh, labels diverse, and candles current', async () => {
    choreograph({
      agg: { rows_24h: 240, distinct_symbols: 10, distinct_labels: 3, one_label: 'range' },
      latestDetectedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      candleMaxTs: freshCandles(),
    });

    const health = await checkRegimeHealth();

    expect(health.regimeRows24h).toBe(240);
    expect(health.distinctSymbols24h).toBe(10);
    expect(health.staleRegime).toBe(false);
    expect(health.allOneLabel24h).toEqual({ allOne: false, label: null });
    expect(health.staleCandles).toEqual([]);
  });

  it('detects the degenerate all-one-label state', async () => {
    choreograph({
      agg: { rows_24h: 240, distinct_symbols: 10, distinct_labels: 1, one_label: 'range' },
      latestDetectedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      candleMaxTs: freshCandles(),
    });

    const health = await checkRegimeHealth();

    expect(health.allOneLabel24h).toEqual({ allOne: true, label: 'range' });
  });

  it('flags a latest row older than 2 hours as stale', async () => {
    choreograph({
      agg: { rows_24h: 50, distinct_symbols: 10, distinct_labels: 2, one_label: 'range' },
      latestDetectedAt: new Date(Date.now() - 3 * HOUR_MS).toISOString(),
      candleMaxTs: freshCandles(),
    });

    const health = await checkRegimeHealth();

    expect(health.staleRegime).toBe(true);
  });

  it('lists universe symbols whose latest H1 candle is older than 3 hours or missing', async () => {
    const candleMaxTs = freshCandles();
    const staleTs = Date.now() - 4 * HOUR_MS;
    candleMaxTs.set('BTCUSD', staleTs);
    candleMaxTs.delete('ETHUSD'); // no stored candles at all

    choreograph({
      agg: { rows_24h: 240, distinct_symbols: 10, distinct_labels: 3, one_label: 'range' },
      latestDetectedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      candleMaxTs,
    });

    const health = await checkRegimeHealth();

    expect(health.staleCandles).toEqual(
      expect.arrayContaining([
        { symbol: 'BTCUSD', latestTs: staleTs },
        { symbol: 'ETHUSD', latestTs: null },
      ]),
    );
    expect(health.staleCandles).toHaveLength(2);
  });

  it('propagates DB errors instead of swallowing them', async () => {
    mockedQueryOne.mockRejectedValue(new Error('connection refused'));
    mockedQuery.mockResolvedValue([]);

    await expect(checkRegimeHealth()).rejects.toThrow('connection refused');
  });
});
