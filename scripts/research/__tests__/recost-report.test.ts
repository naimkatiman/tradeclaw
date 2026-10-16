import {
  buildRecostJsonReport,
  formatRecostCostRealityLines,
  formatRecostVerdictLines,
  getClearingRecostCells,
  type RecostCellResult,
  type RecostCellStats,
  type RecostJsonReport,
} from '../recost-report';

describe('buildRecostJsonReport', () => {
  it('builds the stable JSON artifact envelope without requiring database access', () => {
    const all: RecostCellStats = {
      n: 2,
      winRatePct: 50,
      grossExpectancyR: 0.25,
      netExpectancyR: -0.15,
      avgCostR: 0.4,
      netReturnPct: -0.3,
      maxDrawdownPct: 0.45,
      conclusive: false,
    };
    const cells: RecostCellResult[] = [
      buildCell({ assetClass: 'crypto', band: 'all', n: 2, netExpectancyR: -0.15, conclusive: false }),
    ];

    const report = buildRecostJsonReport({ window: 30, minN: 100, all, cells });

    expect(Object.keys(report)).toEqual(['window', 'minN', 'all', 'cells']);
    expect(report).toEqual({ window: 30, minN: 100, all, cells });
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it.each([
    ['zero window', { window: 0 }, 'Invalid recost JSON report window: expected null or a positive safe integer, got 0.'],
    ['negative window', { window: -7 }, 'Invalid recost JSON report window: expected null or a positive safe integer, got -7.'],
    ['decimal window', { window: 7.5 }, 'Invalid recost JSON report window: expected null or a positive safe integer, got 7.5.'],
    ['infinite window', { window: Number.POSITIVE_INFINITY }, 'Invalid recost JSON report window: expected null or a positive safe integer, got Infinity.'],
    ['unsafe window', { window: Number.MAX_SAFE_INTEGER + 1 }, 'Invalid recost JSON report window: expected null or a positive safe integer, got 9007199254740992.'],
    ['zero minN', { minN: 0 }, 'Invalid recost JSON report minN: expected a positive safe integer, got 0.'],
    ['decimal minN', { minN: 10.5 }, 'Invalid recost JSON report minN: expected a positive safe integer, got 10.5.'],
    ['unsafe minN', { minN: Number.MAX_SAFE_INTEGER + 1 }, 'Invalid recost JSON report minN: expected a positive safe integer, got 9007199254740992.'],
  ])('rejects invalid JSON report envelope controls before artifact serialization: %s', (_label, overrides, expectedMessage) => {
    const validReport: RecostJsonReport = buildValidJsonReport();

    expect(() => buildRecostJsonReport({ ...validReport, ...overrides })).toThrow(expectedMessage);
  });

  it.each([
    [
      'non-object all stats',
      { all: null },
      'Invalid recost JSON report all: expected an object, got null.',
    ],
    [
      'unsafe all sample count',
      { all: { ...buildValidJsonReport().all, n: Number.MAX_SAFE_INTEGER + 1 } },
      'Invalid recost JSON report all.n: expected a non-negative safe integer, got 9007199254740992.',
    ],
    [
      'out-of-range all win rate',
      { all: { ...buildValidJsonReport().all, winRatePct: 101 } },
      'Invalid recost JSON report all.winRatePct: expected a finite percentage between 0 and 100, got 101.',
    ],
    [
      'negative all average cost',
      { all: { ...buildValidJsonReport().all, avgCostR: -0.01 } },
      'Invalid recost JSON report all.avgCostR: expected a finite non-negative number, got -0.01.',
    ],
    [
      'non-boolean all conclusive flag',
      { all: { ...buildValidJsonReport().all, conclusive: 'yes' } },
      'Invalid recost JSON report all.conclusive: expected a boolean, got yes.',
    ],
    [
      'non-array cells table',
      { cells: { assetClass: 'crypto' } },
      'Invalid recost JSON report cells: expected an array, got [object Object].',
    ],
    [
      'unknown cell asset class',
      { cells: [{ ...buildCell({ assetClass: 'crypto', band: 'all', n: 2, netExpectancyR: -0.15, conclusive: false }), assetClass: 'bonds' }] },
      'Invalid recost JSON report cell[0].assetClass: expected one of crypto, metals, fx, stocks/cmdty, got bonds.',
    ],
    [
      'unknown cell band',
      { cells: [{ ...buildCell({ assetClass: 'crypto', band: 'all', n: 2, netExpectancyR: -0.15, conclusive: false }), band: 'vip' }] },
      'Invalid recost JSON report cell[0].band: expected one of all, standard, premium, got vip.',
    ],
    [
      'negative cell drawdown',
      { cells: [{ ...buildCell({ assetClass: 'crypto', band: 'all', n: 2, netExpectancyR: -0.15, conclusive: false }), maxDrawdownPct: -0.01 }] },
      'Invalid recost JSON report cell[0].maxDrawdownPct: expected a finite non-negative number, got -0.01.',
    ],
    [
      'duplicate asset-class/band cell key',
      {
        cells: [
          buildCell({ assetClass: 'crypto', band: 'all', n: 2, netExpectancyR: -0.15, conclusive: false }),
          buildCell({ assetClass: 'crypto', band: 'all', n: 4, netExpectancyR: -0.25, conclusive: false }),
        ],
      },
      'Invalid recost JSON report cells: duplicate crypto/all cell at index 1.',
    ],
  ])('rejects malformed JSON report stats before artifact serialization: %s', (_label, overrides, expectedMessage) => {
    const validReport = buildValidJsonReport();

    expect(() => buildRecostJsonReport({ ...validReport, ...overrides } as unknown as RecostJsonReport)).toThrow(expectedMessage);
  });
});

describe('getClearingRecostCells', () => {
  it('returns only conclusive net-positive cells sorted by strongest edge', () => {
    const cryptoPremium = buildCell({ assetClass: 'crypto', band: 'premium', n: 120, netExpectancyR: 0.11, conclusive: true });
    const fxAll = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });
    const thinPositive = buildCell({ assetClass: 'metals', band: 'premium', n: 12, netExpectancyR: 0.5, conclusive: false });
    const conclusiveNegative = buildCell({ assetClass: 'stocks/cmdty', band: 'all', n: 140, netExpectancyR: -0.01, conclusive: true });

    expect(getClearingRecostCells([fxAll, thinPositive, conclusiveNegative, cryptoPremium])).toEqual([
      cryptoPremium,
      fxAll,
    ]);
  });

  it('returns an empty list when no representative cell clears real cost', () => {
    expect(
      getClearingRecostCells([
        buildCell({ assetClass: 'crypto', band: 'all', n: 99, netExpectancyR: 0.2, conclusive: false }),
        buildCell({ assetClass: 'metals', band: 'standard', n: 100, netExpectancyR: 0, conclusive: true }),
        buildCell({ assetClass: 'fx', band: 'premium', n: 100, netExpectancyR: -0.02, conclusive: true }),
      ]),
    ).toEqual([]);
  });

  it('does not report non-finite net expectancy as clearing real cost', () => {
    const impossibleEdge = buildCell({
      assetClass: 'crypto',
      band: 'premium',
      n: 250,
      netExpectancyR: Number.POSITIVE_INFINITY,
      conclusive: true,
    });
    const measuredEdge = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });

    expect(getClearingRecostCells([impossibleEdge, measuredEdge])).toEqual([measuredEdge]);
  });

  it('does not report malformed conclusive cells as clearing real cost', () => {
    const impossibleSample = buildCell({ assetClass: 'crypto', band: 'premium', n: Number.POSITIVE_INFINITY, netExpectancyR: 0.5, conclusive: true });
    const negativeSample = buildCell({ assetClass: 'metals', band: 'standard', n: -5, netExpectancyR: 0.4, conclusive: true });
    const badWinRate = { ...buildCell({ assetClass: 'stocks/cmdty', band: 'all', n: 150, netExpectancyR: 0.3, conclusive: true }), winRatePct: Number.NaN };
    const negativeCost = { ...buildCell({ assetClass: 'crypto', band: 'all', n: 160, netExpectancyR: 0.2, conclusive: true }), avgCostR: -0.01 };
    const measuredEdge = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });

    expect(getClearingRecostCells([impossibleSample, negativeSample, badWinRate, negativeCost, measuredEdge])).toEqual([measuredEdge]);
  });
});

