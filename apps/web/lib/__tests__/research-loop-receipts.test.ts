import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import {
  EXPECTED_LEGACY_DUPLICATE_WINDOW_IDS,
  RESEARCH_LOOP_RECEIPTS,
  RESEARCH_LOOP_RECEIPT_LEDGER_AUDIT,
  auditResearchLoopReceipts,
  getResearchLoopReceiptSnapshot,
} from '../research-loop-receipts';

const root = resolve(__dirname, '../../../..');

interface StateCycle {
  id: string;
  recorded_at: string;
  task_id: string;
  candidate_id: string;
  stage_before: string;
  stage_after: string;
  verdict: string;
  outcome: string;
  evidence_paths: string[];
  marketing_draft: string;
  external_actions: string;
  next_action: string;
}

describe('research-loop receipt ledger', () => {
  it('retains the exact nine receipts and exposes only the known historical collision', () => {
    expect(RESEARCH_LOOP_RECEIPTS.map((receipt) => receipt.taskId)).toEqual([
      'TC-256',
      'TC-257',
      'TC-258',
      'TC-259',
      'TC-260',
      'TC-261',
      'TC-262',
      'TC-263',
      'TC-264',
    ]);
    expect(RESEARCH_LOOP_RECEIPT_LEDGER_AUDIT).toEqual({
      status: 'historical-conflict',
      receiptCount: 9,
      uniqueWindowCount: 8,
      duplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
      expectedLegacyDuplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
      additionalDuplicateWindowIds: [],
    });
    expect(EXPECTED_LEGACY_DUPLICATE_WINDOW_IDS).toEqual([
      '2026-08-29T06:00:00.000Z/PT3H',
    ]);

    for (const receipt of RESEARCH_LOOP_RECEIPTS) {
      expect(receipt).toMatchObject({
        eligibleForProspectiveReview: false,
        publicationApproved: false,
        tradingApproved: false,
        externalActions: 'none',
      });
    }
  });

  it('fails ledger integrity if another window acquires a duplicate receipt', () => {
    const extra = {
      ...RESEARCH_LOOP_RECEIPTS[3],
      taskId: 'TC-999',
      candidateId: 'unexpected-second-receipt',
      recordedAt: '2026-08-29T12:48:00.000Z',
    };
    expect(auditResearchLoopReceipts([...RESEARCH_LOOP_RECEIPTS, extra])).toMatchObject({
      status: 'invalid',
      duplicateWindowIds: [
        '2026-08-29T06:00:00.000Z/PT3H',
        '2026-08-29T12:00:00.000Z/PT3H',
      ],
      additionalDuplicateWindowIds: ['2026-08-29T12:00:00.000Z/PT3H'],
    });
  });

  it('does not let the legacy allowlist hide a third receipt in the conflicted window', () => {
    const extra = {
      ...RESEARCH_LOOP_RECEIPTS[1],
      taskId: 'TC-999',
      candidateId: 'unexpected-third-receipt',
      recordedAt: '2026-08-29T08:30:00.000Z',
    };

    expect(auditResearchLoopReceipts([...RESEARCH_LOOP_RECEIPTS, extra])).toMatchObject({
      status: 'invalid',
      duplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
      expectedLegacyDuplicateWindowIds: [],
      additionalDuplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
    });
  });

  it('selects receipts by observation time without exposing future work', () => {
    expect(getResearchLoopReceiptSnapshot('2026-08-29T07:32:53.999Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: null,
      currentWindowReceipts: [],
      integrity: { status: 'clean', receiptCount: 0, uniqueWindowCount: 0 },
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T07:32:54.000Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-256' },
      currentWindowReceipts: [{ taskId: 'TC-256' }],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T08:29:58.000Z')).toMatchObject({
      currentWindowStatus: 'conflict',
      latestReceipt: { taskId: 'TC-257' },
      currentWindowReceipts: [{ taskId: 'TC-256' }, { taskId: 'TC-257' }],
      integrity: {
        status: 'historical-conflict',
        receiptCount: 2,
        uniqueWindowCount: 1,
      },
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T12:47:50.999Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-258' },
      currentWindowReceipts: [],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T12:47:51.000Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-259' },
      currentWindowReceipts: [{ taskId: 'TC-259' }],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T15:00:00.000Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-259' },
      currentWindowReceipts: [],
      nextAction:
        'Open at most one receipt for the current UTC window by screening the next lower-transition candidate; do not select, publish, or trade automatically.',
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T15:19:13.999Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-259' },
      currentWindowReceipts: [],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T15:19:14.000Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-260' },
      currentWindowReceipts: [{ taskId: 'TC-260' }],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T18:00:39.999Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-260' },
      currentWindowReceipts: [],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T18:00:40.000Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-261' },
      currentWindowReceipts: [{ taskId: 'TC-261' }],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T21:09:39.109Z')).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      latestReceipt: { taskId: 'TC-261' },
      currentWindowReceipts: [],
    });

    expect(getResearchLoopReceiptSnapshot('2026-08-29T21:09:39.110Z')).toMatchObject({
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-262' },
      currentWindowReceipts: [{ taskId: 'TC-262' }],
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
  });

  it('binds the runtime ledger to the canonical STATE cycle receipts', () => {
    const state = parse(readFileSync(resolve(root, 'STATE.yaml'), 'utf8')) as {
      research_intake_desk_2026_08_29: Record<string, StateCycle>;
    };
    const desk = state.research_intake_desk_2026_08_29;
    const cycles = [
      desk.cycle,
      desk.cycle_2,
      desk.cycle_3,
      desk.cycle_4,
      desk.cycle_5,
      desk.cycle_6,
      desk.cycle_7,
      desk.cycle_8,
      desk.cycle_9,
    ];

    expect(
      RESEARCH_LOOP_RECEIPTS.map((receipt) => ({
        cycleId: receipt.cycleId,
        recordedAt: receipt.recordedAt,
        taskId: receipt.taskId,
        candidateId: receipt.candidateId,
        stageBefore: receipt.stageBefore,
        stageAfter: receipt.stageAfter,
        verdict: receipt.verdict,
        outcome: receipt.outcome,
        evidencePaths: receipt.evidencePaths,
        marketingDraft: receipt.marketingDraft,
        externalActions: receipt.externalActions,
        nextAction: receipt.nextAction,
      })),
    ).toEqual(
      cycles.map((cycle) => ({
        cycleId: cycle.id,
        recordedAt: cycle.recorded_at,
        taskId: cycle.task_id,
        candidateId: cycle.candidate_id,
        stageBefore: cycle.stage_before,
        stageAfter: cycle.stage_after,
        verdict: cycle.verdict,
        outcome: cycle.outcome,
        evidencePaths: cycle.evidence_paths,
        marketingDraft: cycle.marketing_draft,
        externalActions: cycle.external_actions,
        nextAction: cycle.next_action,
      })),
    );
  });
});
