import crypto from 'crypto';
import {
  buildExtremaExposure,
  chronologicalFolds,
  decideBitcoinMaxMin,
  simulateExtremaWindow,
  type CandidateGateMetrics,
  type ObservedDailyCandle,
  type StableStrategyMetrics,
} from '../bitcoin-max-min-assembly';
import {
  decodeBitcoinMaxMinInput,
  serializeBitcoinMaxMinArtifact,
} from '../bitcoin-max-min-replication';

const DAY_MS = 86_400_000;

function candles(closes: number[]): ObservedDailyCandle[] {
  return closes.map((close, index) => ({
    timestamp: Date.UTC(2020, 0, 1 + index),
    open: index === 0 ? close : closes[index - 1],
    high: Math.max(close, index === 0 ? close : closes[index - 1]),
    low: Math.min(close, index === 0 ? close : closes[index - 1]),
    close,
    volume: 1,
    observedHourlyBars: 24,
    missingHourUtc: null,
  }));
}

function metric(overrides: Partial<StableStrategyMetrics> = {}): StableStrategyMetrics {
  return {
    days: 100,
    exposureDays: 50,
    exposureFraction: 0.5,
    completedEpisodes: 60,
    delayedEntries: 0,
    observedGapDays: 0,
    compoundedReturn: 0.4,
    annualizedReturn: 0.2,
    annualizedVolatility: 0.2,
    sharpe: 1,
    maximumDrawdown: 0.2,
    calmar: 1,
    meanEpisodeReturn: 0.01,
    episodeReturnTStatistic: 2.5,
    episodeWinRate: 0.6,
    episodeProfitFactor: 1.5,
    breakEvenSideCostPct: 0.4,
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateGateMetrics> = {}): CandidateGateMetrics {
  return {
    full: metric(),
    holdout: metric({ completedEpisodes: 25, compoundedReturn: 0.1 }),
    folds: [metric(), metric(), metric(), metric({ compoundedReturn: -0.01 })],
    benchmarkFull: metric({ maximumDrawdown: 0.5, calmar: 0.4 }),
    ...overrides,
  };
}

describe('TC-258 Bitcoin MAX10/MIN10 assembly', () => {
  it('uses only prior closes and exact inclusive extrema for the published signal', () => {
    const source = candles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7]);
    const atMax = buildExtremaExposure(source, 10, 'at-max');
    const atMin = buildExtremaExposure(source, 10, 'at-min');
    const composite = buildExtremaExposure(source, 10, 'composite');

    expect(atMax.slice(0, 10)).toEqual(new Array(10).fill(false));
    expect(atMax[10]).toBe(true);
    expect(atMin[10]).toBe(false);
    expect(composite[10]).toBe(true);

    const changedFuture = source.map((candle) => ({ ...candle }));
    changedFuture[12].close = 1_000;
    expect(buildExtremaExposure(changedFuture, 10, 'composite').slice(0, 12)).toEqual(
      composite.slice(0, 12),
    );
  });

  it('charges one entry and one exit for adjacent event days', () => {
    const source = candles([110, 121, 121, 121]).map((candle, index) => ({
      ...candle,
      open: [100, 110, 121, 121][index],
      high: [110, 121, 121, 121][index],
      low: [100, 110, 121, 121][index],
    }));
    source[0].observedHourlyBars = 23;
    source[0].missingHourUtc = 0;
    const result = simulateExtremaWindow(
      source,
      [true, true, false, false],
      {
        label: 'fixture',
        startTs: source[0].timestamp,
        endExclusiveTs: source[0].timestamp + 4 * DAY_MS,
      },
      0.01,
    );

    expect(result.completedEpisodes).toBe(1);
    expect(result.exposureDays).toBe(2);
    expect(result.delayedEntries).toBe(1);
    expect(result.observedGapDays).toBe(1);
    expect(result.episodeReturns[0]).toBeCloseTo(1.21 * 0.99 ** 2 - 1, 12);
    expect(result.compoundedReturn).toBeCloseTo(result.episodeReturns[0], 12);
  });

  it('creates four contiguous folds that cover the complete window exactly once', () => {
    const start = Date.UTC(2020, 0, 1);
    const end = start + 101 * DAY_MS;
    const folds = chronologicalFolds(start, end);

    expect(folds).toHaveLength(4);
    expect(folds[0].startTs).toBe(start);
    expect(folds.at(-1)?.endExclusiveTs).toBe(end);
    for (let index = 1; index < folds.length; index += 1) {
      expect(folds[index].startTs).toBe(folds[index - 1].endExclusiveTs);
    }
  });

  it('keeps BTC replication, ETH confirmation, eligibility, and activation separate', () => {
    const passed = decideBitcoinMaxMin(true, candidate(), candidate());
    expect(passed).toMatchObject({
      verdict: 'PASS',
      btcReplicationPassed: true,
      crossAssetConfirmationPassed: true,
      eligibleForProspectiveReview: true,
      activationApproved: false,
      publicationApproved: false,
    });

    const ethFailed = decideBitcoinMaxMin(
      true,
      candidate(),
      candidate({ holdout: metric({ completedEpisodes: 25, compoundedReturn: -0.01 }) }),
    );
    expect(ethFailed).toMatchObject({
      verdict: 'PASS',
      btcReplicationPassed: true,
      crossAssetConfirmationPassed: false,
      eligibleForProspectiveReview: false,
    });

    const btcFailed = decideBitcoinMaxMin(
      true,
      candidate({ holdout: metric({ completedEpisodes: 25, compoundedReturn: -0.01 }) }),
      candidate(),
    );
    expect(btcFailed.verdict).toBe('FAIL');
    expect(decideBitcoinMaxMin(false, null, null).performanceGatesEvaluated).toBe(false);
  });

  it('verifies input bytes before parsing and serializes canonical trailing-LF JSON', () => {
    const payload = Buffer.from(JSON.stringify({ symbol: 'BTCUSD', candles: [] }), 'utf8');
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    expect(decodeBitcoinMaxMinInput(payload, 'BTCUSD', hash).sourceSha256).toBe(hash);
    expect(() => decodeBitcoinMaxMinInput(payload, 'BTCUSD', '0'.repeat(64))).toThrow(
      /source SHA-256 mismatch/i,
    );
    expect(serializeBitcoinMaxMinArtifact({ ok: true })).toBe('{\n  "ok": true\n}\n');
  });
});