describe('formatRecostCostRealityLines', () => {
  it('labels the 0.02% comparator as a legacy flat-cost baseline, not the current public curve', () => {
    const all: RecostCellStats = {
      n: 250,
      winRatePct: 50,
      grossExpectancyR: 0.25,
      netExpectancyR: -0.15,
      avgCostR: 0.4,
      netReturnPct: -0.3,
      maxDrawdownPct: 0.45,
      conclusive: true,
    };

    expect(formatRecostCostRealityLines(all)).toEqual([
      'Cost reality check (ALL symbols, ALL band):',
      '  legacy flat-cost baseline : 0.0200 R/trade  (0.02% equity; pre-real-cost curve baseline)',
      '  REAL avg cost             : 0.4000 R/trade  (20.0x the legacy flat baseline)',
      '  gross expectancy          : 0.2500 R/trade',
      '  NET expectancy            : -0.1500 R/trade  negative',
      '  net return / maxDD        : -0.3% / -0.45%',
    ]);
  });

  it.each([
    ['zero legacy cost comparator', { legacyFlatCostPct: 0 }, 'legacyFlatCostPct', '0'],
    ['negative legacy cost comparator', { legacyFlatCostPct: -0.01 }, 'legacyFlatCostPct', '-0.01'],
    ['infinite legacy cost comparator', { legacyFlatCostPct: Number.POSITIVE_INFINITY }, 'legacyFlatCostPct', 'Infinity'],
    ['zero risk-per-trade comparator', { riskPerTradePct: 0 }, 'riskPerTradePct', '0'],
    ['negative risk-per-trade comparator', { riskPerTradePct: -1 }, 'riskPerTradePct', '-1'],
    ['NaN risk-per-trade comparator', { riskPerTradePct: Number.NaN }, 'riskPerTradePct', 'NaN'],
  ])('rejects invalid cost reality option before formatting: %s', (_label, options, optionName, renderedValue) => {
    const all: RecostCellStats = {
      n: 250,
      winRatePct: 50,
      grossExpectancyR: 0.25,
      netExpectancyR: -0.15,
      avgCostR: 0.4,
      netReturnPct: -0.3,
      maxDrawdownPct: 0.45,
      conclusive: true,
    };

    expect(() => formatRecostCostRealityLines(all, options)).toThrow(
      `Invalid recost cost reality ${optionName}: expected a positive finite number, got ${renderedValue}.`,
    );
  });
});

