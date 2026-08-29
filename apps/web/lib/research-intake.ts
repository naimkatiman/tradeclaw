import systematicResearchIntakeJson from '../data/systematic-research-intake.json';

export const SYSTEMATIC_INTAKE_COMMIT = 'd9c98521c76662d5eae03ab97a4fc721d010dde3';
export const SYSTEMATIC_INTAKE_README_SHA256 =
  '67f4c4963ce10ab5ebdc7a0b1eb578c179cf151e1ddaad990cd428a231b2b29a';
export const SYSTEMATIC_INTAKE_EXPECTED_CANDIDATES = 61;

export const RESEARCH_ASSET_CLASSES = [
  'Equities',
  'Bonds',
  'Commodities',
  'Currencies',
  'Cryptocurrencies',
  'Derivatives',
  'Multi-asset',
] as const;

export const RESEARCH_INTAKE_STAGES = [
  'discovered',
  'source-audited',
  'preregistered',
  'replicated',
  'prospective',
] as const;

export type ResearchAssetClass = (typeof RESEARCH_ASSET_CLASSES)[number];
export type ResearchIntakeStage = (typeof RESEARCH_INTAKE_STAGES)[number];
export type ResearchVerdict = 'not-tested' | 'pass' | 'fail' | 'inconclusive';
export type ResearchCostStatus = 'unassessed' | 'modeled-pass' | 'failed';
export type ResearchSourceAuditDisposition = 'advance' | 'hold' | 'no-go';

export interface SystematicIntakeSource {
  repository: string;
  commit: string;
  readmeSha256: string;
  snapshotDate: string;
  reportedPerformanceBasis: 'gross-of-trading-costs';
  tradeClawTreatment: 'discovery-only';
}

export interface SystematicDiscoveryCandidate {
  id: string;
  title: string;
  sourceUrl: string;
  assetClass: ResearchAssetClass;
  upstreamGrossSharpe: number;
  upstreamTStatistic: number;
  upstreamVolatilityPct: number;
  upstreamYearsTested: number;
}

export interface SystematicResearchIntakeSnapshot {
  schemaVersion: 1;
  source: SystematicIntakeSource;
  candidates: readonly SystematicDiscoveryCandidate[];
}

export interface TradeClawReplicationEvidence {
  taskId: 'TC-255';
  studyDate: '2026-08-29';
  preregistrationPath: string;
  preregistrationSha256: string;
  resultPath: string;
  artifactPath: string;
  artifactSha256: string;
  verdict: 'fail';
  eligibleForProspectiveReview: false;
  activationApproved: false;
  sourceAmbiguityRetained: true;
  gateInputsChangedByErratum: false;
  costs: {
    feePctPerSide: number;
    slippagePctPerSide: number;
    fundingPctPer8h: number;
  };
  btc: {
    grossCompoundedReturn: number;
    netCompoundedReturn: number;
    completedTrades: number;
    meanGrossTradeReturn: number;
    meanNetTradeReturn: number;
    netTradeTStatistic: number;
    positiveFolds: number;
    totalFolds: number;
    holdoutNetCompoundedReturn: number;
    breakEvenFeePlusSlippagePctPerSide: number;
  };
  eth: {
    grossCompoundedReturn: number;
    netCompoundedReturn: number;
    completedTrades: number;
    meanNetTradeReturn: number;
    netTradeTStatistic: number;
    positiveFolds: number;
    totalFolds: number;
    holdoutNetCompoundedReturn: number;
  };
  portfolio: {
    grossCompoundedReturn: number;
    netCompoundedReturn: number;
    holdoutNetCompoundedReturn: number;
    maximumDrawdown: number;
    calmar: number;
  };
}

