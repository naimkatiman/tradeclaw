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

function formatResearchMarketingReviewPacket(
  payload: ResearchIntakeAdminReviewItemPayload,
): string {
  const { navigation, researchLoop, reviewItem, reviewProtocol } = payload;
  const { candidate, controls, handoff, links, receipt } = reviewItem;
  const { draft } = handoff;
  const { evidenceState } = candidate;
  const requiredChecks = reviewProtocol.checks.map(
    (check) => `- ${check.instruction}`,
  );
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
    '## Required manual checks',
    '',
    ...requiredChecks,
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
