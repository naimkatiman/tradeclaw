import {
  buildResearchIntakeAdminReviewPayload,
  type ResearchIntakeAdminReviewItem,
  type ResearchIntakeAdminReviewPayload,
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

function formatReceipt(item: ResearchIntakeAdminReviewItem): string {
  if (item.receipt === null) return 'None (pre-loop closure)';
  return `${inlineCode(item.receipt.taskId)}, recorded ${item.receipt.recordedAt}, cycle ${inlineCode(item.receipt.cycleId)}`;
}

function formatReviewItem(item: ResearchIntakeAdminReviewItem): readonly string[] {
  const { candidate, controls, handoff, links } = item;
  const { draft } = handoff;
  const { evidenceState } = candidate;

  return [
    `## ${item.queuePosition}. ${handoff.taskId} — ${oneLine(draft.title)}`,
    '',
    `- Candidate: ${oneLine(candidate.title)}`,
    `- Candidate ID: ${inlineCode(candidate.id)}`,
    `- Source: ${candidate.sourceUrl}`,
    `- Asset class: ${candidate.assetClass}`,
    `- Pinned source position: ${candidate.sourcePosition}`,
    `- Stage: ${candidate.stage}`,
    `- Verdict: ${candidate.verdict}`,
    `- Cost status: ${candidate.costStatus}`,
    `- Evidence: ${oneLine(evidenceState.label)} (${inlineCode(evidenceState.performanceEvidenceStatus)})`,
    `- Evidence date: ${nullableText(evidenceState.evidenceRecordedOn)}`,
    `- Performance gates evaluated: ${yesNo(evidenceState.performanceGatesEvaluated)}`,
    `- Decision: ${nullableText(evidenceState.decisionSummary)}`,
    `- Available at: ${handoff.availableAt}`,
    `- Availability basis: ${handoff.basis}`,
    `- Research cycle: ${handoff.cycleId === null ? 'None (pre-loop closure)' : inlineCode(handoff.cycleId)}`,
    `- Receipt: ${formatReceipt(item)}`,
    `- Draft summary: ${oneLine(draft.summary)}`,
    `- Workflow: ${handoff.workflowState}`,
    `- Human review required: ${yesNo(controls.humanReviewRequired)}`,
    `- Publication approved: ${yesNo(controls.publicationApproved)}`,
    `- Trading approved: ${yesNo(controls.tradingApproved)}`,
    `- Review packet: [Open exact packet](${links.reviewPacket})`,
    `- Blank review handoff: [Download YAML](${links.reviewItem}/handoff.yaml)`,
    `- Exact review JSON: ${inlineCode(links.reviewItem)}`,
    `- Protected human candidate: [Read candidate record](${links.adminCandidateBrief})`,
    '',
  ];
}

function nextReviewLines(
  nextReview: ResearchIntakeAdminReviewPayload['queue']['nextReview'],
): readonly string[] {
  if (nextReview === null) {
    return ['- Next review: None', '- Next review packet: None'];
  }

  return [
    `- Next review: ${inlineCode(nextReview.taskId)} — ${oneLine(nextReview.handoff.headline)}`,
    `- Next review packet: [Open ${inlineCode(nextReview.taskId)}](${nextReview.links.reviewPacket})`,
  ];
}

/**
 * Render the complete observation-visible review queue without copying full
 * draft bodies. The protected JSON projection remains the source of truth and
 * exact packets remain the review surface; this function adds no state or
 * authority.
 */
export function buildResearchMarketingReviewQueueBrief(
  at: Date | string | number = new Date(),
): string {
  const payload = buildResearchIntakeAdminReviewPayload(at);
  const { queue, researchLoop, resources } = payload;
  const currentWindow = researchLoop.currentWindow;
  const itemLines = queue.items.length === 0
    ? ['No review handoffs are visible at this observation.', '']
    : queue.items.flatMap(formatReviewItem);

  return [
    '# TradeClaw protected marketing-review queue',
    '',
    '> Human review required. This read-only queue summarizes visible drafts but does not approve or complete a review.',
    '',
    `- Observed at: ${inlineCode(researchLoop.observedAt)}`,
    `- Current UTC window: ${inlineCode(currentWindow.id)} (${inlineCode(currentWindow.startAt)} to ${inlineCode(currentWindow.endsAt)})`,
    '- Access: Admin read-only',
    '',
    '## Queue summary',
    '',
    `- Status: ${inlineCode(queue.status)}`,
    `- Visible drafts: ${queue.summary.availableDrafts}`,
    `- Receipt-backed drafts: ${queue.summary.receiptBackedDrafts}`,
    `- Pre-loop drafts: ${queue.summary.preLoopDrafts}`,
    `- Publication-approved drafts: ${queue.summary.publicationApprovedDrafts}`,
    `- Current-window drafts: ${queue.currentWindowItems.length}`,
    '- Order: Oldest visible human-review handoff first',
    `- Receipt gate: ${inlineCode(researchLoop.receiptGate.status)}`,
    `- Evidence summary: ${oneLine(queue.evidenceStateSummary.plainLanguageSummary)}`,
    ...nextReviewLines(queue.nextReview),
    '',
    '## Review-ready drafts',
    '',
    ...itemLines,
    '## How to use this queue',
    '',
    '- Review order: Oldest visible handoff first; this is workflow order, not performance ranking.',
    '- Open the exact packet to inspect the full draft, evidence files, integrity hashes, numeric claim map, and blank YAML handoff.',
    '- A handoff is visible only after its canonical availability instant.',
    '- Records review completion: No',
    '- Records an owner decision: No',
    '',
    '## Related protected data',
    '',
    `- Research cycle brief: [Open cycle brief](${resources.cycleBrief})`,
    `- Machine-readable review queue: ${inlineCode(resources.marketingReview)}`,
    `- Review queue CSV: ${inlineCode(resources.marketingReviewCsv)}`,
    `- Human-readable examined-candidate index: [Open evidence index](${resources.evidenceIndexBrief})`,
    '',
    '## Safety',
    '',
    '- Read-only: Yes',
    '- Creates or authorizes a receipt: No',
    '- Changes research or evidence state: No',
    '- Completes a review or records an owner decision: No',
    '- Grants publication authority: No',
    '- Grants trading authority: No',
    '- Publishes, posts, or trades: No',
    '',
  ].join('\n');
}
