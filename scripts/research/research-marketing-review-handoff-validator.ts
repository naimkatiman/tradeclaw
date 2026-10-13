import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parse, parseAllDocuments } from 'yaml';
import { buildResearchMarketingReviewHandoff } from '../../apps/web/lib/research-marketing-review-handoff';
import { isResearchMarketingReviewEvidenceTaskId } from '../../apps/web/lib/research-marketing-review-integrity';
import {
  verifyResearchMarketingReviewEvidence,
  type ResearchMarketingReviewEvidenceTaskVerification,
} from './research-marketing-review-evidence-verifier';

export const RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES = 64 * 1024;

export const RESEARCH_MARKETING_REVIEW_HANDOFF_VALIDATOR_CONTROLS =
  Object.freeze({
    recordsReviewCompletion: false,
    recordsOwnerDecision: false,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
    externalActions: 'none',
  } as const);

export interface ResearchMarketingReviewHandoffValidationIssue {
  code: string;
  path: string;
  message: string;
}

export type ResearchMarketingReviewHandoffWorkflowStatus =
  | 'invalid-handoff'
  | 'draft-rejected'
  | 'revision-required'
  | 'ready-for-separate-owner-decision';

export interface ResearchMarketingReviewOwnerDecisionRequest {
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

export interface ResearchMarketingReviewHandoffWorkflow {
  status: ResearchMarketingReviewHandoffWorkflowStatus;
  nextAction: string;
  ownerDecisionRequest: ResearchMarketingReviewOwnerDecisionRequest | null;
}

export interface ResearchMarketingReviewHandoffValidationReport {
  schemaVersion: 2;
  ok: boolean;
  scope: 'completed-review-handoff-and-repository-evidence';
  source: { bytes: number; sha256: string };
  review: {
    taskId: string | null;
    candidateId: string | null;
    reviewedProjectionObservedAt: string | null;
    reviewer: string | null;
    reviewedAt: string | null;
    outcome: string | null;
    expectedRequiredCheckCount: number | null;
    completedCheckCount: number | null;
    expectedClaimCount: number | null;
    verifiedClaimCount: number | null;
    evidenceManifestSha256: string | null;
    completedHandoffContractSatisfied: boolean;
  };
  issues: ResearchMarketingReviewHandoffValidationIssue[];
  evidenceVerification: {
    scope: 'repository-evidence-bytes-only';
    ok: boolean;
    task: ResearchMarketingReviewEvidenceTaskVerification;
  } | null;
  workflow: ResearchMarketingReviewHandoffWorkflow;
  controls: typeof RESEARCH_MARKETING_REVIEW_HANDOFF_VALIDATOR_CONTROLS;
}

export interface ValidateResearchMarketingReviewHandoffOptions {
  yamlText: string;
  root?: string;
  now?: Date | string | number;
  readEvidenceText?: (
    absolutePath: string,
    repositoryPath: string,
  ) => Promise<string>;
}

const EDITABLE_FIELDS = new Set([
  'reviewer',
  'reviewedAt',
  'completedCheckIds',
  'verifiedClaimIds',
  'outcome',
  'notes',
]);

const HANDOFF_FIELDS = Object.freeze([
  'schemaVersion',
  'templateStatus',
  'completionTracking',
  'completionRecorded',
  'mutationSupported',
  'ownerDecisionRecorded',
  'ownerDecisionRequiredForPublication',
  'grantsPublicationAuthority',
  'grantsTradingAuthority',
  'taskId',
  'candidateId',
  'reviewedProjectionObservedAt',
  'evidenceIntegrity',
  'requiredCheckIds',
  'claimIds',
  'allowedOutcomes',
  'validation',
  'reviewer',
  'reviewedAt',
  'completedCheckIds',
  'verifiedClaimIds',
  'outcome',
  'notes',
]);

const HANDOFF_FIELD_SET = new Set(HANDOFF_FIELDS);
const EXPLICIT_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

function fail(message: string): never {
  throw new Error(`Research review handoff validation failed: ${message}`);
}

function issue(
  issues: ResearchMarketingReviewHandoffValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : null;
}

function nestedString(
  value: unknown,
  parent: string,
  child: string,
): string | null {
  if (!isRecord(value) || !isRecord(value[parent])) return null;
  return stringValue(value[parent][child]);
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function explicitInstant(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = EXPLICIT_INSTANT.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millisecond = Number((match[7] ?? '').padEnd(3, '0') || '0');
  if (
    year < 1000 ||
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return null;
  }

  let offsetMinutes = 0;
  if (match[8] !== 'Z') {
    const offsetHour = Number(match[8].slice(1, 3));
    const offsetMinute = Number(match[8].slice(4, 6));
    if (
      offsetHour > 14 ||
      offsetMinute > 59 ||
      (offsetHour === 14 && offsetMinute !== 0)
    ) {
      return null;
    }
    const sign = match[8][0] === '+' ? 1 : -1;
    offsetMinutes = sign * (offsetHour * 60 + offsetMinute);
  }

  const local = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const timestamp = local - offsetMinutes * 60_000;
  const roundTrip = new Date(timestamp + offsetMinutes * 60_000);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCHours() !== hour ||
    roundTrip.getUTCMinutes() !== minute ||
    roundTrip.getUTCSeconds() !== second ||
    roundTrip.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }
  return timestamp;
}

function validationNow(value: Date | string | number | undefined): number {
  if (value === undefined) return Date.now();
  if (typeof value === 'string') {
    const timestamp = explicitInstant(value);
    if (timestamp === null) {
      fail('now must be a valid instant with an explicit UTC offset');
    }
    return timestamp;
  }
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) fail('now must be a valid instant');
  return timestamp;
}

