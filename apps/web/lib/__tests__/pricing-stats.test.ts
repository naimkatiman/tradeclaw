import { computePricingStats, type RawPricingAgg } from '../pricing-stats';

describe('pricing-stats — computePricingStats', () => {
  it('returns nulls when no rows resolved yet', () => {
    const stats = computePricingStats(null);
    expect(stats).toEqual({
      closedSignalsAllTime: 0,
      winRatePct: null,
      cumulativePnlPct: 0,
      payoffRatio: null,
      breakEvenWinRatePct: null,
    });
  });

  it('computes win rate and cumulative PnL from raw aggregate', () => {
    const agg: RawPricingAgg = {
      closed_count: '100',
      wins: '73',
      cumulative_pnl: '128.5',
    };
    const stats = computePricingStats(agg);
    expect(stats.closedSignalsAllTime).toBe(100);
    expect(stats.winRatePct).toBe(73);
    expect(stats.cumulativePnlPct).toBeCloseTo(128.5, 1);
  });

  it('rounds win rate to one decimal', () => {
    const agg: RawPricingAgg = {
      closed_count: '300',
      wins: '187',
      cumulative_pnl: '42.0',
    };
    // 187 / 300 = 0.6233... → 62.3
    const stats = computePricingStats(agg);
    expect(stats.winRatePct).toBeCloseTo(62.3, 1);
  });

  it('treats zero closed count as null win rate, not NaN', () => {
    const agg: RawPricingAgg = {
      closed_count: '0',
      wins: '0',
      cumulative_pnl: '0',
    };
    const stats = computePricingStats(agg);
    expect(stats.closedSignalsAllTime).toBe(0);
    expect(stats.winRatePct).toBeNull();
    expect(stats.cumulativePnlPct).toBe(0);
  });

  it('coerces string fields safely; non-numeric → 0 / null', () => {
    const agg: RawPricingAgg = {
      closed_count: 'abc',
      wins: 'xyz',
      cumulative_pnl: 'NaN',
    };
    const stats = computePricingStats(agg);
    expect(stats.closedSignalsAllTime).toBe(0);
    expect(stats.winRatePct).toBeNull();
    expect(stats.cumulativePnlPct).toBe(0);
    expect(stats.payoffRatio).toBeNull();
    expect(stats.breakEvenWinRatePct).toBeNull();
  });

  it('computes payoff ratio and break-even win rate from avg win/loss', () => {
    const agg: RawPricingAgg = {
      closed_count: '100',
      wins: '40',
      cumulative_pnl: '50',
      avg_win_pnl: '3.4',
      avg_loss_pnl: '-2.0',
    };
    const stats = computePricingStats(agg);
    // payoff = 3.4 / 2.0 = 1.7 → break-even = 100 / 2.7 = 37.0
    expect(stats.payoffRatio).toBeCloseTo(1.7, 1);
    expect(stats.breakEvenWinRatePct).toBeCloseTo(37.0, 1);
  });

  it('returns null payoff when there are no losses (or no wins)', () => {
    const noLosses: RawPricingAgg = {
      closed_count: '10',
      wins: '10',
      cumulative_pnl: '20',
      avg_win_pnl: '2.0',
      avg_loss_pnl: null,
    };
    expect(computePricingStats(noLosses).payoffRatio).toBeNull();
    expect(computePricingStats(noLosses).breakEvenWinRatePct).toBeNull();

    const noWins: RawPricingAgg = {
      closed_count: '10',
      wins: '0',
      cumulative_pnl: '-20',
      avg_win_pnl: null,
      avg_loss_pnl: '-2.0',
    };
    expect(computePricingStats(noWins).payoffRatio).toBeNull();
    expect(computePricingStats(noWins).breakEvenWinRatePct).toBeNull();
  });
});
