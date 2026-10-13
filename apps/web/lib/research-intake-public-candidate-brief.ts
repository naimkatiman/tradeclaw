import {
  buildResearchIntakePublicCandidatePayload,
  type ResearchIntakePublicCandidatePayload,
  type ResearchIntakePublicRecord,
} from './research-intake-public';

function renderDecision(record: ResearchIntakePublicRecord): readonly string[] {
  const state = record.evidenceState;
  if (
    state.taskId === null ||
    state.decisionSummary === null ||
    state.evidenceRecordedOn === null
  ) {
    return [
      '- Decision record: None',
      '- Decision: No TradeClaw audit or replication decision is recorded.',
    ];
  }

  return [
    `- Decision record: \`${state.taskId}\` on \`${state.evidenceRecordedOn}\``,
    `- Decision: ${state.decisionSummary}`,
  ];
}

function evidencePaths(record: ResearchIntakePublicRecord): readonly string[] {
  const paths = new Set<string>();
  if (record.tradeClawSourceAudit) {
    paths.add(record.tradeClawSourceAudit.researchPath);
  }
  if (record.tradeClawEvidence) {
    paths.add(record.tradeClawEvidence.preregistrationPath);
    paths.add(record.tradeClawEvidence.resultPath);
    paths.add(record.tradeClawEvidence.artifactPath);
  }
  if (record.evidenceState.evidencePath) {
    paths.add(record.evidenceState.evidencePath);
  }
  if (record.evidenceState.artifactPath) {
    paths.add(record.evidenceState.artifactPath);
  }
  return [...paths];
}

function renderEvidencePaths(record: ResearchIntakePublicRecord): readonly string[] {
  const paths = evidencePaths(record);
  if (paths.length === 0) {
    return ['- No TradeClaw repository evidence file is recorded.'];
  }
  return paths.map((path) => `- \`${path}\``);
}

function renderNavigation(
  payload: ResearchIntakePublicCandidatePayload,
): readonly string[] {
  const { navigation, record, resources } = payload;
  const lines = [
    `- Examined-candidate index: [Browse human index](${resources.evidenceIndexBrief})`,
    `- Machine-readable record: [Open JSON](${record.links.candidate})`,
  ];

  if (navigation.previous) {
    lines.push(
      `- Previous human record: [${navigation.previous.position}. ${navigation.previous.title}](${navigation.previous.href}/brief.md)`,
    );
  }
  if (navigation.next) {
    lines.push(
      `- Next human record: [${navigation.next.position}. ${navigation.next.title}](${navigation.next.href}/brief.md)`,
    );
  }
  return lines;
}

/**
 * Render one exact safe public candidate projection as deterministic Markdown.
 * This adds presentation and navigation only; evidence meaning and authority
 * remain in the existing public projection.
 */
export function buildResearchIntakePublicCandidateBrief(
  candidateId: string,
): string | null {
  const payload = buildResearchIntakePublicCandidatePayload(candidateId);
  if (!payload) return null;

  const { record, navigation } = payload;
  const state = record.evidenceState;
  const lines = [
    `# ${record.title}`,
    '',
    'TradeClaw exact public research record.',
    '',
    `- Asset class: ${record.assetClass}`,
    `- Pinned source position: ${record.sourcePosition + 1} of ${navigation.totalCandidates}`,
    `- Research stage: \`${record.stage}\``,
    `- Research verdict: \`${record.verdict}\``,
    `- Cost status: \`${record.costStatus}\``,
    `- Evidence basis: \`${record.evidenceBasis}\``,
    '',
    '## What TradeClaw recorded',
    '',
    `- Evidence status: ${state.label}`,
    `- Performance gates evaluated: ${state.performanceGatesEvaluated ? 'Yes' : 'No'}`,
    `- Meaning: ${state.meaning}`,
    ...renderDecision(record),
    '',
    '## Upstream source',
    '',
    `[Open upstream source](${record.sourceUrl})`,
    '',
    'These figures are upstream gross discovery metadata. They are not TradeClaw results, a ranking, or promotion evidence.',
    '',
    '| Upstream gross metric | Value |',
    '| --- | ---: |',
    `| Sharpe | ${record.upstreamGrossSharpe} |`,
    `| t-statistic | ${record.upstreamTStatistic} |`,
    `| Volatility | ${record.upstreamVolatilityPct}% |`,
    `| Years tested | ${record.upstreamYearsTested} |`,
    '',
    '## Repository evidence',
    '',
    ...renderEvidencePaths(record),
    '',
    'Repository paths identify retained TradeClaw material; they do not turn modeled research into live performance.',
    '',
    '## Navigate',
    '',
    ...renderNavigation(payload),
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
