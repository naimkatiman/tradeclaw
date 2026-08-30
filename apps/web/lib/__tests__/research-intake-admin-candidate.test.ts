import { createHash } from 'node:crypto';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminPayload,
} from '../research-intake-admin';

const TC255 = 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin';
const TC259 = 'trading-the-term-premium';
const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';
const TC261 =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';
const TC262 = 'properties-of-the-most-diversified-portfolio';
const UNTOUCHED = 'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe';

interface CandidateNavigation {
  order: 'pinned-source-order';
  currentPosition: number;
  totalCandidates: number;
  catalogHref: string;
  selfHref: string;
  previous: { id: string; title: string; position: number; href: string } | null;
  next: { id: string; title: string; position: number; href: string } | null;
}

function navigation(payload: unknown): CandidateNavigation | undefined {
  return (payload as { navigation?: CandidateNavigation }).navigation;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const serialized = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(serialized, 'utf8'),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

describe('protected research intake candidate projection', () => {
  it('returns TC-260 with its exact visible receipt and no invented marketing handoff', () => {
    const payload = buildResearchIntakeAdminCandidatePayload(
      TC260,
      '2026-08-29T15:59:59.999Z',
    );
    if (!payload) throw new Error('TC-260 admin candidate fixture is missing');

    expect(payload).toMatchObject({
      schemaVersion: 1,
      access: {
        mode: 'admin-read-only',
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
      source: {
        commit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
        reportedPerformanceBasis: 'gross-of-trading-costs',
        tradeClawTreatment: 'discovery-only',
      },
      catalogSummary: {
        total: 61,
        discovered: 51,
        sourceAudited: 6,
        replicated: 4,
        sourceNoGo: 6,
      },
      catalogEvidenceStateSummary: {
        totalCandidates: 61,
        withTradeClawRecord: 10,
        performanceGatesEvaluated: 3,
        performanceGatesNotEvaluated: 58,
        plainLanguageSummary:
          '61 candidates: 51 not tested by TradeClaw, 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
      navigation: {
        order: 'pinned-source-order',
        currentPosition: 61,
        totalCandidates: 61,
        catalogHref: '/api/admin/research-intake',
        selfHref: `/api/admin/research-intake/${TC260}`,
        previous: {
          id: 'risk-parity-portfolios-with-risk-factors',
          position: 60,
          href: '/api/admin/research-intake/risk-parity-portfolios-with-risk-factors',
        },
        next: null,
      },
      record: {
        id: TC260,
        stage: 'source-audited',
        verdict: 'not-tested',
        marketingDisposition: 'none',
        tradeClawSourceAudit: {
          taskId: 'TC-260',
          disposition: 'no-go',
          tradeClawBacktestRun: false,
        },
        tradeClawEvidence: null,
        marketingReviewDraft: null,
      },
      candidateWorkflow: {
        receiptCount: 1,
        receipts: [{
          taskId: 'TC-260',
          candidateId: TC260,
          cycleId: '2026-08-29T15:00:00.000Z/PT3H',
          recordedAt: '2026-08-29T15:19:14.000Z',
          marketingDraft: 'none',
          publicationApproved: false,
          tradingApproved: false,
          externalActions: 'none',
        }],
        latestReceipt: { taskId: 'TC-260' },
        marketingHandoff: null,
        controls: {
          humanReviewRequired: false,
          automaticPublication: false,
          automaticPosting: false,
          automaticTrading: false,
          externalActions: 'none',
        },
      },
    });
    expect(payload.selectionPolicy).toMatch(/gross discovery metadata/i);
    expect(payload.workflow).toHaveLength(5);
    expect(payload.researchLoop).toMatchObject({
      observedAt: '2026-08-29T15:59:59.999Z',
      currentWindow: { id: '2026-08-29T15:00:00.000Z/PT3H' },
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-260' },
    });
    for (const omitted of [
      'records',
      'appliedFilters',
      'filteredSummary',
      'pagination',
      'marketingReview',
    ]) {
      expect(payload).not.toHaveProperty(omitted);
    }
  });

  it('keeps TC-261 source evidence visible while revealing its receipt only at 18:00:40Z', () => {
    const before = buildResearchIntakeAdminCandidatePayload(
      TC261,
      '2026-08-29T18:00:39.999Z',
    );
    const at = buildResearchIntakeAdminCandidatePayload(
      TC261,
      '2026-08-29T18:00:40.000Z',
    );
    if (!before || !at) throw new Error('TC-261 admin candidate fixture is missing');

    expect(before.record).toMatchObject({
      id: TC261,
      sourcePosition: 32,
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      marketingDisposition: 'none',
      marketingReviewDraft: null,
      tradeClawSourceAudit: {
        taskId: 'TC-261',
        disposition: 'no-go',
        tradeClawBacktestRun: false,
        currentDataReceipt: { pivxPriceUsdAvailable: false },
      },
      tradeClawEvidence: null,
    });
    expect(before.researchLoop).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-260' },
      currentWindowReceipts: [],
    });
    expect(before.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: null,
      controls: {
        humanReviewRequired: false,
        publicationApproved: false,
        tradingApproved: false,
        externalActions: 'none',
      },
    });
    expect(navigation(before)).toEqual({
      order: 'pinned-source-order',
      currentPosition: 33,
      totalCandidates: 61,
      catalogHref: '/api/admin/research-intake',
      selfHref: `/api/admin/research-intake/${TC261}`,
      previous: {
        id: TC255,
        title: 'How to Design a Simple Multi-Timeframe Trend Strategy on Bitcoin',
        position: 32,
        href: `/api/admin/research-intake/${TC255}`,
      },
      next: {
        id: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
        title: 'Seasonality, Trend-following, and Mean reversion in Bitcoin',
        position: 34,
        href:
          '/api/admin/research-intake/seasonality-trend-following-and-mean-reversion-in-bitcoin',
      },
    });

    expect(at.researchLoop).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-261' },
      currentWindowReceipts: [{ taskId: 'TC-261' }],
    });
    expect(at.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{
        taskId: 'TC-261',
        cycleId: '2026-08-29T18:00:00.000Z/PT3H',
        recordedAt: '2026-08-29T18:00:40.000Z',
        marketingDraft: 'none',
        publicationApproved: false,
        tradingApproved: false,
        externalActions: 'none',
      }],
      latestReceipt: { taskId: 'TC-261' },
      marketingHandoff: null,
    });
  });

  it('gates TC-259 receipt, handoff, and draft on their canonical availability time', () => {
    const before = buildResearchIntakeAdminCandidatePayload(
      TC259,
      '2026-08-29T12:47:50.999Z',
    );
    const after = buildResearchIntakeAdminCandidatePayload(
      TC259,
      '2026-08-29T12:47:51.000Z',
    );
    if (!before || !after) throw new Error('TC-259 admin candidate fixture is missing');

    expect(before.record.marketingReviewDraft).toBeNull();
    expect(before.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: null,
      controls: { humanReviewRequired: false },
    });

    expect(after.record.marketingReviewDraft).toMatchObject({
      candidateId: TC259,
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
    expect(after.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{
        taskId: 'TC-259',
        candidateId: TC259,
        recordedAt: '2026-08-29T12:47:51.000Z',
      }],
      latestReceipt: { taskId: 'TC-259' },
      marketingHandoff: {
        taskId: 'TC-259',
        candidateId: TC259,
        availableAt: '2026-08-29T12:47:51.000Z',
        workflowState: 'human-review-required',
        publicationApproved: false,
        externalActions: 'none',
        draft: { publishApproved: false },
      },
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });
  });

  it('keeps TC-262 source evidence visible while revealing only its canonical no-draft receipt', () => {
    const before = buildResearchIntakeAdminCandidatePayload(
      TC262,
      '2026-08-29T21:09:39.109Z',
    );
    const at = buildResearchIntakeAdminCandidatePayload(
      TC262,
      '2026-08-29T21:09:39.110Z',
    );
    if (!before || !at) throw new Error('TC-262 admin candidate fixture is missing');

    expect(before.record).toMatchObject({
      id: TC262,
      sourcePosition: 6,
      stage: 'source-audited',
      verdict: 'not-tested',
      marketingDisposition: 'none',
      marketingReviewDraft: null,
      tradeClawSourceAudit: {
        taskId: 'TC-262',
        disposition: 'no-go',
        tradeClawBacktestRun: false,
        publishedRule: { cadence: 'semiannual', rebalanceMonths: [5, 11] },
      },
      tradeClawEvidence: null,
    });
    expect(before.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: null,
    });
    expect(at.researchLoop).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-262' },
      currentWindowReceipts: [{ taskId: 'TC-262' }],
    });
    expect(at.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{
        taskId: 'TC-262',
        cycleId: '2026-08-29T21:00:00.000Z/PT3H',
        recordedAt: '2026-08-29T21:09:39.110Z',
        marketingDraft: 'none',
      }],
      latestReceipt: { taskId: 'TC-262' },
      marketingHandoff: null,
    });
  });

  it('distinguishes pre-loop handoffs and untouched candidates without inventing receipts', () => {
    const at = '2026-08-29T15:59:59.999Z';
    const preLoop = buildResearchIntakeAdminCandidatePayload(TC255, at);
    const untouched = buildResearchIntakeAdminCandidatePayload(UNTOUCHED, at);
    if (!preLoop || !untouched) throw new Error('Admin candidate fixture is missing');

    expect(preLoop.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: {
        taskId: 'TC-255',
        basis: 'pre-loop-closure',
        cycleId: null,
        workflowState: 'human-review-required',
      },
      controls: { humanReviewRequired: true },
    });
    expect(preLoop.record.marketingReviewDraft).not.toBeNull();

    expect(untouched.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: null,
      controls: { humanReviewRequired: false },
    });
    expect(untouched.record.marketingReviewDraft).toBeNull();
  });

  it('requires exact canonical IDs', () => {
    for (const candidateId of [
      TC260.toUpperCase(),
      ` ${TC260}`,
      `${TC260} `,
      'TC-260',
      'A Risk-Based Approach to Tactical Asset Allocation',
      '0',
      'missing-candidate',
    ]) {
      expect(
        buildResearchIntakeAdminCandidatePayload(
          candidateId,
          '2026-08-29T15:59:59.999Z',
        ),
      ).toBeNull();
    }
  });

  it('serializes protected first, middle, and last navigation deterministically', () => {
    const at = '2026-08-29T15:59:59.999Z';
    const first = buildResearchIntakeAdminCandidatePayload(UNTOUCHED, at);
    const middle = buildResearchIntakeAdminCandidatePayload(TC261, at);
    const last = buildResearchIntakeAdminCandidatePayload(TC260, at);
    if (!first || !middle || !last) throw new Error('Admin navigation fixture is missing');

    expect({
      first: fingerprint(first.navigation),
      middle: fingerprint(middle.navigation),
      last: fingerprint(last.navigation),
      lastPayload: fingerprint(last),
    }).toEqual({
      first: {
        bytes: 388,
        sha256: 'b2d76e6a6dabca7ce6387e65692d030023f191b64012f8b3a89664aedaf0b5e5',
      },
      middle: {
        bytes: 796,
        sha256: '33e9a532758a23bb8bc152ced9f64d644c4a0348fa9920b2310ac15678c7a0c2',
      },
      last: {
        bytes: 422,
        sha256: '5fc6e26af7a462ede7ec2c071cb14cd35017aa25abefa42db649abfde01c4607',
      },
      lastPayload: {
        bytes: 13_408,
        sha256: '8b1ca8a6e337f492bd317da26d78deee699a1d47a14bd4ac664e941ae86b7aa6',
      },
    });
  });

  it('keeps paginated admin record drafts observation-consistent', () => {
    const query = new URLSearchParams('q=term%20premium&limit=100');
    const before = buildResearchIntakeAdminPayload(query, '2026-08-29T12:47:50.999Z');
    const after = buildResearchIntakeAdminPayload(query, '2026-08-29T12:47:51.000Z');

    expect(before.records).toHaveLength(1);
    expect(before.records[0].id).toBe(TC259);
    expect(before.records[0].marketingReviewDraft).toBeNull();
    expect(before.marketingReview.handoffs.some((handoff) => handoff.taskId === 'TC-259')).toBe(
      false,
    );

    expect(after.records[0].marketingReviewDraft).toMatchObject({
      candidateId: TC259,
      publishApproved: false,
    });
    expect(after.marketingReview.handoffs.some((handoff) => handoff.taskId === 'TC-259')).toBe(
      true,
    );
  });
});
