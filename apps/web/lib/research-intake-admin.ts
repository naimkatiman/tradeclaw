import {
  RESEARCH_ASSET_CLASSES,
  RESEARCH_INTAKE_SELECTION_POLICY,
  RESEARCH_INTAKE_STAGES,
  RESEARCH_INTAKE_WORKFLOW,
  SYSTEMATIC_RESEARCH_INTAKE,
  SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
  filterResearchIntake,
  summarizeResearchIntake,
  type ResearchAssetClass,
  type ResearchIntakeFilters,
  type ResearchIntakeRecord,
  type ResearchIntakeStage,
  type ResearchSourceAuditDisposition,
  type ResearchVerdict,
} from './research-intake';
import {
  buildMarketingReviewDraft,
  getResearchLoopWindow,
  type MarketingReviewDraft,
  type ResearchLoopWindow,
} from './research-loop';
import {
  RESEARCH_LOOP_RECEIPTS,
  getResearchLoopReceiptSnapshot,
  type ResearchLoopReceipt,
  type ResearchLoopReceiptSnapshot,
} from './research-loop-receipts';
import {
  getResearchLoopMarketingReview,
  type ResearchLoopMarketingHandoff,
  type ResearchLoopMarketingReview,
} from './research-loop-marketing';

const VERDICTS = ['not-tested', 'pass', 'fail', 'inconclusive'] as const;
const SOURCE_AUDIT_DISPOSITIONS = ['advance', 'hold', 'no-go'] as const;

export const RESEARCH_INTAKE_ADMIN_QUERY_KEYS = [
  'q',
  'assetClass',
  'stage',
  'verdict',
  'sourceAuditDisposition',
  'page',
  'limit',
] as const;

const QUERY_KEY_SET = new Set<string>(RESEARCH_INTAKE_ADMIN_QUERY_KEYS);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 120;

export interface ResearchIntakeAdminQuery {
  query?: string;
  assetClass: ResearchAssetClass | 'all';
  stage: ResearchIntakeStage | 'all';
  verdict: ResearchVerdict | 'all';
  sourceAuditDisposition: ResearchSourceAuditDisposition | 'all';
  page: number;
  limit: number;
}

export interface ResearchIntakeAdminRecord extends ResearchIntakeRecord {
  marketingReviewDraft: MarketingReviewDraft | null;
}

export interface ResearchIntakeAdminPayload {
  schemaVersion: 1;
  access: {
    mode: 'admin-read-only';
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: {
    observedAt: string;
    alignment: 'UTC';
    cadence: 'PT3H';
    currentWindow: ResearchLoopWindow;
    nextRolloverAt: string;
  } & ResearchLoopReceiptSnapshot;
  marketingReview: ResearchLoopMarketingReview;
  appliedFilters: ResearchIntakeAdminQuery;
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  filteredSummary: ReturnType<typeof summarizeResearchIntake>;
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    returnedRecords: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  records: readonly ResearchIntakeAdminRecord[];
}

export interface ResearchIntakeAdminCandidatePayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  record: ResearchIntakeAdminRecord;
  candidateWorkflow: {
    receiptCount: number;
    receipts: readonly ResearchLoopReceipt[];
    latestReceipt: ResearchLoopReceipt | null;
    marketingHandoff: ResearchLoopMarketingHandoff | null;
    controls: {
      humanReviewRequired: boolean;
      publicationApproved: false;
      automaticPublication: false;
      automaticPosting: false;
      tradingApproved: false;
      automaticTrading: false;
      externalActions: 'none';
    };
  };
}

export interface ResearchIntakeAdminEvidenceItem {
  evidencePosition: number;
  record: ResearchIntakeAdminRecord;
  candidateWorkflow: ResearchIntakeAdminCandidatePayload['candidateWorkflow'];
  links: {
    adminCandidate: string;
    publicCandidate: string;
  };
}

export interface ResearchIntakeAdminEvidencePayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  evidenceIndex: {
    selection: 'all-candidates-with-tradeclaw-source-audit-or-replication';
    order: 'pinned-source-order';
    performanceRanked: false;
    includesEveryAvailableOverlay: true;
  };
  evidenceSummary: ReturnType<typeof summarizeResearchIntake>;
  items: readonly ResearchIntakeAdminEvidenceItem[];
}

