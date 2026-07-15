jest.mock('../db-pool', () => ({ query: jest.fn() }));

import { query } from '../db-pool';
import {
  decideCostAdjustedEdge,
  evaluateCostAdjustedEdge,
  getStrictlyApprovedSignalIds,
  summarizeEdgeEvidence,
  type EdgeEvidenceSummary,
} from '../cost-adjusted-edge-gate';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const NOW = Date.parse('2026-07-15T00:00:00.000Z');

function summary(overrides: Partial<EdgeEvidenceSummary> = {}): EdgeEvidenceSummary {
  return {
    windowDays: 90,
    matureCount: 110,
    usableCount: 105,
    coverage: 105 / 110,
    activeDays: 35,
    perSignalMeanNetR: 0.2,
    equalDayMeanNetR: 0.2,
    equalDayStdDevNetR: 0.1,
    equalDayLowerBoundNetR: 0.165,
    latestUsableAt: NOW - 86_400_000,
    ...overrides,
  };
}

function row(index: number, overrides: Record<string, unknown> = {}) {
  const dayOffset = index % 35;
  return {
    id: `row-${index}`,
    created_at: new Date(NOW - (dayOffset + 2) * 86_400_000).toISOString(),
    entry_price: 100,
    sl: 98,
    cost_estimate_pct: 0.1,
    outcome_24h: { pnlPct: 1, hit: true, target: 'expired', source: 'binance' },
    ...overrides,
  };
}

describe('cost-adjusted edge gate', () => {
  beforeEach(() => mockedQuery.mockReset());

  it('allows only a fresh, complete, statistically positive cohort', () => {
    expect(decideCostAdjustedEdge(summary(), NOW)).toEqual(
      expect.objectContaining({ allowed: true, reason: 'ready' }),
    );
  });

  it('enforces the exact 100-observation boundary', () => {
    expect(decideCostAdjustedEdge(summary({ usableCount: 99 }), NOW).reason)
      .toBe('insufficient_sample');
    expect(decideCostAdjustedEdge(summary({ usableCount: 100 }), NOW).allowed)
      .toBe(true);
  });

  it('blocks incomplete, thin-day, and stale evidence', () => {
    expect(decideCostAdjustedEdge(summary({ coverage: 0.899 }), NOW).reason)
      .toBe('incomplete_data');
    expect(decideCostAdjustedEdge(summary({ activeDays: 29 }), NOW).reason)
      .toBe('insufficient_sample');
    expect(decideCostAdjustedEdge(summary({ latestUsableAt: NOW - 8 * 86_400_000 }), NOW).reason)
      .toBe('stale');
  });

  it('blocks zero or negative modeled net expectancy', () => {
    expect(decideCostAdjustedEdge(summary({ perSignalMeanNetR: 0 }), NOW).reason)
      .toBe('negative');
    expect(decideCostAdjustedEdge(summary({ perSignalMeanNetR: -0.01 }), NOW).reason)
      .toBe('negative');
  });

  it('blocks a positive mean whose day-clustered lower bound is not positive', () => {
    expect(decideCostAdjustedEdge(summary({ equalDayLowerBoundNetR: 0 }), NOW).reason)
      .toBe('inconclusive');
  });

  it('uses nonzero 24h closes but excludes force-expiry and missing-cost rows', () => {
    const rows = [
      row(0),
      row(1, { outcome_24h: { pnlPct: -0.5, hit: false, target: 'expired', source: 'stooq' } }),
      row(2, { outcome_24h: { pnlPct: 0, hit: false, target: 'expired', source: 'binance' } }),
      row(3, { cost_estimate_pct: null }),
      row(4, { sl: null }),
    ];
    const result = summarizeEdgeEvidence(rows);

    expect(result.matureCount).toBe(5);
    expect(result.usableCount).toBe(2);
    expect(result.coverage).toBe(0.4);
  });

  it.each([
    ['missing', undefined],
    ['synthetic', 'synthetic'],
    ['unknown', 'unknown-provider'],
    ['force-expired', 'force-expired'],
    ['trade-close', 'trade-close'],
  ])('treats %s outcome provenance as unusable evidence', (_label, source) => {
    const outcome = { pnlPct: 1, hit: true, target: 'TP1', ...(source ? { source } : {}) };
    const result = summarizeEdgeEvidence([
      row(0),
      row(1, { outcome_24h: outcome }),
    ]);

    expect(result.matureCount).toBe(2);
    expect(result.usableCount).toBe(1);
    expect(result.coverage).toBe(0.5);
  });

  it('fails closed on database or schema errors', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('column broadcast_blocked does not exist'));
    await expect(evaluateCostAdjustedEdge()).resolves.toEqual(
      expect.objectContaining({ allowed: false, reason: 'unavailable' }),
    );
  });

  it('queries a strict broadcast-approved cohort with parameterized filters', async () => {
    mockedQuery.mockResolvedValueOnce([]);
    await evaluateCostAdjustedEdge({ strategyId: 'hmm-top3', symbols: ['BTCUSD'] });

    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain('broadcast_blocked = FALSE');
    expect(sql).toContain('strategy_id = $1');
    expect(sql).toContain('pair = ANY($2)');
    expect(params).toEqual(['hmm-top3', ['BTCUSD']]);
  });

  it('returns only explicitly approved persisted candidate IDs', async () => {
    mockedQuery.mockResolvedValueOnce([{ id: 'approved' }]);

    await expect(getStrictlyApprovedSignalIds(['approved', 'legacy-null']))
      .resolves.toEqual(new Set(['approved']));
    expect(mockedQuery.mock.calls[0][0]).toContain('broadcast_blocked = FALSE');
  });

  it('fails the candidate-ID check closed on query errors', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(getStrictlyApprovedSignalIds(['candidate'])).resolves.toEqual(new Set());
  });
});