export interface TradeClawTreasuryReplicationEvidence {
  taskId: 'TC-257';
  studyDate: '2026-08-29';
  preregistrationPath: string;
  preregistrationSha256: string;
  sourceAuditPath: string;
  sourceAuditSha256: string;
  resultPath: string;
  resultSha256: string;
  artifactPath: string;
  artifactSha256: string;
  verdict: 'inconclusive';
  evidenceBasis: 'modeled-current-vintage-independent-replication';
  performanceGatesEvaluated: false;
  eligibleForProspectiveReview: false;
  activationApproved: false;
  publicationApproved: false;
  costsFrozenButNotEvaluated: {
    headlineRoundTripBps: 5;
    stressRoundTripBps: 10;
    stressFinancingSpreadBpsAnnual: 100;
    financingProxy: 'DFF';
  };
  qa: {
    nominalRows: 9151;
    financingRows: 13392;
    evaluationMonths: 439;
    holdoutMonths: 91;
    suppliedYieldChecks: 27453;
    suppliedYieldChecksAboveTolerance: 1;
    frozenTolerancePct: 0.0001;
    maximumErrorPct: number;
    maximumErrorDate: '2013-10-16';
    maximumErrorMaturityYears: 5;
    standingQaPassed: false;
  };
  reason: string;
}

export type TradeClawResearchEvidence =
  | TradeClawReplicationEvidence
  | TradeClawTreasuryReplicationEvidence;