export interface ResearchIntakeAdminReviewControls {
  humanReviewRequired: true;
  publicationApproved: false;
  automaticPublication: false;
  automaticPosting: false;
  tradingApproved: false;
  automaticTrading: false;
  externalActions: 'none';
}

export interface ResearchIntakeAdminReviewItem {
  queuePosition: number;
  candidate: Pick<
    ResearchIntakeRecord,
    | 'id'
    | 'title'
    | 'sourceUrl'
    | 'assetClass'
    | 'sourcePosition'
    | 'stage'
    | 'verdict'
    | 'costStatus'
  >;
  handoff: ResearchLoopMarketingHandoff;
  receipt: ResearchLoopReceipt | null;
  links: {
    adminCandidate: string;
    publicCandidate: string;
  };
  controls: ResearchIntakeAdminReviewControls;
}

export interface ResearchIntakeAdminReviewPayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  queue: {
    status: ResearchLoopMarketingReview['status'];
    summary: ResearchLoopMarketingReview['summary'];
    latestItem: ResearchIntakeAdminReviewItem | null;
    currentWindowItems: readonly ResearchIntakeAdminReviewItem[];
    items: readonly ResearchIntakeAdminReviewItem[];
    controls: ResearchIntakeAdminReviewControls;
  };
}

export class ResearchIntakeAdminQueryError extends Error {
  readonly parameter: string;

  constructor(parameter: string, message: string) {
    super(message);
    this.name = 'ResearchIntakeAdminQueryError';
    this.parameter = parameter;
  }
}

function readSingleParameter(searchParams: URLSearchParams, key: string): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) {
    throw new ResearchIntakeAdminQueryError(key, `${key} must appear at most once`);
  }
  if (values.length === 0) return undefined;
  return values[0];
}

function parseEnum<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | 'all' {
  const raw = readSingleParameter(searchParams, key);
  if (raw === undefined || raw === '' || raw === 'all') return 'all';
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ResearchIntakeAdminQueryError(
      key,
      `${key} must be one of: all, ${allowed.join(', ')}`,
    );
  }
  return raw as T;
}

function parsePositiveInteger(
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
  maximum: number,
): number {
  const raw = readSingleParameter(searchParams, key);
  if (raw === undefined || raw === '') return fallback;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new ResearchIntakeAdminQueryError(key, `${key} must be a positive integer`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new ResearchIntakeAdminQueryError(key, `${key} must not exceed ${maximum}`);
  }
  return parsed;
}

function parseQueryText(searchParams: URLSearchParams): string | undefined {
  const raw = readSingleParameter(searchParams, 'q');
  if (raw === undefined) return undefined;
  const query = raw.trim();
  if (query.length === 0) return undefined;
  if (query.length > MAX_QUERY_LENGTH) {
    throw new ResearchIntakeAdminQueryError(
      'q',
      `q must not exceed ${MAX_QUERY_LENGTH} characters`,
    );
  }
  if (/[\u0000-\u001f\u007f]/.test(query)) {
    throw new ResearchIntakeAdminQueryError('q', 'q must not contain control characters');
  }
  return query;
}

export function parseResearchIntakeAdminQuery(
  searchParams: URLSearchParams,
): ResearchIntakeAdminQuery {
  for (const key of searchParams.keys()) {
    if (!QUERY_KEY_SET.has(key)) {
      throw new ResearchIntakeAdminQueryError(key, `unknown query parameter: ${key}`);
    }
  }

  return {
    query: parseQueryText(searchParams),
    assetClass: parseEnum(searchParams, 'assetClass', RESEARCH_ASSET_CLASSES),
    stage: parseEnum(searchParams, 'stage', RESEARCH_INTAKE_STAGES),
    verdict: parseEnum(searchParams, 'verdict', VERDICTS),
    sourceAuditDisposition: parseEnum(
      searchParams,
      'sourceAuditDisposition',
      SOURCE_AUDIT_DISPOSITIONS,
    ),
    page: parsePositiveInteger(searchParams, 'page', DEFAULT_PAGE, MAX_PAGE),
    limit: parsePositiveInteger(searchParams, 'limit', DEFAULT_LIMIT, MAX_LIMIT),
  };
}

function asIntakeFilters(query: ResearchIntakeAdminQuery): ResearchIntakeFilters {
  return {
    query: query.query,
    assetClass: query.assetClass,
    stage: query.stage,
    verdict: query.verdict,
    sourceAuditDisposition: query.sourceAuditDisposition,
  };
}

