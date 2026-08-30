import type { ResearchIntakeStage, ResearchVerdict } from './research-intake';
import { getResearchLoopWindow } from './research-loop';

export const EXPECTED_LEGACY_DUPLICATE_WINDOW_IDS = [
  '2026-08-29T06:00:00.000Z/PT3H',
] as const;

export type ResearchLoopReceiptTaskId =
  | 'TC-256'
  | 'TC-257'
  | 'TC-258'
  | 'TC-259'
  | 'TC-260'
  | 'TC-261'
  | 'TC-262'
  | 'TC-263'
  | 'TC-264'
  | 'TC-265'
  | 'TC-266';
export type ResearchLoopReceiptOutcome =
  | 'verified-no-go'
  | 'implemented-qa-only-hold'
  | 'implemented-canonical-fail'
  | 'verified-canonical-fail-integrated-committed-local';
export type ResearchLoopMarketingDraft =
  | 'none'
  | 'human-review-only-no-performance-draft'
  | 'human-review-only-holdout-failure-draft'
  | 'human-review-only-holdout-benchmark-failure-draft';

export interface ResearchLoopReceipt {
  cycleId: string;
  recordedAt: string;
  taskId: ResearchLoopReceiptTaskId;
  candidateId: string;
  stageBefore: ResearchIntakeStage;
  stageAfter: ResearchIntakeStage;
  verdict: ResearchVerdict;
  outcome: ResearchLoopReceiptOutcome;
  evidencePaths: readonly string[];
  marketingDraft: ResearchLoopMarketingDraft;
  eligibleForProspectiveReview: false;
  publicationApproved: false;
  tradingApproved: false;
  externalActions: 'none';
  nextAction: string;
}

export type ResearchLoopReceiptIntegrityStatus =
  | 'clean'
  | 'historical-conflict'
  | 'invalid';

export interface ResearchLoopReceiptAudit {
  status: ResearchLoopReceiptIntegrityStatus;
  receiptCount: number;
  uniqueWindowCount: number;
  duplicateWindowIds: readonly string[];
  expectedLegacyDuplicateWindowIds: readonly string[];
  additionalDuplicateWindowIds: readonly string[];
}

export interface ResearchLoopReceiptSnapshot {
  currentWindowStatus: 'awaiting-receipt' | 'complete' | 'conflict';
  latestReceipt: ResearchLoopReceipt | null;
  currentWindowReceipts: readonly ResearchLoopReceipt[];
  integrity: ResearchLoopReceiptAudit;
  nextAction: string;
  controls: {
    automaticCandidateSelection: false;
    automaticPublication: false;
    automaticTrading: false;
  };
}