export interface TradeClawSourceAuditEvidence {
  taskId: 'TC-256';
  auditDate: '2026-08-29';
  researchPath: string;
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: string;
    authors: readonly string[];
    repositoryUrl: string;
    documentUrl: string;
    doi: string;
    documentSha256: string;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'daily';
    eventWindowDays: 30;
    thresholdStandardDeviations: 1;
    entry: 'next-day-open';
    exit: 'same-day-close';
    variants: readonly ['contrarian', 'continuation'];
    bitcoinSample: '2015-01-01/2017-12-31';
    bitcoinTrades: 155;
  };
  publishedResult: {
    contrarianProfitUsd: number;
    contrarianTradeTStatistic: number;
    continuationProfitUsd: number;
    continuationTradeTStatistic: number;
    oneSidedCriticalTStatistic: number;
    conclusion: 'no-exploitable-profit';
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawTreasurySourceAuditEvidence {
  taskId: 'TC-257';
  auditDate: '2026-08-29';
  researchPath: string;
  researchSha256: string;
  disposition: 'advance';
  tradeClawBacktestRunAtAuditClose: false;
  primarySource: {
    title: 'Predictable End-of-Month Treasury Returns';
    authors: readonly ['Jonathan Hartley', 'Krista Schwarz'];
    institutionalDocumentUrl: string;
    ssrnUrl: string;
    documentSha256: string;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'monthly';
    finalTradingIntervals: 2;
    primaryMaturityYears: 5;
    entry: 'third-to-last-curve-close';
    exit: 'final-curve-close';
    financing: 'general-collateral-repo';
    paperSample: '1990-01/2018-12';
    expectedRoundTripsPerYear: 12;
  };
  publishedResult: {
    fiveYearMeanMonthlyExcessReturnPct: 0.13;
    fiveYearAnnualizedSharpe: 1.07;
    fiveYearPositiveMonthsPct: 63;
    typicalBidAskSpreadBps: readonly [2, 3];
  };
  limits: readonly string[];
  reason: string;
}

export type TradeClawResearchSourceAuditEvidence =
  | TradeClawSourceAuditEvidence
  | TradeClawTreasurySourceAuditEvidence;

export interface ResearchIntakeRecord extends SystematicDiscoveryCandidate {
  sourcePosition: number;
  discoveryBasis: 'upstream-gross-metadata';
  stage: ResearchIntakeStage;
  verdict: ResearchVerdict;
  costStatus: ResearchCostStatus;
  nextAction: string;
  marketingDisposition: 'none' | 'human-review-draft-only';
  tradeClawSourceAudit: TradeClawResearchSourceAuditEvidence | null;
  tradeClawEvidence: TradeClawResearchEvidence | null;
}

export interface ResearchIntakeFilters {
  query?: string;
  assetClass?: ResearchAssetClass | 'all';
  stage?: ResearchIntakeStage | 'all';
  verdict?: ResearchVerdict | 'all';
  sourceAuditDisposition?: ResearchSourceAuditDisposition | 'all';
}

export interface ResearchIntakeSummary {
  total: number;
  discovered: number;
  sourceAudited: number;
  preregistered: number;
  replicated: number;
  prospective: number;
  passed: number;
  failed: number;
  inconclusive: number;
  untested: number;
  sourceNoGo: number;
  byAssetClass: Record<ResearchAssetClass, number>;
}

export const RESEARCH_INTAKE_SELECTION_POLICY =
  'Source order is preserved. Upstream Sharpe, t-statistic, volatility, and years are gross discovery metadata and are never TradeClaw evidence, a default sort, or a promotion score.';

export const RESEARCH_INTAKE_WORKFLOW = [
  {
    stage: 'discovered',
    exitGate:
      'A pinned source record exists. No performance, feasibility, or evidence claim is permitted.',
  },
  {
    stage: 'source-audited',
    exitGate:
      'The primary paper or article, exact public rule, ambiguities, data rights, required history, and expected turnover are recorded.',
  },
  {
    stage: 'preregistered',
    exitGate:
      'Rule, fills, costs, datasets and hashes, benchmarks, folds, holdout, falsification market, metrics, and pass gates are frozen before result access.',
  },
  {
    stage: 'replicated',
    exitGate:
      'A deterministic artifact, replay, focused tests, full research tests, limitations, and PASS/FAIL/INCONCLUSIVE verdict are retained.',
  },
  {
    stage: 'prospective',
    exitGate:
      'Only a separately eligible result may enter an immutable prospective ledger. Promotion and activation remain separate owner actions.',
  },
] as const satisfies readonly { stage: ResearchIntakeStage; exitGate: string }[];

const MULTI_TIMEFRAME_BITCOIN_ID =
  'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin';
const PRICE_OVERREACTIONS_ID = 'price-overreactions-in-the-cryptocurrency-market';
const END_OF_MONTH_TREASURY_ID = 'predictable-end-of-month-treasury-returns';

const TC256_PRICE_OVERREACTIONS_SOURCE_AUDIT: TradeClawSourceAuditEvidence = {
  taskId: 'TC-256',
  auditDate: '2026-08-29',
  researchPath: 'docs/research/2026-08-29-price-overreactions-source-audit.md',
  researchSha256: '6acbcd4a9aacfb1479f94af35fd1ebd50530c696678793383ffdca373dd64839',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title: 'Price overreactions in the cryptocurrency market',
    authors: ['Guglielmo Maria Caporale', 'Alex Plastun'],
    repositoryUrl: 'https://bura.brunel.ac.uk/handle/2438/17194',
    documentUrl: 'https://bura.brunel.ac.uk/bitstream/2438/17194/3/FullText.pdf',
    doi: 'https://doi.org/10.1108/JES-09-2018-0310',
    documentSha256: 'b979248a3d5d1abe47876a43fae2575b61ade80c8d3508a5077985d23e2168ee',
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'daily',
    eventWindowDays: 30,
    thresholdStandardDeviations: 1,
    entry: 'next-day-open',
    exit: 'same-day-close',
    variants: ['contrarian', 'continuation'],
    bitcoinSample: '2015-01-01/2017-12-31',
    bitcoinTrades: 155,
  },
  publishedResult: {
    contrarianProfitUsd: -6279.29,
    contrarianTradeTStatistic: -1.53,
    continuationProfitUsd: 5879.08,
    continuationTradeTStatistic: 1.44,
    oneSidedCriticalTStatistic: 1.66,
    conclusion: 'no-exploitable-profit',
  },
  blockers: [
    'The unsigned event-magnitude formula does not specify the increase/decrease discriminator used for trade direction.',
    'Rolling-window inclusion, warm-up, missing-data, timezone, and executable end-of-day fill rules are not frozen.',
    'The MetaTrader report uses a floating Current spread rather than an immutable fee, spread, and slippage schedule.',
    'Threshold parameters were selected on the research sample without an untouched holdout or nested protocol.',
    'The CoinMarketCap aggregate series is not pinned to an exact export and is not mapped reproducibly to the BTCUSD tester instrument.',
  ],
  reason:
    'The primary paper already finds the contrarian rule unprofitable and the positive continuation rule statistically indistinguishable from random after spread-aware simulation; material rule and data ambiguities also prevent an exact independent replay.',
};

