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
  'docs/research/2026-08-30-commodity-correlation-momentum-source-audit.md',
);
const candidateId = 'how-to-improve-commodity-momentum-using-intra-market-correlation';
const recordedAt = '2026-08-30T15:08:26.991Z';

interface Tc268Audit {
  taskId: string;
  researchSha256: string;
  disposition: string;
  tradeClawBacktestRun: boolean;
  marketReturnsInspected: boolean;
  primarySource: {
    title: string;
    authors: readonly string[];
    discoveryUrl: string;
    ssrnUrl: string;
    doi: string;
    authorMethodologyUrl: string;
    authorPresentationUrl: string;
    yahooTermsUrl: string;
    paperDate: string;
    documentPages: number;
    exactPrimaryBytesAcquired: boolean;
    documentSha256: null;
    localByteAcquisition: string;
    publicReplicationPackageSupplied: boolean;
    redistributionRightsEstablished: boolean;
  };
  publishedRule: {
    universe: readonly string[];
    dataProvider: string;
    sourceField: string;
    sampleStarts: string;
    rebalanceCadence: string;
    holdMonths: number;
    momentumLookbackMonths: number;
    robustnessLookbacksMonths: readonly number[];
    longCount: number;
    shortCount: number;
    correlationPairCount: number;
    shortCorrelationTradingDays: number;
    longCorrelationTradingDays: number;
    highCorrelationRegime: string;
    lowCorrelationRegime: string;
    equalityRuleSupplied: boolean;
    causalFillRuleSupplied: boolean;
  };
  upstreamResult: {
    treatment: string;
    annualReturnApproxPct: number;
    annualVolatilityApproxPct: number;
    maximumDrawdownApproxPct: number;
    sharpeApprox: number;
    calmarApprox: number;
    tradeClawRecalculated: boolean;
  };
  inputProvenance: {
    intendedProviderNamed: boolean;
    immutableDatasetManifestSupplied: boolean;
    exactPriceBytesSupplied: boolean;
    corporateActionVintageSupplied: boolean;
    providerAutomatedAccessPermissionPresent: boolean;
    authorizedHistoricalDatasetPresent: boolean;
    substituteVendorWouldBeNewHypothesis: boolean;
  };
  publishedCostTreatment: {
    commissionModelSupplied: boolean;
    spreadSlippageModelSupplied: boolean;
    shortBorrowModelSupplied: boolean;
    financingModelSupplied: boolean;
    turnoverLinkedLedgerSupplied: boolean;
    completeFrictionModelSupplied: boolean;
  };
  validation: {
    preregistrationSupplied: boolean;
    chronologicalFoldsSupplied: boolean;
    untouchedPostPublicationHoldoutSupplied: boolean;
    externalFalsificationMarketSupplied: boolean;
    deterministicReplayArtifactSupplied: boolean;
    possiblePostPaperMonthsThrough2026July: number;
  };
  blockers: readonly string[];
}

function taskId(record: {
  tradeClawEvidence: { taskId: string } | null;
  tradeClawSourceAudit: { taskId: string } | null;
}): string | null {
  return record.tradeClawEvidence?.taskId ?? record.tradeClawSourceAudit?.taskId ?? null;
}

