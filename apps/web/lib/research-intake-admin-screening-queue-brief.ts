import { RESEARCH_ASSET_CLASSES } from './research-intake';
import {
  buildResearchIntakeAdminPayload,
  type ResearchIntakeAdminCatalogRecord,
  type ResearchIntakeAdminPayload,
} from './research-intake-admin';

type ReceiptGate = ResearchIntakeAdminPayload['researchLoop']['receiptGate'];

function nextReceiptSlot(gate: ReceiptGate): string {
  if (gate.status === 'open-for-one-receipt') {
    if (gate.nextAvailableWindow === null) {
      throw new Error('an open research receipt gate must name its current window');
    }
    return `Open now in \`${gate.nextAvailableWindow.id}\``;
  }

  if (gate.status === 'blocked-by-conflict') {
    return 'None until the current-window conflict is reconciled';
  }

  if (gate.nextAvailableAt === null || gate.nextAvailableWindow === null) {
    throw new Error('a waiting research receipt gate must name its next window');
  }
  return `\`${gate.nextAvailableAt}\` (\`${gate.nextAvailableWindow.id}\`)`;
}

function gateGuidance(gate: ReceiptGate): string {
  if (gate.status === 'open-for-one-receipt') {
    return 'One manual receipt slot is open. Screen candidates with the checklist below and advance at most one.';
  }
  if (gate.status === 'blocked-by-conflict') {
    return 'Do not advance a candidate while the current receipt window is conflicted.';
  }
  return 'The current receipt slot is already used. The queue remains available for orientation, but do not advance a candidate before the named next window.';
}

function assertUntouchedQueue(payload: ResearchIntakeAdminPayload): void {
  if (
    payload.appliedFilters.stage !== 'discovered'
    || payload.appliedFilters.page !== 1
    || payload.appliedFilters.limit !== 100
    || payload.pagination.totalRecords !== payload.records.length
  ) {
    throw new Error('manual screening queue must contain the complete discovered set');
  }

  if (
    payload.filteredSummary.total !== payload.records.length
    || payload.filteredSummary.discovered !== payload.records.length
    || payload.filteredSummary.untested !== payload.records.length
  ) {
    throw new Error('manual screening queue summary does not match its records');
  }

  let previousSourcePosition = -1;
  for (const record of payload.records) {
    const untouched = record.stage === 'discovered'
      && record.verdict === 'not-tested'
      && record.costStatus === 'unassessed'
      && record.marketingDisposition === 'none'
      && record.tradeClawSourceAudit === null
      && record.tradeClawEvidence === null
      && record.evidenceState.performanceEvidenceStatus === 'not-tested';
    if (!untouched) {
      throw new Error(`manual screening queue contains a touched record: ${record.id}`);
    }
    if (record.sourcePosition <= previousSourcePosition) {
      throw new Error('manual screening queue is not in pinned source order');
    }
    if (
      record.sourcePosition < 0
      || record.sourcePosition >= payload.catalogSummary.total
    ) {
      throw new Error(`manual screening queue has an invalid source position: ${record.id}`);
    }
    previousSourcePosition = record.sourcePosition;
  }
}

function renderCandidate(
  record: ResearchIntakeAdminCatalogRecord,
  queuePosition: number,
  catalogTotal: number,
): readonly string[] {
  return [
    `## ${queuePosition}. ${record.title}`,
    '',
    `- Candidate ID: \`${record.id}\``,
    `- Asset class: ${record.assetClass}`,
    `- Pinned source position: ${record.sourcePosition + 1} of ${catalogTotal}`,
    `- Research stage: \`${record.stage}\``,
    `- Research verdict: \`${record.verdict}\``,
    `- Cost status: \`${record.costStatus}\``,
    `- Upstream source: [Open source](${record.sourceUrl})`,
    `- Upstream gross discovery metadata: Sharpe ${record.upstreamGrossSharpe}; t-statistic ${record.upstreamTStatistic}; volatility ${record.upstreamVolatilityPct}%; years tested ${record.upstreamYearsTested}`,
    `- Frozen next action: ${record.nextAction}`,
    `- Protected human record: [Inspect candidate](${record.links.adminCandidateBrief})`,
    `- Protected machine record: \`${record.links.adminCandidate}\``,
    '',
  ];
}

