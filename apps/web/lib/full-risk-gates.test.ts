import {
  computeGateState,
  computeVolMultiplier,
  STREAK_N,
  DRAWDOWN_THRESHOLD,
  GATE_THRESHOLDS_BY_REGIME,
  REGIME_VOL_BASELINE_PCT,
  getGateThresholds,
  type ResolvedOutcome,
} from './full-risk-gates';

const win = (pnl: number): ResolvedOutcome => ({ hit: true, pnlPct: pnl });
const loss = (pnl: number): ResolvedOutcome => ({ hit: false, pnlPct: pnl });

describe('computeGateState — default (neutral) regime', () => {
  test('empty history → allow (fail-open)', () => {
    const state = computeGateState([]);
    expect(state.gatesAllow).toBe(true);
    expect(state.reason).toBeNull();
    expect(state.dataPoints).toBe(0);
    expect(state.regime).toBe('neutral');
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

describe('computeGateState — regime-aware thresholds', () => {
  test('getGateThresholds returns correct table per regime', () => {
    expect(getGateThresholds('crash')).toEqual(GATE_THRESHOLDS_BY_REGIME.crash);
    expect(getGateThresholds('bull')).toEqual(GATE_THRESHOLDS_BY_REGIME.bull);
    expect(getGateThresholds('neutral').streakN).toBe(STREAK_N);
    expect(getGateThresholds('neutral').drawdownThreshold).toBe(DRAWDOWN_THRESHOLD);
  });

  test('crash regime: 2 consecutive losses trigger streak (neutral would not)', () => {
    const hist: ResolvedOutcome[] = [loss(-1), loss(-1)];
    expect(computeGateState(hist, 'neutral').gatesAllow).toBe(true);  // neutral needs 3
    const crashState = computeGateState(hist, 'crash');
    expect(crashState.gatesAllow).toBe(false);
    expect(crashState.reason).toMatch(/streak_blocked.*regime=crash/);
    expect(crashState.thresholds.streakN).toBe(2);
  });

  test('bull regime: 3 consecutive losses do NOT trigger streak (neutral would)', () => {
    const hist: ResolvedOutcome[] = [loss(-1), loss(-1), loss(-1)];
    expect(computeGateState(hist, 'neutral').gatesAllow).toBe(false); // blocks at 3
    const bullState = computeGateState(hist, 'bull');
    expect(bullState.gatesAllow).toBe(true);                          // bull needs 4
    expect(bullState.streakLossCount).toBe(3);
    expect(bullState.thresholds.streakN).toBe(4);
  });

  test('bull regime: ~11% drawdown does NOT trigger (neutral would block at 10%)', () => {
    // Same shape as the neutral drawdown test but ends with a small win so
    // the newest-4 window for bull (streakN=4) does not trip the streak gate.
    // Sequence produces ~11% drawdown from the run-up peak.
    const oldestFirst: ResolvedOutcome[] = [
      win(5), win(5), win(5), win(5), win(5),
      loss(-1), loss(-1), loss(-1), loss(-1), loss(-1),
      loss(-1), loss(-1), loss(-1), loss(-1), loss(-1),
      loss(-1), loss(-1),
      win(0.1),                                          // breaks streak window
    ];
    const newestFirst = oldestFirst.slice().reverse();

    // Neutral: DD ~11% > 10% → blocked (DD gate, streak only at 2)
    expect(computeGateState(newestFirst, 'neutral').gatesAllow).toBe(false);

    // Bull: streakN=4, newest window [win, loss, loss, loss] → 3/4, no streak
    // block. DD ~11% < 15% threshold → DD doesn't fire either. Allow.
    const bullState = computeGateState(newestFirst, 'bull');
    expect(bullState.gatesAllow).toBe(true);
    expect(bullState.currentDrawdownPct).toBeLessThan(
      GATE_THRESHOLDS_BY_REGIME.bull.drawdownThreshold * 100,
    );
  });

  test('vol scaling off by default: computeGateState returns multiplier=1.0', () => {
    const state = computeGateState([], 'neutral');
    expect(state.volMultiplier).toBe(1.0);
    expect(state.effectiveDrawdownThreshold).toBe(
      GATE_THRESHOLDS_BY_REGIME.neutral.drawdownThreshold,
    );
  });

  test('crash regime: 6% drawdown triggers (neutral would allow at 10%)', () => {
    // Sequence producing ~6% drawdown: 3 wins +3% then 6 losses of -1.2%
    // Peak after wins ≈ 10927, then 6×(-1.2%) → ≈ 10165, DD ≈ 6.97%
    const oldestFirst: ResolvedOutcome[] = [
      win(3), win(3), win(3),
      // Avoid a loss streak longer than crash.streakN - 1 = 1 by interleaving
      // wins of 0% so we isolate the drawdown gate behavior.
      loss(-1.2), win(0), loss(-1.2), win(0),
      loss(-1.2), win(0), loss(-1.2), win(0),
      loss(-1.2), win(0), loss(-1.2),
    ];
    const newestFirst = oldestFirst.slice().reverse();

    // Neutral: DD threshold 10%, this sequence is ~7% → allow
    expect(computeGateState(newestFirst, 'neutral').gatesAllow).toBe(true);

    // Crash: DD threshold 5%, streakN 2 — interleaved zeros mean no 2-loss
    // streak triggers, but DD > 5% should fire.
    const crashState = computeGateState(newestFirst, 'crash');
    expect(crashState.gatesAllow).toBe(false);
    expect(crashState.reason).toMatch(/drawdown_blocked.*regime=crash/);
    expect(crashState.currentDrawdownPct).toBeGreaterThan(
      GATE_THRESHOLDS_BY_REGIME.crash.drawdownThreshold * 100,
    );
  });
});

describe('computeVolMultiplier', () => {
  test('returns 1.0 for < 5 samples (not enough signal)', () => {
    expect(computeVolMultiplier([win(1), loss(-1), win(1), loss(-1)], 'neutral')).toBe(1.0);
  });

  test('returns 1.0 when realized stddev matches regime baseline', () => {
    // Neutral baseline is 1.5%. Build a sample with stddev ≈ 1.5.
    // Values alternating ±1.5 have mean 0, stddev = 1.5.
    const samples: ResolvedOutcome[] = [
      win(1.5), loss(-1.5), win(1.5), loss(-1.5),
      win(1.5), loss(-1.5), win(1.5), loss(-1.5),
    ];
    const mult = computeVolMultiplier(samples, 'neutral');
    expect(mult).toBeCloseTo(1.0, 1);
  });

  test('clamps to 1.5 in high vol (stddev >> baseline)', () => {
    // Neutral baseline 1.5. Values alternating ±5% → stddev 5 → ratio 3.33 → clamped to 1.5.
    const samples: ResolvedOutcome[] = [
      win(5), loss(-5), win(5), loss(-5),
      win(5), loss(-5), win(5), loss(-5),
    ];
    expect(computeVolMultiplier(samples, 'neutral')).toBe(1.5);
  });

  test('clamps to 0.75 in low vol (stddev << baseline)', () => {
    // Neutral baseline 1.5. Values ±0.2% → stddev 0.2 → ratio 0.13 → clamped to 0.75.
    const samples: ResolvedOutcome[] = [
      win(0.2), loss(-0.2), win(0.2), loss(-0.2),
      win(0.2), loss(-0.2), win(0.2), loss(-0.2),
    ];
    expect(computeVolMultiplier(samples, 'neutral')).toBe(0.75);
  });

  test('vol-scaled state: high vol loosens DD threshold', () => {
    // Same ~11% DD sequence that gets blocked on static neutral.
    const oldestFirst: ResolvedOutcome[] = [
      win(5), win(5), win(5), win(5), win(5),
      loss(-1), loss(-1), loss(-1), loss(-1), loss(-1),
      loss(-1), loss(-1), loss(-1), loss(-1), loss(-1),
      loss(-1), loss(-1), loss(-1),
    ];
    const newestFirst = oldestFirst.slice().reverse();

    const staticState = computeGateState(newestFirst, 'neutral');
    expect(staticState.gatesAllow).toBe(false); // 11% > 10%

    // With vol scaling: this sequence has high realized stddev (mix of +5 and -1)
    // which lifts the multiplier above 1.0, pushing the effective DD threshold
    // above 10% — should now allow.
    const scaledState = computeGateState(newestFirst, 'neutral', { volScaling: true });
    expect(scaledState.volMultiplier).toBeGreaterThan(1.0);
    expect(scaledState.effectiveDrawdownThreshold).toBeGreaterThan(
      GATE_THRESHOLDS_BY_REGIME.neutral.drawdownThreshold,
    );
  });

  test('REGIME_VOL_BASELINE_PCT has entry per regime', () => {
    for (const regime of Object.keys(GATE_THRESHOLDS_BY_REGIME) as Array<
      keyof typeof GATE_THRESHOLDS_BY_REGIME
    >) {
      expect(REGIME_VOL_BASELINE_PCT[regime]).toBeGreaterThan(0);
    }
  });
});