const TC257_TREASURY_SOURCE_AUDIT: TradeClawTreasurySourceAuditEvidence = {
  taskId: 'TC-257',
  auditDate: '2026-08-29',
  researchPath: 'docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md',
  researchSha256: '3df7f04b4ef3d94a1fe245bf61262f7cfe41dc2582bdb748162ee1dbb086c127',
  disposition: 'advance',
  tradeClawBacktestRunAtAuditClose: false,
  primarySource: {
    title: 'Predictable End-of-Month Treasury Returns',
    authors: ['Jonathan Hartley', 'Krista Schwarz'],
    institutionalDocumentUrl:
      'https://rodneywhitecenter.wharton.upenn.edu/wp-content/uploads/2019/12/17-19.Schwarz.pdf',
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3440417',
    documentSha256: '56403762378f606f595dcce11afcf1f1eaccf8810237c58999f653a230a32809',
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'monthly',
    finalTradingIntervals: 2,
    primaryMaturityYears: 5,
    entry: 'third-to-last-curve-close',
    exit: 'final-curve-close',
    financing: 'general-collateral-repo',
    paperSample: '1990-01/2018-12',
    expectedRoundTripsPerYear: 12,
  },
  publishedResult: {
    fiveYearMeanMonthlyExcessReturnPct: 0.13,
    fiveYearAnnualizedSharpe: 1.07,
    fiveYearPositiveMonthsPct: 63,
    typicalBidAskSpreadBps: [2, 3],
  },
  limits: [
    'The exact historical GC-repo export is not identified.',
    'Current Federal Reserve curve vintages can differ from the authors historical vintage.',
    'Daily curve closes are modeled hypothetical off-the-run securities rather than executable CUSIP fills.',
    'The paper does not freeze a complete spread, slippage, and commission model.',
  ],
  reason:
    'The public monthly rule is reconstructible from hashable Federal Reserve data, has only 12 expected round trips per year, and the paper reports gross headroom above a predeclared full friction model.',
};

const TC257_TREASURY_EVIDENCE: TradeClawTreasuryReplicationEvidence = {
  taskId: 'TC-257',
  studyDate: '2026-08-29',
  preregistrationPath: 'docs/plans/2026-08-29-end-of-month-treasury-replication.md',
  preregistrationSha256:
    '4e3d9ed5392aa9cbe8eed9865483f583a31336c6cc770e9773230f4fe829b3de',
  sourceAuditPath: 'docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md',
  sourceAuditSha256:
    '3df7f04b4ef3d94a1fe245bf61262f7cfe41dc2582bdb748162ee1dbb086c127',
  resultPath: 'docs/research/2026-08-29-end-of-month-treasury-replication-result.md',
  resultSha256: '1d38f9ded9eddc995514a3e09c03da418f62b60956fb968f37ed0b5c379d5f6b',
  artifactPath:
    'docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json',
  artifactSha256: 'f8707913da4714c967d58f0fd2630c5f2316d6c5ede53507340ad54f35af36cf',
  verdict: 'inconclusive',
  evidenceBasis: 'modeled-current-vintage-independent-replication',
  performanceGatesEvaluated: false,
  eligibleForProspectiveReview: false,
  activationApproved: false,
  publicationApproved: false,
  costsFrozenButNotEvaluated: {
    headlineRoundTripBps: 5,
    stressRoundTripBps: 10,
    stressFinancingSpreadBpsAnnual: 100,
    financingProxy: 'DFF',
  },
  qa: {
    nominalRows: 9151,
    financingRows: 13392,
    evaluationMonths: 439,
    holdoutMonths: 91,
    suppliedYieldChecks: 27453,
    suppliedYieldChecksAboveTolerance: 1,
    frozenTolerancePct: 0.0001,
    maximumErrorPct: 0.000300749306,
    maximumErrorDate: '2013-10-16',
    maximumErrorMaturityYears: 5,
    standingQaPassed: false,
  },
  reason:
    'One of 27,453 parameter-to-supplied-yield checks exceeded the preregistered 0.0001 percentage-point tolerance, so the retained artifact is QA-only and no performance gate was evaluated.',
};

