import {
  canonicalResearchSha256,
  canonicalizeResearchText,
  decideEndOfMonthTreasuryReplication,
  equalChronologicalFolds,
  parseNominalCurveCsv,
  parseRateCsv,
  simulateCurveTrade,
  summarizeSeries,
  svenssonZeroCouponYieldPct,
  zeroCouponDiscountPrice,
  type CurveLaneResult,
  type CurvePoint,
  type CurveTradeMetrics,
  type DecisionInputs,
  type DollarControlResult,
  type PairedLaneResult,
  type SeriesMetrics,
} from '../end-of-month-treasury-assembly';

const HEADER =
  'Date,BETA0,BETA1,BETA2,BETA3,TAU1,TAU2,SVENY01,SVENY05,SVENY10';

function point(date: string, overrides: Partial<CurvePoint> = {}): CurvePoint {
  return {
    date,
    beta0: 4,
    beta1: 0,
    beta2: 0,
    beta3: 0,
    tau1: 1,
    tau2: 2,
    suppliedYield1Pct: 4,
    suppliedYield5Pct: 4,
    suppliedYield10Pct: 4,
    ...overrides,
  };
}

function tradeMetrics(overrides: Partial<CurveTradeMetrics> = {}): CurveTradeMetrics {
  return {
    observations: 100,
    fromMonth: '1990-01',
    toMonth: '2026-07',
    meanCalendarDays: 3,
    meanPriceLogReturn: 0.002,
    meanHeadlineFinancingLog: 0.0002,
    meanStressFinancingLog: 0.0003,
    meanPreFrictionExcessLog: 0.0018,
    meanHeadlineNetLog: 0.0013,
    meanStressNetLog: 0.0007,
    preFrictionTStatistic: 3,
    headlineTStatistic: 2.5,
    stressTStatistic: 2,
    preFrictionAnnualizedSharpe: 1.2,
    headlineAnnualizedSharpe: 1,
    stressAnnualizedSharpe: 0.7,
    preFrictionCompoundedReturn: 0.2,
    headlineCompoundedReturn: 0.14,
    stressCompoundedReturn: 0.07,
    headlinePositiveFraction: 0.6,
    stressPositiveFraction: 0.55,
    headlineMaximumDrawdown: 0.1,
    stressMaximumDrawdown: 0.15,
    breakEvenRoundTripCostBps: 17.98,
    ...overrides,
  };
}

function curveLane(overrides: {
  full?: Partial<CurveTradeMetrics>;
  paper?: Partial<CurveTradeMetrics>;
  holdout?: Partial<CurveTradeMetrics>;
  foldMeans?: number[];
} = {}): CurveLaneResult {
  const foldMeans = overrides.foldMeans ?? [0.001, 0.001, 0.001, -0.0001];
  return {
    full: tradeMetrics(overrides.full),
    paperWindow: tradeMetrics(overrides.paper),
    holdout: tradeMetrics(overrides.holdout),
    folds: foldMeans.map((meanHeadlineNetLog, index) => ({
      fold: index + 1,
      fromMonth: `200${index}-01`,
      toMonth: `200${index}-12`,
      metrics: tradeMetrics({ meanHeadlineNetLog }),
    })),
  };
}

function seriesMetrics(overrides: Partial<SeriesMetrics> = {}): SeriesMetrics {
  return {
    observations: 100,
    fromMonth: '1990-01',
    toMonth: '2026-07',
    mean: 0.001,
    sampleStandardDeviation: 0.004,
    tStatistic: 2.5,
    annualizedSharpe: 0.86,
    compoundedReturn: 0.1,
    positiveFraction: 0.6,
    maximumDrawdown: 0.08,
    ...overrides,
  };
}

function pairedLane(overrides: {
  full?: Partial<SeriesMetrics>;
  paper?: Partial<SeriesMetrics>;
  holdout?: Partial<SeriesMetrics>;
} = {}): PairedLaneResult {
  return {
    full: seriesMetrics(overrides.full),
    paperWindow: seriesMetrics(overrides.paper),
    holdout: seriesMetrics(overrides.holdout),
    folds: [1, 2, 3, 4].map((fold) => ({
      fold,
      fromMonth: `200${fold - 1}-01`,
      toMonth: `200${fold - 1}-12`,
      metrics: seriesMetrics(),
    })),
  };
}

