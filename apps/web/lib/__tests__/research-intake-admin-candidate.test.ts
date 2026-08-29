import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminPayload,
} from '../research-intake-admin';

const TC255 = 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin';
const TC259 = 'trading-the-term-premium';
const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';
const UNTOUCHED = 'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe';

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
        discovered: 55,
        sourceAudited: 2,
        replicated: 4,
        sourceNoGo: 2,
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