const TC255_EVIDENCE: TradeClawReplicationEvidence = {
  taskId: 'TC-255',
  studyDate: '2026-08-29',
  preregistrationPath: 'docs/plans/2026-08-29-external-multi-timeframe-replication.md',
  preregistrationSha256: '8679c1aa033b5e52f1cc6c9097ed14d34aa101a6fd592188d8edb20f8a23cb8f',
  resultPath: 'docs/research/2026-08-29-external-multi-timeframe-replication-result.md',
  artifactPath:
    'docs/research/experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json',
  artifactSha256: '762bb52991db266f79b08a104c811b7309668bf3f12b96f70f0fa15bd67f2c53',
  verdict: 'fail',
  eligibleForProspectiveReview: false,
  activationApproved: false,
  sourceAmbiguityRetained: true,
  gateInputsChangedByErratum: false,
  costs: {
    feePctPerSide: 0.05,
    slippagePctPerSide: 0.15,
    fundingPctPer8h: 0.01,
  },
  btc: {
    grossCompoundedReturn: 0.69429616,
    netCompoundedReturn: -0.99213436,
    completedTrades: 1334,
    meanGrossTradeReturn: 0.00045083,
    meanNetTradeReturn: -0.00357036,
    netTradeTStatistic: -12.3015948,
    positiveFolds: 0,
    totalFolds: 4,
    holdoutNetCompoundedReturn: -0.3330339,
    breakEvenFeePlusSlippagePctPerSide: 0.0186,
  },
  eth: {
    grossCompoundedReturn: -0.1274927,
    netCompoundedReturn: -0.99550038,
    completedTrades: 1308,
    meanNetTradeReturn: -0.00406776,
    netTradeTStatistic: -13.95397122,
    positiveFolds: 0,
    totalFolds: 4,
    holdoutNetCompoundedReturn: -0.25751115,
  },
  portfolio: {
    grossCompoundedReturn: 0.28340173,
    netCompoundedReturn: -0.99381737,
    holdoutNetCompoundedReturn: -0.29527252,
    maximumDrawdown: 0.99387648,
    calmar: -0.48964758,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} keys must be exactly: ${wanted.join(', ')}`);
  }
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function parseAssetClass(value: unknown, label: string): ResearchAssetClass {
  const parsed = requiredString(value, label);
  if (!(RESEARCH_ASSET_CLASSES as readonly string[]).includes(parsed)) {
    throw new Error(`${label} is not a supported asset class`);
  }
  return parsed as ResearchAssetClass;
}

function parseCandidate(value: unknown, index: number): SystematicDiscoveryCandidate {
  const label = `candidates[${index}]`;
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  assertExactKeys(
    value,
    [
      'id',
      'title',
      'sourceUrl',
      'assetClass',
      'upstreamGrossSharpe',
      'upstreamTStatistic',
      'upstreamVolatilityPct',
      'upstreamYearsTested',
    ],
    label,
  );

  const id = requiredString(value.id, `${label}.id`);
  const sourceUrl = requiredString(value.sourceUrl, `${label}.sourceUrl`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(`${label}.id must be a lowercase URL slug`);
  }
  if (sourceUrl !== `https://paperswithbacktest.com/strategies/${id}`) {
    throw new Error(`${label}.sourceUrl must match its pinned candidate id`);
  }

  const upstreamGrossSharpe = finiteNumber(
    value.upstreamGrossSharpe,
    `${label}.upstreamGrossSharpe`,
  );
  const upstreamTStatistic = finiteNumber(
    value.upstreamTStatistic,
    `${label}.upstreamTStatistic`,
  );
  const upstreamVolatilityPct = finiteNumber(
    value.upstreamVolatilityPct,
    `${label}.upstreamVolatilityPct`,
  );
  const upstreamYearsTested = finiteNumber(
    value.upstreamYearsTested,
    `${label}.upstreamYearsTested`,
  );

  if (upstreamGrossSharpe <= 0) throw new Error(`${label}.upstreamGrossSharpe must be positive`);
  if (upstreamTStatistic < 1.96) throw new Error(`${label}.upstreamTStatistic must be at least 1.96`);
  if (upstreamVolatilityPct < 1 || upstreamVolatilityPct > 100) {
    throw new Error(`${label}.upstreamVolatilityPct must be between 1 and 100`);
  }
  if (!Number.isSafeInteger(upstreamYearsTested) || upstreamYearsTested < 10) {
    throw new Error(`${label}.upstreamYearsTested must be an integer of at least 10`);
  }

  return {
    id,
    title: requiredString(value.title, `${label}.title`),
    sourceUrl,
    assetClass: parseAssetClass(value.assetClass, `${label}.assetClass`),
    upstreamGrossSharpe,
    upstreamTStatistic,
    upstreamVolatilityPct,
    upstreamYearsTested,
  };
}