function dollarControl(overrides: {
  active?: Partial<SeriesMetrics>;
  foldMeans?: number[];
} = {}): DollarControlResult {
  const foldMeans = overrides.foldMeans ?? [-0.001, 0.0001, -0.0002, 0.0001];
  return {
    observations: 243,
    firstWindow: seriesMetrics(),
    monthEndWindow: seriesMetrics(),
    pairedActive: seriesMetrics({ mean: -0.0001, tStatistic: -0.2, ...overrides.active }),
    holdoutPairedActive: seriesMetrics({ mean: -0.0001 }),
    folds: foldMeans.map((mean, index) => ({
      fold: index + 1,
      fromMonth: `201${index}-01`,
      toMonth: `201${index}-12`,
      metrics: seriesMetrics({ mean }),
    })),
  };
}

function passingDecisionInput(): DecisionInputs {
  return {
    qaPassed: true,
    fiveYear: curveLane({ paper: { meanPreFrictionExcessLog: 0.0018 } }),
    tenYear: curveLane({
      paper: { meanPreFrictionExcessLog: 0.0025 },
      holdout: { meanHeadlineNetLog: 0.001 },
    }),
    oneYear: curveLane({ paper: { meanPreFrictionExcessLog: 0.0005 } }),
    allOtherDays: curveLane({ paper: { headlineAnnualizedSharpe: 0.2 } }),
    pairedPrimaryMinusFirst: pairedLane(),
    dollarControl: dollarControl(),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('end-of-month Treasury source parsing and curve math', () => {
  it('canonicalizes line endings before hashing', () => {
    expect(canonicalizeResearchText('a\r\nb\r')).toBe('a\nb\n');
    expect(canonicalResearchSha256('a\r\nb\r')).toBe(canonicalResearchSha256('a\nb\n'));
  });

  it('parses exact nominal and rate schemas and rejects drift', () => {
    const nominal = parseNominalCurveCsv(`${HEADER}\n1990-01-02,4,0,0,0,1,2,4,4,4\n`);
    expect(nominal).toEqual([point('1990-01-02')]);
    expect(parseRateCsv('observation_date,DFF\n1990-01-01,8.00\n', 'DFF')).toEqual([
      { date: '1990-01-01', value: 8 },
    ]);
    expect(() => parseNominalCurveCsv(`${HEADER},EXTRA\n`)).toThrow(/header mismatch/i);
    expect(() => parseRateCsv('observation_date,DFF\n1990-01-01,NA\n', 'DFF')).toThrow(
      /finite/i,
    );
    expect(() => parseRateCsv(
      'observation_date,DFF\n1990-01-02,8\n1990-01-01,8\n',
      'DFF',
    )).toThrow(/strictly increasing/i);
  });

  it('implements the official continuously compounded discount function', () => {
    const flat = point('2026-01-01');
    expect(svenssonZeroCouponYieldPct(flat, 5)).toBeCloseTo(4, 14);
    expect(zeroCouponDiscountPrice(flat, 5)).toBeCloseTo(Math.exp(-0.04 * 5), 14);

    const shaped = point('2026-01-02', {
      beta0: 3,
      beta1: -1,
      beta2: 2,
      beta3: 0.5,
      tau1: 1.5,
      tau2: 7,
    });
    expect(svenssonZeroCouponYieldPct(shaped, 5)).toBeGreaterThan(2);
    expect(zeroCouponDiscountPrice(shaped, 5)).toBeGreaterThan(0);
    expect(zeroCouponDiscountPrice(shaped, 5)).toBeLessThan(1);
  });

  it('accrues every calendar financing day and applies exact frozen costs', () => {
    const financing = new Map([
      ['2026-01-02', 3.6],
      ['2026-01-03', 3.6],
      ['2026-01-04', 3.6],
    ]);
    const trade = simulateCurveTrade(
      '2026-01',
      point('2026-01-02'),
      point('2026-01-05'),
      5,
      financing,
    );
    expect(trade.calendarDays).toBe(3);
    expect(trade.exitMaturityYears).toBeCloseTo(5 - 3 / 365, 14);
    expect(trade.headlineFinancingLog).toBeCloseTo(3 * (0.036 / 360), 14);
    expect(trade.stressFinancingLog).toBeCloseTo(3 * (0.046 / 360), 14);
    expect(trade.headlineNetLog).toBeCloseTo(
      trade.preFrictionExcessLog + Math.log1p(-0.0005),
      14,
    );
    expect(trade.stressNetLog).toBeCloseTo(
      trade.priceLogReturn - trade.stressFinancingLog + Math.log1p(-0.001),
      14,
    );
  });
});

describe('end-of-month Treasury metrics and folds', () => {
  it('computes deterministic monthly metrics with a real drawdown', () => {
    const rows = [
      { month: '2026-01', value: 0.01 },
      { month: '2026-02', value: -0.02 },
      { month: '2026-03', value: 0.015 },
      { month: '2026-04', value: 0.005 },
    ];
    const metrics = summarizeSeries(rows);
    expect(metrics.observations).toBe(4);
    expect(metrics.mean).toBeCloseTo(0.0025, 14);
    expect(metrics.compoundedReturn).toBeCloseTo(Math.exp(0.01) - 1, 14);
    expect(metrics.positiveFraction).toBe(0.75);
    expect(metrics.maximumDrawdown).toBeGreaterThan(0);
    expect(summarizeSeries(rows)).toEqual(metrics);
  });

  it('splits chronological observations with the frozen floor boundaries', () => {
    const rows = Array.from({ length: 11 }, (_value, index) => ({
      month: `m${String(index + 1).padStart(2, '0')}`,
    }));
    expect(equalChronologicalFolds(rows).map((fold) => fold.map((row) => row.month))).toEqual([
      ['m01', 'm02'],
      ['m03', 'm04', 'm05'],
      ['m06', 'm07', 'm08'],
      ['m09', 'm10', 'm11'],
    ]);
  });
});

describe('end-of-month Treasury decision gates', () => {
  it('passes only a complete core result with a clean external control', () => {
    const decision = decideEndOfMonthTreasuryReplication(passingDecisionInput());
    expect(decision).toMatchObject({
      verdict: 'PASS',
      performanceGatesEvaluated: true,
      fiveYearPositiveFoldCount: 3,
      externalDollarFalsified: false,
      eligibleForProspectiveReview: true,
      activationApproved: false,
      publicationApproved: false,
      allocationApproved: false,
      executionApproved: false,
    });
    expect(decision.failedCoreGates).toEqual([]);
    expect(Object.values(decision.gates).every(Boolean)).toBe(true);
  });

  it.each([
    ['paper significance', (input: DecisionInputs) => { input.fiveYear.paperWindow.headlineTStatistic = 1; }],
    ['holdout', (input: DecisionInputs) => { input.fiveYear.holdout.meanHeadlineNetLog = -0.001; }],
    ['fold stability', (input: DecisionInputs) => {
      input.fiveYear.folds[2].metrics.meanHeadlineNetLog = -0.001;
    }],
    ['stress', (input: DecisionInputs) => { input.fiveYear.full.meanStressNetLog = -0.001; }],
    ['break-even cost', (input: DecisionInputs) => {
      input.fiveYear.holdout.breakEvenRoundTripCostBps = 5;
    }],
    ['all-other-days Sharpe', (input: DecisionInputs) => {
      input.allOtherDays.paperWindow.headlineAnnualizedSharpe = 1.1;
    }],
    ['calendar placebo', (input: DecisionInputs) => {
      input.pairedPrimaryMinusFirst.holdout.mean = -0.001;
    }],
    ['ten-year confirmation', (input: DecisionInputs) => {
      input.tenYear.holdout.meanHeadlineNetLog = -0.001;
    }],
    ['duration ordering', (input: DecisionInputs) => {
      input.oneYear.paperWindow.meanPreFrictionExcessLog = 0.002;
    }],
  ])('fails when the %s gate fails', (_label, mutate) => {
    const input = clone(passingDecisionInput());
    mutate(input);
    const decision = decideEndOfMonthTreasuryReplication(input);
    expect(decision.verdict).toBe('FAIL');
    expect(decision.eligibleForProspectiveReview).toBe(false);
    expect(decision.failedCoreGates.length).toBeGreaterThan(0);
  });

  it('returns INCONCLUSIVE rather than a performance verdict when QA fails', () => {
    const input = passingDecisionInput();
    input.qaPassed = false;
    expect(decideEndOfMonthTreasuryReplication(input)).toMatchObject({
      verdict: 'INCONCLUSIVE',
      performanceGatesEvaluated: false,
      eligibleForProspectiveReview: false,
      gates: { qaPassed: false },
      failedCoreGates: [],
    });
  });

  it('returns INCONCLUSIVE when the external calendar market falsifies specificity', () => {
    const input = passingDecisionInput();
    input.dollarControl = dollarControl({
      active: { mean: 0.001, tStatistic: 2 },
      foldMeans: [0.001, 0.001, 0.001, -0.001],
    });
    expect(decideEndOfMonthTreasuryReplication(input)).toMatchObject({
      verdict: 'INCONCLUSIVE',
      externalDollarFalsified: true,
      dollarPositiveFoldCount: 3,
      eligibleForProspectiveReview: false,
      gates: { externalDollarNotFalsified: false },
    });
  });
});
