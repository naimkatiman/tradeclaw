import {
  buildResearchIntakeAdminEvidenceIndexPayload,
  type ResearchIntakeAdminEvidenceIndexItem,
  type ResearchIntakeAdminEvidenceIndexPayload,
} from './research-intake-admin';

function renderReviewState(
  item: ResearchIntakeAdminEvidenceIndexItem,
  resources: ResearchIntakeAdminEvidenceIndexPayload['resources'],
  taskId: string,
): readonly string[] {
  if (!item.workflow.hasMarketingHandoff) {
    return ['- Marketing review: None', '- Review packet: None'];
  }

  const packetHref = `${resources.marketingReview}/${encodeURIComponent(
    taskId,
  )}/packet.md`;
  return [
    '- Marketing review: Human review required',
    `- Review packet: [Open review packet](${packetHref})`,
  ];
}

function renderEvidenceItem(
  item: ResearchIntakeAdminEvidenceIndexItem,
  payload: ResearchIntakeAdminEvidenceIndexPayload,
): readonly string[] {
  const { candidate, workflow } = item;
  const state = candidate.evidenceState;
  if (state.taskId === null) {
    throw new Error(`examined research record ${candidate.id} has no task ID`);
  }

  return [
    `## ${item.evidencePosition}. ${candidate.title}`,
    '',
    `- Asset class: ${candidate.assetClass}`,
    `- Pinned source position: ${candidate.sourcePosition + 1} of ${payload.catalogSummary.total}`,
    `- Research stage: \`${candidate.stage}\``,
    `- Research verdict: \`${candidate.verdict}\``,
    `- Cost status: \`${candidate.costStatus}\``,
    `- Evidence: ${state.label} (\`${state.performanceEvidenceStatus}\`)`,
    `- Performance gates evaluated: ${state.performanceGatesEvaluated ? 'Yes' : 'No'}`,
    `- Decision record: \`${state.taskId}\` on \`${state.evidenceRecordedOn}\``,
    `- Decision: ${state.decisionSummary}`,
    `- Visible receipts: ${workflow.receiptCount}`,
    ...renderReviewState(item, payload.resources, state.taskId),
    `- Frozen next action: ${workflow.nextAction}`,
    `- Protected human record: [Read this record](${item.links.adminCandidateBrief})`,
    `- Protected machine record: \`${item.links.adminCandidate}\``,
    `- Public human record: [Open public record](${item.links.publicCandidateBrief})`,
    '',
  ];
}

/**
 * Render the compact protected evidence index as deterministic Markdown. The
 * protected JSON payload remains the source of truth; this view adds no state,
 * evidence, ranking, recommendation, approval, or execution authority.
 */
export function buildResearchIntakeAdminEvidenceIndexBrief(
  at: Date | string | number = new Date(),
): string {
  const payload = buildResearchIntakeAdminEvidenceIndexPayload(at);
  const catalogCount = payload.catalogSummary.total;
  const evidenceCount = payload.items.length;

  payload.items.forEach((item, index) => {
    if (item.evidencePosition !== index + 1) {
      throw new Error('protected evidence index has a non-consecutive position');
    }
    if (
      item.candidate.sourcePosition < 0
      || item.candidate.sourcePosition >= catalogCount
    ) {
      throw new Error(
        `protected evidence index has an invalid source position for ${item.candidate.id}`,
      );
    }
  });

  const { researchLoop, marketingReview } = payload;
  const lines = [
    '# TradeClaw protected examined-candidate index',
    '',
    'TradeClaw retains adverse, inconclusive, and source-audit-only work alongside anything that reaches performance gates.',
    '',
    `- Observed at: \`${researchLoop.observedAt}\``,
    `- Current UTC window: \`${researchLoop.currentWindow.id}\` (\`${researchLoop.currentWindow.startAt}\` to \`${researchLoop.currentWindow.endsAt}\`)`,
    '- Access: Admin read-only',
    '',
    `**${evidenceCount} of ${catalogCount} pinned candidates have a TradeClaw source audit or replication record. This list is in pinned upstream source order and is not performance-ranked.**`,
    '',
    `- Examined candidates: ${evidenceCount}`,
    `- Performance gates evaluated: ${payload.catalogEvidenceStateSummary.performanceGatesEvaluated}`,
    `- Performance gates not evaluated: ${payload.catalogEvidenceStateSummary.performanceGatesNotEvaluated}`,
    `- Summary: ${payload.catalogEvidenceStateSummary.plainLanguageSummary}`,
    `- Receipt gate: \`${researchLoop.receiptGate.status}\``,
    `- Ledger receipts: ${researchLoop.integrity.receiptCount} across ${researchLoop.integrity.uniqueWindowCount} windows`,
    `- Ledger integrity: \`${researchLoop.integrity.status}\``,
    `- Drafts awaiting human review: ${marketingReview.summary.availableDrafts}`,
    `- Publication-approved drafts: ${marketingReview.summary.publicationApprovedDrafts}`,
    '',
    ...payload.items.flatMap((item) => renderEvidenceItem(item, payload)),
    '## How to interpret this index',
    '',
    '- Source-audit-only means TradeClaw stopped before a local performance test; it is not a performance failure.',
    '- QA-only means a replication stopped on a preregistered integrity check before any performance gate was evaluated.',
    '- Modeled historical results are research artifacts, not live performance, broker fills, or customer returns.',
    '- Receipt and review fields are visibility at the stated observation instant, not an action or approval.',
    '- Upstream Sharpe, t-statistic, volatility, and years remain gross discovery metadata and do not rank this list.',
    '',
    '## Related protected data',
    '',
    `- Research cycle brief: [Open cycle brief](${payload.resources.cycleBrief})`,
    `- Machine-readable index: \`${payload.resources.evidenceIndex}\``,
    `- Complete evidence records: \`${payload.resources.evidence}\``,
    `- Evidence CSV: \`${payload.resources.evidenceCsv}\``,
    `- Complete pinned catalog: \`${payload.resources.catalog}\``,
    `- Marketing review queue: \`${payload.resources.marketingReview}\``,
    '',
    '## Safety',
    '',
    '- Read-only: Yes',
    '- Authentication required: Yes',
    '- Performance-ranked: No',
    '- Creates evidence or changes research state: No',
    '- Creates or authorizes a receipt: No',
    '- Selects or recommends a strategy: No',
    '- Records review completion or an owner decision: No',
    '- Publishes, broadcasts, or trades: No',
    '- Grants publication authority: No',
    '- Grants trading authority: No',
    '- Executes trades: No',
    '',
  ];

  return lines.join('\n');
}
