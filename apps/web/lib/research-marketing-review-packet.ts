import {
  buildResearchIntakeAdminReviewItemPayload,
  type ResearchIntakeAdminReviewItemPayload,
} from './research-intake-admin';

function yesNo(value: boolean): 'Yes' | 'No' {
  return value ? 'Yes' : 'No';
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function inlineCode(value: string): string {
  const runs = value.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(1, ...runs.map((run) => run.length + 1)));
  const padded = /^(?:`|\s)|(?:`|\s)$/.test(value) ? ` ${value} ` : value;
  return `${fence}${padded}${fence}`;
}

function nullableText(value: string | null): string {
  return value === null ? 'not recorded' : oneLine(value);
}

function formatClaimReference(
  reference: ResearchIntakeAdminReviewItemPayload['claimVerification']['claims'][number]['references'][number],
): string {
  if (reference.source === 'protected-candidate-json') {
    return `- Protected candidate JSON ${inlineCode(reference.jsonPointer)}: ${inlineCode(reference.renderedValue)}`;
  }
  return `- Preregistration ${inlineCode(reference.locator)}: ${inlineCode(reference.renderedValue)}`;
}

function formatReviewHandoffTemplate(
  template: ResearchIntakeAdminReviewItemPayload['reviewHandoffTemplate'],
): string[] {
  const { blankRecord } = template;
  return [
    '> Copy this blank record into a separate manual workflow after completing the checks above. This read-only API does not save the copy or approve an outcome.',
    '',
    `- Required check IDs: ${template.requiredCheckIds.map(inlineCode).join(', ')}`,
    `- Numeric claim IDs: ${template.claimIds.map(inlineCode).join(', ')}`,
    `- Allowed review outcomes: ${template.allowedOutcomes.map(inlineCode).join(', ')}`,
    '',
    '```yaml',
    `taskId: ${blankRecord.taskId}`,
    `candidateId: ${blankRecord.candidateId}`,
    `reviewedProjectionObservedAt: ${blankRecord.reviewedProjectionObservedAt}`,
    'requiredCheckIds:',
    ...template.requiredCheckIds.map((id) => `  - ${id}`),
    'claimIds:',
    ...template.claimIds.map((id) => `  - ${id}`),
    'allowedOutcomes:',
    ...template.allowedOutcomes.map((outcome) => `  - ${outcome}`),
    'reviewer: null',
    'reviewedAt: null',
    'completedCheckIds: []',
    'verifiedClaimIds: []',
    'outcome: null',
    'notes: null',
    '```',
    '',
    `- Completion recorded by this API: ${yesNo(template.completionRecorded)}`,
    `- Owner decision recorded by this API: ${yesNo(template.ownerDecisionRecorded)}`,
    `- Owner decision required for publication: ${yesNo(template.ownerDecisionRequiredForPublication)}`,
    `- Publication authority granted: ${yesNo(template.grantsPublicationAuthority)}`,
    `- Trading authority granted: ${yesNo(template.grantsTradingAuthority)}`,
  ];
}

