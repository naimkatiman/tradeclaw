import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseAllDocuments } from 'yaml';
import type { ValidateResearchMarketingReviewHandoffOptions } from './research-marketing-review-handoff-validator';
import {
  RESEARCH_MARKETING_OWNER_DECISION_OUTCOMES,
  RESEARCH_MARKETING_OWNER_DECISION_TEMPLATE_CONTROLS,
  prepareResearchMarketingOwnerDecisionTemplate,
  type ResearchMarketingOwnerDecisionOutcome,
  type ResearchMarketingOwnerDecisionTemplate,
} from './research-marketing-owner-decision-template';

export const RESEARCH_MARKETING_OWNER_DECISION_MAX_BYTES = 64 * 1024;

export const RESEARCH_MARKETING_OWNER_DECISION_VALIDATOR_CONTROLS =
  RESEARCH_MARKETING_OWNER_DECISION_TEMPLATE_CONTROLS;

export interface ResearchMarketingOwnerDecisionValidationIssue {
  code: string;
  path: string;
  message: string;
}

export type ResearchMarketingOwnerDecisionWorkflowStatus =
  | 'invalid-owner-decision'
  | 'publication-declined'
  | 'draft-revision-requested'
  | 'approved-for-separate-publication-action';

export interface ResearchMarketingOwnerDecisionValidationReport {
  schemaVersion: 1;
  ok: boolean;
  scope: 'manual-owner-decision-form-and-current-evidence';
  sources: {
    completedHandoff: { bytes: number; sha256: string };
    decisionForm: { bytes: number; sha256: string };
  };
  request: {
    taskId: string | null;
    candidateId: string | null;
    completedHandoffSha256: string | null;
    evidenceManifestSha256: string | null;
    requestFingerprintSha256: string | null;
    readyHandoffSatisfied: boolean;
  };
  decision: {
    owner: string | null;
    decidedAt: string | null;
    outcome: string | null;
    notes: string | null;
    publicationApprovedForSeparateAction: boolean;
  };
  issues: ResearchMarketingOwnerDecisionValidationIssue[];
  workflow: {
    status: ResearchMarketingOwnerDecisionWorkflowStatus;
    nextAction: string;
  };
  controls: typeof RESEARCH_MARKETING_OWNER_DECISION_VALIDATOR_CONTROLS;
}

export interface ValidateResearchMarketingOwnerDecisionOptions {
  handoffYamlText: string;
  decisionYamlText: string;
  root?: string;
  now?: Date | string | number;
  readEvidenceText?: ValidateResearchMarketingReviewHandoffOptions['readEvidenceText'];
}

export interface ResearchMarketingOwnerDecisionCliArgs {
  handoffFile: string;
  decisionFile: string;
}

const EDITABLE_FIELDS = new Set(['owner', 'decidedAt', 'outcome', 'notes']);
const TEMPLATE_FIELDS = Object.freeze([
  'schemaVersion',
  'formStatus',
  'requestBinding',
  'ownerDecisionRequest',
  'allowedOutcomes',
  'owner',
  'decidedAt',
  'outcome',
  'notes',
  'decisionRecordedByTradeClaw',
  'publicationActionPerformed',
  'automaticPublication',
  'automaticPosting',
  'grantsPublicationAuthority',
  'grantsTradingAuthority',
  'externalActions',
] as const);
const TEMPLATE_FIELD_SET = new Set<string>(TEMPLATE_FIELDS);
const OWNER_OUTCOME_SET = new Set<string>(
  RESEARCH_MARKETING_OWNER_DECISION_OUTCOMES,
);
const EXPLICIT_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

function issue(
  issues: ResearchMarketingOwnerDecisionValidationIssue[],
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

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
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
      throw new Error('now must be a valid instant with an explicit UTC offset');
    }
    return timestamp;
  }
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) throw new Error('now must be a valid instant');
  return timestamp;
}

