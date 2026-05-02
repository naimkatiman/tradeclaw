import { describe, it, expect } from 'vitest';
import { currentWinStreak } from '../streak';

const t = (pnlPct: number, closedAt = Date.now()) => ({ pnlPct, closedAt });

describe('currentWinStreak', () => {
  it('returns 0 when there are no closed trades', () => {
    expect(currentWinStreak([])).toBe(0);
  });
  it('returns 0 when most recent trade was a loss', () => {
    expect(currentWinStreak([t(-1, 3), t(2, 2), t(3, 1)])).toBe(0);
  });
  it('returns the count of consecutive wins from the most recent trade', () => {
    const trades = [
      t(2, 5), t(3, 4), t(1, 3), t(-0.5, 2), t(4, 1),
    ];
    expect(currentWinStreak(trades)).toBe(3);
  });
  it('handles a single win', () => {
    expect(currentWinStreak([t(1, 1)])).toBe(1);
  });
  it('treats pnlPct === 0 as not a win (break-even)', () => {
    expect(currentWinStreak([t(0, 2), t(2, 1)])).toBe(0);
  });
});
