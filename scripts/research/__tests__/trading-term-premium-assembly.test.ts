import {
  assembleTradingTermPremiumReplication,
  buildTermPremiumOutcome,
  canonicalResearchSha256,
  canonicalizeResearchText,
  costPenalties,
  decideTradingTermPremiumReplication,
  equalChronologicalFolds,
  movingAverageFlags,
  parseTradingTermPremiumCsv,
  serializeTradingTermPremiumArtifact,
  summarizeReturnSeries,
  termCurveYieldPct,
  termZeroCouponPrice,
  type HeadlineGateSnapshot,
  type TermCurvePoint,
  type TradingTermPremiumDecisionInput,
} from '../trading-term-premium-assembly';

const HEADER = [
  'Date',
  'BETA0',
  'BETA1',
  'BETA2',
  'BETA3',
  'TAU1',
  'TAU2',
  ...Array.from({ length: 30 }, (_value, index) => `SVENY${String(index + 1).padStart(2, '0')}`),
].join(',');

function csvRow(
  date: string,
  parameters: readonly [number, number, number, number, number, number],
  supplied = Array.from({ length: 30 }, () => '4'),
): string {
  return [date, ...parameters.map(String), ...supplied].join(',');
}

function curvePoint(
  date: string,
  overrides: Partial<TermCurvePoint> = {},
): TermCurvePoint {
  return {
    date,
    model: 'nelson-siegel',
    beta0: 4,
    beta1: 0,
    beta2: 0,
    beta3: 0,
    tau1: 1,
    tau2: -999.99,
    suppliedYieldPct: Array.from({ length: 30 }, () => 4),
    ...overrides,
  };
}

function gateSnapshot(
  compoundedReturn: number,
  annualizedSharpe: number,
  maximumDrawdown: number,
): HeadlineGateSnapshot {
  return { compoundedReturn, annualizedSharpe, maximumDrawdown };
}

function gateWindow(
  canonical = gateSnapshot(0.1, 1, 0.1),
  alwaysTenYear = gateSnapshot(0.08, 0.8, 0.2),
  alwaysOneMonth = gateSnapshot(0.04, 0.2, 0.02),
) {
  return { canonical, alwaysTenYear, alwaysOneMonth };
}

function passingDecisionInput(): TradingTermPremiumDecisionInput {
  return {
    qaPassed: true,
    full: gateWindow(),
    paperFolds: [
      gateWindow(),
      gateWindow(),
      gateWindow(),
      gateWindow(
        gateSnapshot(0.01, 0.4, 0.2),
        gateSnapshot(0.02, 0.8, 0.2),
        gateSnapshot(0.03, 0.2, 0.02),
      ),
    ],
    holdout: gateWindow(
      gateSnapshot(0.03, 0.7, 0.08),
      gateSnapshot(0.02, 0.6, 0.12),
      gateSnapshot(0.01, 0.1, 0.01),
    ),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('TC-259 frozen source and curve math', () => {
  it('canonicalizes line endings before hashing', () => {
    expect(canonicalizeResearchText('a\r\nb\r')).toBe('a\nb\n');
    expect(canonicalResearchSha256('a\r\nb\r')).toBe(canonicalResearchSha256('a\nb\n'));
  });

  it('parses exact NS/NSS rows, preserves NA, and rejects sentinel drift', () => {
    const supplied = Array.from({ length: 30 }, (_value, index) => (
      index === 9 ? 'NA' : '4'
    ));
    const parsed = parseTradingTermPremiumCsv([
      HEADER,
      csvRow('1979-12-31', [4, 0, 0, 0, 1, -999.99], supplied),
      csvRow('1980-01-31', [4, 0, 0, 0.5, 1, 2]),
      '',
    ].join('\n'));

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ model: 'nelson-siegel', tau2: -999.99 });
    expect(parsed[0].suppliedYieldPct[9]).toBeNull();
    expect(parsed[1]).toMatchObject({ model: 'svensson', beta3: 0.5, tau2: 2 });
    expect(() => parseTradingTermPremiumCsv([
      HEADER,
      csvRow('1979-12-31', [4, 0, 0, 0.1, 1, -999.99]),
      '',
    ].join('\n'))).toThrow(/Nelson-Siegel sentinel/i);
    expect(() => parseTradingTermPremiumCsv([
      `${HEADER},EXTRA`,
      '',
    ].join('\n'))).toThrow(/header mismatch/i);
  });

  it('uses the NS formula before 1980 and the second NSS curvature term afterward', () => {
    const ns = curvePoint('1979-12-31');
    const nss = curvePoint('1980-01-31', {
      model: 'svensson',
      beta3: 1,
      tau2: 2,
    });
    expect(termCurveYieldPct(ns, 10)).toBeCloseTo(4, 14);
    expect(termZeroCouponPrice(ns, 10)).toBeCloseTo(Math.exp(-0.4), 14);
    expect(termCurveYieldPct(nss, 10)).toBeGreaterThan(4);
    expect(termZeroCouponPrice(nss, 10)).toBeGreaterThan(0);
    expect(() => termCurveYieldPct(ns, 0)).toThrow(/positive/i);
  });
});

