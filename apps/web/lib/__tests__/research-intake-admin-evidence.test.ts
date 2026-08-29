import { createHash } from 'node:crypto';
import { buildResearchIntakeAdminEvidencePayload } from '../research-intake-admin';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const TASK_ORDER = ['TC-259', 'TC-257', 'TC-255', 'TC-261', 'TC-258', 'TC-256', 'TC-260'];

function taskIdOf(item: ReturnType<typeof buildResearchIntakeAdminEvidencePayload>['items'][number]) {
  return item.record.tradeClawEvidence?.taskId ?? item.record.tradeClawSourceAudit?.taskId;
}

describe('protected research evidence desk projection', () => {
  it('returns every examined candidate in pinned source order without catalog pagination', () => {
    const payload = buildResearchIntakeAdminEvidencePayload(AUDIT_AT);

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
      researchLoop: {
        observedAt: AUDIT_AT,
        currentWindow: { id: '2026-08-29T15:00:00.000Z/PT3H' },
        currentWindowStatus: 'complete',
        latestReceipt: { taskId: 'TC-260' },
        currentWindowReceipts: [{ taskId: 'TC-260' }],
      },
      evidenceIndex: {
        selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
        order: 'pinned-source-order',
        performanceRanked: false,
        includesEveryAvailableOverlay: true,
      },
      evidenceSummary: {
        total: 7,
        discovered: 0,
        sourceAudited: 3,
        replicated: 4,
        passed: 0,
        failed: 3,
        inconclusive: 1,
        untested: 3,
        sourceNoGo: 3,
      },
    });
    expect(payload.selectionPolicy).toMatch(/gross discovery metadata/i);
    expect(payload.workflow).toHaveLength(5);
    expect(payload.items).toHaveLength(7);
    expect(payload.items.map(taskIdOf)).toEqual(TASK_ORDER);
    expect(payload.items.map((item) => item.record.sourcePosition + 1)).toEqual([
      22, 24, 32, 33, 34, 37, 61,
    ]);
    expect(payload.items.map((item) => item.evidencePosition)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const omitted of ['records', 'appliedFilters', 'filteredSummary', 'pagination', 'marketingReview']) {
      expect(payload).not.toHaveProperty(omitted);
    }
  });

  it('joins exact receipts, handoffs, links, drafts, and false authority controls', () => {
    const payload = buildResearchIntakeAdminEvidencePayload(AUDIT_AT);
    const byTask = new Map(payload.items.map((item) => [taskIdOf(item), item]));
    const tc255 = byTask.get('TC-255');
    const tc259 = byTask.get('TC-259');
    const tc260 = byTask.get('TC-260');
    const tc261 = byTask.get('TC-261');
    if (!tc255 || !tc259 || !tc260 || !tc261) throw new Error('Evidence fixture is incomplete');

    expect(payload.items.map((item) => item.candidateWorkflow.receiptCount)).toEqual([
      1, 1, 0, 0, 1, 1, 1,
    ]);
    expect(payload.items.map((item) => item.candidateWorkflow.marketingHandoff?.taskId ?? null))
      .toEqual(['TC-259', 'TC-257', 'TC-255', null, 'TC-258', null, null]);

    expect(tc255).toMatchObject({
      record: {
        id: 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        stage: 'replicated',
        verdict: 'fail',
        marketingReviewDraft: { candidateId: expect.any(String), publishApproved: false },
      },
      candidateWorkflow: {
        receiptCount: 0,
        receipts: [],
        latestReceipt: null,
        marketingHandoff: {
          taskId: 'TC-255',
          basis: 'pre-loop-closure',
          cycleId: null,
          publicationApproved: false,
          externalActions: 'none',
        },
      },
      links: {
        adminCandidate: '/api/admin/research-intake/how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        publicCandidate: '/api/research/intake/how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      },
    });
    expect(tc259.candidateWorkflow.latestReceipt).toMatchObject({
      taskId: 'TC-259',
      candidateId: 'trading-the-term-premium',
      cycleId: '2026-08-29T12:00:00.000Z/PT3H',
      publicationApproved: false,
      tradingApproved: false,
      externalActions: 'none',
    });
    expect(tc260).toMatchObject({
      record: {
        id: 'a-risk-based-approach-to-tactical-asset-allocation',
        stage: 'source-audited',
        verdict: 'not-tested',
        marketingReviewDraft: null,
      },
      candidateWorkflow: {
        receiptCount: 1,
        latestReceipt: { taskId: 'TC-260' },
        marketingHandoff: null,
        controls: {
          humanReviewRequired: false,
          publicationApproved: false,
          automaticPublication: false,
          automaticPosting: false,
          tradingApproved: false,
          automaticTrading: false,
          externalActions: 'none',
        },
      },
    });
    expect(tc261).toMatchObject({
      record: {
        sourcePosition: 32,
        stage: 'source-audited',
        verdict: 'not-tested',
        marketingReviewDraft: null,
        tradeClawSourceAudit: {
          taskId: 'TC-261',
          disposition: 'no-go',
          tradeClawBacktestRun: false,
        },
      },
      candidateWorkflow: {
        receiptCount: 0,
        receipts: [],
        latestReceipt: null,
        marketingHandoff: null,
      },
    });
    for (const item of payload.items) {
      expect(item.record).toHaveProperty('nextAction');
      expect(item.record).toHaveProperty('marketingDisposition');
      expect(item.candidateWorkflow.controls).toMatchObject({
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        tradingApproved: false,
        automaticTrading: false,
        externalActions: 'none',
      });
    }
  });

  it('does not expose TC-260 receipt state before its canonical availability instant', () => {
    const before = buildResearchIntakeAdminEvidencePayload('2026-08-29T15:19:13.999Z');
    const at = buildResearchIntakeAdminEvidencePayload('2026-08-29T15:19:14.000Z');
    const beforeTc260 = before.items.find((item) => taskIdOf(item) === 'TC-260');
    const atTc260 = at.items.find((item) => taskIdOf(item) === 'TC-260');
    if (!beforeTc260 || !atTc260) throw new Error('TC-260 evidence fixture is missing');

    expect(before.researchLoop).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-259' },
      currentWindowReceipts: [],
    });
    expect(beforeTc260.record.tradeClawSourceAudit?.taskId).toBe('TC-260');
    expect(beforeTc260.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: null,
    });

    expect(at.researchLoop).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-260' },
      currentWindowReceipts: [{ taskId: 'TC-260' }],
    });
    expect(atTc260.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{ taskId: 'TC-260' }],
      latestReceipt: { taskId: 'TC-260' },
      marketingHandoff: null,
    });
  });

  it('does not expose the TC-261 receipt before 18:00:40Z', () => {
    const before = buildResearchIntakeAdminEvidencePayload('2026-08-29T18:00:39.999Z');
    const at = buildResearchIntakeAdminEvidencePayload('2026-08-29T18:00:40.000Z');
    const beforeTc261 = before.items.find((item) => taskIdOf(item) === 'TC-261');
    const atTc261 = at.items.find((item) => taskIdOf(item) === 'TC-261');
    if (!beforeTc261 || !atTc261) throw new Error('TC-261 evidence fixture is missing');

    expect(before.researchLoop).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-260' },
      currentWindowReceipts: [],
    });
    expect(beforeTc261.candidateWorkflow).toMatchObject({
      receiptCount: 0,
      receipts: [],
      latestReceipt: null,
      marketingHandoff: null,
    });
    expect(at.researchLoop).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-261' },
      currentWindowReceipts: [{ taskId: 'TC-261' }],
    });
    expect(atTc261.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{ taskId: 'TC-261' }],
      latestReceipt: { taskId: 'TC-261' },
      marketingHandoff: null,
    });
  });

  it('serializes deterministically at the frozen audit instant', () => {
    const first = JSON.stringify(buildResearchIntakeAdminEvidencePayload(AUDIT_AT));
    const second = JSON.stringify(buildResearchIntakeAdminEvidencePayload(AUDIT_AT));

    expect(second).toBe(first);
    expect(Buffer.byteLength(first, 'utf8')).toBe(56_502);
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      'defa5ec013c50c5c762fbb801d5dca6760646d0a3e28fdf2b441f75a3cea8098',
    );
  });
});
