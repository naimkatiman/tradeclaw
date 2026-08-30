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
  reason: string;
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

export interface TradeClawBitcoinMaxMinReplicationEvidence {
  taskId: 'TC-258';
  studyDate: '2026-08-29';
  preregistrationPath: string;
  preregistrationSha256: string;
  sourceAuditPath: string;
  sourceAuditSha256: string;
  resultPath: string;
  resultSha256: string;
  artifactPath: string;
  artifactSha256: string;
  verdict: 'fail';
  evidenceBasis: 'modeled-independent-gemini-replication';
  performanceGatesEvaluated: true;
  eligibleForProspectiveReview: false;
  activationApproved: false;
  publicationApproved: false;
  costs: {
    feePctPerSide: 0.1;
    slippagePctPerSide: 0.15;
    headlineTotalPctPerSide: 0.25;
    fundingPctPer8h: 0;
  };
  qa: {
    standingQaPassed: true;
    btcDays: 3901;
    ethDays: 3735;
    incompleteDaysPerSymbol: 3;
  };
  paperWindowGrossControl: {
    annualizedReturn: number;
    sourceTargetAnnualizedReturn: 0.9843;
  };
  intradayCostNoGo: {
    publishedGrossAnnualizedReturn: 0.33;
    breakEvenCostPctPerSide: number;
    feeOnlyImpliedAnnualizedNet: number;
    headlineImpliedAnnualizedNet: number;
  };
  btc: {
    grossCompoundedReturn: number;
    netCompoundedReturn: number;
    completedEpisodes: number;
    meanNetEpisodeReturn: number;
    netEpisodeTStatistic: number;
    positiveFolds: number;
    totalFolds: 4;
    holdoutGrossCompoundedReturn: number;
    holdoutFeeOnlyCompoundedReturn: number;
    holdoutNetCompoundedReturn: number;
    holdoutMeanNetEpisodeReturn: number;
    holdoutBreakEvenCostPctPerSide: number;
    maximumDrawdown: number;
    calmar: number;
    spotCalmar: number;
  };
  eth: {
    grossCompoundedReturn: number;
    netCompoundedReturn: number;
    completedEpisodes: number;
    meanNetEpisodeReturn: number;
    netEpisodeTStatistic: number;
    positiveFolds: number;
    totalFolds: 4;
    holdoutGrossCompoundedReturn: number;
    holdoutFeeOnlyCompoundedReturn: number;
    holdoutNetCompoundedReturn: number;
    holdoutMeanNetEpisodeReturn: number;
    holdoutBreakEvenCostPctPerSide: number;
    maximumDrawdown: number;
    calmar: number;
    spotCalmar: number;
  };
  reason: string;
}

export interface TradeClawTermPremiumReplicationEvidence {
  taskId: 'TC-259';
  studyDate: '2026-08-29';
  preregistrationPath: string;
  preregistrationSha256: string;
  sourceAuditPath: string;
  sourceAuditSha256: string;
  resultPath: string;
  resultSha256: string;
  artifactPath: string;
  artifactSha256: string;
  verdict: 'fail';
  evidenceBasis: 'modeled-current-vintage-independent-replication';
  performanceGatesEvaluated: true;
  eligibleForProspectiveReview: false;
  activationApproved: false;
  publicationApproved: false;
  costs: {
    headlineSideBps: 5;
    stressSideBps: 12.5;
    tenYearAdverseSidesPerMonth: 2;
    oneMonthAdverseSidesPerMonth: 1;
  };
  qa: {
    standingQaPassed: true;
    curveRows: 782;
    nelsonSiegelRows: 223;
    svenssonRows: 559;
    suppliedYieldChecks: 18334;
    suppliedYieldChecksAboveTolerance: 0;
    fullOutcomes: 703;
    holdoutOutcomes: 42;
    earlyExtrapolatedPaperOutcomes: 44;
  };
  full: {
    grossCompoundedReturn: number;
    headlineCompoundedReturn: number;
    stressCompoundedReturn: number;
    headlineAnnualizedSharpe: number;
    headlineMaximumDrawdown: number;
    alwaysTenYearHeadlineCompoundedReturn: number;
    alwaysOneMonthHeadlineCompoundedReturn: number;
  };
  holdout: {
    grossCompoundedReturn: number;
    headlineCompoundedReturn: number;
    stressCompoundedReturn: number;
    headlineAnnualizedSharpe: number;
    headlineMaximumDrawdown: number;
    priorOnlyHeadlineCompoundedReturn: number;
    alwaysTenYearHeadlineCompoundedReturn: number;
    alwaysOneMonthHeadlineCompoundedReturn: number;
    canonicalMinusAlwaysOneMonthCompoundedExcess: number;
  };
  stability: {
    passingPaperFolds: 1;
    totalPaperFolds: 4;
  };
  failedGates: readonly ['paperFoldStability', 'holdoutBeatsAlwaysOneMonth'];
  reason: string;
}

export type TradeClawResearchEvidence =
  | TradeClawReplicationEvidence
  | TradeClawTreasuryReplicationEvidence
  | TradeClawBitcoinMaxMinReplicationEvidence
  | TradeClawTermPremiumReplicationEvidence;

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

