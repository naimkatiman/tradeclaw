import {
  buildResearchIntakeAdminReviewItemPayload,
  type ResearchIntakeAdminReviewHandoffTemplate,
} from './research-intake-admin';

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function yamlStringList(label: string, values: readonly string[]): string[] {
  return [label, ...values.map((value) => `  - ${yamlString(value)}`)];
}

function yamlEvidenceIntegrity(
  integrity: ResearchIntakeAdminReviewHandoffTemplate['evidenceIntegrity'],
): string[] {
  return [
    'evidenceIntegrity:',
    `  schemaVersion: ${integrity.schemaVersion}`,
    `  status: ${yamlString(integrity.status)}`,
    `  algorithm: ${yamlString(integrity.algorithm)}`,
    `  normalization: ${yamlString(integrity.normalization)}`,
    `  manifestCanonicalization: ${yamlString(
      integrity.manifestCanonicalization,
    )}`,
    `  manifestSha256: ${yamlString(integrity.manifestSha256)}`,
    '  verification:',
    `    status: ${yamlString(integrity.verification.status)}`,
    `    command: ${yamlString(integrity.verification.command)}`,
    `    successMeaning: ${yamlString(
      integrity.verification.successMeaning,
    )}`,
    `    recordsReviewCompletion: ${integrity.verification.recordsReviewCompletion}`,
    `    grantsPublicationAuthority: ${integrity.verification.grantsPublicationAuthority}`,
    `    grantsTradingAuthority: ${integrity.verification.grantsTradingAuthority}`,
    '  files:',
    ...integrity.files.flatMap((file) => [
      `    - role: ${yamlString(file.role)}`,
      `      path: ${yamlString(file.path)}`,
      `      normalizedBytes: ${file.normalizedBytes}`,
      `      sha256: ${yamlString(file.sha256)}`,
    ]),
  ];
}

/**
 * Serialize the editable blank record from the exact-review template. All
 * strings are quoted so the attachment remains deterministic and cannot gain
 * YAML structure from candidate or claim text.
 */
export function formatResearchMarketingReviewHandoff(
  template: ResearchIntakeAdminReviewHandoffTemplate,
): string {
  const { blankRecord } = template;
  return [
    'schemaVersion: 1',
    `templateStatus: ${yamlString(template.status)}`,
    `completionTracking: ${yamlString(template.completionTracking)}`,
    'completionRecorded: false',
    'mutationSupported: false',
    'ownerDecisionRecorded: false',
    'ownerDecisionRequiredForPublication: true',
    'grantsPublicationAuthority: false',
    'grantsTradingAuthority: false',
    `taskId: ${yamlString(blankRecord.taskId)}`,
    `candidateId: ${yamlString(blankRecord.candidateId)}`,
    `reviewedProjectionObservedAt: ${yamlString(
      blankRecord.reviewedProjectionObservedAt,
    )}`,
    ...yamlEvidenceIntegrity(template.evidenceIntegrity),
    ...yamlStringList('requiredCheckIds:', template.requiredCheckIds),
    ...yamlStringList('claimIds:', template.claimIds),
    ...yamlStringList('allowedOutcomes:', template.allowedOutcomes),
    'reviewer: null',
    'reviewedAt: null',
    'completedCheckIds: []',
    'verifiedClaimIds: []',
    'outcome: null',
    'notes: null',
    '',
  ].join('\n');
}

/**
 * Build one observation-bound, blank manual-review handoff. A null result
 * intentionally conflates unknown, non-canonical, and not-yet-visible task IDs.
 */
export function buildResearchMarketingReviewHandoff(
  taskId: string,
  at: Date | string | number = new Date(),
): string | null {
  const payload = buildResearchIntakeAdminReviewItemPayload(taskId, at);
  return payload === null
    ? null
    : formatResearchMarketingReviewHandoff(payload.reviewHandoffTemplate);
}
