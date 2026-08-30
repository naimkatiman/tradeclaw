import {
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const TASK_IDS = ['TC-255', 'TC-257', 'TC-258', 'TC-259'] as const;
const REVIEW_OUTCOMES = [
  'reject-draft',
  'needs-revision',
  'ready-for-separate-owner-decision',
] as const;

interface ReviewHandoffTemplate {
  schemaVersion: 1;
  status: 'blank-template-not-recorded';
  purpose: 'copy-to-separate-manual-review-workflow';
  completionTracking: 'not-recorded-by-this-read-only-api';
  completionRecorded: false;
  mutationSupported: false;
  ownerDecisionRecorded: false;
  ownerDecisionRequiredForPublication: true;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  requiredCheckIds: readonly string[];
  claimIds: readonly string[];
  allowedOutcomes: readonly (typeof REVIEW_OUTCOMES)[number][];
  blankRecord: {
    taskId: string;
    candidateId: string;
    reviewedProjectionObservedAt: string;
    reviewer: null;
    reviewedAt: null;
    completedCheckIds: readonly [];
    verifiedClaimIds: readonly [];
    outcome: null;
    notes: null;
  };
}

function handoffTemplate(taskId: string): ReviewHandoffTemplate | undefined {
  return (
    buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT) as
      | { reviewHandoffTemplate?: ReviewHandoffTemplate }
      | null
  )?.reviewHandoffTemplate;
}

describe('protected exact-review blank manual handoff template', () => {
  it('provides a deeply frozen, non-approving blank record for the exact review', () => {
    const exact = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT);
    const template = handoffTemplate('TC-255');
    if (!exact || !template) throw new Error('TC-255 handoff template is missing');

    expect(template).toEqual({
      schemaVersion: 1,
      status: 'blank-template-not-recorded',
      purpose: 'copy-to-separate-manual-review-workflow',
      completionTracking: 'not-recorded-by-this-read-only-api',
      completionRecorded: false,
      mutationSupported: false,
      ownerDecisionRecorded: false,
      ownerDecisionRequiredForPublication: true,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      requiredCheckIds: exact.reviewProtocol.checks.map((check) => check.id),
      claimIds: exact.claimVerification.claims.map((claim) => claim.id),
      allowedOutcomes: REVIEW_OUTCOMES,
      blankRecord: {
        taskId: 'TC-255',
        candidateId: exact.reviewItem.candidate.id,
        reviewedProjectionObservedAt: AUDIT_AT,
        reviewer: null,
        reviewedAt: null,
        completedCheckIds: [],
        verifiedClaimIds: [],
        outcome: null,
        notes: null,
      },
    });
    expect(Object.isFrozen(template)).toBe(true);
    expect(Object.isFrozen(template.requiredCheckIds)).toBe(true);
    expect(Object.isFrozen(template.claimIds)).toBe(true);
    expect(Object.isFrozen(template.allowedOutcomes)).toBe(true);
    expect(Object.isFrozen(template.blankRecord)).toBe(true);
    expect(Object.isFrozen(template.blankRecord.completedCheckIds)).toBe(true);
    expect(Object.isFrozen(template.blankRecord.verifiedClaimIds)).toBe(true);
  });

  it.each(TASK_IDS)('binds %s to its own protocol, claim map, and observation', (taskId) => {
    const exact = buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT);
    const template = handoffTemplate(taskId);
    if (!exact || !template) throw new Error(`${taskId} handoff template is missing`);

    expect(template.blankRecord).toMatchObject({
      taskId,
      candidateId: exact.reviewItem.candidate.id,
      reviewedProjectionObservedAt: exact.researchLoop.observedAt,
      reviewer: null,
      reviewedAt: null,
      outcome: null,
      notes: null,
    });
    expect(template.requiredCheckIds).toEqual(
      exact.reviewProtocol.checks.map((check) => check.id),
    );
    expect(template.claimIds).toEqual(
      exact.claimVerification.claims.map((claim) => claim.id),
    );
    expect(template.allowedOutcomes).toEqual(REVIEW_OUTCOMES);
    expect(template.allowedOutcomes).not.toContain('approved');
  });

  it('renders a copy-ready packet block while staying off queue, public, and CSV surfaces', () => {
    const template = handoffTemplate('TC-255');
    const packet = buildResearchMarketingReviewPacket('TC-255', AUDIT_AT);
    if (!template || !packet) throw new Error('TC-255 packet fixture is missing');

    expect(packet).toContain('## Manual review handoff template (not recorded)');
    expect(packet).toContain('Copy this blank record into a separate manual workflow');
    expect(packet).toContain('taskId: TC-255');
    expect(packet).toContain(`candidateId: ${template.blankRecord.candidateId}`);
    expect(packet).toContain(`reviewedProjectionObservedAt: ${AUDIT_AT}`);
    expect(packet).toContain('completedCheckIds: []');
    expect(packet).toContain('verifiedClaimIds: []');
    expect(packet).toContain('outcome: null');
    for (const outcome of template.allowedOutcomes) {
      expect(packet).toContain(outcome);
    }
    expect(packet).toContain('Publication authority granted: No');
    expect(packet).toContain('Owner decision required for publication: Yes');

    expect(JSON.stringify(buildResearchIntakeAdminReviewPayload(AUDIT_AT))).not.toContain(
      'reviewHandoffTemplate',
    );
    expect(JSON.stringify(buildResearchIntakeAdminOverviewPayload(AUDIT_AT))).not.toContain(
      'reviewHandoffTemplate',
    );
    expect(JSON.stringify(buildResearchIntakePublicOverviewPayload())).not.toContain(
      'reviewHandoffTemplate',
    );
    expect(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())).not.toContain(
      'reviewHandoffTemplate',
    );
    expect([
      buildResearchIntakeCsv(),
      buildResearchIntakeEvidenceCsv(),
      buildResearchIntakeAdminEvidenceCsv(AUDIT_AT),
      buildResearchMarketingReviewCsv(AUDIT_AT),
    ].every((body) => !body.includes('reviewHandoffTemplate'))).toBe(true);
  });
});