describe('TC-259 causal signal and monthly return ledger', () => {
  it('classifies exact equality low and keeps every prefix invariant to future values', () => {
    const values = [...Array.from({ length: 40 }, () => 1), 2, -50, 100];
    const canonical = movingAverageFlags(values, 40, 'include-current');
    const priorOnly = movingAverageFlags(values, 40, 'prior-only');

    expect(canonical[39]).toBe(false);
    expect(canonical[40]).toBe(true);
    expect(priorOnly[39]).toBeNull();
    expect(priorOnly[40]).toBe(true);
    for (let index = 0; index < values.length; index += 1) {
      expect(movingAverageFlags(
        values.slice(0, index + 1),
        40,
        'include-current',
      )[index]).toBe(canonical[index]);
      expect(movingAverageFlags(
        values.slice(0, index + 1),
        40,
        'prior-only',
      )[index]).toBe(priorOnly[index]);
    }
  });

  it('charges the frozen sleeve-specific costs on every monthly reset', () => {
    const decision = curvePoint('2025-01-31');
    const next = curvePoint('2025-02-28');
    const outcome = buildTermPremiumOutcome(
      '2025-02',
      decision,
      next,
      true,
      false,
    );
    const headline = costPenalties(0.0005);
    const stress = costPenalties(0.00125);
    const flatMonthlyLog = 0.04 / 12;

    expect(outcome.grossLogTenYear).toBeCloseTo(flatMonthlyLog, 14);
    expect(outcome.grossLogOneMonth).toBeCloseTo(flatMonthlyLog, 14);
    expect(outcome.returns.canonical).toMatchObject({ sleeve: 'ten-year' });
    expect(outcome.returns.priorOnly).toMatchObject({ sleeve: 'one-month' });
    expect(outcome.returns.canonical.headlineNetLog).toBeCloseTo(
      flatMonthlyLog - headline.roundTrip,
      14,
    );
    expect(outcome.returns.priorOnly.headlineNetLog).toBeCloseTo(
      flatMonthlyLog - headline.entry,
      14,
    );
    expect(outcome.returns.alwaysTenYear.stressNetLog).toBeCloseTo(
      flatMonthlyLog - stress.roundTrip,
      14,
    );
    expect(outcome.returns.alwaysOneMonth.stressNetLog).toBeCloseTo(
      flatMonthlyLog - stress.entry,
      14,
    );
  });
});

