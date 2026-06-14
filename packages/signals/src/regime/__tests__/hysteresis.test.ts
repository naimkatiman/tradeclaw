/**
 * Unit tests for the regime hysteresis / min-dwell function (Phase 3, plan D6).
 *
 * applyHysteresis is the pure flap-suppression layer: a label switch requires
 * the previous label to have been held >= minDwellBars, unless the candidate's
 * confidence clears the override threshold.
 */

import { applyHysteresis } from '../hysteresis.js';
import type { HysteresisState } from '../hysteresis.js';

describe('applyHysteresis', () => {
  it('adopts the candidate when there is no previous state', () => {
    expect(applyHysteresis(null, 'trend', 0.5)).toBe('trend');
    expect(applyHysteresis(null, 'range', 0.01)).toBe('range');
  });

  it('keeps the regime when the candidate matches the previous regime', () => {
    const prev: HysteresisState = { regime: 'volatile', barsHeld: 0 };
    expect(applyHysteresis(prev, 'volatile', 0.4)).toBe('volatile');
  });

  it('suppresses a switch below the dwell minimum at low confidence', () => {
    const prev: HysteresisState = { regime: 'range', barsHeld: 3 };
    expect(applyHysteresis(prev, 'trend', 0.6)).toBe('range');
  });

  it('suppresses alternating low-confidence candidates (flap suppression)', () => {
    // Simulate a caller tracking barsHeld while the classifier flaps
    // trend/volatile every bar: the held regime must never move.
    let state: HysteresisState = { regime: 'range', barsHeld: 0 };
    const candidates: Array<'trend' | 'volatile'> = [
      'trend', 'volatile', 'trend', 'volatile', 'trend',
    ];
    for (const candidate of candidates) {
      const next = applyHysteresis(state, candidate, 0.55);
      expect(next).toBe('range');
      state = { regime: next, barsHeld: state.barsHeld + 1 };
    }
  });

  it('switches once the dwell minimum is satisfied', () => {
    const prev: HysteresisState = { regime: 'range', barsHeld: 6 };
    expect(applyHysteresis(prev, 'trend', 0.5)).toBe('trend');
  });

  it('switches immediately on confidence at or above the override threshold', () => {
    const prev: HysteresisState = { regime: 'range', barsHeld: 0 };
    expect(applyHysteresis(prev, 'volatile', 0.8)).toBe('volatile');
    expect(applyHysteresis(prev, 'volatile', 0.95)).toBe('volatile');
  });

  it('does not switch just below the override threshold before dwell', () => {
    const prev: HysteresisState = { regime: 'trend', barsHeld: 5 };
    expect(applyHysteresis(prev, 'range', 0.79)).toBe('trend');
  });

  it('dwell-gates again immediately after an accepted switch (caller resets barsHeld)', () => {
    // Dwell satisfied → switch is accepted
    const prev: HysteresisState = { regime: 'range', barsHeld: 6 };
    const switched = applyHysteresis(prev, 'trend', 0.5);
    expect(switched).toBe('trend');

    // Caller bookkeeping per the barsHeld contract: reset after the switch,
    // counting from 1. An immediate low-confidence flip back must be
    // suppressed by the dwell gate.
    const fresh: HysteresisState = { regime: switched, barsHeld: 1 };
    expect(applyHysteresis(fresh, 'range', 0.5)).toBe('trend');
  });

  it('respects custom minDwellBars and overrideConfidence options', () => {
    const prev: HysteresisState = { regime: 'range', barsHeld: 2 };
    // Dwell satisfied under a custom minimum of 2
    expect(applyHysteresis(prev, 'trend', 0.1, { minDwellBars: 2 })).toBe('trend');
    // Default dwell (6) not met, but custom override of 0.6 is cleared
    expect(applyHysteresis(prev, 'trend', 0.65, { overrideConfidence: 0.6 })).toBe('trend');
    // Neither custom gate met
    expect(
      applyHysteresis(prev, 'trend', 0.5, { minDwellBars: 3, overrideConfidence: 0.9 }),
    ).toBe('range');
  });
});
