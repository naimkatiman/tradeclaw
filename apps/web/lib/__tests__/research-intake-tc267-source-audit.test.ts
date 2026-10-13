import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SYSTEMATIC_RESEARCH_INTAKE, summarizeResearchIntake } from '../research-intake';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
} from '../research-intake-admin';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidencePayload,
} from '../research-intake-public';
import { buildMarketingReviewDraft } from '../research-loop';
import {
  RESEARCH_LOOP_MARKETING_HANDOFFS,
  getResearchLoopMarketingReview,
} from '../research-loop-marketing';
import {
  RESEARCH_LOOP_RECEIPTS,
  getResearchLoopReceiptSnapshot,
} from '../research-loop-receipts';

const root = resolve(__dirname, '../../../..');
const sourceAuditPath = resolve(
  root,
  'docs/research/2026-08-30-when-factor-timing-makes-sense-source-audit.md',
);
const candidateId = 'when-factor-timing-makes-sense';
const recordedAt = '2026-08-30T12:00:59.497Z';

interface Tc267Audit {
  taskId: string;
  researchSha256: string;
  disposition: string;
  tradeClawBacktestRun: boolean;
  primarySource: {
    title: string;
    authors: readonly string[];
    discoveryUrl: string;
    uclaReportUrl: string;
    uclaIndexUrl: string;
    ssrnUrl: string;
    doi: string;
    documentPages: number;
    documentBytes: number;
    documentSha256: string;
    localByteAcquisition: string;
    publicReplicationPackageSupplied: boolean;
    redistributionRightsEstablished: boolean;
  };
  paperScope: {
    sourceType: string;
    historicalMarketBacktestSupplied: boolean;
    actualFactorUniverseSupplied: boolean;
    causalTradableStrategySupplied: boolean;
    clairvoyantPeriodCorrelationKnown: boolean;
  };
  singleStrategy: {
    exampleCadence: string;
    deltaT: number;
    investorCases: readonly string[];
    perfectStateSharpeKnown: boolean;
    meaningfulGainCondition: string;
    realTimeStateSignalSupplied: boolean;
  };
  multiFactorSimulation: {
    factorCountParameter: string;
    eachFactorSharpe: number;
    longRunPairwiseCorrelation: number;
    correlationMatrixDistribution: string;
    sampledIndependentlyEachPeriod: boolean;
    offDiagonalAbsoluteBoundParameter: string;
    rebalanceCadence: string;
    deltaT: number;
    optimizer: string;
    nonnegativeAllocations: boolean;
    perfectPeriodCorrelationForesight: boolean;
    monteCarloMethod: string;
    benefitThresholdApproxFactorCount: string;
    belowEightImprovementPctLessThan: number;
    historicalReturnsUsed: boolean;
  };
  sourceCloneMismatch: {
    cloneSample: string;
    cloneCadence: string;
    cloneDataset: string;
    clonePositions: string;
    cloneVisibleTickers: readonly string[];
    clonePseudoCodePublic: boolean;
    paperEtfUniverseSpecified: boolean;
    paperHistoricalSampleSpecified: boolean;
    datasetSpyFirstObservation: string;
    cloneSampleStartsBeforeDatasetExample: boolean;
    liveCloneMetricsEvidenceBasis: string;
  };
  inputProvenance: {
    exactPrimaryBytesAcquired: boolean;
    primaryBytesRetained: boolean;
    authorizedHistoricalDatasetPresent: boolean;
    actualFactorReturnSeriesSupplied: boolean;
    pointInTimeCorrelationEstimatorSupplied: boolean;
    cloneCodeSupplied: boolean;
  };
  publishedCostTreatment: {
    transactionCostModelSupplied: boolean;
    transactionCostsAcknowledgedAsImplementationChallenge: boolean;
    causalFillRuleSupplied: boolean;
    turnoverLinkedLedgerSupplied: boolean;
    completeFrictionModelSupplied: boolean;
  };
  validation: {
    chronologicalFoldsSupplied: boolean;
    untouchedHoldoutSupplied: boolean;
    externalFalsificationMarketSupplied: boolean;
    deterministicReplayArtifactSupplied: boolean;
  };
  blockers: readonly string[];
}