function parseHandoffYaml(
  yamlText: string,
  issues: ResearchMarketingReviewHandoffValidationIssue[],
): Record<string, unknown> | null {
  const bytes = Buffer.byteLength(yamlText, 'utf8');
  if (bytes > RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES) {
    issue(
      issues,
      'yaml-byte-limit',
      '/',
      `YAML exceeds the ${RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES}-byte limit`,
    );
    return null;
  }

  try {
    const documents = parseAllDocuments(yamlText, {
      strict: true,
      uniqueKeys: true,
    });
    if (documents.length !== 1) {
      issue(issues, 'yaml-document-count', '/', 'YAML must contain exactly one document');
      return null;
    }
    const document = documents[0];
    for (const error of document.errors) {
      issue(issues, 'yaml-parse', '/', error.message);
    }
    for (const warning of document.warnings) {
      issue(issues, 'yaml-warning', '/', warning.message);
    }
    if (document.errors.length > 0 || document.warnings.length > 0) return null;
    const value = document.toJS({ maxAliasCount: 20 }) as unknown;
    if (!isRecord(value)) {
      issue(issues, 'top-level-object', '/', 'YAML document must be a mapping');
      return null;
    }
    return value;
  } catch (error) {
    issue(issues, 'yaml-parse', '/', errorMessage(error));
    return null;
  }
}

function validateFieldSet(
  handoff: Record<string, unknown>,
  issues: ResearchMarketingReviewHandoffValidationIssue[],
): void {
  for (const key of Object.keys(handoff)) {
    if (!HANDOFF_FIELD_SET.has(key)) {
      issue(issues, 'unknown-field', `/${key}`, `Unknown top-level field ${JSON.stringify(key)}`);
    }
  }
  for (const key of HANDOFF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(handoff, key)) {
      issue(issues, 'missing-field', `/${key}`, `Required top-level field ${JSON.stringify(key)} is missing`);
    }
  }
}

function validateExactIdSet(
  actualValue: unknown,
  expectedValue: unknown,
  code: string,
  path: string,
  issues: ResearchMarketingReviewHandoffValidationIssue[],
): void {
  const actual = stringArray(actualValue);
  const expected = stringArray(expectedValue);
  if (!actual || !expected) {
    issue(issues, code, path, 'Value must be a string array matching the exact required IDs');
    return;
  }
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  if (
    actualSet.size !== actual.length ||
    actualSet.size !== expectedSet.size ||
    [...expectedSet].some((id) => !actualSet.has(id))
  ) {
    issue(issues, code, path, 'Value must contain every required ID exactly once');
  }
}