export function parseSystematicResearchIntakeSnapshot(
  value: unknown,
): SystematicResearchIntakeSnapshot {
  if (!isRecord(value)) throw new Error('research intake snapshot must be an object');
  assertExactKeys(value, ['schemaVersion', 'source', 'candidates'], 'research intake snapshot');
  if (value.schemaVersion !== 1) throw new Error('research intake schemaVersion must be 1');
  if (!isRecord(value.source)) throw new Error('research intake source must be an object');
  assertExactKeys(
    value.source,
    [
      'repository',
      'commit',
      'readmeSha256',
      'snapshotDate',
      'reportedPerformanceBasis',
      'tradeClawTreatment',
    ],
    'research intake source',
  );
  if (!Array.isArray(value.candidates)) throw new Error('research intake candidates must be an array');

  const source: SystematicIntakeSource = {
    repository: requiredString(value.source.repository, 'source.repository'),
    commit: requiredString(value.source.commit, 'source.commit'),
    readmeSha256: requiredString(value.source.readmeSha256, 'source.readmeSha256'),
    snapshotDate: requiredString(value.source.snapshotDate, 'source.snapshotDate'),
    reportedPerformanceBasis: value.source.reportedPerformanceBasis as 'gross-of-trading-costs',
    tradeClawTreatment: value.source.tradeClawTreatment as 'discovery-only',
  };

  if (source.repository !== 'https://github.com/paperswithbacktest/awesome-systematic-trading') {
    throw new Error('research intake repository must be the pinned awesome-systematic-trading source');
  }
  if (!/^[0-9a-f]{40}$/.test(source.commit)) throw new Error('source.commit must be a full Git SHA');
  if (!/^[0-9a-f]{64}$/.test(source.readmeSha256)) {
    throw new Error('source.readmeSha256 must be a SHA-256 digest');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.snapshotDate)) {
    throw new Error('source.snapshotDate must use YYYY-MM-DD');
  }
  if (source.reportedPerformanceBasis !== 'gross-of-trading-costs') {
    throw new Error('source performance basis must remain gross-of-trading-costs');
  }
  if (source.tradeClawTreatment !== 'discovery-only') {
    throw new Error('source treatment must remain discovery-only');
  }

  const candidates = value.candidates.map(parseCandidate);
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.id)) throw new Error(`duplicate research intake id: ${candidate.id}`);
    ids.add(candidate.id);
  }

  return { schemaVersion: 1, source, candidates };
}

const parsedSnapshot = parseSystematicResearchIntakeSnapshot(
  systematicResearchIntakeJson as unknown,
);

if (parsedSnapshot.source.commit !== SYSTEMATIC_INTAKE_COMMIT) {
  throw new Error('systematic research intake commit does not match the application pin');
}
if (parsedSnapshot.source.readmeSha256 !== SYSTEMATIC_INTAKE_README_SHA256) {
  throw new Error('systematic research intake README hash does not match the application pin');
}
if (parsedSnapshot.candidates.length !== SYSTEMATIC_INTAKE_EXPECTED_CANDIDATES) {
  throw new Error(`systematic research intake must contain ${SYSTEMATIC_INTAKE_EXPECTED_CANDIDATES} candidates`);
}

export const SYSTEMATIC_RESEARCH_INTAKE_SOURCE = parsedSnapshot.source;