function taskId(record: {
  tradeClawEvidence: { taskId: string } | null;
  tradeClawSourceAudit: { taskId: string } | null;
}): string | null {
  return record.tradeClawEvidence?.taskId ?? record.tradeClawSourceAudit?.taskId ?? null;
}

describe('TC-267 When Factor Timing Makes Sense source audit', () => {
  it('binds the exact paper and hidden ETF clone to a no-return no-go', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.id === candidateId);
    const audit = record?.tradeClawSourceAudit as unknown as Tc267Audit | null | undefined;
    if (!record || !audit || audit.taskId !== 'TC-267') {
      throw new Error('TC-267 factor-timing source audit is missing');
    }

    const canonicalBytes = Buffer.from(
      readFileSync(sourceAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(record).toMatchObject({
      sourcePosition: 41,
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      marketingDisposition: 'none',
      tradeClawEvidence: null,
    });
    expect(audit).toMatchObject({
      disposition: 'no-go',
      tradeClawBacktestRun: false,
      primarySource: {
        title: 'When Factor Timing Makes Sense',
        authors: ['Farzin Barekat'],
        discoveryUrl:
          'https://paperswithbacktest.com/strategies/when-factor-timing-makes-sense',
        uclaReportUrl: 'https://ww3.math.ucla.edu/camreport/cam19-25.pdf',
        uclaIndexUrl: 'https://ww3.math.ucla.edu/cam-reports-2001-2020/',
        ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3359438',
        doi: 'https://doi.org/10.2139/ssrn.3359438',
        documentPages: 17,
        documentBytes: 329703,
        documentSha256:
          'ec0fa6b72f6567a70c38d01b95933eaa5b5dbb3a8e61668ad7f756698e87d93b',
        localByteAcquisition: 'in-memory-valid-pdf-not-retained',
        publicReplicationPackageSupplied: false,
        redistributionRightsEstablished: false,
      },
      paperScope: {
        sourceType: 'theoretical-results-plus-synthetic-monte-carlo',
        historicalMarketBacktestSupplied: false,
        actualFactorUniverseSupplied: false,
        causalTradableStrategySupplied: false,
        clairvoyantPeriodCorrelationKnown: true,
      },
      singleStrategy: {
        exampleCadence: 'weekly',
        deltaT: 1 / 52,
        investorCases: ['passive', 'clairvoyant'],
        perfectStateSharpeKnown: true,
        meaningfulGainCondition:
          'large-state-Sharpe-differences-or-predictable-negative-returns-with-shorting',
        realTimeStateSignalSupplied: false,
      },
      multiFactorSimulation: {
        factorCountParameter: 'N',
        eachFactorSharpe: 1,
        longRunPairwiseCorrelation: 0,
        correlationMatrixDistribution: 'uniform-valid-NxN-correlation-matrices',
        sampledIndependentlyEachPeriod: true,
        offDiagonalAbsoluteBoundParameter: 'rho',
        rebalanceCadence: 'weekly',
        deltaT: 1 / 52,
        optimizer: 'maximum-ex-ante-Sharpe',
        nonnegativeAllocations: true,
        perfectPeriodCorrelationForesight: true,
        monteCarloMethod: 'acceptance-rejection',
        benefitThresholdApproxFactorCount: 'more-than-10',
        belowEightImprovementPctLessThan: 30,
        historicalReturnsUsed: false,
      },
      sourceCloneMismatch: {
        cloneSample: '1990-2026',
        cloneCadence: 'weekly',
        cloneDataset: 'ETFs-Daily-Price',
        clonePositions: '9-long-ETFs',
        cloneVisibleTickers: ['DBC', 'EEM', 'GLD', 'IWM', 'LQD', 'QQQ', 'SPY', 'TLT'],
        clonePseudoCodePublic: false,
        paperEtfUniverseSpecified: false,
        paperHistoricalSampleSpecified: false,
        datasetSpyFirstObservation: '1993-01-29',
        cloneSampleStartsBeforeDatasetExample: true,
        liveCloneMetricsEvidenceBasis: 'upstream-discovery-only',
      },
      inputProvenance: {
        exactPrimaryBytesAcquired: true,
        primaryBytesRetained: false,
        authorizedHistoricalDatasetPresent: false,
        actualFactorReturnSeriesSupplied: false,
        pointInTimeCorrelationEstimatorSupplied: false,
        cloneCodeSupplied: false,
      },
      publishedCostTreatment: {
        transactionCostModelSupplied: false,
        transactionCostsAcknowledgedAsImplementationChallenge: true,
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
    });
    expect(audit.blockers.length).toBeGreaterThanOrEqual(10);
    expect(record.nextAction).toMatch(/separately hashed.*universe.*estimator.*costs.*holdout/i);
    expect(buildMarketingReviewDraft(record)).toBeNull();
  });

  it('moves exactly one untouched row into adverse source-audit evidence', () => {
    expect(summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE)).toMatchObject({
      total: 61,
      discovered: 47,
      sourceAudited: 10,
      replicated: 4,
      passed: 0,
      failed: 3,
      inconclusive: 1,
      untested: 57,
      sourceNoGo: 10,
    });
  });

  it('projects the same evidence publicly and to admins without marketing or authority', () => {
    const publicCandidate = buildResearchIntakePublicCandidatePayload(candidateId);
    const adminCandidate = buildResearchIntakeAdminCandidatePayload(candidateId, recordedAt);
    if (!publicCandidate || !adminCandidate) throw new Error('TC-267 projection is missing');

    expect(publicCandidate.record).toMatchObject({
      id: candidateId,
      stage: 'source-audited',
      verdict: 'not-tested',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: { taskId: 'TC-267', disposition: 'no-go' },
      tradeClawEvidence: null,
    });
    expect(publicCandidate.access).toMatchObject({
      mode: 'public-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    const publicEvidence = buildResearchIntakePublicEvidencePayload();
    const adminEvidence = buildResearchIntakeAdminEvidencePayload(recordedAt);
    expect(publicEvidence.records.map(taskId)).toContain('TC-267');
    expect(adminEvidence.items.map((item) => taskId(item.record))).toContain('TC-267');
    expect(publicEvidence.evidenceSummary).toMatchObject({ total: 14, sourceAudited: 10, sourceNoGo: 10 });
    expect(adminEvidence.evidenceSummary).toMatchObject({ total: 14, sourceAudited: 10, sourceNoGo: 10 });

    expect(adminCandidate.record.marketingReviewDraft).toBeNull();
    expect(adminCandidate.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      latestReceipt: { taskId: 'TC-267' },
      marketingHandoff: null,
      controls: {
        humanReviewRequired: false,
        automaticPublication: false,
        automaticPosting: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });
  });

  it('records the sole 12:00Z receipt and no marketing handoff', () => {
    expect(RESEARCH_LOOP_RECEIPTS.find((receipt) => receipt.taskId === 'TC-267')).toEqual({
      cycleId: '2026-08-30T12:00:00.000Z/PT3H',
      recordedAt,
      taskId: 'TC-267',
      candidateId,
      stageBefore: 'discovered',
      stageAfter: 'source-audited',
      verdict: 'not-tested',
      outcome: 'verified-no-go',
      evidencePaths: [
        'docs/research/2026-08-30-when-factor-timing-makes-sense-source-audit.md',
      ],
      marketingDraft: 'none',
      eligibleForProspectiveReview: false,
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
      nextAction:
        'Archive the exact-source no-go; any causal ETF correlation-timing study must begin as a separately hashed hypothesis with frozen universe, estimator, lookback, fills, costs, folds, and holdout before returns',
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T12:00:59.496Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-266' },
      currentWindowReceipts: [],
    });
    expect(getResearchLoopReceiptSnapshot(recordedAt)).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-267' },
      currentWindowReceipts: [{ taskId: 'TC-267' }],
      controls: {
        automaticCandidateSelection: false,
        automaticPublication: false,
        automaticTrading: false,
      },
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some((handoff) => (
      handoff.taskId === ('TC-267' as string)
    ))).toBe(false);
    expect(getResearchLoopMarketingReview(recordedAt)).toMatchObject({
      latestHandoff: { taskId: 'TC-259' },
      currentWindowHandoffs: [],
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
      },
    });
  });
});