/**
 * Render every untouched candidate as a deterministic, protected screening aid.
 * The catalog remains the source of truth. This view adds no ranking, selection,
 * receipt, evidence, publication, or execution state.
 */
export function buildResearchIntakeAdminScreeningQueueBrief(
  at: Date | string | number = new Date(),
): string {
  const payload = buildResearchIntakeAdminPayload(
    new URLSearchParams('stage=discovered&page=1&limit=100'),
    at,
  );
  assertUntouchedQueue(payload);

  const { researchLoop } = payload;
  const gate = researchLoop.receiptGate;
  const records = payload.records;
  const lines = [
    '# TradeClaw protected manual screening queue',
    '',
    'Use this read-only queue to compare untouched research candidates before any receipt exists. Upstream figures remain gross discovery metadata, not TradeClaw evidence.',
    '',
    `- Observed at: \`${researchLoop.observedAt}\``,
    `- Current UTC window: \`${researchLoop.currentWindow.id}\` (\`${researchLoop.currentWindow.startAt}\` to \`${researchLoop.currentWindow.endsAt}\`)`,
    '- Access: Admin read-only',
    `- Receipt gate: \`${gate.status}\``,
    `- Current receipts: ${gate.currentWindowReceiptCount} of ${gate.receiptLimitPerWindow}`,
    `- Next receipt slot: ${nextReceiptSlot(gate)}`,
    '',
    gateGuidance(gate),
    '',
    `**${records.length} untouched candidates are shown in pinned upstream source order. This is not a priority ranking and no candidate is preselected.**`,
    '',
    '## Untouched candidates by asset class',
    '',
    ...RESEARCH_ASSET_CLASSES.map(
      (assetClass) => `- ${assetClass}: ${payload.filteredSummary.byAssetClass[assetClass]}`,
    ),
    '',
    '## Manual cost-first screen',
    '',
    'Apply the same questions manually to any candidate you inspect:',
    '',
    '1. **rule reconstructibility** — Can the public rule, timing, universe, and ambiguities be written without guessing?',
    '2. **authorized immutable data** — Can the complete test use lawful, hashable, version-pinned inputs with sufficient history?',
    '3. **full-friction headroom** — Is there plausible gross edge above fees, spread, slippage, financing, and turnover before a performance test?',
    '4. **chronological falsification** — Can the preregistration freeze walk-forward folds, a post-publication holdout, and an honest falsification market or control?',
    '5. **bounded implementation** — Is one small, replayable research slice possible without touching signals, execution, billing, or public claims?',
    '',
    'A passing manual screen permits at most a source-audit receipt when the gate is open. It is not evidence that a strategy works.',
    '',
    ...records.flatMap((record, index) => (
      renderCandidate(record, index + 1, payload.catalogSummary.total)
    )),
    '## Related protected data',
    '',
    `- Research cycle brief: [Open cycle brief](${payload.resources.cycleBrief})`,
    `- Complete machine-readable catalog: \`${payload.resources.catalog}\``,
    `- Human-readable examined-candidate index: [Open evidence index](${payload.resources.evidenceIndexBrief})`,
    `- Human-readable marketing-review queue: [Open review queue](${payload.resources.marketingReviewBrief})`,
    '',
    '## Safety',
    '',
    '- Read-only: Yes',
    '- Authentication required: Yes',
    '- Performance-ranked: No',
    '- Automatically selects a candidate: No',
    '- Creates or authorizes a receipt: No',
    '- Calculates or opens returns: No',
    '- Changes research or review state: No',
    '- Publishes, posts, or trades: No',
    '- Grants publication authority: No',
    '- Grants trading authority: No',
    '',
  ];

  return lines.join('\n');
}
