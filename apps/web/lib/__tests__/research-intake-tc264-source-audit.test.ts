import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SYSTEMATIC_RESEARCH_INTAKE, summarizeResearchIntake } from '../research-intake';
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
  'docs/research/2026-08-30-rolling-vs-expanding-mean-reversion-source-audit.md',
);
const candidateId =
  'rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation';

interface Tc264Audit {
  taskId: string;
  researchSha256: string;
  disposition: string;
  tradeClawBacktestRun: boolean;
  primarySource: {
    ssrnUrl: string;
    doi: string;
    documentSha256: string;
    documentBytes: number;
    documentPages: number;
    redistributionRightsEstablished: boolean;
  };
  publishedRule: {
    structure: string;
    signalFrequency: string;
    windowYears: number;
    thresholdZ: number;
    confirmationDeclinePct: number;
    confirmationLookbackTradingDays: number;
    holdingPeriodTradingDays: number;
    earlyExit: boolean;
    parameterCombinationsSwept: number;
    finalVixThreshold: number;
    finalVixOverweight: number;
  };
  selectionAndValidation: {
    parametersSelectedUsingFullSample: boolean;
    temporalSplit: string;
    primaryTrades: number;
    crossAssetPairs: number;
    pooledTrades: number;
    postPublicationHoldoutFrozen: boolean;
  };
  sourceCloneMismatch: {
    primaryCadence: string;
    cloneCadence: string;
    primarySample: string;
    cloneSample: string;
    cloneCurrentPosition: string;
  };
  inputProvenance: {
    exactSourceBytesSupplied: boolean;
    investingComSeriesPinned: boolean;
    futuresContractsPinned: boolean;
    rollRulesSupplied: boolean;
    executableFillRulesSupplied: boolean;
    overlappingPositionRulesSupplied: boolean;
  };
  publishedCostTreatment: {
    baselinePerSideBasisPoints: number;
    sensitivityMaxPerSideBasisPoints: number;
    deterministicTradeLedgerSupplied: boolean;
    completeFrictionModelSupplied: boolean;
  };
  blockers: readonly string[];
}

describe('TC-264 rolling-versus-expanding mean-reversion source audit', () => {
  it('keeps the exact-source no-go distinct from a result and binds the canonical audit', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.id === candidateId);
    const audit = record?.tradeClawSourceAudit as unknown as Tc264Audit | null | undefined;
    if (!audit || audit.taskId !== 'TC-264') {
      throw new Error('TC-264 rolling-versus-expanding source audit is missing');
    }

    const canonicalBytes = Buffer.from(
      readFileSync(sourceAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(record).toMatchObject({
      sourcePosition: 26,
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
        ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6217778',
        doi: 'https://doi.org/10.2139/ssrn.6217778',
        documentSha256: '94ce5ddb4c6f211989440b087cf7f9fcc368907bb0f0d8955058a0cb935197e6',
        documentBytes: 636787,
        documentPages: 19,
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
    });
    expect(audit.blockers.length).toBeGreaterThanOrEqual(10);
    expect(record?.nextAction).toMatch(/new.*commodity.*hypothesis/i);
    expect(buildMarketingReviewDraft(record!)).toBeNull();
  });

  it('moves only one catalog row into adverse source-audit evidence', () => {
    const summary = summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE);
    expect(summary).toMatchObject({
      total: 61,
      discovered: 50,
      sourceAudited: 7,
      replicated: 4,
      passed: 0,
      failed: 3,
      inconclusive: 1,
      untested: 57,
      sourceNoGo: 7,
    });
  });

  it('records the sole 03:00Z receipt without creating marketing or authority', () => {
    expect(RESEARCH_LOOP_RECEIPTS.find((receipt) => receipt.taskId === 'TC-264')).toEqual({
      cycleId: '2026-08-30T03:00:00.000Z/PT3H',
      recordedAt: '2026-08-30T03:10:26.781Z',
      taskId: 'TC-264',
      candidateId,
      stageBefore: 'discovered',
      stageAfter: 'source-audited',
      verdict: 'not-tested',
      outcome: 'verified-no-go',
      evidencePaths: [
        'docs/research/2026-08-30-rolling-vs-expanding-mean-reversion-source-audit.md',
      ],
      marketingDraft: 'none',
      eligibleForProspectiveReview: false,
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
      nextAction:
        'Archive the exact-source no-go; any new public-commodity mean-reversion hypothesis must freeze instruments, source bytes, fills, costs, controls, and a prospective holdout in a later UTC window before returns',
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T03:10:26.780Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-263' },
      currentWindowReceipts: [],
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T03:10:26.781Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-264' },
      currentWindowReceipts: [{ taskId: 'TC-264' }],
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some((handoff) => (
      handoff.taskId === ('TC-264' as string)
    ))).toBe(false);
    expect(getResearchLoopMarketingReview('2026-08-30T03:10:26.781Z')).toMatchObject({
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
