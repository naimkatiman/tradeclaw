import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import {
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../../../apps/web/lib/research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../../../apps/web/lib/research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../../../apps/web/lib/research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../../../apps/web/lib/research-marketing-review-csv';
import { buildResearchMarketingReviewHandoff } from '../../../apps/web/lib/research-marketing-review-handoff';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../../../apps/web/lib/research-intake-public';

const REPO_ROOT = resolve(__dirname, '../../..');
const VALIDATOR_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-review-handoff-validator.ts',
);
const README_PATH = resolve(REPO_ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  REPO_ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REVIEWED_AT = '2026-08-29T16:05:00.000Z';
const VALIDATION_NOW = '2026-08-30T00:00:00.000Z';

interface OwnerDecisionRequest {
  schemaVersion: 1;
  status: 'request-for-separate-owner-decision-not-recorded';
  taskId: string;
  candidateId: string;
  completedHandoffSha256: string;
  evidenceManifestSha256: string;
  reviewer: string;
  reviewedAt: string;
  reviewOutcome: 'ready-for-separate-owner-decision';
  reviewNotes: string | null;
  links: {
    exactReview: string;
    reviewPacket: string;
  };
  ownerDecisionRequired: true;
  ownerDecisionRecorded: false;
  publicationApproved: false;
  automaticPublication: false;
  automaticPosting: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  externalActions: 'none';
}

interface ValidationReport {
  schemaVersion: 2;
  ok: boolean;
  source: { sha256: string };
  workflow: {
    status:
      | 'invalid-handoff'
      | 'draft-rejected'
      | 'revision-required'
      | 'ready-for-separate-owner-decision';
    nextAction: string;
    ownerDecisionRequest: OwnerDecisionRequest | null;
  };
}

interface ValidatorModule {
  validateResearchMarketingReviewHandoff(options: {
    yamlText: string;
    root?: string;
    now?: Date | string | number;
  }): Promise<ValidationReport>;
}

function validatorModule(): ValidatorModule {
  return require(VALIDATOR_PATH) as ValidatorModule;
}

function completedYaml(
  outcome:
    | 'reject-draft'
    | 'needs-revision'
    | 'ready-for-separate-owner-decision',
  mutate?: (record: Record<string, unknown>) => void,
): string {
  const blank = buildResearchMarketingReviewHandoff('TC-255', AUDIT_AT);
  if (!blank) throw new Error('TC-255 handoff fixture is missing');
  const record = parse(blank) as Record<string, unknown>;
  record.reviewer = 'Research operator';
  record.reviewedAt = REVIEWED_AT;
  record.completedCheckIds = [...(record.requiredCheckIds as string[])];
  record.verifiedClaimIds = [...(record.claimIds as string[])];
  record.outcome = outcome;
  record.notes = outcome === 'ready-for-separate-owner-decision'
    ? 'Evidence and framing checks are complete.'
    : outcome === 'needs-revision'
      ? 'Replace the unsupported live-performance sentence.'
      : 'Reject this draft because its headline overstates the evidence.';
  mutate?.(record);
  return stringify(record, { lineWidth: 0 });
}

async function validate(yamlText: string): Promise<ValidationReport> {
  return validatorModule().validateResearchMarketingReviewHandoff({
    yamlText,
    root: REPO_ROOT,
    now: VALIDATION_NOW,
  });
}

describe('outcome-aware owner decision request', () => {
  it('emits one digest-bound non-authorizing request only for a valid ready handoff', async () => {
    const yamlText = completedYaml('ready-for-separate-owner-decision');
    const sourceSha256 = createHash('sha256').update(yamlText).digest('hex');
    const report = await validate(yamlText);

    expect(report).toMatchObject({
      schemaVersion: 2,
      ok: true,
      workflow: {
        status: 'ready-for-separate-owner-decision',
        nextAction:
          'Send ownerDecisionRequest to a separate owner workflow; validation itself grants no publication or posting authority.',
        ownerDecisionRequest: {
          schemaVersion: 1,
          status: 'request-for-separate-owner-decision-not-recorded',
          taskId: 'TC-255',
          candidateId:
            'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
          completedHandoffSha256: sourceSha256,
          evidenceManifestSha256:
            'baa1778585d32bd9a5b99f2dc7a7157d8b29f32f7046b5c83610e4b051c170a8',
          reviewer: 'Research operator',
          reviewedAt: REVIEWED_AT,
          reviewOutcome: 'ready-for-separate-owner-decision',
          reviewNotes: 'Evidence and framing checks are complete.',
          links: {
            exactReview: '/api/admin/research-intake/review/TC-255',
            reviewPacket:
              '/api/admin/research-intake/review/TC-255/packet.md',
          },
          ownerDecisionRequired: true,
          ownerDecisionRecorded: false,
          publicationApproved: false,
          automaticPublication: false,
          automaticPosting: false,
          grantsPublicationAuthority: false,
          grantsTradingAuthority: false,
          externalActions: 'none',
        },
      },
    });
    expect(report.workflow.ownerDecisionRequest?.completedHandoffSha256).toBe(
      report.source.sha256,
    );
  });

  it.each([
    {
      outcome: 'reject-draft' as const,
      status: 'draft-rejected',
      nextAction:
        'Archive the rejected draft or start a separately reviewed revision; do not request publication.',
    },
    {
      outcome: 'needs-revision' as const,
      status: 'revision-required',
      nextAction:
        'Revise the draft, download a fresh exact handoff, and repeat manual review before any owner decision.',
    },
  ])('routes $outcome without creating an owner request', async ({
    outcome,
    status,
    nextAction,
  }) => {
    const report = await validate(completedYaml(outcome));

    expect(report.ok).toBe(true);
    expect(report.workflow).toEqual({
      status,
      nextAction,
      ownerDecisionRequest: null,
    });
  });

  it('keeps invalid handoffs out of every downstream decision path', async () => {
    const report = await validate(
      completedYaml('ready-for-separate-owner-decision', (record) => {
        record.completedCheckIds = [];
      }),
    );

    expect(report.ok).toBe(false);
    expect(report.workflow).toEqual({
      status: 'invalid-handoff',
      nextAction:
        'Correct every validation issue and run the completed-handoff validator again; do not request an owner decision.',
      ownerDecisionRequest: null,
    });
  });

  it('is deterministic and changes its request binding when the completed file changes', async () => {
    const firstYaml = completedYaml('ready-for-separate-owner-decision');
    const secondYaml = completedYaml(
      'ready-for-separate-owner-decision',
      (record) => {
        record.notes = 'Evidence and framing checks are complete. Second review note.';
      },
    );
    const first = await validate(firstYaml);
    const replay = await validate(firstYaml);
    const second = await validate(secondYaml);

    expect(replay.workflow).toEqual(first.workflow);
    expect(second.workflow.ownerDecisionRequest?.completedHandoffSha256).not.toBe(
      first.workflow.ownerDecisionRequest?.completedHandoffSha256,
    );
    expect(second.workflow.ownerDecisionRequest?.reviewNotes).toBe(
      'Evidence and framing checks are complete. Second review note.',
    );
  });

  it('documents the three outcomes without implying approval or automatic action', () => {
    for (const body of [
      readFileSync(README_PATH, 'utf8'),
      readFileSync(LOOP_PLAN_PATH, 'utf8'),
    ]) {
      expect(body).toContain('ownerDecisionRequest');
      expect(body).toContain('draft-rejected');
      expect(body).toContain('revision-required');
      expect(body).toContain('ready-for-separate-owner-decision');
      expect(body).toMatch(/does not (?:record|make) an owner decision/i);
    }
  });

  it('keeps the request out of queues, public projections, and CSV exports', () => {
    const excludedJson = [
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakePublicOverviewPayload(),
      buildResearchIntakePublicEvidenceIndexPayload(),
    ].map((value) => JSON.stringify(value));
    const excludedCsv = [
      buildResearchIntakeCsv(),
      buildResearchIntakeEvidenceCsv(),
      buildResearchIntakeAdminEvidenceCsv(AUDIT_AT),
      buildResearchMarketingReviewCsv(AUDIT_AT),
    ];
    expect(
      [...excludedJson, ...excludedCsv].every(
        (body) => !body.includes('ownerDecisionRequest'),
      ),
    ).toBe(true);
  });
});