function buildWorkflow(options: {
  ok: boolean;
  taskId: string | null;
  candidateId: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  outcome: string | null;
  notes: string | null;
  completedHandoffSha256: string;
  evidenceManifestSha256: string | null;
}): ResearchMarketingReviewHandoffWorkflow {
  if (!options.ok) {
    return {
      status: 'invalid-handoff',
      nextAction:
        'Correct every validation issue and run the completed-handoff validator again; do not request an owner decision.',
      ownerDecisionRequest: null,
    };
  }

  if (options.outcome === 'reject-draft') {
    return {
      status: 'draft-rejected',
      nextAction:
        'Archive the rejected draft or start a separately reviewed revision; do not request publication.',
      ownerDecisionRequest: null,
    };
  }

  if (options.outcome === 'needs-revision') {
    return {
      status: 'revision-required',
      nextAction:
        'Revise the draft, download a fresh exact handoff, and repeat manual review before any owner decision.',
      ownerDecisionRequest: null,
    };
  }

  if (
    options.outcome === 'ready-for-separate-owner-decision' &&
    options.taskId !== null &&
    options.candidateId !== null &&
    options.reviewer !== null &&
    options.reviewedAt !== null &&
    options.evidenceManifestSha256 !== null
  ) {
    const exactReview = `/api/admin/research-intake/review/${options.taskId}`;
    return {
      status: 'ready-for-separate-owner-decision',
      nextAction:
        'Send ownerDecisionRequest to a separate owner workflow; validation itself grants no publication or posting authority.',
      ownerDecisionRequest: {
        schemaVersion: 1,
        status: 'request-for-separate-owner-decision-not-recorded',
        taskId: options.taskId,
        candidateId: options.candidateId,
        completedHandoffSha256: options.completedHandoffSha256,
        evidenceManifestSha256: options.evidenceManifestSha256,
        reviewer: options.reviewer,
        reviewedAt: options.reviewedAt,
        reviewOutcome: 'ready-for-separate-owner-decision',
        reviewNotes: options.notes,
        links: {
          exactReview,
          reviewPacket: `${exactReview}/packet.md`,
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
    };
  }

  return {
    status: 'invalid-handoff',
    nextAction:
      'Correct every validation issue and run the completed-handoff validator again; do not request an owner decision.',
    ownerDecisionRequest: null,
  };
}

export function parseResearchMarketingReviewHandoffArgs(
  args: readonly string[],
): string {
  let file: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--file') {
      fail(`unexpected argument ${JSON.stringify(argument)}`);
    }
    if (file !== null) fail('--file may be provided at most once');
    const value = args[index + 1];
    if (!value || value.startsWith('-')) fail('--file requires a path');
    file = value;
    index += 1;
  }
  if (file === null) fail('--file is required');
  return file;
}

