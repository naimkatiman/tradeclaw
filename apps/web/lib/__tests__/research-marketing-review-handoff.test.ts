import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import {
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';

const MODULE_PATH = resolve(__dirname, '../research-marketing-review-handoff.ts');
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const BEFORE_LAST = '2026-08-29T12:47:50.999Z';
const TASK_IDS = ['TC-255', 'TC-257', 'TC-258', 'TC-259'] as const;

type HandoffBuilder = (
  taskId: string,
  at: Date | string | number,
) => string | null;

function loadBuilder(): HandoffBuilder | undefined {
  if (!existsSync(MODULE_PATH)) return undefined;
  return (
    jest.requireActual('../research-marketing-review-handoff') as {
      buildResearchMarketingReviewHandoff?: HandoffBuilder;
    }
  ).buildResearchMarketingReviewHandoff;
}

describe('protected manual-review YAML handoff', () => {
  it('serializes one deterministic editable blank record from the exact template', () => {
    const builder = loadBuilder();
    expect(builder).toBeDefined();
    if (!builder) return;

    const exact = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT);
    const first = builder('TC-255', AUDIT_AT);
    const replay = builder('TC-255', AUDIT_AT);
    if (!exact || !first || !replay) throw new Error('TC-255 handoff fixture is missing');

    expect(replay).toBe(first);
    expect(first.endsWith('\n')).toBe(true);
    expect(createHash('sha256').update(first).digest('hex')).toMatch(/^[a-f0-9]{64}$/);
    expect(parse(first)).toEqual({
      schemaVersion: 1,
      templateStatus: 'blank-template-not-recorded',
      completionTracking: 'not-recorded-by-this-read-only-api',
      completionRecorded: false,
      mutationSupported: false,
      ownerDecisionRecorded: false,
      ownerDecisionRequiredForPublication: true,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      taskId: 'TC-255',
      candidateId: exact.reviewItem.candidate.id,
      reviewedProjectionObservedAt: AUDIT_AT,
      evidenceIntegrity: exact.claimVerification.evidenceIntegrity,
      requiredCheckIds: exact.reviewProtocol.checks.map((check) => check.id),
      claimIds: exact.claimVerification.claims.map((claim) => claim.id),
      allowedOutcomes: [
        'reject-draft',
        'needs-revision',
        'ready-for-separate-owner-decision',
      ],
      reviewer: null,
      reviewedAt: null,
      completedCheckIds: [],
      verifiedClaimIds: [],
      outcome: null,
      notes: null,
    });
  });

  it.each(TASK_IDS)('binds %s to its own observation-visible review data', (taskId) => {
    const builder = loadBuilder();
    expect(builder).toBeDefined();
    if (!builder) return;

    const exact = buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT);
    const body = builder(taskId, AUDIT_AT);
    if (!exact || !body) throw new Error(`${taskId} handoff fixture is missing`);

    const parsed = parse(body) as Record<string, unknown>;
    expect(parsed.taskId).toBe(taskId);
    expect(parsed.candidateId).toBe(exact.reviewItem.candidate.id);
    expect(parsed.reviewedProjectionObservedAt).toBe(exact.researchLoop.observedAt);
    expect(parsed.requiredCheckIds).toEqual(
      exact.reviewHandoffTemplate.requiredCheckIds,
    );
    expect(parsed.claimIds).toEqual(exact.reviewHandoffTemplate.claimIds);
    expect(parsed.outcome).toBeNull();
  });

  it('returns null for unavailable, unknown, and non-canonical tasks', () => {
    const builder = loadBuilder();
    expect(builder).toBeDefined();
    if (!builder) return;

    expect(builder('TC-259', BEFORE_LAST)).toBeNull();
    expect(builder('TC-999', AUDIT_AT)).toBeNull();
    expect(builder('tc-255', AUDIT_AT)).toBeNull();
  });

  it('is linked by the exact template and packet only', () => {
    const exact = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT);
    const packet = buildResearchMarketingReviewPacket('TC-255', AUDIT_AT);
    if (!exact || !packet) throw new Error('TC-255 handoff fixture is missing');

    const href = '/api/admin/research-intake/review/TC-255/handoff.yaml';
    expect(exact.reviewHandoffTemplate).toMatchObject({ downloadHref: href });
    expect(packet).toContain(`- Blank YAML handoff: \`${href}\``);

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
    expect([...excludedJson, ...excludedCsv].every((body) => !body.includes('handoff.yaml')))
      .toBe(true);
  });

  it('keeps the formatter implementation free of persistence and authority paths', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    if (!existsSync(MODULE_PATH)) return;

    expect(readFileSync(MODULE_PATH, 'utf8')).not.toMatch(
      /(?:INSERT|UPDATE|DELETE|fetch\(|publicationApproved:\s*true|tradingApproved:\s*true)/,
    );
  });
});
