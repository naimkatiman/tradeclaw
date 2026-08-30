import {
  buildResearchIntakePublicEvidenceIndexPayload,
  type ResearchIntakePublicEvidenceIndexItem,
} from './research-intake-public';

function renderEvidenceItem(
  item: ResearchIntakePublicEvidenceIndexItem,
  catalogCount: number,
): readonly string[] {
  const { candidate } = item;
  const state = candidate.evidenceState;
  if (state.taskId === null) {
    throw new Error(`examined research record ${candidate.id} has no task ID`);
  }

  return [
    `## ${item.evidencePosition}. ${candidate.title}`,
    '',
    `- Asset class: ${candidate.assetClass}`,
    `- Pinned source position: ${candidate.sourcePosition + 1} of ${catalogCount}`,
    `- Evidence: ${state.label} (\`${state.performanceEvidenceStatus}\`)`,
    `- Performance gates evaluated: ${state.performanceGatesEvaluated ? 'Yes' : 'No'}`,
    `- Decision record: \`${state.taskId}\` on \`${state.evidenceRecordedOn}\``,
    `- Decision: ${state.decisionSummary}`,
    `- Exact public record: \`${item.links.candidate}\``,
    '',
  ];
}

/**
 * Render every compact public evidence row as deterministic Markdown. The
 * compact JSON index remains the source of truth; this adds no evidence,
 * ranking, recommendation, clock observation, or private workflow state.
 */
export function buildResearchIntakePublicEvidenceIndexBrief(): string {
  const payload = buildResearchIntakePublicEvidenceIndexPayload();
  const catalogCount = payload.catalogSummary.total;
  const evidenceCount = payload.items.length;

  payload.items.forEach((item, index) => {
    if (item.evidencePosition !== index + 1) {
      throw new Error('public evidence index has a non-consecutive position');
    }
    if (
      item.candidate.sourcePosition < 0 ||
      item.candidate.sourcePosition >= catalogCount
    ) {
      throw new Error(
        `public evidence index has an invalid source position for ${item.candidate.id}`,
      );
    }
  });

  const lines = [
    '# TradeClaw examined-candidate index',
    '',
    'TradeClaw retains adverse, inconclusive, and source-audit-only work alongside anything that reaches performance gates.',
    '',
    `**${evidenceCount} of ${catalogCount} pinned candidates have a TradeClaw source audit or replication record. This list is in pinned upstream source order and is not performance-ranked.**`,
    '',
    `- Examined candidates: ${evidenceCount}`,
    `- Performance gates evaluated: ${payload.catalogEvidenceStateSummary.performanceGatesEvaluated}`,
    `- Performance gates not evaluated: ${payload.catalogEvidenceStateSummary.performanceGatesNotEvaluated}`,
    `- Summary: ${payload.catalogEvidenceStateSummary.plainLanguageSummary}`,
    '',
    ...payload.items.flatMap((item) => renderEvidenceItem(item, catalogCount)),
    '## How to interpret this index',
    '',
    '- Source-audit-only means TradeClaw stopped before a local performance test; it is not a performance failure.',
    '- QA-only means a replication stopped on a preregistered integrity check before any performance gate was evaluated.',
    '- Modeled historical results are research artifacts, not live performance, broker fills, or customer returns.',
    '- Upstream Sharpe, t-statistic, volatility, and years remain gross discovery metadata and do not rank this list.',
    '',
    '## Related public data',
    '',
    `- Research evidence brief: \`${payload.resources.evidenceBrief}\``,
    `- Machine-readable index: \`${payload.resources.evidenceIndex}\``,
    `- Complete evidence records: \`${payload.resources.evidence}\``,
    `- Evidence CSV: \`${payload.resources.evidenceCsv}\``,
    `- Complete pinned catalog: \`${payload.resources.catalog}\``,
    '',
    '## Safety',
    '',
    '- Public read-only: Yes',
    '- Authentication or API key required: No',
    '- Performance-ranked: No',
    '- Creates evidence or changes research state: No',
    '- Selects or recommends a strategy: No',
    '- Publishes, broadcasts, or trades: No',
    '- Grants publication authority: No',
    '- Grants trading authority: No',
    '- Executes trades: No',
    '',
  ];

  return lines.join('\n');
}