function buildResearchIntakeAdminObservation(at: Date | string | number) {
  const observedDate = new Date(at instanceof Date ? at.getTime() : at);
  const observedAt = observedDate.toISOString();
  const currentWindow = getResearchLoopWindow(observedDate);
  const receiptSnapshot = getResearchLoopReceiptSnapshot(observedDate);
  const marketingReview = getResearchLoopMarketingReview(observedDate);

  return {
    observedAt,
    observedAtMs: observedDate.getTime(),
    marketingReview,
    researchLoop: {
      observedAt,
      alignment: 'UTC' as const,
      cadence: 'PT3H' as const,
      currentWindow,
      nextRolloverAt: currentWindow.endsAt,
      ...receiptSnapshot,
    },
  };
}

function toAdminRecord(
  record: ResearchIntakeRecord,
  marketingHandoffVisible: boolean,
): ResearchIntakeAdminRecord {
  return {
    ...record,
    marketingReviewDraft: marketingHandoffVisible
      ? buildMarketingReviewDraft(record)
      : null,
  };
}

function buildResearchIntakeAdminCandidateWorkflow(
  candidate: ResearchIntakeRecord,
  observation: ReturnType<typeof buildResearchIntakeAdminObservation>,
): ResearchIntakeAdminCandidatePayload['candidateWorkflow'] {
  const receipts = RESEARCH_LOOP_RECEIPTS.filter(
    (entry) =>
      entry.candidateId === candidate.id &&
      Date.parse(entry.recordedAt) <= observation.observedAtMs,
  );
  const marketingHandoff = observation.marketingReview.handoffs.find(
    (handoff) => handoff.candidateId === candidate.id,
  ) ?? null;

  return {
    receiptCount: receipts.length,
    receipts,
    latestReceipt: receipts.at(-1) ?? null,
    marketingHandoff,
    controls: {
      humanReviewRequired: marketingHandoff !== null,
      publicationApproved: false,
      automaticPublication: false,
      automaticPosting: false,
      tradingApproved: false,
      automaticTrading: false,
      externalActions: 'none',
    },
  };
}

const ADMIN_REVIEW_CONTROLS: ResearchIntakeAdminReviewControls = {
  humanReviewRequired: true,
  publicationApproved: false,
  automaticPublication: false,
  automaticPosting: false,
  tradingApproved: false,
  automaticTrading: false,
  externalActions: 'none',
};

function toAdminReviewItem(
  handoff: ResearchLoopMarketingHandoff,
  queuePosition: number,
  observedAtMs: number,
): ResearchIntakeAdminReviewItem {
  const candidate = SYSTEMATIC_RESEARCH_INTAKE.find(
    (record) => record.id === handoff.candidateId,
  );
  if (!candidate || candidate.tradeClawEvidence?.taskId !== handoff.taskId) {
    throw new Error(`marketing review ${handoff.taskId} has no matching evidence record`);
  }

  const receipt = RESEARCH_LOOP_RECEIPTS.find(
    (entry) =>
      entry.taskId === handoff.taskId &&
      Date.parse(entry.recordedAt) <= observedAtMs,
  ) ?? null;
  if (handoff.basis === 'pre-loop-closure') {
    if (receipt !== null || handoff.cycleId !== null) {
      throw new Error(`pre-loop marketing review ${handoff.taskId} acquired a cycle receipt`);
    }
  } else if (
    receipt === null ||
    receipt.candidateId !== handoff.candidateId ||
    receipt.recordedAt !== handoff.availableAt ||
    receipt.cycleId !== handoff.cycleId
  ) {
    throw new Error(`marketing review ${handoff.taskId} has no matching cycle receipt`);
  }

  const encodedCandidateId = encodeURIComponent(candidate.id);
  return {
    queuePosition,
    candidate: {
      id: candidate.id,
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      assetClass: candidate.assetClass,
      sourcePosition: candidate.sourcePosition,
      stage: candidate.stage,
      verdict: candidate.verdict,
      costStatus: candidate.costStatus,
    },
    handoff,
    receipt,
    links: {
      adminCandidate: `/api/admin/research-intake/${encodedCandidateId}`,
      publicCandidate: `/api/research/intake/${encodedCandidateId}`,
    },
    controls: ADMIN_REVIEW_CONTROLS,
  };
}

