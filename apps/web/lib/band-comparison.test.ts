import { classifyBandComparison, type BandSummaryLite } from './band-comparison';

function band(overrides: Partial<BandSummaryLite>): BandSummaryLite {
  return {
    totalReturn: 0,
    winRate: 50,
    totalSignals: 100,
    expectancyR: 0,
    ...overrides,
  };
}

describe('classifyBandComparison', () => {
  it('credits the filter only when premium beats all on win rate AND expectancy AND return', () => {
    const all = band({ totalReturn: 5, winRate: 35, expectancyR: 0.04 });
    const premium = band({ totalReturn: 12, winRate: 40, expectancyR: 0.15, totalSignals: 30 });

    const r = classifyBandComparison(all, premium);
    expect(r.verdict).toBe('premium_better');
    expect(r.tone).toBe('positive');
    expect(r.returnDelta).toBe(7);
  });

  it('does NOT credit premium when its total return wins only by trading less (lower win rate / worse expectancy)', () => {
    // The live 7d cherry-pick: All -40.32% (WR 28.1, exp -0.17R, 256), Premium
    // -7.83% (WR 25.8, exp -0.23R, 31). Premium "wins" the week by trading ~8× less.
    const all = band({ totalReturn: -40.32, winRate: 28.1, expectancyR: -0.17, totalSignals: 256 });
    const premium = band({ totalReturn: -7.83, winRate: 25.8, expectancyR: -0.23, totalSignals: 31 });

    const r = classifyBandComparison(all, premium);
    expect(r.verdict).toBe('premium_fewer_trades');
    expect(r.tone).toBe('neutral');
    expect(r.returnDelta).toBe(32.49);
    expect(r.label.toLowerCase()).toContain('fewer trades');
  });

  it('flags premium as underperforming when its total return is worse (all-time reality)', () => {
    // Live all-time: All +41.16%, Premium -1.7%.
    const all = band({ totalReturn: 41.16, winRate: 37.9, expectancyR: 0.04, totalSignals: 3313 });
    const premium = band({ totalReturn: -1.7, winRate: 34.6, expectancyR: 0.02, totalSignals: 191 });

    const r = classifyBandComparison(all, premium);
    expect(r.verdict).toBe('premium_worse');
    expect(r.tone).toBe('negative');
    expect(r.returnDelta).toBe(-42.86);
  });

  it('falls back to win-rate when expectancy is unknowable on either band', () => {
    const all = band({ totalReturn: 1, winRate: 30, expectancyR: null });
    const premium = band({ totalReturn: 4, winRate: 35, expectancyR: null, totalSignals: 20 });

    const r = classifyBandComparison(all, premium);
    // Higher win rate + higher return, expectancy null → treated as genuine.
    expect(r.verdict).toBe('premium_better');
  });

  it('falls back to win-rate when expectancy is unknowable on ONE side only', () => {
    // A band with no sized trades reports expectancyR null; the other has data.
    const all = band({ totalReturn: 1, winRate: 30, expectancyR: 0.04, totalSignals: 200 });
    const premium = band({ totalReturn: 4, winRate: 35, expectancyR: null, totalSignals: 20 });

    const r = classifyBandComparison(all, premium);
    expect(r.verdict).toBe('premium_better');
  });

  it('treats an exactly-equal return with no quality edge as neutral "matched", not "underperformed"', () => {
    const all = band({ totalReturn: 5.32, winRate: 40, expectancyR: 0.05 });
    const premium = band({ totalReturn: 5.32, winRate: 38, expectancyR: 0.03, totalSignals: 50 });

    const r = classifyBandComparison(all, premium);
    expect(r.returnDelta).toBe(0);
    expect(r.tone).toBe('neutral');
    expect(r.verdict).toBe('premium_worse');
    expect(r.label.toLowerCase()).toContain('matched');
  });
});
