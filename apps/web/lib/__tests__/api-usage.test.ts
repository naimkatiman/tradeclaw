import { buildScopeAccessRows, getUsageAccessSummary } from '../api-usage';

describe('api-usage scope access helpers', () => {
  it('marks enabled scopes and preserves matrix order', () => {
    const rows = buildScopeAccessRows(['leaderboard', 'signals']);

    expect(rows.map((row) => row.scope)).toEqual(['signals', 'leaderboard', 'screener']);
    expect(rows.map((row) => row.enabled)).toEqual([true, true, false]);
    expect(rows[0]?.helperText).toMatch(/signal feed/i);
  });

  it('summarizes access coverage for the UI badge', () => {
    expect(getUsageAccessSummary(['signals'])).toEqual({
      enabledCount: 1,
      totalCount: 3,
      allEnabled: false,
    });

    expect(getUsageAccessSummary(['signals', 'leaderboard', 'screener'])).toEqual({
      enabledCount: 3,
      totalCount: 3,
      allEnabled: true,
    });
  });
});