describe('formatRecostVerdictLines', () => {
  it('formats sorted clearing-cell winner lines for the operator verdict', () => {
    const cryptoPremium = buildCell({ assetClass: 'crypto', band: 'premium', n: 120, netExpectancyR: 0.11, conclusive: true });
    const fxAll = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });
    const thinPositive = buildCell({ assetClass: 'metals', band: 'premium', n: 12, netExpectancyR: 0.5, conclusive: false });

    expect(formatRecostVerdictLines([fxAll, thinPositive, cryptoPremium], 100)).toEqual([
      'Subsets that CLEAR their real cost (net-positive, n >= 100):',
      '  crypto/premium: net 0.1100 R/trade, n=120, win 50%, netRet -0.3%',
      '  fx/all: net 0.0400 R/trade, n=250, win 50%, netRet -0.3%',
    ]);
  });

  it('orders equal-edge clearing cells by larger sample size before smaller sample size', () => {
    const smallerSample = buildCell({ assetClass: 'crypto', band: 'premium', n: 120, netExpectancyR: 0.04, conclusive: true });
    const largerSample = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });

    expect(formatRecostVerdictLines([smallerSample, largerSample], 100)).toEqual([
      'Subsets that CLEAR their real cost (net-positive, n >= 100):',
      '  fx/all: net 0.0400 R/trade, n=250, win 50%, netRet -0.3%',
      '  crypto/premium: net 0.0400 R/trade, n=120, win 50%, netRet -0.3%',
    ]);
  });

  it('does not format conclusive cells below the requested minimum sample threshold', () => {
    const staleConclusiveFlag = buildCell({ assetClass: 'crypto', band: 'premium', n: 80, netExpectancyR: 0.5, conclusive: true });
    const representativeEdge = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });

    expect(formatRecostVerdictLines([staleConclusiveFlag, representativeEdge], 100)).toEqual([
      'Subsets that CLEAR their real cost (net-positive, n >= 100):',
      '  fx/all: net 0.0400 R/trade, n=250, win 50%, netRet -0.3%',
    ]);
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['decimal', 1.5],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_SAFE_INTEGER + 1],
  ])('rejects %s verdict minimum sample thresholds before formatting winners', (_label, minN) => {
    const representativeEdge = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });

    expect(() => formatRecostVerdictLines([representativeEdge], minN)).toThrow(
      `Invalid recost verdict minN: expected a positive safe integer, got ${String(minN)}.`,
    );
  });

  it('does not reorder the caller-owned cell table while formatting winners', () => {
    const fxAll = buildCell({ assetClass: 'fx', band: 'all', n: 250, netExpectancyR: 0.04, conclusive: true });
    const cryptoPremium = buildCell({ assetClass: 'crypto', band: 'premium', n: 120, netExpectancyR: 0.11, conclusive: true });
    const thinPositive = buildCell({ assetClass: 'metals', band: 'premium', n: 12, netExpectancyR: 0.5, conclusive: false });
    const cells = [fxAll, thinPositive, cryptoPremium];

    formatRecostVerdictLines(cells, 100);

    expect(cells).toEqual([fxAll, thinPositive, cryptoPremium]);
  });

  it('formats the no-survivor verdict guidance for thin or net-negative cells', () => {
    expect(
      formatRecostVerdictLines([
        buildCell({ assetClass: 'crypto', band: 'all', n: 99, netExpectancyR: 0.2, conclusive: false }),
        buildCell({ assetClass: 'fx', band: 'premium', n: 120, netExpectancyR: -0.02, conclusive: true }),
      ], 100),
    ).toEqual([
      'No asset-class x band cell clears its own cost at n >= 100.',
      'Selectivity does not rescue net edge at real cost — escalate to a different edge source.',
    ]);
  });
});

function buildValidJsonReport(): RecostJsonReport {
  const all: RecostCellStats = {
    n: 2,
    winRatePct: 50,
    grossExpectancyR: 0.25,
    netExpectancyR: -0.15,
    avgCostR: 0.4,
    netReturnPct: -0.3,
    maxDrawdownPct: 0.45,
    conclusive: false,
  };
  const cells: RecostCellResult[] = [
    buildCell({ assetClass: 'crypto', band: 'all', n: 2, netExpectancyR: -0.15, conclusive: false }),
  ];

  return { window: 30, minN: 100, all, cells };
}

function buildCell(overrides: Pick<RecostCellResult, 'assetClass' | 'band' | 'n' | 'netExpectancyR' | 'conclusive'>): RecostCellResult {
  return {
    assetClass: overrides.assetClass,
    band: overrides.band,
    n: overrides.n,
    winRatePct: 50,
    grossExpectancyR: 0.25,
    netExpectancyR: overrides.netExpectancyR,
    avgCostR: 0.4,
    netReturnPct: -0.3,
    maxDrawdownPct: 0.45,
    conclusive: overrides.conclusive,
  };
}