export interface TradeClawRiskBasedAllocationSourceAuditEvidence {
  taskId: 'TC-260';
  auditDate: '2026-08-29';
  researchPath: string;
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: 'A Risk Based Approach to Tactical Asset Allocation';
    authors: readonly ['Stefano Colucci', 'Dario Brandolini'];
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1965423';
    doi: 'https://doi.org/10.2139/ssrn.1965423';
    documentUrl: string;
    documentSha256: string;
    documentBytes: 492231;
    documentPages: 27;
    citedRiskModelUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1965377';
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'weekly';
    expectedShortfallTargetPct: -6;
    horizon: 'one-month';
    tailProbabilityPct: 5;
    decisionEveryMarketDays: 5;
    defensiveSleeve: 'US-Treasuries-7-to-10-years-except-commodity-cash';
    sourceFill: 'signal-day-close';
    paperSample: '2000-01-01/2011-08-22';
    maximumScheduledDecisionsPerYear: 52;
  };
  publishedCostTreatment: {
    singleAssetTradingCostsIncluded: false;
    managedAnnualExpenseRatioPct: 2;
    buyAndHoldAnnualExpenseRatioPct: 0.6;
    turnoverReported: false;
  };
  inputProvenance: {
    exactSourceBytesSupplied: false;
    independentlyHashablePublicInputs: false;
    authorCreatedSyntheticPrehistories: true;
    pointInTimeGdpVintagesSupplied: false;
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawCryptoFactorSourceAuditEvidence {
  taskId: 'TC-261';
  auditDate: '2026-08-29';
  researchPath: string;
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: string;
    authors: readonly ['Stefan Hubrich'];
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3055498';
    doi: 'https://doi.org/10.2139/ssrn.3055498';
    documentUrl: string;
    documentSha256: null;
    documentBytes: null;
    documentPages: 54;
    directSourceBytesAvailable: false;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'weekly';
    holdingDays: 7;
    rebalanceSchedules: 7;
    grossExposurePct: 10;
    cashPct: 90;
    minimumCoins: 4;
    originalUniverse: readonly [
      'BTC',
      'DASH',
      'DCR',
      'DOGE',
      'ETC',
      'ETH',
      'LTC',
      'PIVX',
      'XEM',
      'XMR',
      'ZEC',
    ];
    factors: readonly ['momentum', 'value', 'carry'];
    factorPortfolioShortsAllowed: true;
    paperSample: 'approximately-four-years-through-2017-09';
  };
  publishedCostTreatment: {
    marketImpactIncluded: false;
    spreadAndFeePctOfNotional: readonly [0.2, 0.5];
    momentumAnnualTradingVolumePct: readonly [80, 90];
    combinedAnnualTradingVolumePct: readonly [28, 32];
    combinedWorstCaseEstimatedCostBps: 15;
  };
  currentDataReceipt: {
    archiveRepositoryUrl: 'https://github.com/coinmetrics/data';
    archiveCommit: string;
    archiveLicense: 'CC-BY-NC-4.0';
    archiveStabilityGuaranteed: false;
    communityCatalogUrl: string;
    communityCatalogResponseBytes: 96382;
    communityCatalogResponseSha256: string;
    originalUniverseAssets: 11;
    priceUsdAssetsAvailable: 10;
    pivxPriceUsdAvailable: false;
    pivxArchiveSha256: string;
    pivxArchiveFirstDate: '2018-01-24';
    pivxArchiveFirstReferenceRateDate: '2026-05-18';
    rawBytesCommitted: false;
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawMostDiversifiedPortfolioSourceAuditEvidence {
  taskId: 'TC-262';
  auditDate: '2026-08-30';
  researchPath: 'docs/research/2026-08-30-most-diversified-portfolio-source-audit.md';
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: 'Properties of the Most Diversified Portfolio';
    authors: readonly ['Yves Choueifaty', 'Tristan Froidure', 'Julien Reynier'];
    discoveryUrl: 'https://paperswithbacktest.com/strategies/properties-of-the-most-diversified-portfolio';
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1895459';
    doi: 'https://doi.org/10.21314/JOIS.2013.033';
    documentUrl: 'https://www.tobam.fr/wp-content/uploads/2021/12/2013-choueifatyfroidurereynier-properties-of-the-most-diversified-portfolio-jis.pdf';
    documentSha256: string;
    documentBytes: 171320;
    documentPages: 22;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'semiannual';
    rebalanceMonths: readonly [5, 11];
    covarianceWindowMarketDays: 252;
    paperSample: '1999-01/2010-12';
    pointInTimeUniverse: 'MSCI-World';
    minimumPriceHistoryMonths: 6;
    retainedMarketCapRankFraction: 0.5;
    averageEligibleStocks: 793;
    averageEligibleCapitalizationPct: 90;
    averageMdpHoldings: 137;
    maximumStockWeightPct: 1.5;
    maximumRegionOverweightPctPoints: 5;
    turnoverPenaltyTrackingErrorPct: 1.5;
    longOnly: true;
  };
  sourceCloneMismatch: {
    primaryCadence: 'semiannual-end-May-end-November';
    cloneCadence: 'quarterly';
    primarySample: '1999-2010';
    cloneSample: '1990-2026';
    primaryAverageHoldings: 137;
    cloneCurrentLongPositions: 56;
  };
  publishedCostTreatment: {
    mdpOneWayAnnualTurnoverPct: 82;
    marketOneWayAnnualTurnoverPct: 14;
    mdpClaimedBreakEvenAllInTradingCostPct: 3.4;
    deterministicTradeLedgerSupplied: false;
  };
  inputProvenance: {
    exactSourceBytesSupplied: false;
    pointInTimeMsciMembershipPublic: false;
    bloombergTotalReturnsPublic: false;
    bloombergMarketCapitalizationsPublic: false;
    msciOfficialFxPublic: false;
    plesiochronousEstimatorExecutable: false;
    turnoverPenaltyExecutable: false;
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawCryptocurrencyAsMoneySourceAuditEvidence {
  taskId: 'TC-263';
  auditDate: '2026-08-30';
  researchPath: 'docs/research/2026-08-30-cryptocurrency-as-money-source-audit.md';
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: 'Cryptocurrency As Money: A Trading Strategy Solution';
    authors: readonly ['Marko Ogorevc'];
    discoveryUrl: 'https://paperswithbacktest.com/strategies/cryptocurrency-as-money-a-trading-strategy-solution';
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3436041';
    doi: 'https://doi.org/10.2139/ssrn.3436041';
    documentUrl: 'https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID3436041_code3654339.pdf?abstractid=3436041';
    documentSha256: string;
    documentBytes: 453903;
    documentPages: 9;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    structure: 'long-only-two-cryptocurrency-grid';
    defaultTradingRangePct: 30;
    defaultSteps: 7;
    equalInitialCashValueWeights: true;
    orderSizing: 'linearly-increasing-both-sides-unspecified-formula';
    cycleReset: 'equal-split-with-profit-unspecified-trigger';
    userAdjustable: true;
    paperIllustration: 'LTCBTC-2018-07-31/2019-07-31';
  };
  sourceCloneMismatch: {
    primaryCadence: 'event-driven-standing-limit-orders';
    cloneCadence: 'weekly';
    primarySample: '2018-07-31/2019-07-31-illustration';
    cloneSample: '1992-2026';
  };
  publishedCostTreatment: {
    deterministicTradeLedgerSupplied: false;
    completeFrictionModelSupplied: false;
    breakEvenCostSupplied: false;
    makerTakerFeesSupplied: false;
  };
  inputProvenance: {
    exactSourceBytesSupplied: false;
    venueIdentified: false;
    eventLevelDataSupplied: false;
    executableGridFormulaSupplied: false;
    executableFillRulesSupplied: false;
    applicationCodeSupplied: false;
  };
  userExperiment: {
    accounts: 191;
    activePairs: 235;
    averageActiveDays: 142.5;
    stillActivePct: 41;
    fixedProtocol: false;
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawRollingVsExpandingSourceAuditEvidence {
  taskId: 'TC-264';
  auditDate: '2026-08-30';
  researchPath: 'docs/research/2026-08-30-rolling-vs-expanding-mean-reversion-source-audit.md';
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: 'Rolling vs. Expanding Windows in Mean-Reversion Strategies: Evidence from Gold-Silver and Cross-Asset Validation';
    authors: readonly ['Akshit Gupta'];
    discoveryUrl: 'https://paperswithbacktest.com/strategies/rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation';
    discoveryHtmlSha256: string;
    discoveryHtmlBytes: 203968;
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6217778';
    doi: 'https://doi.org/10.2139/ssrn.6217778';
    documentSha256: string;
    documentBytes: 636787;
    documentPages: 19;
    extractedTextSha256: string;
    extractedTextBytes: 50556;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    structure: 'long-denominator-commodity-ratio-mean-reversion';
    signalFrequency: 'daily-close-lagged-one-trading-day';
    windowYears: 7;
    thresholdZ: 1.25;
    confirmationDeclinePct: 2;
    confirmationLookbackTradingDays: 10;
    holdingPeriodTradingDays: 15;
    earlyExit: false;
    parameterCombinationsSwept: 72;
    finalVixThreshold: 20;
    finalVixOverweight: 1.15;
  };
  selectionAndValidation: {
    parametersSelectedUsingFullSample: true;
    temporalSplit: '2005-2015/2016-2026-retrospective';
    primaryTrades: 47;
    crossAssetPairs: 5;
    pooledTrades: 350;
    postPublicationHoldoutFrozen: false;
  };
  sourceCloneMismatch: {
    primaryCadence: 'event-driven-daily-signal-with-15-trading-day-hold';
    cloneCadence: 'daily';
    primarySample: '2000-01-01/2026-02-09';
    cloneSample: '1990-2026';
    cloneCurrentPosition: 'SPX-short-304';
  };
  inputProvenance: {
    exactSourceBytesSupplied: false;
    investingComSeriesPinned: false;
    futuresContractsPinned: false;
    rollRulesSupplied: false;
    executableFillRulesSupplied: false;
    overlappingPositionRulesSupplied: false;
  };
  publishedCostTreatment: {
    baselinePerSideBasisPoints: 10;
    sensitivityMaxPerSideBasisPoints: 50;
    deterministicTradeLedgerSupplied: false;
    completeFrictionModelSupplied: false;
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawGoodCarrySourceAuditEvidence {
  taskId: 'TC-265';
  auditDate: '2026-08-30';
  researchPath: 'docs/research/2026-08-30-good-carry-bad-carry-source-audit.md';
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: 'Good Carry, Bad Carry';
    authors: readonly ['Geert Bekaert', 'George Panayotov'];
    discoveryUrl: 'https://paperswithbacktest.com/strategies/good-carry-bad-carry';
    discoveryHtmlSha256: string;
    discoveryHtmlBytes: 205367;
    columbiaDocumentUrl: 'https://business.columbia.edu/sites/default/files-efs/pubfiles/26212/good_carry.pdf';
    columbiaDocumentSha256: string;
    columbiaDocumentBytes: 380097;
    columbiaDocumentPages: 88;
    columbiaVersionDate: '2018-01-16';
    nberUrl: 'https://www.nber.org/papers/w25420';
    nberDoi: 'https://doi.org/10.3386/w25420';
    nberDocumentSha256: string;
    nberDocumentBytes: 344309;
    nberDocumentPages: 78;
    finalDoi: 'https://doi.org/10.1017/S0022109019000887';
    finalPublishedOnline: '2019-10-21';
    finalPublication: 'Journal of Financial and Quantitative Analysis 55(4), 2020, 1063-1094';
    publicReplicationPackageSupplied: false;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'monthly';
    paperSample: '1984-12/2014-06';
    monthlyObservations: 354;
    universe: readonly ['NZD', 'AUD', 'GBP', 'NOK', 'SEK', 'CAD', 'USD', 'EUR-or-DEM', 'CHF', 'JPY'];
    rankSignal: 'mid-quote-one-month-forward-differential-F-over-S-minus-one';
    totalGrossAbsoluteWeight: 1;
    rebalance: 'month-end-to-next-month-end';
    oddSubsetTreatment: 'drop-median-ranked-currency';
    longReturn: 'forward-bid-over-next-spot-ask-minus-one';
    shortReturn: 'one-minus-forward-ask-over-next-spot-bid';
  };
  selectionAndValidation: {
    dynamicStart: '1994-12';
    dynamicEnd: '2014-05';
    dynamicMonths: 234;
    expandingHistoryStarts: '1984-12';
    maximumSequentialExclusions: 7;
    causalNextMonthApplication: true;
    fixedSubsetsChosenAfterDynamicHistory: true;
    fixedSubsetsEvaluatedOnFullSample: true;
    authorAcknowledgesLookBackBias: true;
    postPublicationHoldoutFrozen: false;
  };
  sourceCloneMismatch: {
    paperDataset: 'Barclays-Bank-spot-and-one-month-forward-bid-ask-via-Datastream';
    cloneDataset: 'Forex Daily Price';
    paperSample: '1984-12/2014-06';
    cloneSample: '1990-2026';
    cloneCodeFlag: true;
    cloneCodePubliclyInspectable: false;
  };
  inputProvenance: {
    exactSourceBytesSupplied: false;
    barclaysBankIdentified: true;
    datastreamIdentified: true;
    vendorIdentifiersPinned: false;
    sourceVintagePinned: false;
    demEuroSplicePinned: false;
    authorizedDatasetPresent: false;
  };
  publishedCostTreatment: {
    observedBidAskUsed: true;
    flatCostProxy: false;
    quoteSideHistorySupplied: false;
    deterministicTradeLedgerSupplied: false;
    completeCurrentFrictionModelSupplied: false;
  };
  blockers: readonly string[];
  reason: string;
}

export interface TradeClawRiskFactorParitySourceAuditEvidence {
  taskId: 'TC-266';
  auditDate: '2026-08-30';
  researchPath: 'docs/research/2026-08-30-risk-factor-parity-source-audit.md';
  researchSha256: string;
  disposition: 'no-go';
  tradeClawBacktestRun: false;
  primarySource: {
    title: 'Risk Parity Portfolios with Risk Factors';
    authors: readonly ['Thierry Roncalli', 'Guillaume Weisang'];
    discoveryUrl: 'https://paperswithbacktest.com/strategies/risk-parity-portfolios-with-risk-factors';
    mpraRecordUrl: 'https://mpra.ub.uni-muenchen.de/44017/';
    mpraDocumentUrl: 'https://mpra.ub.uni-muenchen.de/44017/1/risk-factor-parity.pdf';
    mpraItemId: 44017;
    documentPages: 33;
    documentSha256: null;
    localByteAcquisition: 'blocked-before-hash';
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2155159';
    ssrnDoi: 'https://doi.org/10.2139/ssrn.2155159';
    journalDoi: 'https://doi.org/10.1080/14697688.2015.1046907';
    publicReplicationPackageSupplied: false;
    redistributionRightsEstablished: false;
  };
  paperScope: {
    sourceType: 'methodology-with-three-distinct-applications';
    applications: readonly [
      'equity-factor-risk-budgeting',
      'hedge-fund-pca-factor-parity',
      'strategic-asset-allocation',
    ];
    singleExecutableStrategySpecified: false;
    optimizationMayHaveMultipleSolutions: true;
    longOnlyMatchingGuaranteed: false;
  };
  equityApplication: {
    universe: readonly [
      'MSCI-USA-Large-Growth',
      'MSCI-USA-Large-Value',
      'MSCI-USA-Mid-Growth',
      'MSCI-USA-Mid-Value',
      'MSCI-USA-Small-Growth',
      'MSCI-USA-Small-Value',
    ];
    factorModel: 'Fama-French-Carhart-market-SMB-HML-MOM';
    estimator: 'maximum-likelihood';
    rollingWindowMonths: 12;
    snapshots: readonly ['2011-06', '2012-06'];
    studyDateSensitivityAcknowledged: true;
  };
  hedgeFundApplication: {
    universe: 'Dow-Jones-Credit-Suisse-AllHedge-plus-10-subindexes';
    returnCadence: 'monthly';
    covarianceWindowMonths: 24;
    factors: 'first-four-PCA-factors';
    factorRiskBudgetEachPct: 25;
    rebalance: 'month-end';
    simulationWindow: '2009-09/2012-08';
    holdingsNoLongerPublic: true;
    holdingsAssumedConstant: true;
    higherTurnoverAcknowledged: true;
  };
  strategicApplication: {
    source: 'Datastream';
    cadence: 'quarterly';
    sample: '1999-Q1/2012-Q2';
    economicSeries: 7;
    factorGroups: 4;
    assetClasses: 13;
    preliminaryResults: true;
  };
  sourceCloneMismatch: {
    cloneSample: '1990-2026';
    cloneCadence: 'monthly';
    cloneDataset: 'ETFs-Daily-Price-plus-All-Monthly-Coreeconomicdata';
    cloneCurrentPortfolio: '27-long-US-stocks';
    paperCurrentPortfolioSpecified: false;
    clonePseudoCodePublic: false;
  };
  inputProvenance: {
    exactSourceBytesSupplied: false;
    proprietaryMsciIndexesRequired: true;
    hedgeIndexHoldingsPublic: false;
    datastreamSeriesPubliclyPinned: false;
    authorizedDatasetPresent: false;
  };
  publishedCostTreatment: {
    transactionCostModelSupplied: false;
    causalFillRuleSupplied: false;
    turnoverLinkedLedgerSupplied: false;
    completeFrictionModelSupplied: false;
  };
  validation: {
    chronologicalFoldsSupplied: false;
    untouchedHoldoutSupplied: false;
    externalFalsificationMarketSupplied: false;
    deterministicReplayArtifactSupplied: false;
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

export interface TradeClawBitcoinMaxMinSourceAuditEvidence {
  taskId: 'TC-258';
  auditDate: '2026-08-29';
  researchPath: string;
  researchSha256: string;
  disposition: 'advance';
  tradeClawBacktestRunAtAuditClose: false;
  primarySource: {
    title: 'Seasonality, Trend-following, and Mean reversion in Bitcoin';
    authors: readonly ['Matúš Padyšák', 'Radovan Vojtko'];
    ssrnUrl: string;
    doi: 'https://doi.org/10.2139/ssrn.4081000';
    documentSha256: string;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'daily';
    lookbacks: readonly [10, 20, 30, 40, 50];
    headline: 'MAX10-or-MIN10';
    entry: 'next-day-first-observed-open';
    exit: 'last-observed-close-when-next-event-is-false';
    paperSample: '2015-11-26/2022-02-03';
  };
  intradayCostScreen: {
    rule: 'buy-21:00-UTC-sell-23:00-UTC-daily';
    publishedGrossAnnualizedReturn: 0.33;
    breakEvenCostPctPerSide: number;
    disposition: 'no-go';
  };
  data: {
    source: 'CryptoDataDownload Gemini H1';
    license: 'CC-BY-NC-SA-4.0';
    rawBytesCommitted: false;
    btcCanonicalSha256: string;
    ethCanonicalSha256: string;
  };
  limits: readonly string[];
  reason: string;
}

export interface TradeClawTermPremiumSourceAuditEvidence {
  taskId: 'TC-259';
  auditDate: '2026-08-29';
  researchPath: string;
  researchSha256: string;
  disposition: 'advance';
  tradeClawBacktestRunAtAuditClose: false;
  primarySource: {
    title: 'Trading the Term Premium';
    authors: readonly ['Luke van Schaik', 'Emlyn Flint', 'Florence Chikurunhe'];
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4324696';
    doi: 'https://doi.org/10.2139/ssrn.4324696';
    documentSha256: string;
    redistributionRightsEstablished: false;
  };
  publishedRule: {
    cadence: 'monthly';
    signal: 'continuously-compounded-10y-minus-3m';
    movingAverageMonths: 40;
    highSleeve: 'modeled-ten-year-zero';
    lowSleeve: 'modeled-one-month-zero';
    paperSample: '1968-01/2021-01';
    expectedMaturityResetsPerYear: 12;
  };
  data: {
    source: 'Federal Reserve Gürkaynak-Sack-Wright nominal curve';
    completeSourceSha256: string;
    normalizedSnapshotSha256: string;
    publicDomainWithAttribution: true;
    currentVintage: true;
    rawBytesCommitted: false;
  };
  costScreen: {
    headlineSideBps: 5;
    stressSideBps: 12.5;
    costChargedEveryMaturityReset: true;
  };
  limits: readonly string[];
  reason: string;
}

export type TradeClawResearchSourceAuditEvidence =
  | TradeClawSourceAuditEvidence
  | TradeClawRiskBasedAllocationSourceAuditEvidence
  | TradeClawCryptoFactorSourceAuditEvidence
  | TradeClawMostDiversifiedPortfolioSourceAuditEvidence
  | TradeClawCryptocurrencyAsMoneySourceAuditEvidence
  | TradeClawRollingVsExpandingSourceAuditEvidence
  | TradeClawGoodCarrySourceAuditEvidence
  | TradeClawRiskFactorParitySourceAuditEvidence
  | TradeClawTreasurySourceAuditEvidence
  | TradeClawBitcoinMaxMinSourceAuditEvidence
  | TradeClawTermPremiumSourceAuditEvidence;

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
const BITCOIN_SEASONALITY_MAX_MIN_ID =
  'seasonality-trend-following-and-mean-reversion-in-bitcoin';
const TRADING_TERM_PREMIUM_ID = 'trading-the-term-premium';
const RISK_BASED_TACTICAL_ALLOCATION_ID =
  'a-risk-based-approach-to-tactical-asset-allocation';
const CRYPTO_FACTOR_INVESTING_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';
const MOST_DIVERSIFIED_PORTFOLIO_ID = 'properties-of-the-most-diversified-portfolio';
const CRYPTOCURRENCY_AS_MONEY_ID = 'cryptocurrency-as-money-a-trading-strategy-solution';
const ROLLING_VS_EXPANDING_MEAN_REVERSION_ID =
  'rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation';
const GOOD_CARRY_BAD_CARRY_ID = 'good-carry-bad-carry';
const RISK_FACTOR_PARITY_ID = 'risk-parity-portfolios-with-risk-factors';

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

const TC260_RISK_BASED_ALLOCATION_SOURCE_AUDIT: TradeClawRiskBasedAllocationSourceAuditEvidence = {
  taskId: 'TC-260',
  auditDate: '2026-08-29',
  researchPath: 'docs/research/2026-08-29-risk-based-tactical-allocation-source-audit.md',
  researchSha256: '70dc3fcc90d895d8f518b657d86c5a1399adbd995fcb0bc0978516dddfa6782a',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title: 'A Risk Based Approach to Tactical Asset Allocation',
    authors: ['Stefano Colucci', 'Dario Brandolini'],
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1965423',
    doi: 'https://doi.org/10.2139/ssrn.1965423',
    documentUrl:
      'https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID1966391_code1715697.pdf?abstractid=1965423',
    documentSha256: 'fb43ff7f323218ea4ebe043fa7b9bbdbe2232a9b65b6b9c3461c1c4d98f2faba',
    documentBytes: 492231,
    documentPages: 27,
    citedRiskModelUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1965377',
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'weekly',
    expectedShortfallTargetPct: -6,
    horizon: 'one-month',
    tailProbabilityPct: 5,
    decisionEveryMarketDays: 5,
    defensiveSleeve: 'US-Treasuries-7-to-10-years-except-commodity-cash',
    sourceFill: 'signal-day-close',
    paperSample: '2000-01-01/2011-08-22',
    maximumScheduledDecisionsPerYear: 52,
  },
  publishedCostTreatment: {
    singleAssetTradingCostsIncluded: false,
    managedAnnualExpenseRatioPct: 2,
    buyAndHoldAnnualExpenseRatioPct: 0.6,
    turnoverReported: false,
  },
  inputProvenance: {
    exactSourceBytesSupplied: false,
    independentlyHashablePublicInputs: false,
    authorCreatedSyntheticPrehistories: true,
    pointInTimeGdpVintagesSupplied: false,
  },
  blockers: [
    'The allocation paper does not freeze the Filtered Bootstrap window, volatility filter, resampling, simulation, seed, horizon, missing-data, or sign conventions.',
    'The source computes the risk estimate and fills at the same close, which is not a causal executable rule.',
    'The Bloomberg, MSCI, RJ/CRB, and Merrill Lynch index histories and author-created prehistories are not supplied as immutable public bytes.',
    'Modern public proxies would materially change histories, return construction, currencies, cash flows, and defensive sleeves.',
    'GDP country mappings, releases, revisions, and point-in-time availability are not frozen.',
    'A flat annual expense ratio does not reproduce turnover-linked fees, spreads, slippage, or impact.',
    'The paper supplies no chronological folds, untouched holdout, or identically timed and costed public-data benchmark.',
  ],
  reason:
    'An exact independent replay would require invented risk-model parameters, unavailable proprietary and synthetic inputs, repaired fill timing, and a new cost model; a public-proxy study would therefore be a materially new hypothesis.',
};

const TC261_CRYPTO_FACTOR_SOURCE_AUDIT: TradeClawCryptoFactorSourceAuditEvidence = {
  taskId: 'TC-261',
  auditDate: '2026-08-29',
  researchPath: 'docs/research/2026-08-29-crypto-factor-investing-source-audit.md',
  researchSha256: 'ea924e6f15e34ec3e2240a247eef7dbe28fb12696690724ff61bb57a8b7038cd',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title:
      "Know When to Hodl 'Em, Know When to Fodl 'Em': An Investigation of Factor Based Investing in the Cryptocurrency Space",
    authors: ['Stefan Hubrich'],
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3055498',
    doi: 'https://doi.org/10.2139/ssrn.3055498',
    documentUrl:
      'https://assets.super.so/e46b77e7-ee08-445e-b43f-4ffd88ae0a0e/files/a2ce438a-42de-40d6-9eb7-272b28ce1cec.pdf',
    documentSha256: null,
    documentBytes: null,
    documentPages: 54,
    directSourceBytesAvailable: false,
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'weekly',
    holdingDays: 7,
    rebalanceSchedules: 7,
    grossExposurePct: 10,
    cashPct: 90,
    minimumCoins: 4,
    originalUniverse: [
      'BTC',
      'DASH',
      'DCR',
      'DOGE',
      'ETC',
      'ETH',
      'LTC',
      'PIVX',
      'XEM',
      'XMR',
      'ZEC',
    ],
    factors: ['momentum', 'value', 'carry'],
    factorPortfolioShortsAllowed: true,
    paperSample: 'approximately-four-years-through-2017-09',
  },
  publishedCostTreatment: {
    marketImpactIncluded: false,
    spreadAndFeePctOfNotional: [0.2, 0.5],
    momentumAnnualTradingVolumePct: [80, 90],
    combinedAnnualTradingVolumePct: [28, 32],
    combinedWorstCaseEstimatedCostBps: 15,
  },
  currentDataReceipt: {
    archiveRepositoryUrl: 'https://github.com/coinmetrics/data',
    archiveCommit: 'f1a36afb962731c387bb03982758ab0103063da5',
    archiveLicense: 'CC-BY-NC-4.0',
    archiveStabilityGuaranteed: false,
    communityCatalogUrl:
      'https://community-api.coinmetrics.io/v4/catalog/assets?assets=btc,dash,dcr,doge,etc,eth,ltc,pivx,xem,xmr,zec&pretty=true',
    communityCatalogResponseBytes: 96382,
    communityCatalogResponseSha256:
      '1eb632d06eceaa2a4112fd81f771c4963543f5afeb7d64e8af489c4fb9463d63',
    originalUniverseAssets: 11,
    priceUsdAssetsAvailable: 10,
    pivxPriceUsdAvailable: false,
    pivxArchiveSha256:
      '104d69d15fc28b1e594cb8be64b39fc36433bea98d98e64aca5870ff4db94b39',
    pivxArchiveFirstDate: '2018-01-24',
    pivxArchiveFirstReferenceRateDate: '2026-05-18',
    rawBytesCommitted: false,
  },
  blockers: [
    'The point-in-time September 2017 Coin Metrics and CryptoCompare source bytes, extraction code, and revision rules are not supplied.',
    'The current official Coin Metrics catalog has PriceUSD coverage for only 10 of the paper\'s 11 assets.',
    'The pinned PIVX archive cannot reconstruct PIVX prices across the paper sample or a later holdout.',
    'Current DCR, DOGE, and other metric start dates differ from the paper, proving that the current community catalog is not the source vintage.',
    'Dropping PIVX or substituting another provider changes factor ranks, standardization, weights, universe entry, and all seven schedules.',
    'The strongest factor portfolios require short positions that the paper says could not be implemented at scale.',
    'Modern perpetual futures require new venue eligibility, funding, borrow, margin, liquidation, spread, and fill histories.',
    'The paper supplies no chronological folds, untouched holdout, or identically timed and costed preregistration.',
    'The cost treatment assumes away market impact and does not freeze an executable multi-venue friction ledger.',
  ],
  reason:
    'An exact replay cannot recover the source data vintage or full universe, and an implementable reduced-universe or derivatives study would materially change the hypothesis and trading mechanics.',
};

const TC262_MOST_DIVERSIFIED_PORTFOLIO_SOURCE_AUDIT: TradeClawMostDiversifiedPortfolioSourceAuditEvidence = {
  taskId: 'TC-262',
  auditDate: '2026-08-30',
  researchPath: 'docs/research/2026-08-30-most-diversified-portfolio-source-audit.md',
  researchSha256: '669ff00c6ab39654e1641757af3dc99709b2a4e2458d104520c3fbfe5e9a23e6',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title: 'Properties of the Most Diversified Portfolio',
    authors: ['Yves Choueifaty', 'Tristan Froidure', 'Julien Reynier'],
    discoveryUrl:
      'https://paperswithbacktest.com/strategies/properties-of-the-most-diversified-portfolio',
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1895459',
    doi: 'https://doi.org/10.21314/JOIS.2013.033',
    documentUrl:
      'https://www.tobam.fr/wp-content/uploads/2021/12/2013-choueifatyfroidurereynier-properties-of-the-most-diversified-portfolio-jis.pdf',
    documentSha256: 'bef4ce6719f3355d30c51ea2e7bc0005e8ece43cd422c3d612056a50147d7916',
    documentBytes: 171320,
    documentPages: 22,
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'semiannual',
    rebalanceMonths: [5, 11],
    covarianceWindowMarketDays: 252,
    paperSample: '1999-01/2010-12',
    pointInTimeUniverse: 'MSCI-World',
    minimumPriceHistoryMonths: 6,
    retainedMarketCapRankFraction: 0.5,
    averageEligibleStocks: 793,
    averageEligibleCapitalizationPct: 90,
    averageMdpHoldings: 137,
    maximumStockWeightPct: 1.5,
    maximumRegionOverweightPctPoints: 5,
    turnoverPenaltyTrackingErrorPct: 1.5,
    longOnly: true,
  },
  sourceCloneMismatch: {
    primaryCadence: 'semiannual-end-May-end-November',
    cloneCadence: 'quarterly',
    primarySample: '1999-2010',
    cloneSample: '1990-2026',
    primaryAverageHoldings: 137,
    cloneCurrentLongPositions: 56,
  },
  publishedCostTreatment: {
    mdpOneWayAnnualTurnoverPct: 82,
    marketOneWayAnnualTurnoverPct: 14,
    mdpClaimedBreakEvenAllInTradingCostPct: 3.4,
    deterministicTradeLedgerSupplied: false,
  },
  inputProvenance: {
    exactSourceBytesSupplied: false,
    pointInTimeMsciMembershipPublic: false,
    bloombergTotalReturnsPublic: false,
    bloombergMarketCapitalizationsPublic: false,
    msciOfficialFxPublic: false,
    plesiochronousEstimatorExecutable: false,
    turnoverPenaltyExecutable: false,
  },
  blockers: [
    'Exact point-in-time MSCI World membership, region weights, official FX, and Bloomberg total-return and capitalization histories are not supplied as immutable public bytes.',
    'A current-constituent or US-only universe would introduce survivorship, geography, currency, liquidity, and benchmark changes.',
    'The author-developed plesiochronous correlation estimator is not executable from the paper description.',
    'The turnover penalty lacks its objective term, calibration, solver, convergence tolerance, and tie-breaking rules.',
    'Missing returns, corporate actions, market holidays, time-zone cutoffs, and rebalance information availability are not frozen.',
    'The paper does not specify a causal next-session or next-common-market fill convention.',
    'The stock cap and region constraints require contemporaneous classifications and benchmark weights unavailable in the source package.',
    'The cost discussion is a break-even sensitivity rather than a deterministic friction ledger tied to realized trades.',
    'No chronological folds, immutable post-publication holdout, identically costed external market, or replay artifact is supplied.',
    'The dynamic clone contradicts the primary cadence and sample while its pseudo-code is subscription-only.',
  ],
  reason:
    'The mathematical MDP objective is clear, but exact empirical replay would require proprietary point-in-time inputs plus invented estimator, penalty, fill, and friction choices; a public-universe implementation would be a materially new hypothesis.',
};

const TC263_CRYPTOCURRENCY_AS_MONEY_SOURCE_AUDIT: TradeClawCryptocurrencyAsMoneySourceAuditEvidence = {
  taskId: 'TC-263',
  auditDate: '2026-08-30',
  researchPath: 'docs/research/2026-08-30-cryptocurrency-as-money-source-audit.md',
  researchSha256: 'aa5ce752d428b12823b5f0a5f5b062179953cf8570a818cb0754bbe2e2fff9cd',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title: 'Cryptocurrency As Money: A Trading Strategy Solution',
    authors: ['Marko Ogorevc'],
    discoveryUrl:
      'https://paperswithbacktest.com/strategies/cryptocurrency-as-money-a-trading-strategy-solution',
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3436041',
    doi: 'https://doi.org/10.2139/ssrn.3436041',
    documentUrl:
      'https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID3436041_code3654339.pdf?abstractid=3436041',
    documentSha256: '0b3c8344b8f28ccd17ac3902eb4532d7dd0d179e2a64859533a9239432e743c0',
    documentBytes: 453903,
    documentPages: 9,
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    structure: 'long-only-two-cryptocurrency-grid',
    defaultTradingRangePct: 30,
    defaultSteps: 7,
    equalInitialCashValueWeights: true,
    orderSizing: 'linearly-increasing-both-sides-unspecified-formula',
    cycleReset: 'equal-split-with-profit-unspecified-trigger',
    userAdjustable: true,
    paperIllustration: 'LTCBTC-2018-07-31/2019-07-31',
  },
  sourceCloneMismatch: {
    primaryCadence: 'event-driven-standing-limit-orders',
    cloneCadence: 'weekly',
    primarySample: '2018-07-31/2019-07-31-illustration',
    cloneSample: '1992-2026',
  },
  publishedCostTreatment: {
    deterministicTradeLedgerSupplied: false,
    completeFrictionModelSupplied: false,
    breakEvenCostSupplied: false,
    makerTakerFeesSupplied: false,
  },
  inputProvenance: {
    exactSourceBytesSupplied: false,
    venueIdentified: false,
    eventLevelDataSupplied: false,
    executableGridFormulaSupplied: false,
    executableFillRulesSupplied: false,
    applicationCodeSupplied: false,
  },
  userExperiment: {
    accounts: 191,
    activePairs: 235,
    averageActiveDays: 142.5,
    stillActivePct: 41,
    fixedProtocol: false,
  },
  blockers: [
    'The seven grid levels are not defined by an exact price-spacing formula.',
    'Linearly increasing order quantity has no intercept, slope, normalization, rounding, or balance-reservation rule.',
    'The cycle reset has no exact trigger, valuation price, timestamp, or tie-breaking convention.',
    'Initial split fills, reference price, order sequence, cancellations, replacements, partial fills, and gap behavior are unspecified.',
    'The exchange, pair identifiers, event timestamps, source bytes, application version, and raw order or fill ledger are absent.',
    'Fees, rebates, spread, slippage, queue priority, market impact, minimums, latency, and outages are not frozen.',
    'User-selected settings and pairs make the reported account averages an observational mixture rather than one fixed strategy.',
    'The one-year illustration supplies no chronological folds, untouched holdout, identically costed benchmark, or external venue or pair falsification.',
    'The dynamic discovery clone contradicts the primary cadence and sample while its implementation is hidden.',
  ],
  reason:
    'The source communicates a useful grid concept but omits the executable formulas, venue and immutable event data, causal limit-order fills, complete costs, and fixed evaluation protocol needed for exact independent replay; a venue-specific implementation would be a materially new hypothesis.',
};

const TC264_ROLLING_VS_EXPANDING_SOURCE_AUDIT: TradeClawRollingVsExpandingSourceAuditEvidence = {
  taskId: 'TC-264',
  auditDate: '2026-08-30',
  researchPath: 'docs/research/2026-08-30-rolling-vs-expanding-mean-reversion-source-audit.md',
  researchSha256: '7262373f8db0fb01ef63eaa817c468bb3d180490bfb48438fc8720ac681c9db3',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title:
      'Rolling vs. Expanding Windows in Mean-Reversion Strategies: Evidence from Gold-Silver and Cross-Asset Validation',
    authors: ['Akshit Gupta'],
    discoveryUrl:
      'https://paperswithbacktest.com/strategies/rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation',
    discoveryHtmlSha256:
      'ae252fd968872a8932e67b4e48aa75c88188ae9aad305a3e811ced1e50145455',
    discoveryHtmlBytes: 203968,
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6217778',
    doi: 'https://doi.org/10.2139/ssrn.6217778',
    documentSha256: '94ce5ddb4c6f211989440b087cf7f9fcc368907bb0f0d8955058a0cb935197e6',
    documentBytes: 636787,
    documentPages: 19,
    extractedTextSha256:
      'e1188a944503603ec29bd02c50f68c13f92b62dec081a413a0f229608f49b70b',
    extractedTextBytes: 50556,
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    structure: 'long-denominator-commodity-ratio-mean-reversion',
    signalFrequency: 'daily-close-lagged-one-trading-day',
    windowYears: 7,
    thresholdZ: 1.25,
    confirmationDeclinePct: 2,
    confirmationLookbackTradingDays: 10,
    holdingPeriodTradingDays: 15,
    earlyExit: false,
    parameterCombinationsSwept: 72,
    finalVixThreshold: 20,
    finalVixOverweight: 1.15,
  },
  selectionAndValidation: {
    parametersSelectedUsingFullSample: true,
    temporalSplit: '2005-2015/2016-2026-retrospective',
    primaryTrades: 47,
    crossAssetPairs: 5,
    pooledTrades: 350,
    postPublicationHoldoutFrozen: false,
  },
  sourceCloneMismatch: {
    primaryCadence: 'event-driven-daily-signal-with-15-trading-day-hold',
    cloneCadence: 'daily',
    primarySample: '2000-01-01/2026-02-09',
    cloneSample: '1990-2026',
    cloneCurrentPosition: 'SPX-short-304',
  },
  inputProvenance: {
    exactSourceBytesSupplied: false,
    investingComSeriesPinned: false,
    futuresContractsPinned: false,
    rollRulesSupplied: false,
    executableFillRulesSupplied: false,
    overlappingPositionRulesSupplied: false,
  },
  publishedCostTreatment: {
    baselinePerSideBasisPoints: 10,
    sensitivityMaxPerSideBasisPoints: 50,
    deterministicTradeLedgerSupplied: false,
    completeFrictionModelSupplied: false,
  },
  blockers: [
    'The exact Investing.com files, stable tickers, retrieval timestamp, revisions, time zones, calendars, and redistribution rights are not frozen.',
    'Copper and Brent futures contracts, continuation method, expiry selection, roll dates, adjustment, and carry or collateral treatment are unspecified.',
    'The executable denominator vehicle is not fixed, so spot, ETF, and futures returns remain materially different hypotheses.',
    'Ratio units, cross-market holiday alignment, missing-close behavior, and the exact seven-year window convention are not executable.',
    'The next entry price, order type, session, and exit-price timestamp are not defined after the lagged close signal.',
    'Overlapping signals, cooldowns, repeated-entry capital, and concurrent-ratio netting rules are omitted.',
    'Confirmation endpoints, z-score variance convention, equality behavior, and numerical rounding are not frozen.',
    'The flat cost sensitivity has no realized trade ledger and omits spread, slippage, rolls, financing, collateral yield, taxes, and impact.',
    'The primary parameters were chosen after a 72-combination full-sample sweep, including a downstream choice between the 1.25 and 1.5 thresholds.',
    'The 2016-2026 temporal split is retrospective because the paper says parameters were selected on the full 2000-2026 sample.',
    'The February 2026 publication leaves no meaningful prospective sample for a rule reporting about two primary trades per year.',
    'Cross-asset pooling shares the unpinned source family and pre-publication process, and the final VIX sizing rule is adopted after pooled testing.',
    'The dynamic discovery clone contradicts the paper sample, exposure, and current instrument while its implementation is not an accepted specification.',
  ],
  reason:
    'The high-level low-frequency ratio rule is understandable, but exact replay would require invented vendor series, futures rolls, tradable vehicles, causal fills, overlap accounting, complete costs, and an untouched evaluation protocol; a public-data implementation would be a materially new hypothesis.',
};

const TC265_GOOD_CARRY_SOURCE_AUDIT: TradeClawGoodCarrySourceAuditEvidence = {
  taskId: 'TC-265',
  auditDate: '2026-08-30',
  researchPath: 'docs/research/2026-08-30-good-carry-bad-carry-source-audit.md',
  researchSha256: 'd3d737ec675d7b522f38e144f20b96f21b3fae64de799d463ccf286d1d73c820',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title: 'Good Carry, Bad Carry',
    authors: ['Geert Bekaert', 'George Panayotov'],
    discoveryUrl: 'https://paperswithbacktest.com/strategies/good-carry-bad-carry',
    discoveryHtmlSha256:
      '88888b8a6ab2dec7a4590c3f0f00927e0f318e8be13beee720c61c11026c6f3d',
    discoveryHtmlBytes: 205367,
    columbiaDocumentUrl:
      'https://business.columbia.edu/sites/default/files-efs/pubfiles/26212/good_carry.pdf',
    columbiaDocumentSha256:
      '24d54034c6b74944d4dd3bcfc20ddf2db85871f914d91be5833af0eba8435727',
    columbiaDocumentBytes: 380097,
    columbiaDocumentPages: 88,
    columbiaVersionDate: '2018-01-16',
    nberUrl: 'https://www.nber.org/papers/w25420',
    nberDoi: 'https://doi.org/10.3386/w25420',
    nberDocumentSha256:
      'afb9d2a98720f87659c2ba8b6c675e1b616ef0403ef39bfd17b4a662dbd595a5',
    nberDocumentBytes: 344309,
    nberDocumentPages: 78,
    finalDoi: 'https://doi.org/10.1017/S0022109019000887',
    finalPublishedOnline: '2019-10-21',
    finalPublication: 'Journal of Financial and Quantitative Analysis 55(4), 2020, 1063-1094',
    publicReplicationPackageSupplied: false,
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'monthly',
    paperSample: '1984-12/2014-06',
    monthlyObservations: 354,
    universe: ['NZD', 'AUD', 'GBP', 'NOK', 'SEK', 'CAD', 'USD', 'EUR-or-DEM', 'CHF', 'JPY'],
    rankSignal: 'mid-quote-one-month-forward-differential-F-over-S-minus-one',
    totalGrossAbsoluteWeight: 1,
    rebalance: 'month-end-to-next-month-end',
    oddSubsetTreatment: 'drop-median-ranked-currency',
    longReturn: 'forward-bid-over-next-spot-ask-minus-one',
    shortReturn: 'one-minus-forward-ask-over-next-spot-bid',
  },
  selectionAndValidation: {
    dynamicStart: '1994-12',
    dynamicEnd: '2014-05',
    dynamicMonths: 234,
    expandingHistoryStarts: '1984-12',
    maximumSequentialExclusions: 7,
    causalNextMonthApplication: true,
    fixedSubsetsChosenAfterDynamicHistory: true,
    fixedSubsetsEvaluatedOnFullSample: true,
    authorAcknowledgesLookBackBias: true,
    postPublicationHoldoutFrozen: false,
  },
  sourceCloneMismatch: {
    paperDataset: 'Barclays-Bank-spot-and-one-month-forward-bid-ask-via-Datastream',
    cloneDataset: 'Forex Daily Price',
    paperSample: '1984-12/2014-06',
    cloneSample: '1990-2026',
    cloneCodeFlag: true,
    cloneCodePubliclyInspectable: false,
  },
  inputProvenance: {
    exactSourceBytesSupplied: false,
    barclaysBankIdentified: true,
    datastreamIdentified: true,
    vendorIdentifiersPinned: false,
    sourceVintagePinned: false,
    demEuroSplicePinned: false,
    authorizedDatasetPresent: false,
  },
  publishedCostTreatment: {
    observedBidAskUsed: true,
    flatCostProxy: false,
    quoteSideHistorySupplied: false,
    deterministicTradeLedgerSupplied: false,
    completeCurrentFrictionModelSupplied: false,
  },
  blockers: [
    'The exact Barclays Bank spot and one-month forward bid/ask bytes are not publicly supplied or present under an authorized TradeClaw license.',
    'Exact vendor identifiers, source vintage, timestamp and calendar conventions, missing or stale quote handling, and the DEM/EUR splice are not frozen.',
    'The ranking signal and quote-side returns cannot be reconstructed from the discovery page\'s visible Forex Daily Price dataset.',
    'The clone code is not publicly inspectable, so its 1990-2026 output cannot be audited as an implementation of the paper.',
    'Spot momentum, public rate proxies, covered-interest-parity forwards, midpoint fills, and assumed spreads are materially different hypotheses.',
    'The dynamic selection exercise lacks an immutable public input package and a post-publication holdout frozen before this audit.',
    'The fixed good and bad subsets use the dynamic exclusion history and full research sample, and the authors explicitly acknowledge look-back bias.',
    'The historical bid/ask convention does not provide a current executable friction schedule or deterministic trade ledger for a new implementation.',
  ],
  reason:
    'Exact replay requires unavailable proprietary forward and bid/ask source bytes; the visible spot-only clone is materially non-equivalent, while the fixed headline subsets are ex-post selections with author-disclosed look-back bias. A public-data implementation would be a materially new hypothesis.',
};