export const SYSTEMATIC_RESEARCH_INTAKE: readonly ResearchIntakeRecord[] =
  parsedSnapshot.candidates.map((candidate, sourcePosition) => {
    const tradeClawEvidence = candidate.id === MULTI_TIMEFRAME_BITCOIN_ID
      ? TC255_EVIDENCE
      : candidate.id === END_OF_MONTH_TREASURY_ID
        ? TC257_TREASURY_EVIDENCE
        : null;
    const tradeClawSourceAudit =
      candidate.id === PRICE_OVERREACTIONS_ID
        ? TC256_PRICE_OVERREACTIONS_SOURCE_AUDIT
        : candidate.id === END_OF_MONTH_TREASURY_ID
          ? TC257_TREASURY_SOURCE_AUDIT
          : null;
    if (tradeClawEvidence) {
      if (tradeClawEvidence.taskId === 'TC-257') {
        return {
          ...candidate,
          sourcePosition,
          discoveryBasis: 'upstream-gross-metadata' as const,
          stage: 'replicated' as const,
          verdict: 'inconclusive' as const,
          costStatus: 'unassessed' as const,
          nextAction:
            'Retain the frozen QA-only receipt; use a separately hashed protocol to obtain the original curve vintage or predeclare how rounded parameters and supplied yields are reconciled.',
          marketingDisposition: 'human-review-draft-only' as const,
          tradeClawSourceAudit,
          tradeClawEvidence,
        };
      }
      return {
        ...candidate,
        sourcePosition,
        discoveryBasis: 'upstream-gross-metadata' as const,
        stage: 'replicated' as const,
        verdict: 'fail' as const,
        costStatus: 'failed' as const,
        nextAction:
          'Archive the failed result without retuning or promotion; use the break-even cost finding to screen lower-turnover candidates.',
        marketingDisposition: 'human-review-draft-only' as const,
        tradeClawSourceAudit,
        tradeClawEvidence,
      };
    }

    if (tradeClawSourceAudit) {
      return {
        ...candidate,
        sourcePosition,
        discoveryBasis: 'upstream-gross-metadata' as const,
        stage: 'source-audited' as const,
        verdict: 'not-tested' as const,
        costStatus: 'unassessed' as const,
        nextAction:
          'Archive the published specification as a source-audited no-go; preregister only a materially new hypothesis with explicit rules, data, costs, and holdout.',
        marketingDisposition: 'none' as const,
        tradeClawSourceAudit,
        tradeClawEvidence: null,
      };
    }

    return {
      ...candidate,
      sourcePosition,
      discoveryBasis: 'upstream-gross-metadata' as const,
      stage: 'discovered' as const,
      verdict: 'not-tested' as const,
      costStatus: 'unassessed' as const,
      nextAction:
        'Audit the primary source, data rights, turnover, and round-trip cost before any preregistration.',
      marketingDisposition: 'none' as const,
      tradeClawSourceAudit: null,
      tradeClawEvidence: null,
    };
  });

export function filterResearchIntake(
  records: readonly ResearchIntakeRecord[],
  filters: ResearchIntakeFilters = {},
): ResearchIntakeRecord[] {
  const query = filters.query?.trim().toLocaleLowerCase('en') ?? '';
  return records.filter((record) => {
    if (filters.assetClass && filters.assetClass !== 'all' && record.assetClass !== filters.assetClass) {
      return false;
    }
    if (filters.stage && filters.stage !== 'all' && record.stage !== filters.stage) return false;
    if (filters.verdict && filters.verdict !== 'all' && record.verdict !== filters.verdict) return false;
    if (
      filters.sourceAuditDisposition &&
      filters.sourceAuditDisposition !== 'all' &&
      record.tradeClawSourceAudit?.disposition !== filters.sourceAuditDisposition
    ) {
      return false;
    }
    if (!query) return true;
    return [record.title, record.id, record.assetClass].some((value) =>
      value.toLocaleLowerCase('en').includes(query),
    );
  });
}

export function summarizeResearchIntake(
  records: readonly ResearchIntakeRecord[],
): ResearchIntakeSummary {
  const byAssetClass = Object.fromEntries(
    RESEARCH_ASSET_CLASSES.map((assetClass) => [assetClass, 0]),
  ) as Record<ResearchAssetClass, number>;

  const summary: ResearchIntakeSummary = {
    total: records.length,
    discovered: 0,
    sourceAudited: 0,
    preregistered: 0,
    replicated: 0,
    prospective: 0,
    passed: 0,
    failed: 0,
    inconclusive: 0,
    untested: 0,
    sourceNoGo: 0,
    byAssetClass,
  };

  for (const record of records) {
    byAssetClass[record.assetClass] += 1;
    if (record.stage === 'discovered') summary.discovered += 1;
    if (record.stage === 'source-audited') summary.sourceAudited += 1;
    if (record.stage === 'preregistered') summary.preregistered += 1;
    if (record.stage === 'replicated') summary.replicated += 1;
    if (record.stage === 'prospective') summary.prospective += 1;
    if (record.verdict === 'pass') summary.passed += 1;
    if (record.verdict === 'fail') summary.failed += 1;
    if (record.verdict === 'inconclusive') summary.inconclusive += 1;
    if (record.verdict === 'not-tested') summary.untested += 1;
    if (record.tradeClawSourceAudit?.disposition === 'no-go') summary.sourceNoGo += 1;
  }

  return summary;
}
