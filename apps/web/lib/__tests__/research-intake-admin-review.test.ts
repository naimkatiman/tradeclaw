import { buildResearchIntakeAdminReviewPayload } from '../research-intake-admin';

const TC255 = 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin';
const TC259 = 'trading-the-term-premium';

describe('protected research marketing-review JSON projection', () => {
  it('returns the complete observation-consistent queue without the catalog page', () => {
    const payload = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T15:59:59.999Z',
    );

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
        observedAt: '2026-08-29T15:59:59.999Z',
        currentWindow: { id: '2026-08-29T15:00:00.000Z/PT3H' },
        currentWindowStatus: 'complete',
        latestReceipt: { taskId: 'TC-260' },
        currentWindowReceipts: [{ taskId: 'TC-260' }],
      },
      catalogEvidenceStateSummary: {
        totalCandidates: 61,
        withTradeClawRecord: 14,
        performanceGatesEvaluated: 3,
        performanceGatesNotEvaluated: 58,
        plainLanguageSummary:
          '61 candidates: 47 not tested by TradeClaw, 10 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
      },
      queue: {
        status: 'review-ready',
        summary: {
          availableDrafts: 4,
          receiptBackedDrafts: 3,
          preLoopDrafts: 1,
          publicationApprovedDrafts: 0,
        },
        evidenceStateSummary: {
          totalCandidates: 4,
          withTradeClawRecord: 4,
          performanceGatesEvaluated: 3,
          performanceGatesNotEvaluated: 1,
          plainLanguageSummary:
            '4 candidates: 1 QA-only record with no performance result and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 1 candidate.',
        },
        latestItem: {
          queuePosition: 4,
          handoff: { taskId: 'TC-259' },
        },
        currentWindowItems: [],
        controls: {
          humanReviewRequired: true,
          publicationApproved: false,
          automaticPublication: false,
          automaticPosting: false,
          tradingApproved: false,
          automaticTrading: false,
          externalActions: 'none',
        },
      },
    });
    expect(payload.selectionPolicy).toMatch(/gross discovery metadata/i);
    expect(payload.workflow).toHaveLength(5);
    const taskIds = payload.queue.items.map((item) => String(item.handoff.taskId));
    expect(taskIds).toEqual([
      'TC-255',
      'TC-257',
      'TC-258',
      'TC-259',
    ]);
    expect(payload.queue.items.map((item) => item.queuePosition)).toEqual([1, 2, 3, 4]);
    expect(taskIds).not.toContain('TC-256');
    expect(taskIds).not.toContain('TC-260');
    for (const omitted of ['records', 'appliedFilters', 'filteredSummary', 'pagination']) {
      expect(payload).not.toHaveProperty(omitted);
    }
  });

  it('joins exact candidate, handoff, receipt, links, and false authority controls', () => {
    const payload = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T15:59:59.999Z',
    );
    const preLoop = payload.queue.items.find((item) => item.handoff.taskId === 'TC-255');
    const receiptBacked = payload.queue.items.find((item) => item.handoff.taskId === 'TC-259');
    if (!preLoop || !receiptBacked) throw new Error('Marketing-review fixture is missing');

    expect(preLoop).toMatchObject({
      queuePosition: 1,
      candidate: {
        id: TC255,
        title: 'How to Design a Simple Multi-Timeframe Trend Strategy on Bitcoin',
        sourceUrl: expect.stringMatching(/^https:\/\/paperswithbacktest\.com\/strategies\//),
        assetClass: 'Cryptocurrencies',
        sourcePosition: 31,
        stage: 'replicated',
        verdict: 'fail',
        costStatus: 'failed',
        evidenceState: {
          performanceEvidenceStatus: 'modeled-historical-fail',
          performanceGatesEvaluated: true,
          taskId: 'TC-255',
          grantsPublicationAuthority: false,
          grantsTradingAuthority: false,
        },
      },
      handoff: {
        taskId: 'TC-255',
        candidateId: TC255,
        availableAt: '2026-08-29T04:55:27.000Z',
        basis: 'pre-loop-closure',
        cycleId: null,
        workflowState: 'human-review-required',
        publicationApproved: false,
        externalActions: 'none',
        draft: { candidateId: TC255, publishApproved: false },
      },
      receipt: null,
      links: {
        adminCandidate: `/api/admin/research-intake/${TC255}`,
        publicCandidate: `/api/research/intake/${TC255}`,
      },
      controls: {
        humanReviewRequired: true,
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        tradingApproved: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });

    expect(receiptBacked).toMatchObject({
      queuePosition: 4,
      candidate: {
        id: TC259,
        title: 'Trading the Term Premium',
        assetClass: 'Bonds',
        sourcePosition: 21,
        stage: 'replicated',
        verdict: 'fail',
        costStatus: 'failed',
        evidenceState: {
          performanceEvidenceStatus: 'modeled-historical-fail',
          performanceGatesEvaluated: true,
          taskId: 'TC-259',
        },
      },
      handoff: {
        taskId: 'TC-259',
        candidateId: TC259,
        availableAt: '2026-08-29T12:47:51.000Z',
        basis: 'cycle-receipt',
        cycleId: '2026-08-29T12:00:00.000Z/PT3H',
        draft: { candidateId: TC259, publishApproved: false },
      },
      receipt: {
        taskId: 'TC-259',
        candidateId: TC259,
        recordedAt: '2026-08-29T12:47:51.000Z',
        cycleId: '2026-08-29T12:00:00.000Z/PT3H',
        publicationApproved: false,
        tradingApproved: false,
        externalActions: 'none',
      },
    });
    for (const item of payload.queue.items) {
      expect(item.candidate).not.toHaveProperty('upstreamGrossSharpe');
      expect(item.candidate).not.toHaveProperty('tradeClawEvidence');
      expect(item.candidate.evidenceState.taskId).toBe(item.handoff.taskId);
      expect(item.candidate.evidenceState.grantsPublicationAuthority).toBe(false);
      expect(item.candidate.evidenceState.grantsTradingAuthority).toBe(false);
      expect(item.handoff.draft.publishApproved).toBe(false);
      expect(item.controls).toEqual(payload.queue.controls);
    }
  });

  it('reveals the pre-loop item only at its exact availability instant', () => {
    const before = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T04:55:26.999Z',
    );
    const at = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T04:55:27.000Z',
    );

    expect(before.queue).toMatchObject({
      status: 'empty',
      summary: { availableDrafts: 0 },
      evidenceStateSummary: {
        totalCandidates: 0,
        withTradeClawRecord: 0,
        performanceGatesEvaluated: 0,
        performanceGatesNotEvaluated: 0,
        plainLanguageSummary:
          'No candidates are in this view. No performance gates were evaluated.',
      },
      latestItem: null,
      currentWindowItems: [],
      items: [],
    });
    expect(at.queue.items).toHaveLength(1);
    expect(at.queue.items[0]).toMatchObject({
      handoff: { taskId: 'TC-255' },
      receipt: null,
    });
  });

  it('reveals TC-259 and its exact receipt only at the canonical receipt instant', () => {
    const before = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T12:47:50.999Z',
    );
    const at = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T12:47:51.000Z',
    );

    expect(before.queue.items.map((item) => item.handoff.taskId)).toEqual([
      'TC-255',
      'TC-257',
      'TC-258',
    ]);
    expect(before.queue.latestItem?.handoff.taskId).toBe('TC-258');
    expect(before.queue.currentWindowItems).toEqual([]);

    expect(at.queue.items.map((item) => item.handoff.taskId)).toEqual([
      'TC-255',
      'TC-257',
      'TC-258',
      'TC-259',
    ]);
    expect(at.queue.latestItem?.handoff.taskId).toBe('TC-259');
    expect(at.queue.currentWindowItems).toHaveLength(1);
    expect(at.queue.currentWindowItems[0]).toMatchObject({
      handoff: { taskId: 'TC-259' },
      receipt: { taskId: 'TC-259' },
    });
  });
});
