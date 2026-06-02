import { _internal } from '../signal-run-log';

const { computeHashAndCounts } = _internal;

const row = (
  id: string,
  outcome_4h: unknown,
  outcome_24h: unknown,
  created_at = '2026-06-01T00:00:00.000Z',
) => ({ id, created_at, outcome_4h, outcome_24h });

describe('computeHashAndCounts', () => {
  it('counts a row with no outcomes as pending', () => {
    const { counts } = computeHashAndCounts([row('1', null, null)]);
    expect(counts).toMatchObject({ total: 1, verified: 0, wins: 0, losses: 0, pending: 1 });
  });

  it('counts a hit as a win', () => {
    const { counts } = computeHashAndCounts([row('1', null, { pnlPct: 3, hit: true })]);
    expect(counts).toMatchObject({ total: 1, verified: 1, wins: 1, losses: 0, pending: 0 });
  });

  it('counts a real (non-expired) miss as a loss', () => {
    const { counts } = computeHashAndCounts([row('1', null, { pnlPct: -2, hit: false })]);
    expect(counts).toMatchObject({ total: 1, verified: 1, wins: 0, losses: 1, pending: 0 });
  });

  it('excludes an auto-expire placeholder outcome from wins AND losses', () => {
    // { pnlPct: 0, hit: false, target: 'expired' } is not a real trade outcome.
    const { counts } = computeHashAndCounts([
      row('1', null, { pnlPct: 0, hit: false, target: 'expired' }),
    ]);
    // Still verified (non-null), but neither a win nor a loss.
    expect(counts).toMatchObject({ total: 1, verified: 1, wins: 0, losses: 0 });
  });

  it('does not count a loss when only an expired outcome is present', () => {
    const { counts } = computeHashAndCounts([
      row('1', { pnlPct: 0, hit: false, target: 'expired' }, { pnlPct: 0, hit: false, target: 'expired' }),
    ]);
    expect(counts.losses).toBe(0);
    expect(counts.wins).toBe(0);
  });
});