describe('TC-268 commodity correlation momentum source audit', () => {
  it('binds the public rule and unavailable authorized inputs to a no-return no-go', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.id === candidateId);
    const audit = record?.tradeClawSourceAudit as unknown as Tc268Audit | null | undefined;
    if (!record || !audit || audit.taskId !== 'TC-268') {
      throw new Error('TC-268 commodity correlation source audit is missing');
    }

    const canonicalBytes = Buffer.from(
      readFileSync(sourceAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(record).toMatchObject({
      sourcePosition: 24,
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      marketingDisposition: 'none',
      tradeClawEvidence: null,
    });
    expect(audit).toMatchObject({
      disposition: 'no-go',
      tradeClawBacktestRun: false,
      marketReturnsInspected: false,
      primarySource: {
        title: 'How to Improve Commodity Momentum Using Intra-Market Correlation',
        authors: ['Radovan Vojtko', 'Margaréta Pauchlyová'],
        discoveryUrl:
          'https://paperswithbacktest.com/strategies/how-to-improve-commodity-momentum-using-intra-market-correlation',
        ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4964417',
        doi: 'https://doi.org/10.2139/ssrn.4964417',
        authorMethodologyUrl:
          'https://quantpedia.com/how-to-improve-commodity-momentum-using-intra-market-correlation/',
        authorPresentationUrl:
          'https://www.linkedin.com/posts/quantpedia_quantpedia-explains-trading-strategies-activity-7243866882598965248-Ucre',
        yahooTermsUrl: 'https://legal.yahoo.com/xw/en/yahoo/terms/otos/index.html',
        paperDate: '2024-09-16',
        documentPages: 8,
        exactPrimaryBytesAcquired: false,
        documentSha256: null,
        localByteAcquisition: 'blocked-http-403-no-bytes',
        publicReplicationPackageSupplied: false,
        redistributionRightsEstablished: false,
      },
      publishedRule: {
        universe: ['DBA', 'DBB', 'DBE', 'DBP'],
        dataProvider: 'Yahoo-Finance',
        sourceField: 'adjusted-close',
        sampleStarts: '2007',
        rebalanceCadence: 'monthly',
        holdMonths: 1,
        momentumLookbackMonths: 12,
        robustnessLookbacksMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        longCount: 2,
        shortCount: 2,
        correlationPairCount: 6,
        shortCorrelationTradingDays: 20,
        longCorrelationTradingDays: 250,
        highCorrelationRegime: 'momentum',
        lowCorrelationRegime: 'reversal',
        equalityRuleSupplied: false,
        causalFillRuleSupplied: false,
      },
      upstreamResult: {
        treatment: 'gross-upstream-discovery-only',
        annualReturnApproxPct: 14,
        annualVolatilityApproxPct: 16,
        maximumDrawdownApproxPct: -27,
        sharpeApprox: 0.8,
        calmarApprox: 0.5,
        tradeClawRecalculated: false,
      },
      inputProvenance: {
        intendedProviderNamed: true,
        immutableDatasetManifestSupplied: false,
        exactPriceBytesSupplied: false,
        corporateActionVintageSupplied: false,
        providerAutomatedAccessPermissionPresent: false,
        authorizedHistoricalDatasetPresent: false,
        substituteVendorWouldBeNewHypothesis: true,
      },
      publishedCostTreatment: {
        commissionModelSupplied: false,
        spreadSlippageModelSupplied: false,
        shortBorrowModelSupplied: false,
        financingModelSupplied: false,
        turnoverLinkedLedgerSupplied: false,
        completeFrictionModelSupplied: false,
      },
      validation: {
        preregistrationSupplied: false,
        chronologicalFoldsSupplied: false,
        untouchedPostPublicationHoldoutSupplied: false,
        externalFalsificationMarketSupplied: false,
        deterministicReplayArtifactSupplied: false,
        possiblePostPaperMonthsThrough2026July: 22,
      },
    });
    expect(audit.blockers.length).toBeGreaterThanOrEqual(12);
    expect(record.nextAction).toMatch(/later.*authorized.*hash.*costs.*holdout/i);
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
    if (!publicCandidate || !adminCandidate) throw new Error('TC-268 projection is missing');

    expect(publicCandidate.record).toMatchObject({
      id: candidateId,
      stage: 'source-audited',
      verdict: 'not-tested',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: { taskId: 'TC-268', disposition: 'no-go' },
      tradeClawEvidence: null,
    });
    expect(publicCandidate.access).toMatchObject({
      mode: 'public-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    const publicEvidence = buildResearchIntakePublicEvidencePayload();
    const adminEvidence = buildResearchIntakeAdminEvidencePayload(recordedAt);
    expect(publicEvidence.records.map(taskId)).toContain('TC-268');
    expect(adminEvidence.items.map((item) => taskId(item.record))).toContain('TC-268');
    expect(publicEvidence.evidenceSummary).toMatchObject({ total: 14, sourceAudited: 10, sourceNoGo: 10 });
    expect(adminEvidence.evidenceSummary).toMatchObject({ total: 14, sourceAudited: 10, sourceNoGo: 10 });

    expect(adminCandidate.record.marketingReviewDraft).toBeNull();
    expect(adminCandidate.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      latestReceipt: { taskId: 'TC-268' },
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

  it('records the sole 15:00Z receipt and no marketing handoff', () => {
    expect(RESEARCH_LOOP_RECEIPTS.at(-1)).toEqual({
      cycleId: '2026-08-30T15:00:00.000Z/PT3H',
      recordedAt,
      taskId: 'TC-268',
      candidateId,
      stageBefore: 'discovered',
      stageAfter: 'source-audited',
      verdict: 'not-tested',
      outcome: 'verified-no-go',
      evidencePaths: [
        'docs/research/2026-08-30-commodity-correlation-momentum-source-audit.md',
      ],
      marketingDraft: 'none',
      eligibleForProspectiveReview: false,
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
      nextAction:
        'Archive the exact-source no-go; any independent commodity ETF correlation-switch study must begin in a later receipt window with authorized immutable data and a separately hashed protocol freezing transforms, fills, full costs including borrow and financing, controls, folds, and holdout before returns',
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T15:08:26.990Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-267' },
      currentWindowReceipts: [],
    });
    expect(getResearchLoopReceiptSnapshot(recordedAt)).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-268' },
      currentWindowReceipts: [{ taskId: 'TC-268' }],
      integrity: {
        receiptCount: 13,
        uniqueWindowCount: 12,
        duplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
        additionalDuplicateWindowIds: [],
      },
      controls: {
        automaticCandidateSelection: false,
        automaticPublication: false,
        automaticTrading: false,
      },
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some((handoff) => (
      handoff.taskId === ('TC-268' as string)
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
