import {
  SYSTEMATIC_RESEARCH_INTAKE,
  type ResearchIntakeRecord,
} from './research-intake';
import {
  buildMarketingReviewDraft,
  getResearchLoopWindow,
  type MarketingReviewDraft,
} from './research-loop';
import { RESEARCH_LOOP_RECEIPTS } from './research-loop-receipts';

export type ResearchLoopMarketingTaskId = NonNullable<
  ResearchIntakeRecord['tradeClawEvidence']
>['taskId'];

export interface ResearchLoopMarketingHandoff {
  taskId: ResearchLoopMarketingTaskId;
  candidateId: string;
  availableAt: string;
  basis: 'pre-loop-closure' | 'cycle-receipt';
  cycleId: string | null;
  workflowState: 'human-review-required';
  publicationApproved: false;
  externalActions: 'none';
  draft: MarketingReviewDraft;
}

export interface ResearchLoopMarketingReview {
  status: 'empty' | 'review-ready';
  summary: {
    availableDrafts: number;
    receiptBackedDrafts: number;
    preLoopDrafts: number;
    publicationApprovedDrafts: number;
  };
  latestHandoff: ResearchLoopMarketingHandoff | null;
  currentWindowHandoffs: readonly ResearchLoopMarketingHandoff[];
  handoffs: readonly ResearchLoopMarketingHandoff[];
  controls: {
    humanReviewRequired: true;
    automaticPublication: false;
    automaticPosting: false;
  };
}

interface PreLoopHandoffSeed {
  taskId: 'TC-255';
  candidateId: string;
  availableAt: string;
}

const PRE_LOOP_HANDOFFS: readonly PreLoopHandoffSeed[] = [
  {
    taskId: 'TC-255',
    candidateId: 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
    availableAt: '2026-08-29T04:55:27.000Z',
  },
] as const;

function recordForTask(taskId: ResearchLoopMarketingTaskId): ResearchIntakeRecord {
  const record = SYSTEMATIC_RESEARCH_INTAKE.find(
    (candidate) => candidate.tradeClawEvidence?.taskId === taskId,
  );
  if (!record) throw new Error(`marketing handoff ${taskId} has no intake evidence`);
  return record;
}

function draftForRecord(record: ResearchIntakeRecord): MarketingReviewDraft {
  const draft = buildMarketingReviewDraft(record);
  if (!draft) throw new Error(`marketing handoff ${record.id} has no review draft`);
  if (draft.publishApproved !== false) {
    throw new Error(`marketing handoff ${record.id} acquired publication authority`);
  }
  return draft;
}

function buildResearchLoopMarketingHandoffs(): readonly ResearchLoopMarketingHandoff[] {
  const preLoopHandoffs = PRE_LOOP_HANDOFFS.map((seed) => {
    const record = recordForTask(seed.taskId);
    if (record.id !== seed.candidateId) {
      throw new Error(`marketing handoff ${seed.taskId} candidate does not match intake`);
    }
    return {
      ...seed,
      basis: 'pre-loop-closure' as const,
      cycleId: null,
      workflowState: 'human-review-required' as const,
      publicationApproved: false as const,
      externalActions: 'none' as const,
      draft: draftForRecord(record),
    };
  });

  const receiptHandoffs = RESEARCH_LOOP_RECEIPTS.flatMap((receipt) => {
    if (receipt.marketingDraft === 'none') return [];
    if (
      receipt.taskId === 'TC-256' ||
      receipt.taskId === 'TC-260' ||
      receipt.taskId === 'TC-261' ||
      receipt.taskId === 'TC-262' ||
      receipt.taskId === 'TC-263' ||
      receipt.taskId === 'TC-264' ||
      receipt.taskId === 'TC-265' ||
      receipt.taskId === 'TC-266'
    ) {
      throw new Error(`${receipt.taskId} no-draft receipt acquired a marketing handoff`);
    }
    const record = recordForTask(receipt.taskId);
    if (record.id !== receipt.candidateId) {
      throw new Error(`marketing receipt ${receipt.taskId} candidate does not match intake`);
    }
    return [{
      taskId: receipt.taskId,
      candidateId: receipt.candidateId,
      availableAt: receipt.recordedAt,
      basis: 'cycle-receipt' as const,
      cycleId: receipt.cycleId,
      workflowState: 'human-review-required' as const,
      publicationApproved: false as const,
      externalActions: 'none' as const,
      draft: draftForRecord(record),
    }];
  });

  const handoffs = [...preLoopHandoffs, ...receiptHandoffs].sort(
    (left, right) => Date.parse(left.availableAt) - Date.parse(right.availableAt),
  );
  const taskIds = new Set<ResearchLoopMarketingTaskId>();
  const candidateIds = new Set<string>();
  let priorAvailableAt = Number.NEGATIVE_INFINITY;

  for (const handoff of handoffs) {
    const availableAt = Date.parse(handoff.availableAt);
    if (
      !Number.isFinite(availableAt) ||
      new Date(availableAt).toISOString() !== handoff.availableAt ||
      availableAt <= priorAvailableAt
    ) {
      throw new Error('marketing handoffs must have canonical, strictly ordered availability');
    }
    if (taskIds.has(handoff.taskId) || candidateIds.has(handoff.candidateId)) {
      throw new Error(`duplicate marketing handoff: ${handoff.taskId}`);
    }
    if (handoff.draft.candidateId !== handoff.candidateId) {
      throw new Error(`marketing handoff ${handoff.taskId} draft candidate does not match`);
    }
    taskIds.add(handoff.taskId);
    candidateIds.add(handoff.candidateId);
    priorAvailableAt = availableAt;
  }

  const eligibleTaskIds = SYSTEMATIC_RESEARCH_INTAKE.flatMap((record) => {
    const draft = buildMarketingReviewDraft(record);
    return draft && record.tradeClawEvidence ? [record.tradeClawEvidence.taskId] : [];
  });
  if (
    eligibleTaskIds.length !== taskIds.size ||
    eligibleTaskIds.some((taskId) => !taskIds.has(taskId))
  ) {
    throw new Error('marketing handoff ledger does not cover every eligible intake draft');
  }

  return handoffs;
}

export const RESEARCH_LOOP_MARKETING_HANDOFFS = buildResearchLoopMarketingHandoffs();

export function getResearchLoopMarketingReview(
  at: Date | string | number,
): ResearchLoopMarketingReview {
  const currentWindow = getResearchLoopWindow(at);
  const observedAt = at instanceof Date ? at.getTime() : new Date(at).getTime();
  const handoffs = RESEARCH_LOOP_MARKETING_HANDOFFS.filter(
    (handoff) => Date.parse(handoff.availableAt) <= observedAt,
  );
  const receiptBackedDrafts = handoffs.filter(
    (handoff) => handoff.basis === 'cycle-receipt',
  ).length;
  const preLoopDrafts = handoffs.length - receiptBackedDrafts;

  return {
    status: handoffs.length === 0 ? 'empty' : 'review-ready',
    summary: {
      availableDrafts: handoffs.length,
      receiptBackedDrafts,
      preLoopDrafts,
      publicationApprovedDrafts: 0,
    },
    latestHandoff: handoffs.at(-1) ?? null,
    currentWindowHandoffs: handoffs.filter(
      (handoff) => handoff.cycleId === currentWindow.id,
    ),
    handoffs,
    controls: {
      humanReviewRequired: true,
      automaticPublication: false,
      automaticPosting: false,
    },
  };
}