function formatResearchMarketingReviewPacket(
  payload: ResearchIntakeAdminReviewItemPayload,
): string {
  const {
    claimVerification,
    navigation,
    researchLoop,
    reviewHandoffTemplate,
    reviewItem,
    reviewProtocol,
  } = payload;
  const { candidate, controls, handoff, links, receipt } = reviewItem;
  const { draft } = handoff;
  const { evidenceState } = candidate;
  const requiredChecks = reviewProtocol.checks.map(
    (check) => `- ${check.instruction}`,
  );
  const numericClaims = claimVerification.claims.flatMap((claim) => [
    `### ${inlineCode(claim.id)}`,
    '',
    claim.statement,
    '',
    ...claim.references.map(formatClaimReference),
    '',
  ]);
  const reviewHandoffLines = formatReviewHandoffTemplate(reviewHandoffTemplate);
  const receiptDescription = receipt === null
    ? 'none (pre-loop closure)'
    : `${inlineCode(receipt.taskId)}, recorded ${receipt.recordedAt}, cycle ${inlineCode(receipt.cycleId)}`;

  return [
    `# TradeClaw marketing review packet: ${handoff.taskId}`,
    '',
    '> Human review required. This read-only packet does not approve publication, posting, promotion, trading, allocation, broadcast, broker activity, or execution.',
    '',
    '## Review queue and provenance',
    '',
    `- Queue position: ${navigation.currentPosition} of ${navigation.totalVisibleItems}`,
    `- Observed at: ${researchLoop.observedAt}`,
    `- Available at: ${handoff.availableAt}`,
    `- Availability basis: ${handoff.basis}`,
    `- Research cycle: ${handoff.cycleId === null ? 'none (pre-loop closure)' : inlineCode(handoff.cycleId)}`,
    `- Receipt: ${receiptDescription}`,
    '',
    '## Candidate and evidence',
    '',
    `- Candidate: ${oneLine(candidate.title)}`,
    `- Candidate ID: ${inlineCode(candidate.id)}`,
    `- Source: ${candidate.sourceUrl}`,
    `- Asset class: ${candidate.assetClass}`,
    `- Source position: ${candidate.sourcePosition}`,
    `- Research task: ${inlineCode(handoff.taskId)}`,
    `- Stage: ${candidate.stage}`,
    `- Verdict: ${candidate.verdict}`,
    `- Cost status: ${candidate.costStatus}`,
    `- Evidence state: ${oneLine(evidenceState.label)} (${inlineCode(evidenceState.performanceEvidenceStatus)})`,
    `- Evidence date: ${nullableText(evidenceState.evidenceRecordedOn)}`,
    `- Performance gates evaluated: ${yesNo(evidenceState.performanceGatesEvaluated)}`,
    `- Evidence meaning: ${oneLine(evidenceState.meaning)}`,
    `- Decision: ${nullableText(evidenceState.decisionSummary)}`,
    '',
    '## Draft under review (not approved)',
    '',
    `### ${oneLine(draft.title)}`,
    '',
    `**Summary:** ${oneLine(draft.summary)}`,
    '',
    draft.body.trim(),
    '',
    '## Evidence files and links',
    '',
    `- Result: ${inlineCode(draft.resultPath)}`,
    `- Artifact: ${inlineCode(draft.artifactPath)}`,
    `- Protected candidate JSON: ${inlineCode(links.adminCandidate)}`,
    `- Public candidate JSON: ${inlineCode(links.publicCandidate)}`,
    `- Exact review JSON: ${inlineCode(links.reviewItem)}`,
    `- This Markdown packet: ${inlineCode(links.reviewPacket)}`,
    '',
    '## Numeric claim map (manual cross-check required)',
    '',
    '> This map is navigation assistance, not independent verification or approval.',
    '',
    `- Result source of truth: ${inlineCode(claimVerification.files.resultPath)}`,
    `- Artifact source of truth: ${inlineCode(claimVerification.files.artifactPath)}`,
    `- Protected candidate JSON: ${inlineCode(claimVerification.files.candidateJsonHref)}`,
    `- Preregistration: ${inlineCode(claimVerification.files.preregistrationPath)}`,
    '',
    ...numericClaims,
    '## Required manual checks',
    '',
    ...requiredChecks,
    '',
    '## Manual review handoff template (not recorded)',
    '',
    ...reviewHandoffLines,
    '',
    '## Publication and trading authority',
    '',
    `- Human review required: ${yesNo(controls.humanReviewRequired)}`,
    `- Publication approved: ${yesNo(controls.publicationApproved)}`,
    `- Draft publish approved: ${yesNo(draft.publishApproved)}`,
    `- Automatic publication: ${yesNo(controls.automaticPublication)}`,
    `- Automatic posting: ${yesNo(controls.automaticPosting)}`,
    `- Trading approved: ${yesNo(controls.tradingApproved)}`,
    `- Automatic trading: ${yesNo(controls.automaticTrading)}`,
    `- External actions: ${controls.externalActions}`,
    '',
  ].join('\n');
}

/**
 * Build one human-readable packet from the same observation-safe exact review
 * projection used by the protected JSON route. A null result intentionally
 * conflates unknown, non-canonical, and not-yet-visible task IDs.
 */
export function buildResearchMarketingReviewPacket(
  taskId: string,
  at: Date | string | number = new Date(),
): string | null {
  const payload = buildResearchIntakeAdminReviewItemPayload(taskId, at);
  return payload === null ? null : formatResearchMarketingReviewPacket(payload);
}
