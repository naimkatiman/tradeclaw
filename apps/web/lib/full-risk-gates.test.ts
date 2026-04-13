import {
  computeGateState,
  STREAK_N,
  DRAWDOWN_THRESHOLD,
  type ResolvedOutcome,
} from './full-risk-gates';

const win = (pnl: number): ResolvedOutcome => ({ hit: true, pnlPct: pnl });
const loss = (pnl: number): ResolvedOutcome => ({ hit: false, pnlPct: pnl });

describe('computeGateState', () => {
  test('empty history → allow (fail-open)', () => {
    const state = computeGateState([]);
    expect(state.gatesAllow).toBe(true);
    expect(state.reason).toBeNull();
    expect(state.dataPoints).toBe(0);
  });

  test(`last ${STREAK_N} all losses → block (streak gate)`, () => {
    const state = computeGateState([loss(-1), loss(-1), loss(-1)]);
    expect(state.gatesAllow).toBe(false);
    expect(state.reason).toMatch(/streak_blocked/);
    expect(state.streakLossCount).toBe(3);
  });

  test(`mix of ${STREAK_N - 1} losses + 1 win in last ${STREAK_N} → allow`, () => {
    // Last 3 newest-first: loss, loss, win → streak count = 2
    const state = computeGateState([loss(-1), loss(-1), win(1)]);
    expect(state.gatesAllow).toBe(true);
    expect(state.streakLossCount).toBe(2);
  });

  test('20 entries with cumulative -11% drawdown → block (drawdown gate)', () => {
    // Build a sequence that ends with a clear 11% drawdown from peak.
    // 5 wins of +5% each (compounds to ~127.6%), then 13 losses of -1% each
    // takes balance well below the peak. With newest-first input, we want
    // the SEQUENCE walked oldest-first to look like: 5 wins → 13 losses.
    const oldestFirst: ResolvedOutcome[] = [
      win(5), win(5), win(5), win(5), win(5),         // peak ~12762
      loss(-1), loss(-1), loss(-1), loss(-1), loss(-1),
      loss(-1), loss(-1), loss(-1), loss(-1), loss(-1),
      loss(-1), loss(-1), loss(-1),                    // 13 × -1% ≈ -12.2%
    ];
    // computeGateState expects newest-first, so reverse
    const newestFirst = oldestFirst.slice().reverse();
    const state = computeGateState(newestFirst);

    // Drawdown should be > 10%. May or may not also fire streak; either way
    // the block reason must be one of the two and gatesAllow must be false.
    expect(state.gatesAllow).toBe(false);
    expect(state.currentDrawdownPct).toBeGreaterThan(DRAWDOWN_THRESHOLD * 100);
  });

  test('20 entries with ~5% drawdown and no losing streak → allow', () => {
    // 5 wins +5%, then alternating losses/wins so we never have STREAK_N
    // consecutive losers. Final balance should sit well above the peak - 10%.
    const oldestFirst: ResolvedOutcome[] = [
      win(5), win(5), win(5), win(5), win(5),
      loss(-2), win(1), loss(-2), win(1), loss(-1),
      win(1), loss(-1), win(1), loss(-0.5), win(0.5),
    ];
    const newestFirst = oldestFirst.slice().reverse();
    const state = computeGateState(newestFirst);

    // Should allow: no 3-loss streak, drawdown well under threshold
    expect(state.gatesAllow).toBe(true);
    expect(state.currentDrawdownPct).toBeLessThanOrEqual(DRAWDOWN_THRESHOLD * 100);
  });

  test('partial history (< STREAK_N rows) cannot trigger streak', () => {
    // With only 2 losses in history we don't have enough data for a
    // 3-loss streak — should allow even though both are losses.
    const state = computeGateState([loss(-1), loss(-1)]);
    expect(state.gatesAllow).toBe(true);
    expect(state.streakLossCount).toBe(2);
  });
});
