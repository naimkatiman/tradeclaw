export type ResearchIntakeStartHereKind =
  | 'browse-evidence-index'
  | 'inspect-complete-evidence'
  | 'resolve-receipt-conflict'
  | 'screen-current-window'
  | 'review-marketing-drafts';

export type ResearchIntakeCurrentResource =
  | 'overview'
  | 'catalog'
  | 'candidate'
  | 'screening-queue'
  | 'evidence-index'
  | 'evidence'
  | 'marketing-review'
  | 'marketing-review-item';

export type ResearchIntakeStartHereTargetResource =
  | 'catalog'
  | 'screening-queue'
  | 'evidence-index'
  | 'evidence'
  | 'marketing-review'
  | 'marketing-review-item'
  | 'marketing-review-packet';

interface ResearchIntakeStartHereBase {
  label: string;
  reason: string;
  href: string;
  targetResource: ResearchIntakeStartHereTargetResource;
  targetIsCurrentResource: boolean;
  itemCount: number;
  automaticAction: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

export interface ResearchIntakePublicStartHere extends ResearchIntakeStartHereBase {
  audience: 'public';
  kind: 'browse-evidence-index' | 'inspect-complete-evidence';
}

export interface ResearchIntakeAdminStartHere extends ResearchIntakeStartHereBase {
  audience: 'admin';
  kind: ResearchIntakeStartHereKind;
}

export interface ResearchIntakeAdminStartHereInput {
  currentWindowStatus: 'awaiting-receipt' | 'complete' | 'conflict';
  currentWindowId: string;
  currentWindowReceiptCount: number;
  availableDrafts: number;
  publicationApprovedDrafts: number;
  nextReviewHeadline: string | null;
  nextReviewPacketHref: string | null;
  evidenceCount: number;
  resources: {
    catalog: string;
    screeningQueueBrief: string;
    evidenceIndex: string;
    evidence: string;
    marketingReview: string;
  };
  currentResource: ResearchIntakeCurrentResource;
}

const FALSE_AUTHORITY = Object.freeze({
  automaticAction: false as const,
  grantsPublicationAuthority: false as const,
  grantsTradingAuthority: false as const,
});

function countNoun(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function buildResearchIntakePublicStartHere(
  evidenceCount: number,
  resources: {
    evidenceIndex: string;
    evidence: string;
  },
  currentResource: ResearchIntakeCurrentResource,
): ResearchIntakePublicStartHere {
  const completeEvidenceIsOpen = currentResource === 'evidence';
  const targetResource = completeEvidenceIsOpen ? 'evidence' : 'evidence-index';

  return Object.freeze({
    audience: 'public',
    kind: completeEvidenceIsOpen
      ? 'inspect-complete-evidence'
      : 'browse-evidence-index',
    label: `${completeEvidenceIsOpen ? 'Inspect' : 'Browse'} ${evidenceCount} examined ${countNoun(
      evidenceCount,
      'candidate',
      'candidates',
    )}`,
    reason: completeEvidenceIsOpen
      ? 'This complete evidence desk includes every TradeClaw source audit and replication in pinned source order, including adverse and no-performance-result records. It is not performance-ranked.'
      : 'This lightweight index includes every TradeClaw source audit and replication in pinned source order, with exact candidate-detail links and no performance ranking.',
    href: completeEvidenceIsOpen ? resources.evidence : resources.evidenceIndex,
    targetResource,
    targetIsCurrentResource: currentResource === targetResource,
    itemCount: evidenceCount,
    ...FALSE_AUTHORITY,
  });
}

export function buildResearchIntakeAdminStartHere(
  input: ResearchIntakeAdminStartHereInput,
): ResearchIntakeAdminStartHere {
  if (input.currentWindowStatus === 'conflict') {
    const receiptNoun = countNoun(
      input.currentWindowReceiptCount,
      'receipt',
      'receipts',
    );
    return Object.freeze({
      audience: 'admin',
      kind: 'resolve-receipt-conflict',
      label:
        `Resolve ${input.currentWindowReceiptCount} ${receiptNoun} in the current UTC window`,
      reason:
        `The window ${input.currentWindowId} has conflicting receipts. Reconcile the receipt ledger before relying on it; this guidance takes no automatic action.`,
      href: input.resources.catalog,
      targetResource: 'catalog',
      targetIsCurrentResource: input.currentResource === 'catalog',
      itemCount: input.currentWindowReceiptCount,
      ...FALSE_AUTHORITY,
    });
  }

  if (input.currentWindowStatus === 'awaiting-receipt') {
    return Object.freeze({
      audience: 'admin',
      kind: 'screen-current-window',
      label: 'Screen one candidate for the current UTC window',
      reason:
        `No receipt exists in ${input.currentWindowId}. Use the protected human-readable manual screening queue and keep the frozen cost-first gate; this guidance creates no receipt or candidate selection.`,
      href: input.resources.screeningQueueBrief,
      targetResource: 'screening-queue',
      targetIsCurrentResource: input.currentResource === 'screening-queue',
      itemCount: 1,
      ...FALSE_AUTHORITY,
    });
  }

  if (input.availableDrafts > 0) {
    if (
      input.nextReviewHeadline === null ||
      input.nextReviewPacketHref === null
    ) {
      throw new Error(
        'a visible marketing-review queue requires an exact next review packet',
      );
    }
    const draftNoun = countNoun(input.availableDrafts, 'draft', 'drafts');
    const approvalNoun = countNoun(
      input.publicationApprovedDrafts,
      'publication approval',
      'publication approvals',
    );
    return Object.freeze({
      audience: 'admin',
      kind: 'review-marketing-drafts',
      label: `Review next draft packet: ${input.nextReviewHeadline}`,
      reason:
        `The oldest visible human-review handoff is first in an observation-consistent queue of ${input.availableDrafts} ${draftNoun} with ${input.publicationApprovedDrafts} ${approvalNoun}. Open its protected Markdown packet; review remains manual and this guidance creates no approval.`,
      href: input.nextReviewPacketHref,
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
      itemCount: input.availableDrafts,
      ...FALSE_AUTHORITY,
    });
  }

  const recordNoun = countNoun(input.evidenceCount, 'record', 'records');
  const completeEvidenceIsOpen = input.currentResource === 'evidence';
  const targetResource = completeEvidenceIsOpen ? 'evidence' : 'evidence-index';
  return Object.freeze({
    audience: 'admin',
    kind: completeEvidenceIsOpen
      ? 'inspect-complete-evidence'
      : 'browse-evidence-index',
    label: `${completeEvidenceIsOpen ? 'Inspect' : 'Browse'} ${input.evidenceCount} evidence ${recordNoun}`,
    reason: completeEvidenceIsOpen
      ? 'No higher-priority receipt or review action is present. Inspect the complete source-ordered evidence desk; it is not performance-ranked.'
      : 'No higher-priority receipt or review action is present. Browse the lightweight source-ordered evidence index, then open exact candidate detail as needed; it is not performance-ranked.',
    href: completeEvidenceIsOpen
      ? input.resources.evidence
      : input.resources.evidenceIndex,
    targetResource,
    targetIsCurrentResource: input.currentResource === targetResource,
    itemCount: input.evidenceCount,
    ...FALSE_AUTHORITY,
  });
}