describe('TC-259 metrics, folds, and frozen decision gates', () => {
  it('summarizes sequential log returns with sample risk and real drawdown', () => {
    const rows = [
      { month: '2026-01', value: 0.01 },
      { month: '2026-02', value: -0.02 },
      { month: '2026-03', value: 0.015 },
      { month: '2026-04', value: 0.005 },
    ];
    const metrics = summarizeReturnSeries(rows);
    expect(metrics.observations).toBe(4);
    expect(metrics.meanLogReturn).toBeCloseTo(0.0025, 14);
    expect(metrics.compoundedReturn).toBeCloseTo(Math.exp(0.01) - 1, 14);
    expect(metrics.positiveFraction).toBe(0.75);
    expect(metrics.maximumDrawdown).toBeGreaterThan(0);
    expect(summarizeReturnSeries(rows)).toEqual(metrics);
  });

  it('creates the four exact paper-window folds without carrying state', () => {
    const months: Array<{ month: string }> = [];
    let cursor = new Date(Date.UTC(1968, 0, 1));
    while (cursor <= new Date(Date.UTC(2021, 0, 1))) {
      months.push({ month: cursor.toISOString().slice(0, 7) });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    const folds = equalChronologicalFolds(months);
    expect(folds.map((fold) => [fold[0].month, fold.at(-1)!.month, fold.length])).toEqual([
      ['1968-01', '1981-03', 159],
      ['1981-04', '1994-06', 159],
      ['1994-07', '2007-09', 159],
      ['2007-10', '2021-01', 160],
    ]);
  });

  it('passes only when every full, stability, and holdout gate passes', () => {
    const decision = decideTradingTermPremiumReplication(passingDecisionInput());
    expect(decision).toMatchObject({
      verdict: 'PASS',
      performanceGatesEvaluated: true,
      passingPaperFoldCount: 3,
      failedPerformanceGates: [],
      eligibleForProspectiveReview: true,
      publicationApproved: false,
      activationApproved: false,
      allocationApproved: false,
      broadcastApproved: false,
      executionApproved: false,
    });
    expect(Object.values(decision.gates).every((value) => value === true)).toBe(true);
  });

  it.each([
    ['full positive', (input: TradingTermPremiumDecisionInput) => {
      input.full.canonical.compoundedReturn = 0;
    }],
    ['full one-month comparison', (input: TradingTermPremiumDecisionInput) => {
      input.full.alwaysOneMonth.compoundedReturn = 0.2;
    }],
    ['full Sharpe comparison', (input: TradingTermPremiumDecisionInput) => {
      input.full.alwaysTenYear.annualizedSharpe = 1.1;
    }],
    ['full drawdown comparison', (input: TradingTermPremiumDecisionInput) => {
      input.full.alwaysTenYear.maximumDrawdown = 0.1;
    }],
    ['paper stability', (input: TradingTermPremiumDecisionInput) => {
      input.paperFolds[2] = clone(input.paperFolds[3]);
    }],
    ['holdout positive', (input: TradingTermPremiumDecisionInput) => {
      input.holdout.canonical.compoundedReturn = 0;
    }],
    ['holdout one-month comparison', (input: TradingTermPremiumDecisionInput) => {
      input.holdout.alwaysOneMonth.compoundedReturn = 0.04;
    }],
    ['holdout Sharpe comparison', (input: TradingTermPremiumDecisionInput) => {
      input.holdout.alwaysTenYear.annualizedSharpe = 0.7;
    }],
    ['holdout drawdown comparison', (input: TradingTermPremiumDecisionInput) => {
      input.holdout.alwaysTenYear.maximumDrawdown = 0.08;
    }],
  ])('fails when the %s gate fails', (_label, mutate) => {
    const input = clone(passingDecisionInput());
    mutate(input);
    const decision = decideTradingTermPremiumReplication(input);
    expect(decision.verdict).toBe('FAIL');
    expect(decision.eligibleForProspectiveReview).toBe(false);
    expect(decision.failedPerformanceGates.length).toBeGreaterThan(0);
  });

  it('returns INCONCLUSIVE with null performance gates when standing QA fails', () => {
    const input = passingDecisionInput();
    input.qaPassed = false;
    const decision = decideTradingTermPremiumReplication(input);
    expect(decision).toMatchObject({
      verdict: 'INCONCLUSIVE',
      performanceGatesEvaluated: false,
      passingPaperFoldCount: 0,
      failedPerformanceGates: [],
      eligibleForProspectiveReview: false,
    });
    expect(decision.gates.qaPassed).toBe(false);
    expect(Object.entries(decision.gates)
      .filter(([name]) => name !== 'qaPassed')
      .every(([, value]) => value === null)).toBe(true);
  });
});

describe('TC-259 fail-closed evidence serialization', () => {
  it('returns a no-result INCONCLUSIVE artifact on frozen-hash failure', () => {
    const artifact = assembleTradingTermPremiumReplication({
      inputText: 'wrong\n',
      sourceAuditText: 'wrong\n',
      preregistrationText: 'wrong\n',
    });
    expect(artifact.qa.passed).toBe(false);
    expect(artifact.results).toBeNull();
    expect(artifact.observations).toBeNull();
    expect(artifact.decision).toMatchObject({
      verdict: 'INCONCLUSIVE',
      performanceGatesEvaluated: false,
    });
  });

  it('serializes identical evidence to identical trailing-LF bytes', () => {
    const value = { b: [1 / 3], a: 'evidence' };
    const first = serializeTradingTermPremiumArtifact(value);
    expect(first).toBe(serializeTradingTermPremiumArtifact(value));
    expect(first.endsWith('\n')).toBe(true);
    expect(first.endsWith('\n\n')).toBe(false);
  });
});
