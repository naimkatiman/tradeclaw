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
  'docs/research/2026-08-30-cryptocurrency-as-money-source-audit.md',
);
const candidateId = 'cryptocurrency-as-money-a-trading-strategy-solution';

interface Tc263Audit {
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
    defaultTradingRangePct: number;
    defaultSteps: number;
    orderSizing: string;
    paperIllustration: string;
  };
  sourceCloneMismatch: {
    primaryCadence: string;
    cloneCadence: string;
    primarySample: string;
    cloneSample: string;
  };
  inputProvenance: {
    exactSourceBytesSupplied: boolean;
    venueIdentified: boolean;
    eventLevelDataSupplied: boolean;
    executableGridFormulaSupplied: boolean;
    executableFillRulesSupplied: boolean;
  };
  publishedCostTreatment: {
    deterministicTradeLedgerSupplied: boolean;
    completeFrictionModelSupplied: boolean;
  };
  blockers: readonly string[];
}

describe('TC-263 cryptocurrency-as-money source audit', () => {
  it('keeps the exact-source no-go distinct from a result and binds the canonical audit', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.id === candidateId);
    const audit = record?.tradeClawSourceAudit as unknown as Tc263Audit | null | undefined;
    if (!audit || audit.taskId !== 'TC-263') {
      throw new Error('TC-263 cryptocurrency-as-money source audit is missing');
    }

    const canonicalBytes = Buffer.from(
      readFileSync(sourceAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(record).toMatchObject({
      sourcePosition: 38,
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
        ssrnUrl: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3436041',
        doi: 'https://doi.org/10.2139/ssrn.3436041',
        documentSha256: '0b3c8344b8f28ccd17ac3902eb4532d7dd0d179e2a64859533a9239432e743c0',
        documentBytes: 453903,
        documentPages: 9,
        redistributionRightsEstablished: false,
      },
      publishedRule: {
        structure: 'long-only-two-cryptocurrency-grid',
        defaultTradingRangePct: 30,
        defaultSteps: 7,
        orderSizing: 'linearly-increasing-both-sides-unspecified-formula',
        paperIllustration: 'LTCBTC-2018-07-31/2019-07-31',
      },
      sourceCloneMismatch: {
        primaryCadence: 'event-driven-standing-limit-orders',
        cloneCadence: 'weekly',
        primarySample: '2018-07-31/2019-07-31-illustration',
        cloneSample: '1992-2026',
      },
      inputProvenance: {
        exactSourceBytesSupplied: false,
        venueIdentified: false,
        eventLevelDataSupplied: false,
        executableGridFormulaSupplied: false,
        executableFillRulesSupplied: false,
      },
      publishedCostTreatment: {
        deterministicTradeLedgerSupplied: false,
        completeFrictionModelSupplied: false,
      },
    });
    expect(audit.blockers.length).toBeGreaterThanOrEqual(8);
    expect(record?.nextAction).toMatch(/new.*venue-specific.*hypothesis/i);
    expect(buildMarketingReviewDraft(record!)).toBeNull();
  });

  it('moves only one catalog row into adverse source-audit evidence', () => {
    const summary = summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE);
    expect(summary).toMatchObject({
      total: 61,
      discovered: 52,
      sourceAudited: 5,
      replicated: 4,
      passed: 0,
      failed: 3,
      inconclusive: 1,
      untested: 57,
      sourceNoGo: 5,
    });
  });

  it('records the sole 00:00Z receipt without creating marketing or authority', () => {
    expect(RESEARCH_LOOP_RECEIPTS.at(-1)).toEqual({
      cycleId: '2026-08-30T00:00:00.000Z/PT3H',
      recordedAt: '2026-08-30T00:09:58.762Z',
      taskId: 'TC-263',
      candidateId,
      stageBefore: 'discovered',
      stageAfter: 'source-audited',
      verdict: 'not-tested',
      outcome: 'verified-no-go',
      evidencePaths: [
        'docs/research/2026-08-30-cryptocurrency-as-money-source-audit.md',
      ],
      marketingDraft: 'none',
      eligibleForProspectiveReview: false,
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
      nextAction:
        'Archive the exact-source no-go; any venue-specific cryptocurrency grid study must begin as a separately hashed hypothesis in a later UTC window before returns',
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T00:09:58.761Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-262' },
      currentWindowReceipts: [],
    });
    expect(getResearchLoopReceiptSnapshot('2026-08-30T00:09:58.762Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-263' },
      currentWindowReceipts: [{ taskId: 'TC-263' }],
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some((handoff) => (
      handoff.taskId === ('TC-263' as string)
    ))).toBe(false);
    expect(getResearchLoopMarketingReview('2026-08-30T00:09:58.762Z')).toMatchObject({
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