function parseDecisionYaml(
  yamlText: string,
  issues: ResearchMarketingOwnerDecisionValidationIssue[],
): Record<string, unknown> | null {
  const bytes = Buffer.byteLength(yamlText, 'utf8');
  if (bytes > RESEARCH_MARKETING_OWNER_DECISION_MAX_BYTES) {
    issue(
      issues,
      'yaml-byte-limit',
      '/',
      `YAML exceeds the ${RESEARCH_MARKETING_OWNER_DECISION_MAX_BYTES}-byte limit`,
    );
    return null;
  }

  try {
    const documents = parseAllDocuments(yamlText, {
      strict: true,
      uniqueKeys: true,
    });
    if (documents.length !== 1) {
      issue(
        issues,
        'yaml-document-count',
        '/',
        'YAML must contain exactly one document',
      );
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
  form: Record<string, unknown>,
  issues: ResearchMarketingOwnerDecisionValidationIssue[],
): void {
  for (const key of Object.keys(form)) {
    if (!TEMPLATE_FIELD_SET.has(key)) {
      issue(
        issues,
        'unknown-field',
        `/${key}`,
        `Unknown top-level field ${JSON.stringify(key)}`,
      );
    }
  }
  for (const key of TEMPLATE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(form, key)) {
      issue(
        issues,
        'missing-field',
        `/${key}`,
        `Required top-level field ${JSON.stringify(key)} is missing`,
      );
    }
  }
}

function validateImmutableFields(
  form: Record<string, unknown>,
  expected: ResearchMarketingOwnerDecisionTemplate,
  issues: ResearchMarketingOwnerDecisionValidationIssue[],
): void {
  const expectedRecord = expected as unknown as Record<string, unknown>;
  for (const key of TEMPLATE_FIELDS) {
    if (
      !EDITABLE_FIELDS.has(key) &&
      !isDeepStrictEqual(form[key], expectedRecord[key])
    ) {
      issue(
        issues,
        'immutable-field-mismatch',
        `/${key}`,
        'Value does not match the exact ready owner-decision template',
      );
    }
  }
}

function validateEditableFields(
  form: Record<string, unknown>,
  expected: ResearchMarketingOwnerDecisionTemplate,
  now: number,
  issues: ResearchMarketingOwnerDecisionValidationIssue[],
): {
  owner: string | null;
  decidedAt: string | null;
  outcome: string | null;
  notes: string | null;
} {
  const owner = stringValue(form.owner);
  const decidedAt = stringValue(form.decidedAt);
  const outcome = stringValue(form.outcome);
  const notes = stringValue(form.notes);

  if (
    owner === null ||
    owner.length === 0 ||
    owner.length > 120 ||
    owner !== owner.trim() ||
    /[\u0000-\u001f\u007f]/.test(owner)
  ) {
    issue(
      issues,
      'owner-invalid',
      '/owner',
      'Owner must be a trimmed 1-120 character string without control characters',
    );
  }

  const decidedAtTimestamp = explicitInstant(decidedAt);
  const reviewedAtTimestamp = explicitInstant(
    expected.ownerDecisionRequest.reviewedAt,
  );
  if (decidedAtTimestamp === null) {
    issue(
      issues,
      'decided-at-invalid',
      '/decidedAt',
      'Decision time must be a valid instant with Z or an explicit signed offset',
    );
  } else {
    if (
      reviewedAtTimestamp !== null &&
      decidedAtTimestamp < reviewedAtTimestamp
    ) {
      issue(
        issues,
        'decided-before-review',
        '/decidedAt',
        'Decision time cannot precede the completed manual review',
      );
    }
    if (decidedAtTimestamp > now) {
      issue(
        issues,
        'decided-in-future',
        '/decidedAt',
        'Decision time cannot be later than the validation instant',
      );
    }
  }

  if (outcome === null || !OWNER_OUTCOME_SET.has(outcome)) {
    issue(
      issues,
      'outcome-invalid',
      '/outcome',
      `Outcome must be one of ${RESEARCH_MARKETING_OWNER_DECISION_OUTCOMES.join(', ')}`,
    );
  }

  if (
    notes === null ||
    notes.length === 0 ||
    notes.length > 2_000 ||
    notes !== notes.trim() ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(notes)
  ) {
    issue(
      issues,
      'notes-invalid',
      '/notes',
      'Notes must be a trimmed 1-2000 character string without unsupported control characters',
    );
  }

  return { owner, decidedAt, outcome, notes };
}

function workflowFor(
  ok: boolean,
  outcome: string | null,
): ResearchMarketingOwnerDecisionValidationReport['workflow'] {
  if (!ok) {
    return {
      status: 'invalid-owner-decision',
      nextAction:
        'Correct every issue and validate the owner-decision form again; do not publish, post, or record approval.',
    };
  }
  if (outcome === 'decline-publication') {
    return {
      status: 'publication-declined',
      nextAction:
        'Archive the declined draft outside this validator; no publication action is authorized or performed.',
    };
  }
  if (outcome === 'request-draft-revision') {
    return {
      status: 'draft-revision-requested',
      nextAction:
        'Return the draft for revision, then repeat exact manual review with a fresh handoff before another owner decision.',
    };
  }
  return {
    status: 'approved-for-separate-publication-action',
    nextAction:
      'The submitted form approves this draft only for a separate publication action; this validator records nothing and performs no publication or posting.',
  };
}

export async function validateResearchMarketingOwnerDecision(
  options: ValidateResearchMarketingOwnerDecisionOptions,
): Promise<ResearchMarketingOwnerDecisionValidationReport> {
  const issues: ResearchMarketingOwnerDecisionValidationIssue[] = [];
  const now = validationNow(options.now);
  const prepared = await prepareResearchMarketingOwnerDecisionTemplate({
    yamlText: options.handoffYamlText,
    root: options.root,
    now: options.now,
    readEvidenceText: options.readEvidenceText,
  });
  const expected = prepared.template;
  if (!prepared.ok || expected === null) {
    issue(
      issues,
      'ready-handoff-required',
      '/requestBinding',
      `Completed handoff is not ready for an owner decision (${prepared.status}; ${prepared.issueCount} validation issue(s))`,
    );
  }

  const form = parseDecisionYaml(options.decisionYamlText, issues);
  let editable = {
    owner: null as string | null,
    decidedAt: null as string | null,
    outcome: null as string | null,
    notes: null as string | null,
  };
  if (form !== null) {
    validateFieldSet(form, issues);
    if (expected !== null) {
      validateImmutableFields(form, expected, issues);
      editable = validateEditableFields(form, expected, now, issues);
    }
  }

  const ok = prepared.ok && expected !== null && form !== null && issues.length === 0;
  const workflow = workflowFor(ok, editable.outcome);
  const publicationApprovedForSeparateAction =
    ok &&
    editable.outcome === 'approve-draft-for-separate-publication-action';

  return {
    schemaVersion: 1,
    ok,
    scope: 'manual-owner-decision-form-and-current-evidence',
    sources: {
      completedHandoff: {
        bytes: Buffer.byteLength(options.handoffYamlText, 'utf8'),
        sha256: sha256(options.handoffYamlText),
      },
      decisionForm: {
        bytes: Buffer.byteLength(options.decisionYamlText, 'utf8'),
        sha256: sha256(options.decisionYamlText),
      },
    },
    request: {
      taskId: expected?.requestBinding.taskId ?? null,
      candidateId: expected?.requestBinding.candidateId ?? null,
      completedHandoffSha256:
        expected?.requestBinding.completedHandoffSha256 ?? null,
      evidenceManifestSha256:
        expected?.requestBinding.evidenceManifestSha256 ?? null,
      requestFingerprintSha256:
        expected?.requestBinding.requestFingerprint.sha256 ?? null,
      readyHandoffSatisfied: prepared.ok && expected !== null,
    },
    decision: {
      owner: editable.owner,
      decidedAt: editable.decidedAt,
      outcome: editable.outcome,
      notes: editable.notes,
      publicationApprovedForSeparateAction,
    },
    issues,
    workflow,
    controls: RESEARCH_MARKETING_OWNER_DECISION_VALIDATOR_CONTROLS,
  };
}

export function parseResearchMarketingOwnerDecisionArgs(
  args: readonly string[],
): ResearchMarketingOwnerDecisionCliArgs {
  let handoffFile: string | null = null;
  let decisionFile: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--handoff' && argument !== '--decision') {
      throw new Error(`unknown argument ${JSON.stringify(argument)}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires one file path`);
    }
    if (argument === '--handoff') {
      if (handoffFile !== null) throw new Error('--handoff may be supplied only once');
      handoffFile = value;
    } else {
      if (decisionFile !== null) throw new Error('--decision may be supplied only once');
      decisionFile = value;
    }
    index += 1;
  }
  if (handoffFile === null || decisionFile === null) {
    throw new Error('--handoff and --decision are both required');
  }
  return { handoffFile, decisionFile };
}

export function isResearchMarketingOwnerDecisionOutcome(
  value: string | null,
): value is ResearchMarketingOwnerDecisionOutcome {
  return value !== null && OWNER_OUTCOME_SET.has(value);
}