export function buildResearchIntakeAdminPayload(
  searchParams: URLSearchParams,
  at: Date | string | number = new Date(),
): ResearchIntakeAdminPayload {
  const query = parseResearchIntakeAdminQuery(searchParams);
  const observation = buildResearchIntakeAdminObservation(at);
  const visibleMarketingCandidates = new Set(
    observation.marketingReview.handoffs.map((handoff) => handoff.candidateId),
  );
  const filtered = filterResearchIntake(
    SYSTEMATIC_RESEARCH_INTAKE,
    asIntakeFilters(query),
  );
  const start = (query.page - 1) * query.limit;
  const records = filtered
    .slice(start, start + query.limit)
    .map((record) => toAdminRecord(record, visibleMarketingCandidates.has(record.id)));
  const totalPages = Math.ceil(filtered.length / query.limit);

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    marketingReview: observation.marketingReview,
    appliedFilters: query,
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    filteredSummary: summarizeResearchIntake(filtered),
    pagination: {
      page: query.page,
      limit: query.limit,
      totalRecords: filtered.length,
      totalPages,
      returnedRecords: records.length,
      hasPreviousPage: filtered.length > 0 && query.page > 1,
      hasNextPage: start + records.length < filtered.length,
    },
    records,
  };
}

/**
 * Protected exact-ID projection for one current compiled candidate. Receipt
 * and marketing provenance are limited to entries visible at `at`.
 */
export function buildResearchIntakeAdminCandidatePayload(
  candidateId: string,
  at: Date | string | number = new Date(),
): ResearchIntakeAdminCandidatePayload | null {
  const candidate = SYSTEMATIC_RESEARCH_INTAKE.find((record) => record.id === candidateId);
  if (!candidate) return null;

  const observation = buildResearchIntakeAdminObservation(at);
  const candidateWorkflow = buildResearchIntakeAdminCandidateWorkflow(
    candidate,
    observation,
  );

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    record: toAdminRecord(candidate, candidateWorkflow.marketingHandoff !== null),
    candidateWorkflow,
  };
}

/**
 * Protected, filter-independent desk for every current compiled candidate with
 * a TradeClaw source-audit or replication overlay. Receipt and marketing state
 * are limited to entries visible at `at`; the evidence records themselves are
 * the current compiled catalog, not reconstructed historical snapshots.
 */
export function buildResearchIntakeAdminEvidencePayload(
  at: Date | string | number = new Date(),
): ResearchIntakeAdminEvidencePayload {
  const observation = buildResearchIntakeAdminObservation(at);
  const evidenceRecords = SYSTEMATIC_RESEARCH_INTAKE.filter(
    (record) => record.tradeClawSourceAudit !== null || record.tradeClawEvidence !== null,
  );

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    evidenceIndex: {
      selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
      order: 'pinned-source-order',
      performanceRanked: false,
      includesEveryAvailableOverlay: true,
    },
    evidenceSummary: summarizeResearchIntake(evidenceRecords),
    items: evidenceRecords.map((record, index) => {
      const candidateWorkflow = buildResearchIntakeAdminCandidateWorkflow(
        record,
        observation,
      );
      const encodedCandidateId = encodeURIComponent(record.id);

      return {
        evidencePosition: index + 1,
        record: toAdminRecord(
          record,
          candidateWorkflow.marketingHandoff !== null,
        ),
        candidateWorkflow,
        links: {
          adminCandidate: `/api/admin/research-intake/${encodedCandidateId}`,
          publicCandidate: `/api/research/intake/${encodedCandidateId}`,
        },
      };
    }),
  };
}

/**
 * Protected, filter-independent marketing-review queue. The server performs
 * every candidate and receipt join so admin clients do not reconstruct
 * provenance from the paginated catalog or flattened CSV cells.
 */
export function buildResearchIntakeAdminReviewPayload(
  at: Date | string | number = new Date(),
): ResearchIntakeAdminReviewPayload {
  const observation = buildResearchIntakeAdminObservation(at);
  const items = observation.marketingReview.handoffs.map((handoff, index) => (
    toAdminReviewItem(handoff, index + 1, observation.observedAtMs)
  ));

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    queue: {
      status: observation.marketingReview.status,
      summary: observation.marketingReview.summary,
      latestItem: items.at(-1) ?? null,
      currentWindowItems: items.filter(
        (item) => item.handoff.cycleId === observation.researchLoop.currentWindow.id,
      ),
      items,
      controls: ADMIN_REVIEW_CONTROLS,
    },
  };
}
