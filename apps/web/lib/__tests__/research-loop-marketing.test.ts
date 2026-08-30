import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { SYSTEMATIC_RESEARCH_INTAKE } from '../research-intake';
import { buildMarketingReviewDraft } from '../research-loop';
import {
  RESEARCH_LOOP_MARKETING_HANDOFFS,
  getResearchLoopMarketingReview,
} from '../research-loop-marketing';

const root = resolve(__dirname, '../../../..');

describe('research-loop marketing review handoff', () => {
  it('binds every eligible draft to one chronological handoff without inventing no-go copy', () => {
    const eligibleDraftCandidateIds = SYSTEMATIC_RESEARCH_INTAKE.flatMap((record) =>
      buildMarketingReviewDraft(record) ? [record.id] : [],
    );

    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.map((handoff) => handoff.taskId)).toEqual([
      'TC-255',
      'TC-257',
      'TC-258',
      'TC-259',
    ]);
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.some(
      (handoff) =>
        handoff.taskId === ('TC-256' as string) ||
        handoff.taskId === ('TC-260' as string) ||
        handoff.taskId === ('TC-261' as string) ||
        handoff.taskId === ('TC-262' as string) ||
        handoff.taskId === ('TC-263' as string) ||
        handoff.taskId === ('TC-264' as string),
    )).toBe(false);
    expect(
      RESEARCH_LOOP_MARKETING_HANDOFFS.map((handoff) => handoff.candidateId).sort(),
    ).toEqual([...eligibleDraftCandidateIds].sort());
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS[0]).toMatchObject({
      taskId: 'TC-255',
      availableAt: '2026-08-29T04:55:27.000Z',
      basis: 'pre-loop-closure',
      cycleId: null,
      workflowState: 'human-review-required',
      publicationApproved: false,
      externalActions: 'none',
    });
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.slice(1).every(
      (handoff) => handoff.basis === 'cycle-receipt' && handoff.cycleId !== null,
    )).toBe(true);
    expect(RESEARCH_LOOP_MARKETING_HANDOFFS.every(
      (handoff) => handoff.draft.candidateId === handoff.candidateId,
    )).toBe(true);
  });

  it('binds the pre-loop handoff to the canonical TC-255 closure recorded in STATE', () => {
    const state = parse(readFileSync(resolve(root, 'STATE.yaml'), 'utf8')) as {
      research_loop_marketing_review_queue_projection_2026_08_29: {
        pre_loop_handoff: {
          task_id: string;
          candidate_id: string;
          available_at: string;
          basis: string;
          cycle_id: null;
          closure_commit: string;
        };
      };
    };
    const canonical =
      state.research_loop_marketing_review_queue_projection_2026_08_29.pre_loop_handoff;
    const handoff = RESEARCH_LOOP_MARKETING_HANDOFFS[0];

    expect({
      taskId: handoff.taskId,
      candidateId: handoff.candidateId,
      availableAt: handoff.availableAt,
      basis: handoff.basis,
      cycleId: handoff.cycleId,
    }).toEqual({
      taskId: canonical.task_id,
      candidateId: canonical.candidate_id,
      availableAt: canonical.available_at,
      basis: canonical.basis,
      cycleId: canonical.cycle_id,
    });
    expect(canonical.closure_commit).toBe('f7936bcf627f208ac0379412453976b17218608b');
  });

  it('reveals handoffs only after their evidence is available', () => {
    expect(getResearchLoopMarketingReview('2026-08-29T04:55:26.999Z')).toEqual({
      status: 'empty',
      summary: {
        availableDrafts: 0,
        receiptBackedDrafts: 0,
        preLoopDrafts: 0,
        publicationApprovedDrafts: 0,
      },
      latestHandoff: null,
      currentWindowHandoffs: [],
      handoffs: [],
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
      },
    });

    expect(
      getResearchLoopMarketingReview('2026-08-29T11:17:23.000Z'),
    ).toMatchObject({
      status: 'review-ready',
      summary: {
        availableDrafts: 3,
        receiptBackedDrafts: 2,
        preLoopDrafts: 1,
        publicationApprovedDrafts: 0,
      },
      latestHandoff: { taskId: 'TC-258' },
      currentWindowHandoffs: [{ taskId: 'TC-258' }],
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
      },
    });
    expect(
      getResearchLoopMarketingReview('2026-08-29T11:17:23.000Z').handoffs.map(
        (handoff) => handoff.taskId,
      ),
    ).toEqual(['TC-255', 'TC-257', 'TC-258']);

    expect(
      getResearchLoopMarketingReview('2026-08-29T12:47:50.999Z'),
    ).toMatchObject({
      latestHandoff: { taskId: 'TC-258' },
      currentWindowHandoffs: [],
    });
    expect(
      getResearchLoopMarketingReview('2026-08-29T12:47:51.000Z'),
    ).toMatchObject({
      summary: { availableDrafts: 4, receiptBackedDrafts: 3, preLoopDrafts: 1 },
      latestHandoff: { taskId: 'TC-259' },
      currentWindowHandoffs: [{ taskId: 'TC-259' }],
    });
  });

  it('starts a new window with no current handoff while retaining prior review evidence', () => {
    const review = getResearchLoopMarketingReview('2026-08-29T15:00:00.000Z');

    expect(review.status).toBe('review-ready');
    expect(review.summary).toEqual({
      availableDrafts: 4,
      receiptBackedDrafts: 3,
      preLoopDrafts: 1,
      publicationApprovedDrafts: 0,
    });
    expect(review.latestHandoff?.taskId).toBe('TC-259');
    expect(review.currentWindowHandoffs).toEqual([]);
    expect(review.handoffs.every((handoff) => handoff.publicationApproved === false)).toBe(true);
  });
});
