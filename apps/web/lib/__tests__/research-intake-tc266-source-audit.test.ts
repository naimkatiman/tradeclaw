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
  'docs/research/2026-08-30-risk-factor-parity-source-audit.md',
);
const candidateId = 'risk-parity-portfolios-with-risk-factors';
const recordedAt = '2026-08-30T09:07:36.506Z';

interface Tc266Audit {
  taskId: string;
  researchSha256: string;
  disposition: string;
  tradeClawBacktestRun: boolean;
  primarySource: {
    mpraItemId: number;
    documentPages: number;
    documentSha256: null;
    localByteAcquisition: string;
    ssrnDoi: string;
    journalDoi: string;
    publicReplicationPackageSupplied: boolean;
    redistributionRightsEstablished: boolean;
  };
  paperScope: {
    sourceType: string;
    applications: readonly string[];
    singleExecutableStrategySpecified: boolean;
    optimizationMayHaveMultipleSolutions: boolean;
    longOnlyMatchingGuaranteed: boolean;
  };
  equityApplication: {
    universe: readonly string[];
    factorModel: string;
    estimator: string;
    rollingWindowMonths: number;
    snapshots: readonly string[];
    studyDateSensitivityAcknowledged: boolean;
  };
  hedgeFundApplication: {
    universe: string;
    returnCadence: string;
    covarianceWindowMonths: number;
    factors: string;
    factorRiskBudgetEachPct: number;
    rebalance: string;
    simulationWindow: string;
    holdingsNoLongerPublic: boolean;
    holdingsAssumedConstant: boolean;
    higherTurnoverAcknowledged: boolean;
  };
  strategicApplication: {
    source: string;
    cadence: string;
    sample: string;
    economicSeries: number;
    factorGroups: number;
    assetClasses: number;
    preliminaryResults: boolean;
  };
  sourceCloneMismatch: {
    cloneSample: string;
    cloneCadence: string;
    cloneDataset: string;
    cloneCurrentPortfolio: string;
    paperCurrentPortfolioSpecified: boolean;
    clonePseudoCodePublic: boolean;
  };
  inputProvenance: {
    exactSourceBytesSupplied: boolean;
    proprietaryMsciIndexesRequired: boolean;
    hedgeIndexHoldingsPublic: boolean;
    datastreamSeriesPubliclyPinned: boolean;
    authorizedDatasetPresent: boolean;
  };
  publishedCostTreatment: {
    transactionCostModelSupplied: boolean;
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

describe('TC-266 Risk Parity Portfolios with Risk Factors source audit', () => {
  it('binds a no-return no-go to the three distinct primary-paper applications', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.id === candidateId);
    const audit = record?.tradeClawSourceAudit as unknown as Tc266Audit | null | undefined;
    if (!record || !audit || audit.taskId !== 'TC-266') {
      throw new Error('TC-266 risk-factor-parity source audit is missing');
    }

    const canonicalBytes = Buffer.from(
      readFileSync(sourceAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(record).toMatchObject({
      sourcePosition: 59,
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
        mpraItemId: 44017,
        documentPages: 33,
        documentSha256: null,
        localByteAcquisition: 'blocked-before-hash',
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
    });
    expect(audit.blockers.length).toBeGreaterThanOrEqual(10);
    expect(record.nextAction).toMatch(/separately hashed.*universe.*costs.*holdout/i);
    expect(buildMarketingReviewDraft(record)).toBeNull();
  });

  it('moves exactly one more row into adverse source-audit evidence', () => {
    expect(summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE)).toMatchObject({
      total: 61,
      discovered: 48,
      sourceAudited: 9,
      replicated: 4,
      passed: 0,
      failed: 3,
      inconclusive: 1,
      untested: 57,
      sourceNoGo: 9,
    });
  });

  it('projects the same evidence publicly and to admins without marketing or authority', () => {
    const publicCandidate = buildResearchIntakePublicCandidatePayload(candidateId);
    const adminCandidate = buildResearchIntakeAdminCandidatePayload(candidateId, recordedAt);
    if (!publicCandidate || !adminCandidate) throw new Error('TC-266 projection is missing');

    expect(publicCandidate.record).toMatchObject({
      id: candidateId,
      stage: 'source-audited',
      verdict: 'not-tested',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: { taskId: 'TC-266', disposition: 'no-go' },
      tradeClawEvidence: null,
    });
    expect(publicCandidate.access).toMatchObject({
      mode: 'public-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    const publicEvidence = buildResearchIntakePublicEvidencePayload();
    const adminEvidence = buildResearchIntakeAdminEvidencePayload(recordedAt);
    expect(publicEvidence.records.map(taskId)).toContain('TC-266');
    expect(adminEvidence.items.map((item) => taskId(item.record))).toContain('TC-266');
    expect(publicEvidence.evidenceSummary).toMatchObject({ total: 13, sourceAudited: 9, sourceNoGo: 9 });
    expect(adminEvidence.evidenceSummary).toMatchObject({ total: 13, sourceAudited: 9, sourceNoGo: 9 });

    expect(adminCandidate.record.marketingReviewDraft).toBeNull();
    expect(adminCandidate.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      latestReceipt: { taskId: 'TC-266' },
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

  it('records the sole 09:00Z receipt and no marketing handoff', () => {
    expect(RESEARCH_LOOP_RECEIPTS.find((receipt) => receipt.taskId === 'TC-266')).toEqual({
      cycleId: '2026-08-30T09:00:00.000Z/PT3H',
      recordedAt,
      taskId: 'TC-266',
      candidateId,
      stageBefore: 'discovered',
      stageAfter: 'source-audited',
      verdict: 'not-tested',
      outcome: 'verified-no-go',
      evidencePaths: ['docs/research/2026-08-30-risk-factor-parity-source-audit.md'],
      marketingDraft: 'none',
      eligibleForProspectiveReview: false,
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
      nextAction:
        'Archive the exact-source no-go; any public risk-factor-parity implementation must begin as a separately hashed hypothesis with frozen universe, data, estimator, costs, folds, and holdout before returns',
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T09:07:36.505Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-265' },
      currentWindowReceipts: [],
    });
    expect(getResearchLoopReceiptSnapshot(recordedAt)).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-266' },
      currentWindowReceipts: [{ taskId: 'TC-266' }],
      controls: {
        automaticCandidateSelection: false,
        automaticPublication: false,
        automaticTrading: false,
      },
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some((handoff) => (
      handoff.taskId === ('TC-266' as string)
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
