import crypto from 'crypto';
import type { OHLCV } from '@tradeclaw/core';
import { CRYPTO_PERP_COSTS } from '@tradeclaw/strategies';
import {
  checkMacdPrefixInvariance,
  decideExternalReplication,
  emaSeries,
  lastFullyClosedD1Index,
  macdSeries,
  simulateEntrySchedule,
  validateAlignedSeries,
  type EvaluationWindow,
  type PerformanceMetrics,
  type PortfolioMetrics,
} from '../external-multi-timeframe-assembly';
import {
  decodeFrozenSeries,
  serializeExternalReplicationArtifact,
} from '../external-multi-timeframe-replication';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function candle(
  timestamp: number,
  open: number,
  close = open,
): OHLCV {
  return {
    timestamp,
    open,
    high: Math.max(open, close) * 1.01,
    low: Math.min(open, close) * 0.99,
    close,
    volume: 10,
  };
}

function window(startTs: number, bars: number): EvaluationWindow {
  return { label: 'fixture', startTs, endExclusiveTs: startTs + bars * HOUR_MS };
}

describe('external multi-timeframe replication assembly', () => {
  it('uses the frozen SMA seed for EMA and MACD', () => {
    expect(emaSeries([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);

    const macd = macdSeries([1, 2, 3, 4, 5, 6], 2, 3, 2);
    expect(macd.line.slice(0, 3)).toEqual([null, null, 0.5]);
    expect(macd.signal.slice(0, 3)).toEqual([null, null, null]);
    expect(macd.signal[3]).toBeCloseTo(0.5, 12);
  });

  it('admits only a D1 candle that had fully closed by the H1 signal close', () => {
    const start = Date.UTC(2026, 0, 1);
    const d1 = [0, 1, 2].map((offset) => candle(start + offset * DAY_MS, 100 + offset));

    expect(lastFullyClosedD1Index(d1, start + DAY_MS - 1)).toBe(-1);
    expect(lastFullyClosedD1Index(d1, start + DAY_MS)).toBe(0);
    expect(lastFullyClosedD1Index(d1, start + 2 * DAY_MS + 12 * HOUR_MS)).toBe(1);
  });

  it('records integer source gaps but rejects off-cadence and malformed bars', () => {
    const start = Date.UTC(2026, 0, 1);
    const alignedGap = [
      candle(start, 100),
      candle(start + HOUR_MS, 101),
      candle(start + 4 * HOUR_MS, 102),
    ];
    expect(validateAlignedSeries(alignedGap, 'H1')).toMatchObject({
      gapCount: 1,
      largestGapBars: 3,
      passed: true,
    });

    const offCadence = alignedGap.map((item) => ({ ...item }));
    offCadence[2].timestamp += 1;
    expect(() => validateAlignedSeries(offCadence, 'H1')).toThrow('aligned');

    const malformed = alignedGap.map((item) => ({ ...item }));
    malformed[1].high = malformed[1].low - 1;
    expect(() => validateAlignedSeries(malformed, 'H1')).toThrow('OHLC');
  });

  it('fills at the scheduled bar open and charges both sides plus hourly funding', () => {
    const start = Date.UTC(2026, 0, 1);
    const h1 = [
      candle(start, 100, 100),
      candle(start + HOUR_MS, 100, 110),
      candle(start + 2 * HOUR_MS, 110, 110),
    ];
    const schedule = [false, true, false];
    const result = simulateEntrySchedule(
      h1,
      schedule,
      'h1-macd-one-bar',
      window(start, h1.length),
    );
    const expected = 1.1 * (1 - 0.002) ** 2 * (1 - 0.0001 / 8) - 1;

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      entryAt: new Date(start + HOUR_MS).toISOString(),
      entryPrice: 100,
      exitPrice: 110,
      heldHours: 1,
      exitReason: 'one-bar',
    });
    expect(result.trades[0].grossReturn).toBeCloseTo(0.1, 12);
    expect(result.trades[0].netReturn).toBeCloseTo(expected, 12);
    expect(result.points.at(-1)!.net).toBeCloseTo(1 + expected, 12);
  });

  it('exits the pure H1 control at the open after a bearish MACD crossover', () => {
    const start = Date.UTC(2026, 0, 1);
    const h1 = [
      candle(start, 100, 102),
      candle(start + HOUR_MS, 103, 104),
      candle(start + 2 * HOUR_MS, 101, 99),
    ];
    const result = simulateEntrySchedule(
      h1,
      [true, false, false],
      'h1-macd-cross-exit',
      window(start, h1.length),
      CRYPTO_PERP_COSTS,
      [false, false, true],
    );

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      entryAt: new Date(start).toISOString(),
      exitAt: new Date(start + 2 * HOUR_MS).toISOString(),
      entryPrice: 100,
      exitPrice: 101,
      heldHours: 2,
      exitReason: 'macd-cross',
    });
    expect(result.trades[0].grossReturn).toBeCloseTo(0.01, 12);
    expect(result.points.at(-1)!.gross).toBeCloseTo(1.01, 12);
  });

  it('requires an explicit bearish-crossover schedule for the pure H1 control', () => {
    const start = Date.UTC(2026, 0, 1);
    const h1 = [candle(start, 100, 101)];
    expect(() => simulateEntrySchedule(
      h1,
      [true],
      'h1-macd-cross-exit',
      window(start, 1),
    )).toThrow('bearish-crossover');
  });

  it('holds the final configuration through positive bars and ignores overlapping entries', () => {
    const start = Date.UTC(2026, 0, 1);
    const h1 = [
      candle(start, 100, 102),
      candle(start + HOUR_MS, 101, 103),
      candle(start + 2 * HOUR_MS, 104, 100),
      candle(start + 3 * HOUR_MS, 100, 105),
    ];
    const result = simulateEntrySchedule(
      h1,
      [true, true, false, false],
      'd1h1-macd-negative-bar-exit',
      window(start, h1.length),
    );

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({ heldHours: 3, exitPrice: 100, exitReason: 'negative-bar' });
    expect(result.trades[0].grossReturn).toBeCloseTo(0, 12);
  });

  it('force-closes a positive trailing position at the evaluation boundary', () => {
    const start = Date.UTC(2026, 0, 1);
    const h1 = [candle(start, 100, 101), candle(start + HOUR_MS, 101, 102)];
    const result = simulateEntrySchedule(
      h1,
      [true, false],
      'd1h1-macd-negative-bar-exit',
      window(start, h1.length),
    );
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].exitReason).toBe('window-end');
    expect(result.trades[0].heldHours).toBe(2);
  });

  it('proves MACD prefixes do not change when future candles are appended', () => {
    const start = Date.UTC(2020, 0, 1);
    const d1 = Array.from({ length: 220 }, (_value, index) => (
      candle(start + index * DAY_MS, 100 + index * 0.2, 100 + index * 0.2 + Math.sin(index / 5))
    ));
    const h1 = Array.from({ length: 220 * 24 }, (_value, index) => (
      candle(start + index * HOUR_MS, 100 + index * 0.01, 100 + index * 0.01 + Math.sin(index / 7))
    ));
    const evidence = checkMacdPrefixInvariance(h1, d1);

    expect(evidence.passed).toBe(true);
    expect(evidence.checkpoints).toHaveLength(4);
  });

  it('applies every preregistered decision condition fail closed', () => {
    function performance(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
      return {
        bars: 1000,
        performanceDays: 365,
        completedTrades: 120,
        heldHours: 240,
        exposureFraction: 0.02,
        grossCompoundedReturn: 0.4,
        netCompoundedReturn: 0.2,
        meanGrossTradeReturn: 0.004,
        meanNetTradeReturn: 0.002,
        netWinRate: 0.55,
        netProfitFactor: 1.3,
        netTradeTStatistic: 2.1,
        annualizedVolatility: 0.2,
        sharpe: 1,
        maximumDrawdown: 0.2,
        cagr: 0.2,
        calmar: 1,
        costs: {
          roundTripFeeSlippagePctSum: 48,
          fundingPctSum: 0.3,
          compoundedReturnDrag: 0.2,
        },
        ...overrides,
      };
    }
    function portfolio(overrides: Partial<PortfolioMetrics> = {}): PortfolioMetrics {
      return {
        performanceDays: 365,
        grossCompoundedReturn: 0.3,
        netCompoundedReturn: 0.15,
        annualizedVolatility: 0.15,
        sharpe: 1,
        maximumDrawdown: 0.15,
        cagr: 0.15,
        calmar: 1,
        ...overrides,
      };
    }
    const passing = decideExternalReplication({
      btc: {
        full: performance(),
        holdout: performance({ completedTrades: 25 }),
        folds: [performance(), performance(), performance(), performance({ netCompoundedReturn: -0.01 })],
        spot: performance({ maximumDrawdown: 0.5, calmar: 0.5 }),
      },
      eth: {
        full: performance(),
        folds: [performance(), performance(), performance(), performance({ netCompoundedReturn: -0.01 })],
      },
      portfolio: {
        full: portfolio(),
        holdout: portfolio(),
        spot: portfolio({ maximumDrawdown: 0.5, calmar: 0.5 }),
      },
      qaPassed: true,
    });
    expect(passing.btcReplication.verdict).toBe('PASS');
    expect(passing.portfolioCandidate.verdict).toBe('PASS');
    expect(passing.activationApproved).toBe(false);

    const failing = decideExternalReplication({
      btc: {
        full: performance({ netTradeTStatistic: 1.95 }),
        holdout: performance({ completedTrades: 19 }),
        folds: [performance(), performance(), performance(), performance()],
        spot: performance({ maximumDrawdown: 0.5, calmar: 0.5 }),
      },
      eth: { full: performance(), folds: [performance(), performance(), performance(), performance()] },
      portfolio: {
        full: portfolio(),
        holdout: portfolio(),
        spot: portfolio({ maximumDrawdown: 0.5, calmar: 0.5 }),
      },
      qaPassed: true,
    });
    expect(failing.btcReplication.verdict).toBe('FAIL');
    expect(failing.portfolioCandidate.verdict).toBe('FAIL');
  });

  it('verifies dump identity and serializes deterministic evidence', () => {
    const dump = Buffer.from(JSON.stringify({
      symbol: 'BTCUSD',
      timeframe: 'H1',
      source: 'binance',
      candles: [candle(Date.UTC(2026, 0, 1), 100)],
    }));
    const hash = crypto.createHash('sha256').update(dump).digest('hex');
    const decoded = decodeFrozenSeries(dump, 'BTCUSD', 'H1', hash);
    expect(decoded.sourceSha256).toBe(hash);
    expect(() => decodeFrozenSeries(dump, 'BTCUSD', 'H1', 'a'.repeat(64))).toThrow('mismatch');
    expect(serializeExternalReplicationArtifact({ b: 2, a: 1 }))
      .toBe('{\n  "b": 2,\n  "a": 1\n}\n');
  });

  it('uses the repository crypto-perpetual cost model unchanged', () => {
    expect(CRYPTO_PERP_COSTS).toEqual({
      feePctPerSide: 0.05,
      slippagePctPerSide: 0.15,
      fundingPctPer8h: 0.01,
    });
  });
});
