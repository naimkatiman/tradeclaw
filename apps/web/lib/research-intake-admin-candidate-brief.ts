import {
  buildResearchIntakeAdminCandidatePayload,
  type ResearchIntakeAdminCandidatePayload,
  type ResearchIntakeAdminRecord,
} from './research-intake-admin';

function renderDecision(record: ResearchIntakeAdminRecord): readonly string[] {
  const state = record.evidenceState;
  if (
    state.taskId === null
    || state.decisionSummary === null
    || state.evidenceRecordedOn === null
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

function repositoryEvidencePaths(
  record: ResearchIntakeAdminRecord,
): readonly string[] {
  const paths = new Set<string>();
  if (record.tradeClawSourceAudit) {
    paths.add(record.tradeClawSourceAudit.researchPath);
  }
  if (record.tradeClawEvidence) {
    paths.add(record.tradeClawEvidence.preregistrationPath);
    if ('sourceAuditPath' in record.tradeClawEvidence) {
      paths.add(record.tradeClawEvidence.sourceAuditPath);
    }
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

function renderRepositoryEvidence(
  record: ResearchIntakeAdminRecord,
): readonly string[] {
  const paths = repositoryEvidencePaths(record);
  if (paths.length === 0) return ['- Repository evidence: None'];
  return paths.map((path) => `- \`${path}\``);
}

function renderLatestReceipt(
  workflow: ResearchIntakeAdminCandidatePayload['candidateWorkflow'],
): string {
  const receipt = workflow.latestReceipt;
  if (receipt === null) return '- Latest receipt: None';
  return `- Latest receipt: \`${receipt.taskId}\` in \`${receipt.cycleId}\` at \`${receipt.recordedAt}\``;
}

function renderMarketingReview(
  payload: ResearchIntakeAdminCandidatePayload,
): readonly string[] {
  const handoff = payload.candidateWorkflow.marketingHandoff;
  if (handoff === null) {
    return [
      '- Marketing review: None',
      '- Review packet: None',
      '- Publication approved: No',
      '- Trading approved: No',
    ];
  }

  const packetHref = `${payload.resources.marketingReview}/${encodeURIComponent(
    handoff.taskId,
  )}/packet.md`;
  return [
    `- Marketing review: \`${handoff.workflowState}\``,
    `- Review packet: [Open review packet](${packetHref})`,
    '- Publication approved: No',
    '- Trading approved: No',
  ];
}

function renderNavigation(
  payload: ResearchIntakeAdminCandidatePayload,
): readonly string[] {
  const lines = [
    `- Protected JSON: [Open machine record](${payload.links.adminCandidate})`,
    `- Public human record: [Open public record](${payload.links.publicCandidateBrief})`,
    `- Protected evidence index: [Open evidence index](${payload.resources.evidenceIndex})`,
    `- Research cycle brief: [Open cycle brief](${payload.resources.cycleBrief})`,
  ];

  if (payload.navigation.previous) {
    lines.push(
      `- Previous protected human record: [${payload.navigation.previous.position}. ${payload.navigation.previous.title}](${payload.navigation.previous.href}/brief.md)`,
    );
  }
  if (payload.navigation.next) {
    lines.push(
      `- Next protected human record: [${payload.navigation.next.position}. ${payload.navigation.next.title}](${payload.navigation.next.href}/brief.md)`,
    );
  }
  return lines;
}

/**
 * Render one observation-consistent protected candidate record as Markdown.
 * The exact admin projection remains the source of truth; this function adds
 * presentation and navigation without creating state or authority.
 */
export function buildResearchIntakeAdminCandidateBrief(
  candidateId: string,
  at: Date | string | number = new Date(),
): string | null {
  const payload = buildResearchIntakeAdminCandidatePayload(candidateId, at);
  if (!payload) return null;

  const { record, navigation, candidateWorkflow, researchLoop } = payload;
  const state = record.evidenceState;
  const sourceAuditDisposition = record.tradeClawSourceAudit?.disposition ?? 'none';
  const lines = [
    `# ${record.title}`,
    '',
    'TradeClaw protected human-readable exact candidate record.',
    '',
    `- Observed at: \`${researchLoop.observedAt}\``,
    '- Access: Admin read-only',
    `- Asset class: ${record.assetClass}`,
    `- Pinned source position: ${record.sourcePosition + 1} of ${navigation.totalCandidates}`,
    `- Research stage: \`${record.stage}\``,
    `- Research verdict: \`${record.verdict}\``,
    `- Cost status: \`${record.costStatus}\``,
    '',
    '## What TradeClaw recorded',
    '',
    `- Evidence status: ${state.label}`,
    `- Performance gates evaluated: ${state.performanceGatesEvaluated ? 'Yes' : 'No'}`,
    `- Source-audit disposition: \`${sourceAuditDisposition}\``,
    `- Meaning: ${state.meaning}`,
    ...renderDecision(record),
    '',
    '## What to do next',
    '',
    `- Manual next action: ${record.nextAction}`,
    '- This brief does not perform or authorize that action.',
    '',
    '## Workflow at this observation',
    '',
    `- Receipt count: ${candidateWorkflow.receiptCount}`,
    renderLatestReceipt(candidateWorkflow),
    ...renderMarketingReview(payload),
    '',
    '## Repository evidence',
    '',
    ...renderRepositoryEvidence(record),
    '',
    'Repository paths identify retained TradeClaw material; they do not turn modeled research into live performance.',
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
    '## Navigate',
    '',
    ...renderNavigation(payload),
    '',
    '## Safety',
    '',
    '- Read-only: Yes',
    '- Changes research state: No',
    '- Creates or authorizes a receipt: No',
    '- Selects or recommends a strategy: No',
    '- Records review completion or an owner decision: No',
    '- Publishes or posts: No',
    '- Grants publication authority: No',
    '- Grants trading authority: No',
    '- Executes trades: No',
    '',
  ];

  return lines.join('\n');
}
