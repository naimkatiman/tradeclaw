export type ResearchIntakeStartHereKind =
  | 'inspect-complete-evidence'
  | 'resolve-receipt-conflict'
  | 'screen-current-window'
  | 'review-marketing-drafts';

interface ResearchIntakeStartHereBase {
  label: string;
  reason: string;
  href: string;
  itemCount: number;
  automaticAction: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

export interface ResearchIntakePublicStartHere extends ResearchIntakeStartHereBase {
  audience: 'public';
  kind: 'inspect-complete-evidence';
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
  evidenceCount: number;
  resources: {
    catalog: string;
    evidence: string;
    marketingReview: string;
  };
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
  evidenceHref: string,
): ResearchIntakePublicStartHere {
  return Object.freeze({
    audience: 'public',
    kind: 'inspect-complete-evidence',
    label: `Start with ${evidenceCount} examined ${countNoun(
      evidenceCount,
      'candidate',
      'candidates',
    )}`,
    reason:
      'This complete evidence desk includes every TradeClaw source audit and replication in pinned source order, including adverse and no-performance-result records. It is not performance-ranked.',
    href: evidenceHref,
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
        `No receipt exists in ${input.currentWindowId}. Use the protected catalog manually and keep the frozen cost-first gate; this guidance creates no receipt.`,
      href: input.resources.catalog,
      itemCount: 0,
      ...FALSE_AUTHORITY,
    });
  }

  if (input.availableDrafts > 0) {
    const draftNoun = countNoun(input.availableDrafts, 'draft', 'drafts');
    const approvalNoun = countNoun(
      input.publicationApprovedDrafts,
      'publication approval',
      'publication approvals',
    );
    return Object.freeze({
      audience: 'admin',
      kind: 'review-marketing-drafts',
      label: `Review ${input.availableDrafts} human-review ${draftNoun}`,
      reason:
        `The observation-consistent queue has ${input.availableDrafts} ${draftNoun} and ${input.publicationApprovedDrafts} ${approvalNoun}. Review remains manual.`,
      href: input.resources.marketingReview,
      itemCount: input.availableDrafts,
      ...FALSE_AUTHORITY,
    });
  }

  const recordNoun = countNoun(input.evidenceCount, 'record', 'records');
  return Object.freeze({
    audience: 'admin',
    kind: 'inspect-complete-evidence',
    label: `Inspect ${input.evidenceCount} evidence ${recordNoun}`,
    reason:
      'No higher-priority receipt or review action is present. Inspect the complete source-ordered evidence desk; it is not performance-ranked.',
    href: input.resources.evidence,
    itemCount: input.evidenceCount,
    ...FALSE_AUTHORITY,
  });
}
