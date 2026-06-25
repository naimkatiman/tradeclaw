import {
  KL_TZ,
  weekStartFor,
  lockCutoffFor,
  isPastLockCutoff,
  evaluateWriteGate,
} from '../discipline';

// 2026-06-01 is a Monday. KL is UTC+8, no DST.
// KL Monday 12:00 == 04:00 UTC. So:
//   Monday 11:59 KL == 2026-06-01T03:59:00Z (before cutoff)
//   Monday 12:01 KL == 2026-06-01T04:01:00Z (after cutoff)
const WEEK_START = '2026-06-01';

describe('KL_TZ', () => {
  it('is the Kuala Lumpur zone identifier', () => {
    expect(KL_TZ).toBe('Asia/Kuala_Lumpur');
  });
});

describe('weekStartFor', () => {
  it('returns the Monday of the KL week for a mid-week instant', () => {
    // Wednesday 2026-06-03 10:00 KL == 02:00 UTC
    const wed = new Date('2026-06-03T02:00:00Z');
    expect(weekStartFor(wed)).toBe('2026-06-01');
  });

  it('returns the same Monday for Monday morning before cutoff', () => {
    const monMorning = new Date('2026-06-01T03:59:00Z'); // Mon 11:59 KL
    expect(weekStartFor(monMorning)).toBe('2026-06-01');
  });

  it('returns the same Monday for Sunday late-night KL', () => {
    // Sunday 2026-06-07 23:30 KL == 15:30 UTC
    const sunNight = new Date('2026-06-07T15:30:00Z');
    expect(weekStartFor(sunNight)).toBe('2026-06-01');
  });

  it('rolls to the next Monday once the new KL week begins', () => {
    // Monday 2026-06-08 00:30 KL == 2026-06-07 16:30 UTC
    const nextMon = new Date('2026-06-07T16:30:00Z');
    expect(weekStartFor(nextMon)).toBe('2026-06-08');
  });

  it('handles a UTC instant that is a different KL calendar day', () => {
    // 2026-06-07T17:00:00Z is Sunday 17:00 UTC == Monday 01:00 KL (2026-06-08)
    const lateUtcSun = new Date('2026-06-07T17:00:00Z');
    expect(weekStartFor(lateUtcSun)).toBe('2026-06-08');
  });
});

describe('lockCutoffFor', () => {
  it('returns Monday 12:00 KL (04:00 UTC) for the given week', () => {
    const cutoff = lockCutoffFor(WEEK_START);
    expect(cutoff.toISOString()).toBe('2026-06-01T04:00:00.000Z');
  });
});

describe('isPastLockCutoff', () => {
  it('is false just before Monday noon KL', () => {
    expect(isPastLockCutoff(new Date('2026-06-01T03:59:00Z'), WEEK_START)).toBe(false);
  });

  it('is true exactly at Monday noon KL', () => {
    expect(isPastLockCutoff(new Date('2026-06-01T04:00:00Z'), WEEK_START)).toBe(true);
  });

  it('is true just after Monday noon KL', () => {
    expect(isPastLockCutoff(new Date('2026-06-01T04:01:00Z'), WEEK_START)).toBe(true);
  });
});

describe('evaluateWriteGate', () => {
  const before = new Date('2026-06-01T03:59:00Z'); // Mon 11:59 KL
  const after = new Date('2026-06-01T04:01:00Z'); // Mon 12:01 KL

  it('allows writes before the cutoff without override', () => {
    const gate = evaluateWriteGate(before, WEEK_START, {});
    expect(gate.allowed).toBe(true);
    expect(gate.requiresOverride).toBe(false);
  });

  it('blocks writes at/after the cutoff without override', () => {
    const gate = evaluateWriteGate(after, WEEK_START, {});
    expect(gate.allowed).toBe(false);
    expect(gate.requiresOverride).toBe(true);
    expect(gate.error).toBeTruthy();
  });

  it('rejects an override with no reason', () => {
    const gate = evaluateWriteGate(after, WEEK_START, { override: true });
    expect(gate.allowed).toBe(false);
    expect(gate.requiresOverride).toBe(true);
    expect(gate.error).toBeTruthy();
  });

  it('rejects an override with a blank reason', () => {
    const gate = evaluateWriteGate(after, WEEK_START, { override: true, reason: '   ' });
    expect(gate.allowed).toBe(false);
    expect(gate.requiresOverride).toBe(true);
  });

  it('allows an override with a non-empty reason after the cutoff', () => {
    const gate = evaluateWriteGate(after, WEEK_START, {
      override: true,
      reason: 'late CPI revision',
    });
    expect(gate.allowed).toBe(true);
  });

  it('ignores override flags before the cutoff (still allowed)', () => {
    const gate = evaluateWriteGate(before, WEEK_START, { override: true, reason: 'whatever' });
    expect(gate.allowed).toBe(true);
  });
});
