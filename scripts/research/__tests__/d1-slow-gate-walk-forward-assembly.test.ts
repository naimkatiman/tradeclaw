import type { OHLCV } from '@tradeclaw/core';
import { CRYPTO_PERP_COSTS } from '@tradeclaw/strategies';
import {
  D1_SLOW_GATE_WALK_FORWARD_END_TS,
  D1_SLOW_GATE_WALK_FORWARD_START_TS,
  assembleD1SlowGateWalkForward,
  buyAndHoldCurve,
  checkPrefixInvariance,
  combineFixedSleeves,
  continuousFoldCurve,
  countNoStopDirectionChanges,
  decideD1SlowGateWalkForward,
  validateD1Series,
} from '../d1-slow-gate-walk-forward-assembly';

const DAY_MS = 86_400_000;

function candlesFromCloses(closes: number[], startTs = Date.UTC(2020, 0, 1)): OHLCV[] {
  return closes.map((close, index) => ({
    timestamp: startTs + index * DAY_MS,
    open: close,
    high: close * 1.01,
    low: close * 0.99,
    close,
    volume: 10 + index,
  }));
}

function frozenFixture(scale: number): OHLCV[] {
  const count = Math.round(
    (D1_SLOW_GATE_WALK_FORWARD_END_TS - D1_SLOW_GATE_WALK_FORWARD_START_TS) / DAY_MS,
  ) + 1;
  const closes = Array.from({ length: count }, (_, index) => (
    scale * (100 + index * 0.015 + Math.sin(index / 24) * 12 + Math.sin(index / 91) * 7)
  ));
  return candlesFromCloses(closes, D1_SLOW_GATE_WALK_FORWARD_START_TS);
}

describe('D1 slow-gate walk-forward assembly', () => {
  it('reconciles the original no-stop definition as raw gate direction changes', () => {
    const candles = candlesFromCloses([
      ...Array.from({ length: 199 }, () => 100),
      110,
      90,
      110,
    ]);

    expect(countNoStopDirectionChanges(candles)).toBe(3);
  });

  it('charges buy-and-hold entry, held-day funding, and terminal exit', () => {
    const candles = candlesFromCloses([100, 100, 100]);
    const result = buyAndHoldCurve(candles, CRYPTO_PERP_COSTS);
    const side = 1 - 0.002;
    const fundingDay = 1 - 0.0003;

    expect(result.equity).toHaveLength(3);
    expect(result.equity.at(-1)).toBeCloseTo(side * fundingDay * fundingDay * side, 12);
    expect(result.totalCostPct).toBeCloseTo(0.46, 12);
  });

  it('rebases continuous folds without restarting state or losing a boundary factor', () => {
    const full = [0.99, 1.1, 0.8, 1.2];
    const first = continuousFoldCurve(full, 0, 2);
    const second = continuousFoldCurve(full, 2, 4);

    expect(first).toEqual([1, 0.99, 1.1]);
    expect(second).toEqual([1, 0.8 / 1.1, 1.2 / 1.1]);
    expect(first.at(-1)! * second.at(-1)!).toBeCloseTo(1.2, 12);
  });

  it('combines independent sleeves at fixed 50/50 weights', () => {
    expect(combineFixedSleeves([1, 2, 1], [1, 1, 3])).toEqual([1, 1.5, 2]);
    expect(() => combineFixedSleeves([1], [1, 2])).toThrow('align');
  });

  it('proves prefix decisions and equity are invariant to future bars', () => {
    const candles = frozenFixture(1);
    const qa = checkPrefixInvariance(candles, 'BTCUSD');

    expect(qa.passed).toBe(true);
    expect(qa.checkpoints).toHaveLength(4);
    expect(qa.checkpoints.every((checkpoint) => checkpoint.passed)).toBe(true);
  });

  it('fails cadence validation on a missing end bar or a gap over 48 hours', () => {
    const candles = candlesFromCloses([100, 101, 102, 103]);
    const startTs = candles[0].timestamp;
    const endTs = candles.at(-1)!.timestamp;

    expect(() => validateD1Series(candles.slice(0, -1), { startTs, endTs }))
      .toThrow('end boundary');

    const gapped = candles.map((candle) => ({ ...candle }));
    gapped[2].timestamp += 2 * DAY_MS;
    gapped[3].timestamp += 2 * DAY_MS;
    expect(() => validateD1Series(gapped, { startTs, endTs: gapped.at(-1)!.timestamp }))
      .toThrow('gap');
  });

  it('applies the preregistered PASS rule without fallback thresholds', () => {
    expect(decideD1SlowGateWalkForward({
      qaPassed: true,
      portfolioTotalReturn: 0.01,
      calmarFoldPasses: 3,
      frequencyPassed: true,
    }).verdict).toBe('PASS');

    for (const failing of [
      { qaPassed: false, portfolioTotalReturn: 0.01, calmarFoldPasses: 3, frequencyPassed: true },
      { qaPassed: true, portfolioTotalReturn: 0, calmarFoldPasses: 3, frequencyPassed: true },
      { qaPassed: true, portfolioTotalReturn: 0.01, calmarFoldPasses: 2, frequencyPassed: true },
      { qaPassed: true, portfolioTotalReturn: 0.01, calmarFoldPasses: 3, frequencyPassed: false },
    ]) {
      expect(decideD1SlowGateWalkForward(failing).verdict).toBe('KILL');
    }
  });

  it('assembles byte-stable evidence with four chronological folds', () => {
    const inputs = [
      { symbol: 'BTCUSD' as const, sourceSha256: 'a'.repeat(64), candles: frozenFixture(1) },
      { symbol: 'ETHUSD' as const, sourceSha256: 'b'.repeat(64), candles: frozenFixture(0.7) },
    ];

    const first = assembleD1SlowGateWalkForward(inputs);
    const second = assembleD1SlowGateWalkForward(inputs.map((input) => ({
      ...input,
      candles: input.candles.map((candle) => ({ ...candle })),
    })));

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.results.portfolio.folds).toHaveLength(4);
    expect(first.meta.preregistrationCommit).toBe('c8785b25');
    expect(first.decision.activationApproved).toBe(false);
  });
});
