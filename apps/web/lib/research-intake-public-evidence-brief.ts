import {
  buildResearchIntakePublicOverviewPayload,
  type ResearchIntakePublicOverviewPayload,
} from './research-intake-public';

type EvidenceStatus = ResearchIntakePublicOverviewPayload[
  'catalogEvidenceStateSummary'
]['statuses'][number]['performanceEvidenceStatus'];

function evidenceStatusCount(
  overview: ResearchIntakePublicOverviewPayload,
  status: EvidenceStatus,
): number {
  const match = overview.catalogEvidenceStateSummary.statuses.find(
    (entry) => entry.performanceEvidenceStatus === status,
  );
  if (!match) {
    throw new Error(`public research overview is missing evidence status ${status}`);
  }
  return match.count;
}

function evidenceHeadline(
  overview: ResearchIntakePublicOverviewPayload,
  passCount: number,
  failCount: number,
  inconclusiveCount: number,
): string {
  const { totalCandidates, performanceGatesEvaluated, performanceGatesNotEvaluated } =
    overview.catalogEvidenceStateSummary;
  if (passCount + failCount + inconclusiveCount !== performanceGatesEvaluated) {
    throw new Error('public research overview has inconsistent evaluated evidence counts');
  }

  if (
    performanceGatesEvaluated === failCount &&
    passCount === 0 &&
    inconclusiveCount === 0
  ) {
    return `**${performanceGatesEvaluated} of ${totalCandidates} pinned candidates reached TradeClaw performance gates; all ${failCount} failed. The other ${performanceGatesNotEvaluated} have no evaluated TradeClaw performance gate.**`;
  }

  return `**${performanceGatesEvaluated} of ${totalCandidates} pinned candidates reached TradeClaw performance gates: ${passCount} passed, ${failCount} failed, and ${inconclusiveCount} were inconclusive. The other ${performanceGatesNotEvaluated} have no evaluated TradeClaw performance gate.**`;
}

/**
 * Render the public, record-free evidence orientation as deterministic Markdown.
 * The public overview remains the source of truth; this adds no evidence or
 * authority and observes no clock or private workflow state.
 */
export function buildResearchIntakePublicEvidenceBrief(): string {
  const overview = buildResearchIntakePublicOverviewPayload();
  const summary = overview.catalogEvidenceStateSummary;
  const sourceAuditOnly = evidenceStatusCount(
    overview,
    'source-audit-only-no-local-backtest',
  );
  const qaOnly = evidenceStatusCount(
    overview,
    'qa-only-no-performance-result',
  );
  const modeledPass = evidenceStatusCount(overview, 'modeled-historical-pass');
  const modeledFail = evidenceStatusCount(overview, 'modeled-historical-fail');
  const modeledInconclusive = evidenceStatusCount(
    overview,
    'modeled-historical-inconclusive',
  );
  const startHere = overview.startHere;
  const resources = overview.resources;

  const lines = [
    '# TradeClaw research evidence brief',
    '',
    'TradeClaw publishes the cost-adjusted evidence record, not a strategy leaderboard, paid signal feed, or promise of an edge.',
    '',
    '## What the record says',
    '',
    evidenceHeadline(overview, modeledPass, modeledFail, modeledInconclusive),
    '',
    `- Pinned candidates: ${overview.catalogSummary.total}`,
    `- TradeClaw evidence records: ${overview.evidenceSummary.total}`,
    `- Source-audit-only records: ${sourceAuditOnly}`,
    `- QA-only records with no performance result: ${qaOnly}`,
    `- Modeled historical passes: ${modeledPass}`,
    `- Modeled historical failures: ${modeledFail}`,
    `- Modeled historical inconclusive results: ${modeledInconclusive}`,
    `- Performance gates evaluated: ${summary.performanceGatesEvaluated}`,
    `- Performance gates not evaluated: ${summary.performanceGatesNotEvaluated}`,
    `- Summary: ${summary.plainLanguageSummary}`,
    '',
    '## Start here',
    '',
    `**${startHere.label}**`,
    '',
    startHere.reason,
    '',
    `- Open human-readable index: \`${resources.evidenceIndexBrief}\``,
    `- Machine-readable index: \`${startHere.href}\``,
    '- Automatic action: No',
    '',
    '## How to read this record',
    '',
    `- Upstream repository: \`${overview.source.repository}\``,
    `- Pinned commit: \`${overview.source.commit}\``,
    `- Snapshot date: \`${overview.source.snapshotDate}\``,
    `- Upstream performance basis: \`${overview.source.reportedPerformanceBasis}\``,
    `- TradeClaw treatment: \`${overview.source.tradeClawTreatment}\``,
    `- Source-order policy: ${overview.selectionPolicy}`,
    `- Upstream metrics: ${overview.claimBoundary.upstreamMetrics}`,
    `- Source audits: ${overview.claimBoundary.sourceAudit}`,
    `- Replications: ${overview.claimBoundary.replication}`,
    '',
    '## Evidence workflow',
    '',
    ...overview.workflow.map(
      (step) => `- \`${step.stage}\`: ${step.exitGate}`,
    ),
    '',
    '## Open data',
    '',
    `- Machine-readable overview: \`${resources.overview}\``,
    `- Human-readable evidence index: \`${resources.evidenceIndexBrief}\``,
    `- Lightweight evidence index: \`${resources.evidenceIndex}\``,
    `- Complete pinned catalog: \`${resources.catalog}\``,
    `- Complete evidence records: \`${resources.evidence}\``,
    `- Catalog CSV: \`${resources.catalogCsv}\``,
    `- Evidence CSV: \`${resources.evidenceCsv}\``,
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