export const RESEARCH_LOOP_RECEIPTS: readonly ResearchLoopReceipt[] = [
  {
    cycleId: '2026-08-29T06:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T07:32:54.000Z',
    taskId: 'TC-256',
    candidateId: 'price-overreactions-in-the-cryptocurrency-market',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: ['docs/research/2026-08-29-price-overreactions-source-audit.md'],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Obtain owner confirmation for the protected admin v0; otherwise continue auditing a reconstructible lower-turnover candidate without changing UI code',
  },
  {
    cycleId: '2026-08-29T06:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T08:29:58.000Z',
    taskId: 'TC-257',
    candidateId: 'predictable-end-of-month-treasury-returns',
    stageBefore: 'discovered',
    stageAfter: 'replicated',
    verdict: 'inconclusive',
    outcome: 'implemented-qa-only-hold',
    evidencePaths: [
      'docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md',
      'docs/plans/2026-08-29-end-of-month-treasury-replication.md',
      'docs/research/2026-08-29-end-of-month-treasury-replication-result.md',
      'docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json',
    ],
    marketingDraft: 'human-review-only-no-performance-draft',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Create a new preregistration around an original-vintage curve source or an explicit rounded-parameter reconciliation policy; do not relax the completed run post hoc',
  },
  {
    cycleId: '2026-08-29T09:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T09:36:14.000Z',
    taskId: 'TC-258',
    candidateId: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
    stageBefore: 'discovered',
    stageAfter: 'replicated',
    verdict: 'fail',
    outcome: 'implemented-canonical-fail',
    evidencePaths: [
      'docs/research/2026-08-29-bitcoin-seasonality-max-min-source-audit.md',
      'docs/plans/2026-08-29-bitcoin-max-min-replication.md',
      'docs/research/2026-08-29-bitcoin-max-min-replication-result.md',
      'docs/research/experiments/bitcoin-max-min-BTCUSD_ETHUSD-D1-2015-11-26-2026-07-31-f4.json',
    ],
    marketingDraft: 'human-review-only-holdout-failure-draft',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Screen the next lower-transition catalog candidate for primary-rule reconstructibility, immutable data, and full-cost headroom; do not select TC-258 controls post result',
  },
  {
    cycleId: '2026-08-29T12:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T12:47:51.000Z',
    taskId: 'TC-259',
    candidateId: 'trading-the-term-premium',
    stageBefore: 'discovered',
    stageAfter: 'replicated',
    verdict: 'fail',
    outcome: 'verified-canonical-fail-integrated-committed-local',
    evidencePaths: [
      'docs/research/2026-08-29-trading-term-premium-source-audit.md',
      'docs/research/2026-08-29-trading-term-premium-replication-result.md',
      'docs/plans/2026-08-29-trading-term-premium-replication.md',
      'docs/research/data/trading-term-premium/fed-nominal-month-end-1961-06-30-2026-07-31.csv',
      'docs/research/experiments/trading-term-premium-US-NOMINAL-MA40-1968-01-2026-07-f4.json',
    ],
    marketingDraft: 'human-review-only-holdout-benchmark-failure-draft',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Keep the FAIL shelved and wait for the exact 15:00Z boundary before opening the next lower-transition candidate; do not publish or change runtime authority',
  },
  {
    cycleId: '2026-08-29T15:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T15:19:14.000Z',
    taskId: 'TC-260',
    candidateId: 'a-risk-based-approach-to-tactical-asset-allocation',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-29-risk-based-tactical-allocation-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-specification no-go and screen another candidate whose complete rule, public source bytes, causal fills, full costs, folds, and holdout can be frozen before returns',
  },
  {
    cycleId: '2026-08-29T18:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T18:00:40.000Z',
    taskId: 'TC-261',
    candidateId:
      'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-29-crypto-factor-investing-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-source no-go; any reduced-universe or implementable long-only cryptocurrency factor study must start as a separately hashed hypothesis in a later UTC window',
  },
  {
    cycleId: '2026-08-29T21:00:00.000Z/PT3H',
    recordedAt: '2026-08-29T21:09:39.110Z',
    taskId: 'TC-262',
    candidateId: 'properties-of-the-most-diversified-portfolio',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-30-most-diversified-portfolio-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-source no-go; any public-universe MDP implementation must begin as a separately hashed hypothesis in a later UTC window before returns',
  },
  {
    cycleId: '2026-08-30T00:00:00.000Z/PT3H',
    recordedAt: '2026-08-30T00:09:58.762Z',
    taskId: 'TC-263',
    candidateId: 'cryptocurrency-as-money-a-trading-strategy-solution',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-30-cryptocurrency-as-money-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-source no-go; any venue-specific cryptocurrency grid study must begin as a separately hashed hypothesis in a later UTC window before returns',
  },
  {
    cycleId: '2026-08-30T03:00:00.000Z/PT3H',
    recordedAt: '2026-08-30T03:10:26.781Z',
    taskId: 'TC-264',
    candidateId:
      'rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-30-rolling-vs-expanding-mean-reversion-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-source no-go; any new public-commodity mean-reversion hypothesis must freeze instruments, source bytes, fills, costs, controls, and a prospective holdout in a later UTC window before returns',
  },
  {
    cycleId: '2026-08-30T06:00:00.000Z/PT3H',
    recordedAt: '2026-08-30T06:12:30.000Z',
    taskId: 'TC-265',
    candidateId: 'good-carry-bad-carry',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-30-good-carry-bad-carry-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-source no-go; any new public-data currency-carry hypothesis must freeze immutable inputs, causal fills, complete costs, chronological folds, a post-publication holdout, and external falsification before returns',
  },
  {
    cycleId: '2026-08-30T09:00:00.000Z/PT3H',
    recordedAt: '2026-08-30T09:07:36.506Z',
    taskId: 'TC-266',
    candidateId: 'risk-parity-portfolios-with-risk-factors',
    stageBefore: 'discovered',
    stageAfter: 'source-audited',
    verdict: 'not-tested',
    outcome: 'verified-no-go',
    evidencePaths: [
      'docs/research/2026-08-30-risk-factor-parity-source-audit.md',
    ],
    marketingDraft: 'none',
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    tradingApproved: false,
    externalActions: 'none',
    nextAction:
      'Archive the exact-source no-go; any public risk-factor-parity implementation must begin as a separately hashed hypothesis with frozen universe, data, estimator, costs, folds, and holdout before returns',
  },
] as const;

