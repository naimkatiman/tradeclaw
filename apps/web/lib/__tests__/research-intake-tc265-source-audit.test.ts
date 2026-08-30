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
  'docs/research/2026-08-30-good-carry-bad-carry-source-audit.md',
);
const candidateId = 'good-carry-bad-carry';
const recordedAt = '2026-08-30T06:12:30.000Z';

interface Tc265Audit {
  taskId: string;
  researchSha256: string;
  disposition: string;
  tradeClawBacktestRun: boolean;
  primarySource: {
    discoveryHtmlSha256: string;
    discoveryHtmlBytes: number;
    columbiaDocumentSha256: string;
    columbiaDocumentBytes: number;
    columbiaDocumentPages: number;
    nberDocumentSha256: string;
    nberDocumentBytes: number;
    nberDocumentPages: number;
    finalDoi: string;
    publicReplicationPackageSupplied: boolean;
  };
  publishedRule: {
    cadence: string;
    paperSample: string;
    monthlyObservations: number;
    universe: readonly string[];
    rankSignal: string;
    totalGrossAbsoluteWeight: number;
    rebalance: string;
    oddSubsetTreatment: string;
    longReturn: string;
    shortReturn: string;
  };
  selectionAndValidation: {
    dynamicStart: string;
    dynamicEnd: string;
    dynamicMonths: number;
    expandingHistoryStarts: string;
    maximumSequentialExclusions: number;
    causalNextMonthApplication: boolean;
    fixedSubsetsChosenAfterDynamicHistory: boolean;
    fixedSubsetsEvaluatedOnFullSample: boolean;
    authorAcknowledgesLookBackBias: boolean;
    postPublicationHoldoutFrozen: boolean;
  };
  sourceCloneMismatch: {
    paperDataset: string;
    cloneDataset: string;
    paperSample: string;
    cloneSample: string;
    cloneCodeFlag: boolean;
    cloneCodePubliclyInspectable: boolean;
  };
  inputProvenance: {
    exactSourceBytesSupplied: boolean;
    barclaysBankIdentified: boolean;
    datastreamIdentified: boolean;
    vendorIdentifiersPinned: boolean;
    sourceVintagePinned: boolean;
    demEuroSplicePinned: boolean;
    authorizedDatasetPresent: boolean;
  };
  publishedCostTreatment: {
    observedBidAskUsed: boolean;
    flatCostProxy: boolean;
    quoteSideHistorySupplied: boolean;
    deterministicTradeLedgerSupplied: boolean;
    completeCurrentFrictionModelSupplied: boolean;
  };
  blockers: readonly string[];
}

function taskId(record: {
  tradeClawEvidence: { taskId: string } | null;
  tradeClawSourceAudit: { taskId: string } | null;
}): string | null {
  return record.tradeClawEvidence?.taskId ?? record.tradeClawSourceAudit?.taskId ?? null;
}

describe('TC-265 Good Carry, Bad Carry source audit', () => {
  it('binds a no-return no-go to the primary-source audit', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.id === candidateId);
    const audit = record?.tradeClawSourceAudit as unknown as Tc265Audit | null | undefined;
    if (!record || !audit || audit.taskId !== 'TC-265') {
      throw new Error('TC-265 Good Carry, Bad Carry source audit is missing');
    }

    const canonicalBytes = Buffer.from(
      readFileSync(sourceAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(record).toMatchObject({
      sourcePosition: 27,
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
        discoveryHtmlSha256:
          '88888b8a6ab2dec7a4590c3f0f00927e0f318e8be13beee720c61c11026c6f3d',
        discoveryHtmlBytes: 205367,
        columbiaDocumentSha256:
          '24d54034c6b74944d4dd3bcfc20ddf2db85871f914d91be5833af0eba8435727',
        columbiaDocumentBytes: 380097,
        columbiaDocumentPages: 88,
        nberDocumentSha256:
          'afb9d2a98720f87659c2ba8b6c675e1b616ef0403ef39bfd17b4a662dbd595a5',
        nberDocumentBytes: 344309,
        nberDocumentPages: 78,
        finalDoi: 'https://doi.org/10.1017/S0022109019000887',
        publicReplicationPackageSupplied: false,
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
    });
    expect(audit.blockers.length).toBeGreaterThanOrEqual(8);
    expect(record.nextAction).toMatch(/new.*public-data.*carry.*hypothesis/i);
    expect(buildMarketingReviewDraft(record)).toBeNull();
  });

  it('moves exactly one more row into adverse source-audit evidence', () => {
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
    if (!publicCandidate || !adminCandidate) throw new Error('TC-265 projection is missing');

    expect(publicCandidate.record).toMatchObject({
      id: candidateId,
      stage: 'source-audited',
      verdict: 'not-tested',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: { taskId: 'TC-265', disposition: 'no-go' },
      tradeClawEvidence: null,
    });
    expect(publicCandidate.access).toMatchObject({
      mode: 'public-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    const publicEvidence = buildResearchIntakePublicEvidencePayload();
    const adminEvidence = buildResearchIntakeAdminEvidencePayload(recordedAt);
    expect(publicEvidence.records.map(taskId)).toContain('TC-265');
    expect(adminEvidence.items.map((item) => taskId(item.record))).toContain('TC-265');
    expect(publicEvidence.evidenceSummary).toMatchObject({ total: 14, sourceAudited: 10, sourceNoGo: 10 });
    expect(adminEvidence.evidenceSummary).toMatchObject({ total: 14, sourceAudited: 10, sourceNoGo: 10 });

    expect(adminCandidate.record.marketingReviewDraft).toBeNull();
    expect(adminCandidate.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      latestReceipt: { taskId: 'TC-265' },
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

  it('records the sole 06:00Z receipt and no marketing handoff', () => {
    expect(RESEARCH_LOOP_RECEIPTS.find((receipt) => receipt.taskId === 'TC-265')).toEqual({
      cycleId: '2026-08-30T06:00:00.000Z/PT3H',
      recordedAt,
      taskId: 'TC-265',
      candidateId,
      stageBefore: 'discovered',
      stageAfter: 'source-audited',
      verdict: 'not-tested',
      outcome: 'verified-no-go',
      evidencePaths: ['docs/research/2026-08-30-good-carry-bad-carry-source-audit.md'],
      marketingDraft: 'none',
      eligibleForProspectiveReview: false,
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
      nextAction:
        'Archive the exact-source no-go; any new public-data currency-carry hypothesis must freeze immutable inputs, causal fills, complete costs, chronological folds, a post-publication holdout, and external falsification before returns',
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T06:12:29.999Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-264' },
      currentWindowReceipts: [],
    });
    expect(getResearchLoopReceiptSnapshot(recordedAt)).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-265' },
      currentWindowReceipts: [{ taskId: 'TC-265' }],
      controls: {
        automaticCandidateSelection: false,
        automaticPublication: false,
        automaticTrading: false,
      },
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some((handoff) => (
      handoff.taskId === ('TC-265' as string)
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