const TC266_RISK_FACTOR_PARITY_SOURCE_AUDIT: TradeClawRiskFactorParitySourceAuditEvidence = {
  taskId: 'TC-266',
  auditDate: '2026-08-30',
  researchPath: 'docs/research/2026-08-30-risk-factor-parity-source-audit.md',
  researchSha256: 'fe1a4b5bc80c5bfcc90150f05a74c2c4070f29c9e40e7d2a256209e478bcc9fd',
  disposition: 'no-go',
  tradeClawBacktestRun: false,
  primarySource: {
    title: 'Risk Parity Portfolios with Risk Factors',
    authors: ['Thierry Roncalli', 'Guillaume Weisang'],
    discoveryUrl:
      'https://paperswithbacktest.com/strategies/risk-parity-portfolios-with-risk-factors',
    mpraRecordUrl: 'https://mpra.ub.uni-muenchen.de/44017/',
    mpraDocumentUrl:
      'https://mpra.ub.uni-muenchen.de/44017/1/risk-factor-parity.pdf',
    mpraItemId: 44017,
    documentPages: 33,
    documentSha256: null,
    localByteAcquisition: 'blocked-before-hash',
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2155159',
    ssrnDoi: 'https://doi.org/10.2139/ssrn.2155159',
    journalDoi: 'https://doi.org/10.1080/14697688.2015.1046907',
    publicReplicationPackageSupplied: false,
    redistributionRightsEstablished: false,
  },
  paperScope: {
    sourceType: 'methodology-with-three-distinct-applications',
    applications: [
      'equity-factor-risk-budgeting',
      'hedge-fund-pca-factor-parity',
      'strategic-asset-allocation',
    ],
    singleExecutableStrategySpecified: false,
    optimizationMayHaveMultipleSolutions: true,
    longOnlyMatchingGuaranteed: false,
  },
  equityApplication: {
    universe: [
      'MSCI-USA-Large-Growth',
      'MSCI-USA-Large-Value',
      'MSCI-USA-Mid-Growth',
      'MSCI-USA-Mid-Value',
      'MSCI-USA-Small-Growth',
      'MSCI-USA-Small-Value',
    ],
    factorModel: 'Fama-French-Carhart-market-SMB-HML-MOM',
    estimator: 'maximum-likelihood',
    rollingWindowMonths: 12,
    snapshots: ['2011-06', '2012-06'],
    studyDateSensitivityAcknowledged: true,
  },
  hedgeFundApplication: {
    universe: 'Dow-Jones-Credit-Suisse-AllHedge-plus-10-subindexes',
    returnCadence: 'monthly',
    covarianceWindowMonths: 24,
    factors: 'first-four-PCA-factors',
    factorRiskBudgetEachPct: 25,
    rebalance: 'month-end',
    simulationWindow: '2009-09/2012-08',
    holdingsNoLongerPublic: true,
    holdingsAssumedConstant: true,
    higherTurnoverAcknowledged: true,
  },
  strategicApplication: {
    source: 'Datastream',
    cadence: 'quarterly',
    sample: '1999-Q1/2012-Q2',
    economicSeries: 7,
    factorGroups: 4,
    assetClasses: 13,
    preliminaryResults: true,
  },
  sourceCloneMismatch: {
    cloneSample: '1990-2026',
    cloneCadence: 'monthly',
    cloneDataset: 'ETFs-Daily-Price-plus-All-Monthly-Coreeconomicdata',
    cloneCurrentPortfolio: '27-long-US-stocks',
    paperCurrentPortfolioSpecified: false,
    clonePseudoCodePublic: false,
  },
  inputProvenance: {
    exactSourceBytesSupplied: false,
    proprietaryMsciIndexesRequired: true,
    hedgeIndexHoldingsPublic: false,
    datastreamSeriesPubliclyPinned: false,
    authorizedDatasetPresent: false,
  },
  publishedCostTreatment: {
    transactionCostModelSupplied: false,
    causalFillRuleSupplied: false,
    turnoverLinkedLedgerSupplied: false,
    completeFrictionModelSupplied: false,
  },
  validation: {
    chronologicalFoldsSupplied: false,
    untouchedHoldoutSupplied: false,
    externalFalsificationMarketSupplied: false,
    deterministicReplayArtifactSupplied: false,
  },
  blockers: [
    'The source is a methodology with three distinct applications rather than one executable strategy matching the discovery clone.',
    'Exact MSCI USA style-index bytes, identifiers, vintages, and redistribution rights are not supplied.',
    'Exact Dow Jones Credit Suisse hedge-fund index bytes and historical holdings or exposures are not publicly supplied.',
    'Exact Datastream economic and asset-class series, vendor identifiers, vintages, and revision histories are not supplied.',
    'No authorized copy of any decisive proprietary input is present in the TradeClaw repository.',
    'The optimizer can be non-unique, and a matching long-only solution is not guaranteed; solver and infeasibility policies are not frozen.',
    'The equity example is date-sensitive and supplies point estimates rather than a deterministic chronological portfolio ledger.',
    'PCA standardization, component ordering and sign conventions, covariance details, and solver tolerances are not executable end to end.',
    'The strategic application lacks point-in-time macro release and revision rules.',
    'No causal signal-to-fill rule or tradable instrument mapping is supplied.',
    'No complete transaction-cost model or turnover-linked ledger is supplied.',
    'No chronological folds, untouched holdout, or external falsification gate is supplied.',
    'The clone code is hidden and its 1990-2026, 27-stock implementation is materially different from the paper applications.',
    'A valid local primary-PDF byte stream could not be acquired and hashed during this audit.',
  ],
  reason:
    'Exact replay requires unavailable proprietary inputs across three different empirical applications, non-unique optimization choices, causal fills, full costs, and a frozen falsification protocol; the hidden 27-stock clone is materially non-equivalent. A public-data implementation would be a materially new hypothesis.',
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

const TC258_BITCOIN_MAX_MIN_SOURCE_AUDIT: TradeClawBitcoinMaxMinSourceAuditEvidence = {
  taskId: 'TC-258',
  auditDate: '2026-08-29',
  researchPath: 'docs/research/2026-08-29-bitcoin-seasonality-max-min-source-audit.md',
  researchSha256: '834008ed2e8107d8f613c15096edaf9f225d8c43487efa123fb78f4056cafd82',
  disposition: 'advance',
  tradeClawBacktestRunAtAuditClose: false,
  primarySource: {
    title: 'Seasonality, Trend-following, and Mean reversion in Bitcoin',
    authors: ['Matúš Padyšák', 'Radovan Vojtko'],
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4081000',
    doi: 'https://doi.org/10.2139/ssrn.4081000',
    documentSha256: 'a8e7f1e4bb134a2ff3dea458872583463de2b69e8b895202a7d5b57ca99596a1',
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'daily',
    lookbacks: [10, 20, 30, 40, 50],
    headline: 'MAX10-or-MIN10',
    entry: 'next-day-first-observed-open',
    exit: 'last-observed-close-when-next-event-is-false',
    paperSample: '2015-11-26/2022-02-03',
  },
  intradayCostScreen: {
    rule: 'buy-21:00-UTC-sell-23:00-UTC-daily',
    publishedGrossAnnualizedReturn: 0.33,
    breakEvenCostPctPerSide: 0.03903125,
    disposition: 'no-go',
  },
  data: {
    source: 'CryptoDataDownload Gemini H1',
    license: 'CC-BY-NC-SA-4.0',
    rawBytesCommitted: false,
    btcCanonicalSha256: 'ab1e468e9065a77ed744314116e6c3bb41cbd88f492cc60a6e6fc4fdc87e9c68',
    ethCanonicalSha256: '6f5bc428c67da5534829f3b567d0c1e7b2e7b1294d6dde1fc56019deeccc20e4',
  },
  limits: [
    'The paper does not pin its data vintage, daily session boundary, executable close fill, or transaction-cost model.',
    'Three one-hour source gaps per asset remain observed gaps and are never filled or interpolated.',
    'The 10-day headline was selected after comparing five lookbacks on the paper sample.',
    'Raw source bytes are not distributed; any commercial market-data use requires a separate rights review.',
  ],
  reason:
    'The daily two-hour lane is cost-infeasible on its own published gross result, while the distinct event-driven MAX10/MIN10 rule is reconstructible, hashable, and testable under a post-paper holdout and ETH falsification market.',
};

const TC258_BITCOIN_MAX_MIN_EVIDENCE: TradeClawBitcoinMaxMinReplicationEvidence = {
  taskId: 'TC-258',
  studyDate: '2026-08-29',
  preregistrationPath: 'docs/plans/2026-08-29-bitcoin-max-min-replication.md',
  preregistrationSha256:
    '52b16a106559213c3fd42d42b25fd552dbab19bc250a61922ce7fb7fcc0f8e8a',
  sourceAuditPath: 'docs/research/2026-08-29-bitcoin-seasonality-max-min-source-audit.md',
  sourceAuditSha256:
    '834008ed2e8107d8f613c15096edaf9f225d8c43487efa123fb78f4056cafd82',
  resultPath: 'docs/research/2026-08-29-bitcoin-max-min-replication-result.md',
  resultSha256: 'f231a521dc677082804561fe70ca98b453571f4cd78bdeacf7d6cbf49b33e07e',
  artifactPath:
    'docs/research/experiments/bitcoin-max-min-BTCUSD_ETHUSD-D1-2015-11-26-2026-07-31-f4.json',
  artifactSha256: '90778b74e93028278d434ea6269db9aa0bd960962413c99e9d8c3f58eba022dc',
  verdict: 'fail',
  evidenceBasis: 'modeled-independent-gemini-replication',
  performanceGatesEvaluated: true,
  eligibleForProspectiveReview: false,
  activationApproved: false,
  publicationApproved: false,
  costs: {
    feePctPerSide: 0.1,
    slippagePctPerSide: 0.15,
    headlineTotalPctPerSide: 0.25,
    fundingPctPer8h: 0,
  },
  qa: {
    standingQaPassed: true,
    btcDays: 3901,
    ethDays: 3735,
    incompleteDaysPerSymbol: 3,
  },
  paperWindowGrossControl: {
    annualizedReturn: 1.05563585,
    sourceTargetAnnualizedReturn: 0.9843,
  },
  intradayCostNoGo: {
    publishedGrossAnnualizedReturn: 0.33,
    breakEvenCostPctPerSide: 0.03903125,
    feeOnlyImpliedAnnualizedNet: -0.07703356,
    headlineImpliedAnnualizedNet: -0.78633752,
  },
  btc: {
    grossCompoundedReturn: 131.7769195,
    netCompoundedReturn: 3.39034173,
    completedEpisodes: 681,
    meanNetEpisodeReturn: 0.00347343,
    netEpisodeTStatistic: 1.7301533,
    positiveFolds: 2,
    totalFolds: 4,
    holdoutGrossCompoundedReturn: 0.56537722,
    holdoutFeeOnlyCompoundedReturn: -0.1463008,
    holdoutNetCompoundedReturn: -0.65656935,
    holdoutMeanNetEpisodeReturn: -0.00275981,
    holdoutBreakEvenCostPctPerSide: 0.07392099,
    maximumDrawdown: 0.77302474,
    calmar: 0.19272055,
    spotCalmar: 0.73161814,
  },
  eth: {
    grossCompoundedReturn: 456.60438224,
    netCompoundedReturn: 18.92720699,
    completedEpisodes: 626,
    meanNetEpisodeReturn: 0.00788293,
    netEpisodeTStatistic: 2.31191184,
    positiveFolds: 2,
    totalFolds: 4,
    holdoutGrossCompoundedReturn: 0.3027366,
    holdoutFeeOnlyCompoundedReturn: -0.25009523,
    holdoutNetCompoundedReturn: -0.67282522,
    holdoutMeanNetEpisodeReturn: -0.00283627,
    holdoutBreakEvenCostPctPerSide: 0.04789924,
    maximumDrawdown: 0.79909692,
    calmar: 0.42668048,
    spotCalmar: 0.64773174,
  },
  reason:
    'BTC and ETH retained spectacular full-history gross and positive full-history net returns, but both failed post-paper holdout, fold-stability, and Calmar gates; neither holdout cleared the fee alone.',
};

const TC259_TERM_PREMIUM_SOURCE_AUDIT: TradeClawTermPremiumSourceAuditEvidence = {
  taskId: 'TC-259',
  auditDate: '2026-08-29',
  researchPath: 'docs/research/2026-08-29-trading-term-premium-source-audit.md',
  researchSha256: 'cef21d66d07f29fb32af67f542a482491c4ffd0e00b656ea79bdb9600e0f8965',
  disposition: 'advance',
  tradeClawBacktestRunAtAuditClose: false,
  primarySource: {
    title: 'Trading the Term Premium',
    authors: ['Luke van Schaik', 'Emlyn Flint', 'Florence Chikurunhe'],
    ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4324696',
    doi: 'https://doi.org/10.2139/ssrn.4324696',
    documentSha256: '867fe06c98fb89d8d7139ec778eaf0367adfad45a86edde4a95d85e1f0deabc0',
    redistributionRightsEstablished: false,
  },
  publishedRule: {
    cadence: 'monthly',
    signal: 'continuously-compounded-10y-minus-3m',
    movingAverageMonths: 40,
    highSleeve: 'modeled-ten-year-zero',
    lowSleeve: 'modeled-one-month-zero',
    paperSample: '1968-01/2021-01',
    expectedMaturityResetsPerYear: 12,
  },
  data: {
    source: 'Federal Reserve Gürkaynak-Sack-Wright nominal curve',
    completeSourceSha256:
      '877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7',
    normalizedSnapshotSha256:
      '29442bea3f4ccef06aa741ff4afd6202c2a029cf6f43966f04e482960959f041',
    publicDomainWithAttribution: true,
    currentVintage: true,
    rawBytesCommitted: false,
  },
  costScreen: {
    headlineSideBps: 5,
    stressSideBps: 12.5,
    costChargedEveryMaturityReset: true,
  },
  limits: [
    'The paper does not specify whether the decision month is included in its 40-month moving average.',
    'The fitted current-vintage curve is not the authors retained source vintage or executable security history.',
    'The first 44 paper-window outcomes extend beyond the supplied ten-year comparison field.',
    'The paper omits costs; TradeClaw applies a disclosed modern modeling surcharge rather than historical fills.',
  ],
  reason:
    'The simple monthly rule is independently reconstructible from exact public Federal Reserve bytes, supports identically costed duration and cash controls, and has a 42-month post-publication holdout; modeled-price and source-ambiguity limits remain explicit.',
};

const TC259_TERM_PREMIUM_EVIDENCE: TradeClawTermPremiumReplicationEvidence = {
  taskId: 'TC-259',
  studyDate: '2026-08-29',
  preregistrationPath: 'docs/plans/2026-08-29-trading-term-premium-replication.md',
  preregistrationSha256:
    '74b138499e36ea55f03490069a3c3f3823e458997c4cb00daf82903bd3f6387b',
  sourceAuditPath: 'docs/research/2026-08-29-trading-term-premium-source-audit.md',
  sourceAuditSha256:
    'cef21d66d07f29fb32af67f542a482491c4ffd0e00b656ea79bdb9600e0f8965',
  resultPath: 'docs/research/2026-08-29-trading-term-premium-replication-result.md',
  resultSha256: 'f1f9281a100a21a3a5988eb8c6896dd2e157554e1b7c1bf9b4b2c33942176d6e',
  artifactPath:
    'docs/research/experiments/trading-term-premium-US-NOMINAL-MA40-1968-01-2026-07-f4.json',
  artifactSha256: 'e30db6b2cbd9f7e9865c0c6c65699c6f2dd2a772f43e449ff63e9120ee6fb18e',
  verdict: 'fail',
  evidenceBasis: 'modeled-current-vintage-independent-replication',
  performanceGatesEvaluated: true,
  eligibleForProspectiveReview: false,
  activationApproved: false,
  publicationApproved: false,
  costs: {
    headlineSideBps: 5,
    stressSideBps: 12.5,
    tenYearAdverseSidesPerMonth: 2,
    oneMonthAdverseSidesPerMonth: 1,
  },
  qa: {
    standingQaPassed: true,
    curveRows: 782,
    nelsonSiegelRows: 223,
    svenssonRows: 559,
    suppliedYieldChecks: 18334,
    suppliedYieldChecksAboveTolerance: 0,
    fullOutcomes: 703,
    holdoutOutcomes: 42,
    earlyExtrapolatedPaperOutcomes: 44,
  },
  full: {
    grossCompoundedReturn: 66.707633586989,
    headlineCompoundedReturn: 39.174968845477,
    stressCompoundedReturn: 17.365631462152,
    headlineAnnualizedSharpe: 0.778536552742,
    headlineMaximumDrawdown: 0.197535219739,
    alwaysTenYearHeadlineCompoundedReturn: 25.459444018235,
    alwaysOneMonthHeadlineCompoundedReturn: 9.965281972918,
  },
  holdout: {
    grossCompoundedReturn: 0.138778864332,
    headlineCompoundedReturn: 0.103469314645,
    stressCompoundedReturn: 0.052557463149,
    headlineAnnualizedSharpe: 0.597730405628,
    headlineMaximumDrawdown: 0.060036705572,
    priorOnlyHeadlineCompoundedReturn: 0.136992657136,
    alwaysTenYearHeadlineCompoundedReturn: -0.008364693383,
    alwaysOneMonthHeadlineCompoundedReturn: 0.156215427867,
    canonicalMinusAlwaysOneMonthCompoundedExcess: -0.045619624121,
  },
  stability: {
    passingPaperFolds: 1,
    totalPaperFolds: 4,
  },
  failedGates: ['paperFoldStability', 'holdoutBeatsAlwaysOneMonth'],
  reason:
    'All standing QA and full-window gates passed, but only one of four paper folds beat both frozen benchmarks and the canonical post-publication holdout returned 10.35% after modeled costs versus 15.62% for the identically costed one-month sleeve.',
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
  reason:
    "The frozen BTC/ETH replication failed after modeled costs: BTC and ETH each lost more than 99% net, neither produced a positive fold, and the fixed portfolio lost 29.53% in holdout; BTC's 0.045% mean gross edge per trade was below 0.40% round-trip friction.",
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
        : candidate.id === BITCOIN_SEASONALITY_MAX_MIN_ID
          ? TC258_BITCOIN_MAX_MIN_EVIDENCE
          : candidate.id === TRADING_TERM_PREMIUM_ID
            ? TC259_TERM_PREMIUM_EVIDENCE
            : null;
    const tradeClawSourceAudit =
      candidate.id === PRICE_OVERREACTIONS_ID
        ? TC256_PRICE_OVERREACTIONS_SOURCE_AUDIT
        : candidate.id === END_OF_MONTH_TREASURY_ID
          ? TC257_TREASURY_SOURCE_AUDIT
          : candidate.id === BITCOIN_SEASONALITY_MAX_MIN_ID
            ? TC258_BITCOIN_MAX_MIN_SOURCE_AUDIT
            : candidate.id === TRADING_TERM_PREMIUM_ID
              ? TC259_TERM_PREMIUM_SOURCE_AUDIT
              : candidate.id === RISK_BASED_TACTICAL_ALLOCATION_ID
                ? TC260_RISK_BASED_ALLOCATION_SOURCE_AUDIT
                : candidate.id === CRYPTO_FACTOR_INVESTING_ID
                  ? TC261_CRYPTO_FACTOR_SOURCE_AUDIT
                  : candidate.id === MOST_DIVERSIFIED_PORTFOLIO_ID
                    ? TC262_MOST_DIVERSIFIED_PORTFOLIO_SOURCE_AUDIT
                    : candidate.id === CRYPTOCURRENCY_AS_MONEY_ID
                      ? TC263_CRYPTOCURRENCY_AS_MONEY_SOURCE_AUDIT
                      : candidate.id === ROLLING_VS_EXPANDING_MEAN_REVERSION_ID
                        ? TC264_ROLLING_VS_EXPANDING_SOURCE_AUDIT
                        : candidate.id === GOOD_CARRY_BAD_CARRY_ID
                          ? TC265_GOOD_CARRY_SOURCE_AUDIT
                          : candidate.id === RISK_FACTOR_PARITY_ID
                            ? TC266_RISK_FACTOR_PARITY_SOURCE_AUDIT
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
      const nextAction = tradeClawEvidence.taskId === 'TC-258'
        ? 'Archive the failed composite without selecting a better-looking MAX-only control; use the post-paper fee-only failure to screen the next candidate.'
        : tradeClawEvidence.taskId === 'TC-259'
          ? 'Archive the failed term-spread timing result without switching to the stronger prior-only control; screen the next candidate on fold stability and a cash benchmark before opening returns.'
          : 'Archive the failed result without retuning or promotion; use the break-even cost finding to screen lower-turnover candidates.';
      return {
        ...candidate,
        sourcePosition,
        discoveryBasis: 'upstream-gross-metadata' as const,
        stage: 'replicated' as const,
        verdict: 'fail' as const,
        costStatus: 'failed' as const,
        nextAction,
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
        nextAction: tradeClawSourceAudit.taskId === 'TC-266'
          ? 'Archive the exact-source no-go; any public risk-factor-parity implementation must begin as a separately hashed hypothesis with frozen universe, data, estimator, costs, folds, and holdout before returns.'
          : tradeClawSourceAudit.taskId === 'TC-265'
            ? 'Archive the exact-source no-go; any new public-data currency-carry hypothesis must freeze immutable inputs, causal fills, complete costs, chronological folds, a post-publication holdout, and external falsification before returns.'
            : tradeClawSourceAudit.taskId === 'TC-264'
            ? 'Archive the exact-source no-go; any new public-commodity mean-reversion hypothesis must freeze instruments, source bytes, fills, costs, controls, and a prospective holdout in a later UTC window before returns.'
            : tradeClawSourceAudit.taskId === 'TC-263'
            ? 'Archive the exact-source no-go; any new venue-specific cryptocurrency grid hypothesis must freeze rules, event data, costs, controls, and holdout in a later UTC window before returns.'
            : tradeClawSourceAudit.taskId === 'TC-262'
              ? 'Archive the exact-source no-go; any public-universe MDP implementation must begin as a separately hashed hypothesis in a later UTC window before returns.'
              : 'Archive the published specification as a source-audited no-go; preregister only a materially new hypothesis with explicit rules, data, costs, and holdout.',
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