export function auditResearchLoopReceipts(
  receipts: readonly Pick<ResearchLoopReceipt, 'cycleId'>[],
): ResearchLoopReceiptAudit {
  const counts = new Map<string, number>();
  for (const receipt of receipts) {
    counts.set(receipt.cycleId, (counts.get(receipt.cycleId) ?? 0) + 1);
  }

  const duplicateWindowIds = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([cycleId]) => cycleId);
  const expectedSet = new Set<string>(EXPECTED_LEGACY_DUPLICATE_WINDOW_IDS);
  const expectedLegacyDuplicateWindowIds = duplicateWindowIds.filter(
    (cycleId) => expectedSet.has(cycleId) && counts.get(cycleId) === 2,
  );
  const additionalDuplicateWindowIds = duplicateWindowIds.filter(
    (cycleId) => !expectedSet.has(cycleId) || counts.get(cycleId) !== 2,
  );

  return {
    status:
      additionalDuplicateWindowIds.length > 0
        ? 'invalid'
        : duplicateWindowIds.length > 0
          ? 'historical-conflict'
          : 'clean',
    receiptCount: receipts.length,
    uniqueWindowCount: counts.size,
    duplicateWindowIds,
    expectedLegacyDuplicateWindowIds,
    additionalDuplicateWindowIds,
  };
}

function assertResearchLoopReceiptLedger(receipts: readonly ResearchLoopReceipt[]): void {
  const taskIds = new Set<string>();
  let priorRecordedAt = Number.NEGATIVE_INFINITY;

  for (const receipt of receipts) {
    const recordedAt = Date.parse(receipt.recordedAt);
    if (!Number.isFinite(recordedAt) || new Date(recordedAt).toISOString() !== receipt.recordedAt) {
      throw new Error(`research receipt ${receipt.taskId} has a non-canonical recordedAt`);
    }
    if (recordedAt <= priorRecordedAt) {
      throw new Error('research receipts must be strictly ordered by recordedAt');
    }
    if (getResearchLoopWindow(receipt.recordedAt).id !== receipt.cycleId) {
      throw new Error(`research receipt ${receipt.taskId} is outside its cycle`);
    }
    if (taskIds.has(receipt.taskId)) {
      throw new Error(`duplicate research receipt task: ${receipt.taskId}`);
    }
    if (
      receipt.evidencePaths.length === 0 ||
      receipt.evidencePaths.some(
        (path) => path.length === 0 || path.startsWith('/') || path.includes('..') || path.includes('\\'),
      )
    ) {
      throw new Error(`research receipt ${receipt.taskId} has an invalid evidence path`);
    }
    if (receipt.nextAction.trim().length === 0) {
      throw new Error(`research receipt ${receipt.taskId} has no next action`);
    }

    taskIds.add(receipt.taskId);
    priorRecordedAt = recordedAt;
  }

  const audit = auditResearchLoopReceipts(receipts);
  if (audit.additionalDuplicateWindowIds.length > 0) {
    throw new Error(
      `unexpected duplicate research windows: ${audit.additionalDuplicateWindowIds.join(', ')}`,
    );
  }
}

assertResearchLoopReceiptLedger(RESEARCH_LOOP_RECEIPTS);

export const RESEARCH_LOOP_RECEIPT_LEDGER_AUDIT =
  auditResearchLoopReceipts(RESEARCH_LOOP_RECEIPTS);

const NO_RECEIPT_NEXT_ACTION =
  'Open at most one receipt for the current UTC window by screening the next lower-transition candidate; do not select, publish, or trade automatically.';
const CONFLICT_NEXT_ACTION =
  'Reconcile the duplicate historical receipts before relying on this window; do not create, publish, or activate another receipt from the conflicted state.';

export function getResearchLoopReceiptSnapshot(
  at: Date | string | number,
): ResearchLoopReceiptSnapshot {
  const currentWindow = getResearchLoopWindow(at);
  const observedAt = at instanceof Date ? at.getTime() : new Date(at).getTime();
  const visibleReceipts = RESEARCH_LOOP_RECEIPTS.filter(
    (receipt) => Date.parse(receipt.recordedAt) <= observedAt,
  );
  const currentWindowReceipts = visibleReceipts.filter(
    (receipt) => receipt.cycleId === currentWindow.id,
  );
  const latestReceipt = visibleReceipts.at(-1) ?? null;
  const currentWindowStatus =
    currentWindowReceipts.length === 0
      ? 'awaiting-receipt'
      : currentWindowReceipts.length === 1
        ? 'complete'
        : 'conflict';

  return {
    currentWindowStatus,
    latestReceipt,
    currentWindowReceipts,
    integrity: auditResearchLoopReceipts(visibleReceipts),
    nextAction:
      currentWindowStatus === 'conflict'
        ? CONFLICT_NEXT_ACTION
        : currentWindowStatus === 'awaiting-receipt'
          ? NO_RECEIPT_NEXT_ACTION
          : latestReceipt!.nextAction,
    controls: {
      automaticCandidateSelection: false,
      automaticPublication: false,
      automaticTrading: false,
    },
  };
}