export async function validateResearchMarketingReviewHandoff(
  options: ValidateResearchMarketingReviewHandoffOptions,
): Promise<ResearchMarketingReviewHandoffValidationReport> {
  const yamlBytes = Buffer.from(options.yamlText, 'utf8');
  const now = validationNow(options.now);
  const issues: ResearchMarketingReviewHandoffValidationIssue[] = [];
  const handoff = parseHandoffYaml(options.yamlText, issues);
  let expected: Record<string, unknown> | null = null;

  if (handoff !== null) {
    validateFieldSet(handoff, issues);
    if (handoff.schemaVersion !== 2) {
      issue(
        issues,
        'schema-version',
        '/schemaVersion',
        'schemaVersion must be 2; download a fresh exact-review handoff',
      );
    }

    const taskId = stringValue(handoff.taskId);
    const observedAt = stringValue(handoff.reviewedProjectionObservedAt);
    const observedAtMs = explicitInstant(observedAt);
    if (taskId === null) {
      issue(issues, 'task-id', '/taskId', 'taskId must be a canonical review task string');
    }
    if (observedAtMs === null) {
      issue(
        issues,
        'projection-observed-at',
        '/reviewedProjectionObservedAt',
        'reviewedProjectionObservedAt must be a valid instant with an explicit UTC offset',
      );
    } else if (observedAtMs > now) {
      issue(
        issues,
        'projection-observed-at',
        '/reviewedProjectionObservedAt',
        'reviewedProjectionObservedAt cannot be later than validation time',
      );
    }

    if (taskId !== null && observedAt !== null && observedAtMs !== null) {
      try {
        const expectedYaml = buildResearchMarketingReviewHandoff(taskId, observedAt);
        if (expectedYaml === null) {
          issue(
            issues,
            'template-unavailable',
            '/taskId',
            'No exact observation-visible review template matches this task',
          );
        } else {
          expected = parse(expectedYaml) as Record<string, unknown>;
        }
      } catch (error) {
        issue(issues, 'template-unavailable', '/taskId', errorMessage(error));
      }
    }
  }

  if (handoff !== null && expected !== null) {
    for (const key of HANDOFF_FIELDS) {
      if (
        EDITABLE_FIELDS.has(key) ||
        !Object.prototype.hasOwnProperty.call(handoff, key)
      ) {
        continue;
      }
      if (!isDeepStrictEqual(handoff[key], expected[key])) {
        issue(
          issues,
          'immutable-field',
          `/${key}`,
          `${key} does not match the exact observation-bound template`,
        );
      }
    }

    const reviewer = handoff.reviewer;
    if (
      typeof reviewer !== 'string' ||
      reviewer.length < 1 || reviewer.length > 120 ||
      reviewer !== reviewer.trim() ||
      /[\u0000-\u001f\u007f]/.test(reviewer)
    ) {
      issue(
        issues,
        'reviewer',
        '/reviewer',
        'reviewer must be a trimmed 1-120 character single-line string',
      );
    }

    const observedAtMs = explicitInstant(handoff.reviewedProjectionObservedAt);
    const reviewedAtMs = explicitInstant(handoff.reviewedAt);
    if (reviewedAtMs === null) {
      issue(
        issues,
        'reviewed-at',
        '/reviewedAt',
        'reviewedAt must be a valid instant with an explicit UTC offset',
      );
    } else if (
      (observedAtMs !== null && reviewedAtMs < observedAtMs) || reviewedAtMs > now
    ) {
      issue(
        issues,
        'reviewed-at',
        '/reviewedAt',
        'reviewedAt must be on or after the observed projection and no later than validation time',
      );
    }

    validateExactIdSet(
      handoff.completedCheckIds,
      expected.requiredCheckIds,
      'completed-check-ids',
      '/completedCheckIds',
      issues,
    );
    validateExactIdSet(
      handoff.verifiedClaimIds,
      expected.claimIds,
      'verified-claim-ids',
      '/verifiedClaimIds',
      issues,
    );

    const allowedOutcomes = stringArray(expected.allowedOutcomes) ?? [];
    if (
      typeof handoff.outcome !== 'string' ||
      !allowedOutcomes.includes(handoff.outcome)
    ) {
      issue(
        issues,
        'outcome',
        '/outcome',
        'outcome must be one of the exact non-approving outcomes in allowedOutcomes',
      );
    }

    const notes = handoff.notes;
    const notesValid =
      notes === null ||
      (typeof notes === 'string' &&
        notes.length >= 1 && notes.length <= 4_000 &&
        notes === notes.trim() && !/\u0000/.test(notes));
    const notesRequired =
      handoff.outcome === 'reject-draft' || handoff.outcome === 'needs-revision';
    if (!notesValid || (notesRequired && typeof notes !== 'string')) {
      issue(
        issues,
        'notes',
        '/notes',
        'notes must be a trimmed 1-4000 character string when rejecting or requesting revision; otherwise it may be null',
      );
    }
  }

  let evidenceVerification: ResearchMarketingReviewHandoffValidationReport['evidenceVerification'] = null;
  const taskId = handoff === null ? null : stringValue(handoff.taskId);
  if (taskId !== null && isResearchMarketingReviewEvidenceTaskId(taskId)) {
    try {
      const evidenceReport = await verifyResearchMarketingReviewEvidence({
        root: options.root,
        taskIds: [taskId],
        readText: options.readEvidenceText,
      });
      const task = evidenceReport.tasks[0];
      evidenceVerification = {
        scope: evidenceReport.scope,
        ok: evidenceReport.ok && task.ok,
        task,
      };
      if (!evidenceVerification.ok) {
        issue(
          issues,
          'repository-evidence',
          '/evidenceIntegrity',
          'Current repository evidence does not match the pinned manifest',
        );
      }
    } catch (error) {
      issue(
        issues,
        'repository-evidence',
        '/evidenceIntegrity',
        errorMessage(error),
      );
    }
  }

  const candidateId = handoff === null ? null : stringValue(handoff.candidateId);
  const observedAt = handoff === null
    ? null
    : stringValue(handoff.reviewedProjectionObservedAt);
  const reviewer = handoff === null ? null : stringValue(handoff.reviewer);
  const reviewedAt = handoff === null ? null : stringValue(handoff.reviewedAt);
  const outcome = handoff === null ? null : stringValue(handoff.outcome);
  const notes = handoff === null ? null : stringValue(handoff.notes);
  const expectedChecks = expected === null ? null : stringArray(expected.requiredCheckIds);
  const completedChecks = handoff === null ? null : stringArray(handoff.completedCheckIds);
  const expectedClaims = expected === null ? null : stringArray(expected.claimIds);
  const verifiedClaims = handoff === null ? null : stringArray(handoff.verifiedClaimIds);
  const manifestSha256 = handoff === null
    ? null
    : nestedString(handoff, 'evidenceIntegrity', 'manifestSha256');
  const ok = issues.length === 0 && evidenceVerification?.ok === true;
  const sourceSha256 = sha256(yamlBytes);
  const workflow = buildWorkflow({
    ok,
    taskId,
    candidateId,
    reviewer,
    reviewedAt,
    outcome,
    notes,
    completedHandoffSha256: sourceSha256,
    evidenceManifestSha256: manifestSha256,
  });

  return {
    schemaVersion: 2,
    ok,
    scope: 'completed-review-handoff-and-repository-evidence',
    source: { bytes: yamlBytes.byteLength, sha256: sourceSha256 },
    review: {
      taskId,
      candidateId,
      reviewedProjectionObservedAt: observedAt,
      reviewer,
      reviewedAt,
      outcome,
      expectedRequiredCheckCount: expectedChecks?.length ?? null,
      completedCheckCount: completedChecks?.length ?? null,
      expectedClaimCount: expectedClaims?.length ?? null,
      verifiedClaimCount: verifiedClaims?.length ?? null,
      evidenceManifestSha256: manifestSha256,
      completedHandoffContractSatisfied: ok,
    },
    issues,
    evidenceVerification,
    workflow,
    controls: RESEARCH_MARKETING_REVIEW_HANDOFF_VALIDATOR_CONTROLS,
  };
}
