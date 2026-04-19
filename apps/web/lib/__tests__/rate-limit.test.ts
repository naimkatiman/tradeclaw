import { check, __resetForTest } from '../rate-limit';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('rate-limit — check', () => {
  beforeEach(() => __resetForTest());

  it('allows calls under the cap and tracks used/remaining', () => {
    const window = { max: 3, windowMs: HOUR };
    const a = check('ip-1', window, 1_000);
    expect(a).toEqual({ allowed: true, used: 1, remaining: 2 });

    const b = check('ip-1', window, 2_000);
    expect(b).toEqual({ allowed: true, used: 2, remaining: 1 });

    const c = check('ip-1', window, 3_000);
    expect(c).toEqual({ allowed: true, used: 3, remaining: 0 });
  });

  it('denies the (max+1)-th call within the window', () => {
    const window = { max: 2, windowMs: HOUR };
    check('ip-2', window, 1_000);
    check('ip-2', window, 2_000);
    const denied = check('ip-2', window, 3_000);
    expect(denied).toEqual({ allowed: false, used: 2, remaining: 0 });
  });

  it('tracks different keys independently', () => {
    const window = { max: 1, windowMs: HOUR };
    expect(check('a', window, 1_000).allowed).toBe(true);
    expect(check('a', window, 2_000).allowed).toBe(false);
    expect(check('b', window, 3_000).allowed).toBe(true);
  });

  it('rolls the window — old calls expire', () => {
    const window = { max: 2, windowMs: DAY };
    check('ip-3', window, 1_000);
    check('ip-3', window, 2_000);
    // Still at cap a moment inside the window
    expect(check('ip-3', window, 1_000 + DAY / 2).allowed).toBe(false);
    // Far enough past t=1_000 that the first call has fallen out; slot frees
    expect(check('ip-3', window, 1_001 + DAY).allowed).toBe(true);
  });

  it('prunes stored timestamps so the store does not grow unboundedly', () => {
    const window = { max: 1_000, windowMs: DAY };
    for (let i = 0; i < 50; i++) check('ip-4', window, i);
    // Last call far outside the window — all prior should be pruned
    const decision = check('ip-4', window, 10 * DAY);
    expect(decision.used).toBe(1);
  });
});
