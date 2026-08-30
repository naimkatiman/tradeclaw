import {
  buildResearchIntakeAdminOverviewPayload,
  type ResearchIntakeAdminOverviewPayload,
} from './research-intake-admin';

type ReceiptGate = ResearchIntakeAdminOverviewPayload['researchLoop']['receiptGate'];

function nextManualReceiptSlot(gate: ReceiptGate): string {
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

function latestReceiptLine(
  researchLoop: ResearchIntakeAdminOverviewPayload['researchLoop'],
): string {
  const receipt = researchLoop.latestReceipt;
  if (receipt === null) {
    return '- Latest receipt: None visible at this observation';
  }

  return `- Latest receipt: \`${receipt.taskId}\` — \`${receipt.candidateId}\` (${receipt.stageAfter}, ${receipt.verdict})`;
}

function nextReviewLines(
  marketingReview: ResearchIntakeAdminOverviewPayload['marketingReview'],
): readonly string[] {
  const nextReview = marketingReview.nextReview;
  if (nextReview === null) {
    return ['- Next review: None', '- Next review packet: None'];
  }

  return [
    `- Next review: \`${nextReview.taskId}\` — ${nextReview.handoff.headline}`,
    `- Next review packet: \`${nextReview.links.reviewPacket}\``,
  ];
}

/**
 * Render one observation-consistent, protected operator brief. The underlying
 * overview remains the source of truth; this function adds no state or authority.
 */
export function buildResearchIntakeAdminCycleBrief(
  at: Date | string | number = new Date(),
): string {
  const overview = buildResearchIntakeAdminOverviewPayload(at);
  const { researchLoop, marketingReview, startHere } = overview;
  const currentWindow = researchLoop.currentWindow;
  const gate = researchLoop.receiptGate;

  const lines = [
    '# TradeClaw research cycle brief',
    '',
    `- Observed at: \`${researchLoop.observedAt}\``,
    `- Current UTC window: \`${currentWindow.id}\` (\`${currentWindow.startAt}\` to \`${currentWindow.endsAt}\`)`,
    '- Access: Admin read-only',
    '',
    '## Do now',
    '',
    `**${startHere.label}**`,
    '',
    startHere.reason,
    '',
    `- Open: \`${startHere.href}\``,
    `- Items in scope: ${startHere.itemCount}`,
    '- Automatic action: No',
    '',
    '## Research cadence',
    '',
    `- Receipt gate: \`${gate.status}\``,
    `- Current window status: \`${researchLoop.currentWindowStatus}\``,
    `- Current receipts: ${gate.currentWindowReceiptCount} of ${gate.receiptLimitPerWindow}`,
    `- Next manual receipt slot: ${nextManualReceiptSlot(gate)}`,
    latestReceiptLine(researchLoop),
    `- Gate instruction: ${gate.instruction}`,
    `- Ledger receipts: ${researchLoop.integrity.receiptCount} across ${researchLoop.integrity.uniqueWindowCount} windows`,
    `- Ledger integrity: \`${researchLoop.integrity.status}\``,
    `- Expected legacy duplicate windows: ${researchLoop.integrity.expectedLegacyDuplicateWindowIds.length}`,
    `- Additional duplicate windows: ${researchLoop.integrity.additionalDuplicateWindowIds.length}`,
    '',
    '## Marketing review',
    '',
    `- Status: \`${marketingReview.status}\``,
    `- Drafts awaiting human review: ${marketingReview.summary.availableDrafts}`,
    `- Publication-approved drafts: ${marketingReview.summary.publicationApprovedDrafts}`,
    `- Current-window drafts: ${marketingReview.currentWindowDraftCount}`,
    ...nextReviewLines(marketingReview),
    '- Human review required: Yes',
    '',
    '## Evidence record',
    '',
    `- Pinned candidates: ${overview.catalogSummary.total}`,
    `- Evidence records: ${overview.evidenceSummary.total}`,
    `- Performance gates evaluated: ${overview.catalogEvidenceStateSummary.performanceGatesEvaluated}`,
    `- Performance gates not evaluated: ${overview.catalogEvidenceStateSummary.performanceGatesNotEvaluated}`,
    `- Summary: ${overview.catalogEvidenceStateSummary.plainLanguageSummary}`,
    `- Machine-readable overview: \`${overview.resources.overview}\``,
    `- Human-readable evidence index: [Open examined-candidate index](${overview.resources.evidenceIndexBrief})`,
    `- Machine-readable evidence index: \`${overview.resources.evidenceIndex}\``,
    '',
    '## Safety',
    '',
    '- Read-only: Yes',
    '- Creates or authorizes a receipt: No',
    '- Automatically selects a candidate: No',
    '- Records review completion or an owner decision: No',
    '- Publishes or posts: No',
    '- Grants publication authority: No',
    '- Grants trading authority: No',
    '- Executes trades: No',
    '',
  ];

  return lines.join('\n');
}
