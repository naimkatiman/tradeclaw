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
  buildResearchIntakeCandidateHref,
  buildResearchIntakeCandidateNavigation,
  type ResearchIntakeCandidateNavigation,
} from './research-intake-candidate-navigation';
import {
  RESEARCH_INTAKE_EVIDENCE_STATUS_COPY,
  RESEARCH_INTAKE_EVIDENCE_STATUS_ORDER,
  buildResearchIntakeEvidenceState,
  summarizeResearchIntakeEvidenceStates,
  type ResearchIntakeEvidenceState,
  type ResearchIntakePerformanceEvidenceStatus,
} from './research-intake-evidence-state';
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
import {
  buildResearchIntakeAdminStartHere,
  type ResearchIntakeCurrentResource,
  type ResearchIntakeAdminStartHere,
} from './research-intake-start-here';

const VERDICTS = Object.freeze(['not-tested', 'pass', 'fail', 'inconclusive'] as const);
const SOURCE_AUDIT_DISPOSITIONS = Object.freeze(['advance', 'hold', 'no-go'] as const);

export const RESEARCH_INTAKE_ADMIN_QUERY_KEYS = Object.freeze([
  'q',
  'assetClass',
  'stage',
  'verdict',
  'sourceAuditDisposition',
  'evidenceStatus',
  'page',
  'limit',
] as const);

export const RESEARCH_INTAKE_ADMIN_RESOURCES = Object.freeze({
  overview: '/api/admin/research-intake/overview',
  catalog: '/api/admin/research-intake',
  evidenceIndex: '/api/admin/research-intake/evidence/index',
  evidence: '/api/admin/research-intake/evidence',
  evidenceCsv: '/api/admin/research-intake/evidence.csv',
  marketingReview: '/api/admin/research-intake/review',
  marketingReviewCsv: '/api/admin/research-intake/review.csv',
} as const);

const RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS = SYSTEMATIC_RESEARCH_INTAKE.filter(
  (record) => record.tradeClawSourceAudit !== null || record.tradeClawEvidence !== null,
);

export type ResearchIntakeAdminResources = typeof RESEARCH_INTAKE_ADMIN_RESOURCES;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 120;
const ADMIN_ASSET_CLASS_VALUES = Object.freeze(['all', ...RESEARCH_ASSET_CLASSES] as const);
const ADMIN_STAGE_VALUES = Object.freeze(['all', ...RESEARCH_INTAKE_STAGES] as const);
const ADMIN_VERDICT_VALUES = Object.freeze(['all', ...VERDICTS] as const);
const ADMIN_SOURCE_AUDIT_DISPOSITION_VALUES = Object.freeze([
  'all',
  ...SOURCE_AUDIT_DISPOSITIONS,
] as const);
const ADMIN_EVIDENCE_STATUS_VALUES = Object.freeze([
  'all',
  ...RESEARCH_INTAKE_EVIDENCE_STATUS_ORDER,
] as const);

export const RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT = Object.freeze({
  parameterOrder: RESEARCH_INTAKE_ADMIN_QUERY_KEYS,
  unknownParameters: 'rejected',
  duplicateParameters: 'rejected',
  parameters: Object.freeze({
    q: Object.freeze({
      type: 'text',
      appliedField: 'query',
      default: null,
      trimWhitespace: true,
      emptyMeans: null,
      maxLength: MAX_QUERY_LENGTH,
      controlCharacters: 'rejected',
    } as const),
    assetClass: Object.freeze({
      type: 'enum',
      default: 'all',
      values: ADMIN_ASSET_CLASS_VALUES,
    } as const),
    stage: Object.freeze({
      type: 'enum',
      default: 'all',
      values: ADMIN_STAGE_VALUES,
    } as const),
    verdict: Object.freeze({
      type: 'enum',
      default: 'all',
      values: ADMIN_VERDICT_VALUES,
    } as const),
    sourceAuditDisposition: Object.freeze({
      type: 'enum',
      default: 'all',
      values: ADMIN_SOURCE_AUDIT_DISPOSITION_VALUES,
    } as const),
    evidenceStatus: Object.freeze({
      type: 'enum',
      appliedField: 'evidenceState.performanceEvidenceStatus',
      default: 'all',
      values: ADMIN_EVIDENCE_STATUS_VALUES,
    } as const),
    page: Object.freeze({
      type: 'positive-integer',
      default: DEFAULT_PAGE,
      minimum: 1,
      maximum: MAX_PAGE,
    } as const),
    limit: Object.freeze({
      type: 'positive-integer',
      default: DEFAULT_LIMIT,
      minimum: 1,
      maximum: MAX_LIMIT,
    } as const),
  }),
  canonicalLinks: Object.freeze({
    basePath: RESEARCH_INTAKE_ADMIN_RESOURCES.catalog,
    omitDefaultFilters: true,
    alwaysInclude: Object.freeze(['page', 'limit'] as const),
    previousAndNextNullable: true,
    lastPageFloor: 1,
  } as const),
} as const);

export type ResearchIntakeAdminQueryContract = typeof RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT;

const RESEARCH_INTAKE_ADMIN_FACET_DIMENSIONS = Object.freeze([
  'assetClass',
  'stage',
  'verdict',
  'sourceAuditDisposition',
  'evidenceStatus',
] as const);

export const RESEARCH_INTAKE_ADMIN_FACET_CONTRACT = Object.freeze({
  dimensionOrder: RESEARCH_INTAKE_ADMIN_FACET_DIMENSIONS,
  countingMode: 'disjunctive',
  scope: 'complete-catalog-before-pagination',
  queryAppliedToEveryCount: true,
  otherActiveFiltersApplied: true,
  ownDimensionReplaced: true,
  zeroCountOptionsIncluded: true,
  optionOrder: 'query-contract',
  paginationAffectsCounts: false,
} as const);

export type ResearchIntakeAdminFacetContract =
  typeof RESEARCH_INTAKE_ADMIN_FACET_CONTRACT;

const RESEARCH_INTAKE_ADMIN_ACTIVE_FILTER_PARAMETERS = Object.freeze([
  'q',
  ...RESEARCH_INTAKE_ADMIN_FACET_DIMENSIONS,
] as const);

export const RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT = Object.freeze({
  activeParameterOrder: RESEARCH_INTAKE_ADMIN_ACTIVE_FILTER_PARAMETERS,
  facetSelectionMode: 'replace-own-dimension',
  resetPageTo: 1,
  preserveLimit: true,
  preserveUnrelatedFilters: true,
  removeOneFilterAtATime: true,
  clearAllPreservesLimit: true,
  canonicalSerialization: 'query-contract',
} as const);

export type ResearchIntakeAdminFilterNavigationContract =
  typeof RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT;

const RESEARCH_INTAKE_ADMIN_FACET_LABELS = Object.freeze({
  assetClass: Object.freeze({
    dimension: 'Asset class',
    options: Object.freeze({
      all: 'All asset classes',
      Equities: 'Equities',
      Bonds: 'Bonds',
      Commodities: 'Commodities',
      Currencies: 'Currencies',
      Cryptocurrencies: 'Cryptocurrencies',
      Derivatives: 'Derivatives',
      'Multi-asset': 'Multi-asset',
    } as const),
  } as const),
  stage: Object.freeze({
    dimension: 'Research stage',
    options: Object.freeze({
      all: 'All stages',
      discovered: 'Discovered',
      'source-audited': 'Source audited',
      preregistered: 'Preregistered',
      replicated: 'Replicated',
      prospective: 'Prospective',
    } as const),
  } as const),
  verdict: Object.freeze({
    dimension: 'TradeClaw verdict',
    options: Object.freeze({
      all: 'All verdicts',
      'not-tested': 'Not tested',
      pass: 'Pass',
      fail: 'Fail',
      inconclusive: 'Inconclusive',
    } as const),
  } as const),
  sourceAuditDisposition: Object.freeze({
    dimension: 'Source-audit disposition',
    options: Object.freeze({
      all: 'All records',
      advance: 'Advance',
      hold: 'Hold',
      'no-go': 'No-go',
    } as const),
  } as const),
  evidenceStatus: Object.freeze({
    dimension: 'Evidence status',
    options: Object.freeze({
      all: 'All evidence statuses',
      'not-tested': RESEARCH_INTAKE_EVIDENCE_STATUS_COPY['not-tested'].label,
      'source-audit-only-no-local-backtest':
        RESEARCH_INTAKE_EVIDENCE_STATUS_COPY['source-audit-only-no-local-backtest'].label,
      'qa-only-no-performance-result':
        RESEARCH_INTAKE_EVIDENCE_STATUS_COPY['qa-only-no-performance-result'].label,
      'modeled-historical-pass':
        RESEARCH_INTAKE_EVIDENCE_STATUS_COPY['modeled-historical-pass'].label,
      'modeled-historical-fail':
        RESEARCH_INTAKE_EVIDENCE_STATUS_COPY['modeled-historical-fail'].label,
      'modeled-historical-inconclusive':
        RESEARCH_INTAKE_EVIDENCE_STATUS_COPY['modeled-historical-inconclusive'].label,
    } as const),
  } as const),
} as const);

const QUERY_KEY_SET = new Set<string>(RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT.parameterOrder);

export interface ResearchIntakeAdminQuery {
  query?: string;
  assetClass: ResearchAssetClass | 'all';
  stage: ResearchIntakeStage | 'all';
  verdict: ResearchVerdict | 'all';
  sourceAuditDisposition: ResearchSourceAuditDisposition | 'all';
  evidenceStatus: ResearchIntakePerformanceEvidenceStatus | 'all';
  page: number;
  limit: number;
}

export interface ResearchIntakeAdminRecord extends ResearchIntakeRecord {
  evidenceState: ResearchIntakeEvidenceState;
  marketingReviewDraft: MarketingReviewDraft | null;
}

export interface ResearchIntakeCandidateLinks {
  adminCandidate: string;
  publicCandidate: string;
}

export interface ResearchIntakeAdminReviewLinks extends ResearchIntakeCandidateLinks {
  reviewItem: string;
  reviewPacket: string;
}

export interface ResearchIntakeAdminCatalogRecord extends ResearchIntakeAdminRecord {
  links: ResearchIntakeCandidateLinks;
}

export interface ResearchIntakeAdminFacetOption<T extends string> {
  value: T;
  label: string;
  count: number;
  selected: boolean;
  href: string;
}

export interface ResearchIntakeAdminFacetDimension<T extends string> {
  label: string;
  selected: T;
  options: readonly ResearchIntakeAdminFacetOption<T>[];
}

export interface ResearchIntakeAdminFilterFacets {
  contract: ResearchIntakeAdminFacetContract;
  dimensions: {
    assetClass: ResearchIntakeAdminFacetDimension<
      (typeof ADMIN_ASSET_CLASS_VALUES)[number]
    >;
    stage: ResearchIntakeAdminFacetDimension<(typeof ADMIN_STAGE_VALUES)[number]>;
    verdict: ResearchIntakeAdminFacetDimension<(typeof ADMIN_VERDICT_VALUES)[number]>;
    sourceAuditDisposition: ResearchIntakeAdminFacetDimension<
      (typeof ADMIN_SOURCE_AUDIT_DISPOSITION_VALUES)[number]
    >;
    evidenceStatus: ResearchIntakeAdminFacetDimension<
      (typeof ADMIN_EVIDENCE_STATUS_VALUES)[number]
    >;
  };
}

export interface ResearchIntakeAdminActiveFilter {
  parameter: (typeof RESEARCH_INTAKE_ADMIN_ACTIVE_FILTER_PARAMETERS)[number];
  label: string;
  value: string;
  displayValue: string;
  removeHref: string;
}

export interface ResearchIntakeAdminFilterNavigation {
  contract: ResearchIntakeAdminFilterNavigationContract;
  activeFilterCount: number;
  clearAllHref: string;
  activeFilters: readonly ResearchIntakeAdminActiveFilter[];
}

export interface ResearchIntakeAdminResultView {
  status: 'showing-results' | 'no-matches' | 'page-out-of-range';
  summary: string;
  range: {
    firstRecord: number;
    lastRecord: number;
    totalRecords: number;
  } | null;
  recoveryAction: {
    kind: 'clear-filters' | 'last-page';
    label: string;
    href: string;
  } | null;
}

export interface ResearchIntakeAdminPayload {
  schemaVersion: 1;
  access: {
    mode: 'admin-read-only';
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
  resources: ResearchIntakeAdminResources;
  startHere: ResearchIntakeAdminStartHere;
  queryContract: ResearchIntakeAdminQueryContract;
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
  marketingReview: ResearchLoopMarketingReview & {
    nextReview: ResearchIntakeAdminNextReview | null;
  };
  appliedFilters: ResearchIntakeAdminQuery;
  filterFacets: ResearchIntakeAdminFilterFacets;
  filterNavigation: ResearchIntakeAdminFilterNavigation;
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  filteredSummary: ReturnType<typeof summarizeResearchIntake>;
  catalogEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  filteredEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    returnedRecords: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    links: {
      self: string;
      first: string;
      previous: string | null;
      next: string | null;
      last: string;
    };
  };
  resultView: ResearchIntakeAdminResultView;
  records: readonly ResearchIntakeAdminCatalogRecord[];
}

export interface ResearchIntakeAdminOverviewPayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  resources: ResearchIntakeAdminResources;
  startHere: ResearchIntakeAdminStartHere;
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  marketingReview: Pick<ResearchLoopMarketingReview, 'status' | 'summary' | 'controls'> & {
    currentWindowDraftCount: number;
    nextReview: ResearchIntakeAdminNextReview | null;
  };
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  catalogEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  evidenceSummary: ReturnType<typeof summarizeResearchIntake>;
  evidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
}

export type ResearchIntakeAdminEvidenceBasis =
  | 'upstream-gross-discovery-only'
  | 'tradeclaw-source-audit-only'
  | 'tradeclaw-replication-record';

export type ResearchIntakeAdminEvidenceIndexState = Pick<
  ResearchIntakeEvidenceState,
  'performanceEvidenceStatus' | 'label' | 'performanceGatesEvaluated' | 'taskId'
> & {
  decisionSummary: string;
  evidenceRecordedOn: string;
};

export interface ResearchIntakeAdminEvidenceIndexItem {
  evidencePosition: number;
  candidate: Pick<
    ResearchIntakeRecord,
    | 'id'
    | 'title'
    | 'assetClass'
    | 'sourcePosition'
    | 'stage'
    | 'verdict'
    | 'costStatus'
  > & {
    evidenceBasis: ResearchIntakeAdminEvidenceBasis;
    evidenceState: ResearchIntakeAdminEvidenceIndexState;
  };
  workflow: {
    receiptCount: number;
    hasMarketingHandoff: boolean;
    nextAction: string;
  };
  links: ResearchIntakeCandidateLinks;
}

export interface ResearchIntakeAdminEvidenceIndexPayload
  extends ResearchIntakeAdminOverviewPayload {
  evidenceIndex: ResearchIntakeAdminEvidencePayload['evidenceIndex'];
  items: readonly ResearchIntakeAdminEvidenceIndexItem[];
}

export interface ResearchIntakeAdminCandidatePayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  resources: ResearchIntakeAdminResources;
  startHere: ResearchIntakeAdminStartHere;
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  catalogEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  navigation: ResearchIntakeCandidateNavigation;
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
  links: ResearchIntakeCandidateLinks;
}

export interface ResearchIntakeAdminEvidencePayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  resources: ResearchIntakeAdminResources;
  startHere: ResearchIntakeAdminStartHere;
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  catalogEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  evidenceIndex: {
    selection: 'all-candidates-with-tradeclaw-source-audit-or-replication';
    order: 'pinned-source-order';
    performanceRanked: false;
    includesEveryAvailableOverlay: true;
  };
  evidenceSummary: ReturnType<typeof summarizeResearchIntake>;
  evidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
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

export interface ResearchIntakeAdminNextReview {
  selection: 'oldest-visible-human-review-handoff';
  queuePosition: number;
  taskId: ResearchLoopMarketingHandoff['taskId'];
  candidate: Pick<ResearchIntakeRecord, 'id' | 'title'> & {
    evidenceState: ResearchIntakeAdminEvidenceIndexState;
  };
  handoff: {
    availableAt: string;
    basis: ResearchLoopMarketingHandoff['basis'];
    cycleId: string | null;
    headline: string;
    summary: string;
  };
  links: ResearchIntakeAdminReviewLinks;
  controls: ResearchIntakeAdminReviewControls;
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
  > & {
    evidenceState: ResearchIntakeEvidenceState;
  };
  handoff: ResearchLoopMarketingHandoff;
  receipt: ResearchLoopReceipt | null;
  links: ResearchIntakeAdminReviewLinks;
  controls: ResearchIntakeAdminReviewControls;
}

export interface ResearchIntakeAdminReviewPayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  resources: ResearchIntakeAdminResources;
  startHere: ResearchIntakeAdminStartHere;
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  catalogEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  queue: {
    status: ResearchLoopMarketingReview['status'];
    summary: ResearchLoopMarketingReview['summary'];
    evidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
    nextReview: ResearchIntakeAdminNextReview | null;
    latestItem: ResearchIntakeAdminReviewItem | null;
    currentWindowItems: readonly ResearchIntakeAdminReviewItem[];
    items: readonly ResearchIntakeAdminReviewItem[];
    controls: ResearchIntakeAdminReviewControls;
  };
}

export interface ResearchIntakeAdminReviewNavigationItem {
  taskId: ResearchLoopMarketingHandoff['taskId'];
  queuePosition: number;
  headline: string;
  href: string;
}

export type ResearchIntakeAdminReviewCheckId =
  | 'verify-numeric-claims'
  | 'preserve-evidence-framing'
  | 'reject-live-or-advice-framing'
  | 'require-separate-owner-decision';

export interface ResearchIntakeAdminReviewCheck {
  id: ResearchIntakeAdminReviewCheckId;
  instruction: string;
  required: true;
}

export interface ResearchIntakeAdminReviewProtocol {
  schemaVersion: 1;
  status: 'manual-review-required';
  completionTracking: 'not-recorded-by-this-read-only-api';
  mutationSupported: false;
  checks: readonly ResearchIntakeAdminReviewCheck[];
}

export interface ResearchIntakeAdminCandidateClaimReference {
  source: 'protected-candidate-json';
  path: string;
  jsonPointer: string;
  rawValue: unknown;
  renderedValue: string;
}

export interface ResearchIntakeAdminPreregistrationClaimReference {
  source: 'preregistration-file';
  path: string;
  locator: string;
  renderedValue: string;
}

export type ResearchIntakeAdminClaimReference =
  | ResearchIntakeAdminCandidateClaimReference
  | ResearchIntakeAdminPreregistrationClaimReference;

export interface ResearchIntakeAdminClaim {
  id: string;
  statement: string;
  references: readonly ResearchIntakeAdminClaimReference[];
}

export interface ResearchIntakeAdminClaimVerification {
  schemaVersion: 1;
  status: 'manual-cross-check-required';
  mappingPurpose: 'draft-claim-to-canonical-evidence-navigation';
  sourceOfTruth: 'result-and-artifact-files';
  verificationRecorded: false;
  mutationSupported: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  files: {
    candidateJsonHref: string;
    preregistrationPath: string;
    resultPath: string;
    artifactPath: string;
  };
  claims: readonly ResearchIntakeAdminClaim[];
}

export interface ResearchIntakeAdminReviewItemPayload {
  schemaVersion: 1;
  access: ResearchIntakeAdminPayload['access'];
  resources: ResearchIntakeAdminResources;
  startHere: ResearchIntakeAdminStartHere;
  researchLoop: ResearchIntakeAdminPayload['researchLoop'];
  navigation: {
    order: 'oldest-visible-human-review-handoff';
    currentPosition: number;
    totalVisibleItems: number;
    queueHref: string;
    selfHref: string;
    previous: ResearchIntakeAdminReviewNavigationItem | null;
    next: ResearchIntakeAdminReviewNavigationItem | null;
  };
  reviewProtocol: ResearchIntakeAdminReviewProtocol;
  claimVerification: ResearchIntakeAdminClaimVerification;
  reviewItem: ResearchIntakeAdminReviewItem;
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
  fallback: T,
): T {
  const raw = readSingleParameter(searchParams, key);
  if (raw === undefined || raw === '') return fallback;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ResearchIntakeAdminQueryError(
      key,
      `${key} must be one of: ${allowed.join(', ')}`,
    );
  }
  return raw as T;
}

function parsePositiveInteger(
  searchParams: URLSearchParams,
  key: string,
  constraints: Readonly<{ default: number; minimum: number; maximum: number }>,
): number {
  const raw = readSingleParameter(searchParams, key);
  if (raw === undefined || raw === '') return constraints.default;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new ResearchIntakeAdminQueryError(key, `${key} must be a positive integer`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed > constraints.maximum) {
    throw new ResearchIntakeAdminQueryError(
      key,
      `${key} must not exceed ${constraints.maximum}`,
    );
  }
  if (parsed < constraints.minimum) {
    throw new ResearchIntakeAdminQueryError(
      key,
      `${key} must be at least ${constraints.minimum}`,
    );
  }
  return parsed;
}

function parseQueryText(searchParams: URLSearchParams): string | undefined {
  const contract = RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT.parameters.q;
  const raw = readSingleParameter(searchParams, 'q');
  if (raw === undefined) return undefined;
  const query = contract.trimWhitespace ? raw.trim() : raw;
  if (query.length === 0 && contract.emptyMeans === null) return undefined;
  if (query.length > contract.maxLength) {
    throw new ResearchIntakeAdminQueryError(
      'q',
      `q must not exceed ${contract.maxLength} characters`,
    );
  }
  if (contract.controlCharacters === 'rejected' && /[\u0000-\u001f\u007f]/.test(query)) {
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

  const parameters = RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT.parameters;

  return {
    query: parseQueryText(searchParams),
    assetClass: parseEnum(
      searchParams,
      'assetClass',
      parameters.assetClass.values,
      parameters.assetClass.default,
    ),
    stage: parseEnum(
      searchParams,
      'stage',
      parameters.stage.values,
      parameters.stage.default,
    ),
    verdict: parseEnum(
      searchParams,
      'verdict',
      parameters.verdict.values,
      parameters.verdict.default,
    ),
    sourceAuditDisposition: parseEnum(
      searchParams,
      'sourceAuditDisposition',
      parameters.sourceAuditDisposition.values,
      parameters.sourceAuditDisposition.default,
    ),
    evidenceStatus: parseEnum(
      searchParams,
      'evidenceStatus',
      parameters.evidenceStatus.values,
      parameters.evidenceStatus.default,
    ),
    page: parsePositiveInteger(searchParams, 'page', parameters.page),
    limit: parsePositiveInteger(searchParams, 'limit', parameters.limit),
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

function filterResearchIntakeForAdmin(
  records: readonly ResearchIntakeRecord[],
  query: ResearchIntakeAdminQuery,
): ResearchIntakeRecord[] {
  const filtered = filterResearchIntake(records, asIntakeFilters(query));
  if (query.evidenceStatus === 'all') return filtered;

  return filtered.filter(
    (record) =>
      buildResearchIntakeEvidenceState(record).performanceEvidenceStatus
      === query.evidenceStatus,
  );
}

type ResearchIntakeAdminFacetDimensionName =
  (typeof RESEARCH_INTAKE_ADMIN_FACET_DIMENSIONS)[number];

function buildResearchIntakeAdminFacetDimension<T extends string>(
  query: ResearchIntakeAdminQuery,
  dimension: ResearchIntakeAdminFacetDimensionName,
  label: string,
  selected: T,
  values: readonly T[],
  labels: Readonly<Record<T, string>>,
): ResearchIntakeAdminFacetDimension<T> {
  return {
    label,
    selected,
    options: values.map((value) => ({
      value,
      label: labels[value],
      count: filterResearchIntakeForAdmin(
        SYSTEMATIC_RESEARCH_INTAKE,
        {
          ...query,
          [dimension]: value,
        } as ResearchIntakeAdminQuery,
      ).length,
      selected: value === selected,
      href: buildResearchIntakeAdminCatalogPath(
        {
          ...query,
          [dimension]: value,
          page: RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT.resetPageTo,
        } as ResearchIntakeAdminQuery,
        RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT.resetPageTo,
      ),
    })),
  };
}

function buildResearchIntakeAdminFilterFacets(
  query: ResearchIntakeAdminQuery,
): ResearchIntakeAdminFilterFacets {
  const parameters = RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT.parameters;

  return {
    contract: RESEARCH_INTAKE_ADMIN_FACET_CONTRACT,
    dimensions: {
      assetClass: buildResearchIntakeAdminFacetDimension(
        query,
        'assetClass',
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.assetClass.dimension,
        query.assetClass,
        parameters.assetClass.values,
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.assetClass.options,
      ),
      stage: buildResearchIntakeAdminFacetDimension(
        query,
        'stage',
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.stage.dimension,
        query.stage,
        parameters.stage.values,
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.stage.options,
      ),
      verdict: buildResearchIntakeAdminFacetDimension(
        query,
        'verdict',
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.verdict.dimension,
        query.verdict,
        parameters.verdict.values,
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.verdict.options,
      ),
      sourceAuditDisposition: buildResearchIntakeAdminFacetDimension(
        query,
        'sourceAuditDisposition',
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.sourceAuditDisposition.dimension,
        query.sourceAuditDisposition,
        parameters.sourceAuditDisposition.values,
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.sourceAuditDisposition.options,
      ),
      evidenceStatus: buildResearchIntakeAdminFacetDimension(
        query,
        'evidenceStatus',
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.evidenceStatus.dimension,
        query.evidenceStatus,
        parameters.evidenceStatus.values,
        RESEARCH_INTAKE_ADMIN_FACET_LABELS.evidenceStatus.options,
      ),
    },
  };
}

function buildResearchIntakeAdminCatalogPath(
  query: ResearchIntakeAdminQuery,
  page: number,
): string {
  const { canonicalLinks, parameterOrder, parameters } =
    RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT;
  const searchParams = new URLSearchParams();

  for (const parameter of parameterOrder) {
    switch (parameter) {
      case 'q':
        if (query.query !== undefined) searchParams.set(parameter, query.query);
        break;
      case 'assetClass':
        if (!canonicalLinks.omitDefaultFilters || query.assetClass !== parameters.assetClass.default) {
          searchParams.set(parameter, query.assetClass);
        }
        break;
      case 'stage':
        if (!canonicalLinks.omitDefaultFilters || query.stage !== parameters.stage.default) {
          searchParams.set(parameter, query.stage);
        }
        break;
      case 'verdict':
        if (!canonicalLinks.omitDefaultFilters || query.verdict !== parameters.verdict.default) {
          searchParams.set(parameter, query.verdict);
        }
        break;
      case 'sourceAuditDisposition':
        if (
          !canonicalLinks.omitDefaultFilters ||
          query.sourceAuditDisposition !== parameters.sourceAuditDisposition.default
        ) {
          searchParams.set(parameter, query.sourceAuditDisposition);
        }
        break;
      case 'evidenceStatus':
        if (
          !canonicalLinks.omitDefaultFilters
          || query.evidenceStatus !== parameters.evidenceStatus.default
        ) {
          searchParams.set(parameter, query.evidenceStatus);
        }
        break;
      case 'page':
        searchParams.set(parameter, String(page));
        break;
      case 'limit':
        searchParams.set(parameter, String(query.limit));
        break;
      default: {
        const exhaustiveParameter: never = parameter;
        throw new Error(`Unsupported research intake query parameter: ${exhaustiveParameter}`);
      }
    }
  }

  return `${canonicalLinks.basePath}?${searchParams.toString()}`;
}

function buildResearchIntakeAdminFilterActionPath(
  query: ResearchIntakeAdminQuery,
  changes: Partial<ResearchIntakeAdminQuery>,
): string {
  const page = RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT.resetPageTo;
  return buildResearchIntakeAdminCatalogPath(
    {
      ...query,
      ...changes,
      page,
    },
    page,
  );
}

function buildResearchIntakeAdminFilterNavigation(
  query: ResearchIntakeAdminQuery,
): ResearchIntakeAdminFilterNavigation {
  const parameters = RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT.parameters;
  const activeFilters: ResearchIntakeAdminActiveFilter[] = [];

  for (const parameter of RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT.activeParameterOrder) {
    switch (parameter) {
      case 'q':
        if (query.query !== undefined) {
          activeFilters.push({
            parameter,
            label: 'Search',
            value: query.query,
            displayValue: query.query,
            removeHref: buildResearchIntakeAdminFilterActionPath(query, { query: undefined }),
          });
        }
        break;
      case 'assetClass':
        if (query.assetClass !== parameters.assetClass.default) {
          activeFilters.push({
            parameter,
            label: RESEARCH_INTAKE_ADMIN_FACET_LABELS.assetClass.dimension,
            value: query.assetClass,
            displayValue: RESEARCH_INTAKE_ADMIN_FACET_LABELS.assetClass.options[query.assetClass],
            removeHref: buildResearchIntakeAdminFilterActionPath(query, {
              assetClass: parameters.assetClass.default,
            }),
          });
        }
        break;
      case 'stage':
        if (query.stage !== parameters.stage.default) {
          activeFilters.push({
            parameter,
            label: RESEARCH_INTAKE_ADMIN_FACET_LABELS.stage.dimension,
            value: query.stage,
            displayValue: RESEARCH_INTAKE_ADMIN_FACET_LABELS.stage.options[query.stage],
            removeHref: buildResearchIntakeAdminFilterActionPath(query, {
              stage: parameters.stage.default,
            }),
          });
        }
        break;
      case 'verdict':
        if (query.verdict !== parameters.verdict.default) {
          activeFilters.push({
            parameter,
            label: RESEARCH_INTAKE_ADMIN_FACET_LABELS.verdict.dimension,
            value: query.verdict,
            displayValue: RESEARCH_INTAKE_ADMIN_FACET_LABELS.verdict.options[query.verdict],
            removeHref: buildResearchIntakeAdminFilterActionPath(query, {
              verdict: parameters.verdict.default,
            }),
          });
        }
        break;
      case 'sourceAuditDisposition':
        if (query.sourceAuditDisposition !== parameters.sourceAuditDisposition.default) {
          activeFilters.push({
            parameter,
            label: RESEARCH_INTAKE_ADMIN_FACET_LABELS.sourceAuditDisposition.dimension,
            value: query.sourceAuditDisposition,
            displayValue:
              RESEARCH_INTAKE_ADMIN_FACET_LABELS.sourceAuditDisposition.options[
                query.sourceAuditDisposition
              ],
            removeHref: buildResearchIntakeAdminFilterActionPath(query, {
              sourceAuditDisposition: parameters.sourceAuditDisposition.default,
            }),
          });
        }
        break;
      case 'evidenceStatus':
        if (query.evidenceStatus !== parameters.evidenceStatus.default) {
          activeFilters.push({
            parameter,
            label: RESEARCH_INTAKE_ADMIN_FACET_LABELS.evidenceStatus.dimension,
            value: query.evidenceStatus,
            displayValue:
              RESEARCH_INTAKE_ADMIN_FACET_LABELS.evidenceStatus.options[
                query.evidenceStatus
              ],
            removeHref: buildResearchIntakeAdminFilterActionPath(query, {
              evidenceStatus: parameters.evidenceStatus.default,
            }),
          });
        }
        break;
      default: {
        const exhaustiveParameter: never = parameter;
        throw new Error(`Unsupported active research intake filter: ${exhaustiveParameter}`);
      }
    }
  }

  const clearAllHref = buildResearchIntakeAdminFilterActionPath(query, {
    query: undefined,
    assetClass: parameters.assetClass.default,
    stage: parameters.stage.default,
    verdict: parameters.verdict.default,
    sourceAuditDisposition: parameters.sourceAuditDisposition.default,
    evidenceStatus: parameters.evidenceStatus.default,
  });

  return {
    contract: RESEARCH_INTAKE_ADMIN_FILTER_NAVIGATION_CONTRACT,
    activeFilterCount: activeFilters.length,
    clearAllHref,
    activeFilters,
  };
}

function buildResearchIntakeAdminPaginationLinks(
  query: ResearchIntakeAdminQuery,
  totalPages: number,
  hasPreviousPage: boolean,
  hasNextPage: boolean,
): ResearchIntakeAdminPayload['pagination']['links'] {
  const pathForPage = (page: number) => buildResearchIntakeAdminCatalogPath(query, page);
  const lastPage = Math.max(
    RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT.canonicalLinks.lastPageFloor,
    totalPages,
  );

  return {
    self: pathForPage(query.page),
    first: pathForPage(1),
    previous: hasPreviousPage ? pathForPage(query.page - 1) : null,
    next: hasNextPage ? pathForPage(query.page + 1) : null,
    last: pathForPage(lastPage),
  };
}

function buildResearchIntakeAdminResultView(
  query: ResearchIntakeAdminQuery,
  totalRecords: number,
  totalPages: number,
  start: number,
  returnedRecords: number,
  clearAllHref: string,
  lastPageHref: string,
): ResearchIntakeAdminResultView {
  if (totalRecords === 0) {
    return {
      status: 'no-matches',
      summary: 'No candidates match the current filters.',
      range: null,
      recoveryAction: {
        kind: 'clear-filters',
        label: 'Clear all filters',
        href: clearAllHref,
      },
    };
  }

  if (returnedRecords === 0) {
    const pageNoun = totalPages === 1 ? 'page' : 'pages';
    return {
      status: 'page-out-of-range',
      summary: `Page ${query.page} is outside the ${totalPages} available ${pageNoun}.`,
      range: null,
      recoveryAction: {
        kind: 'last-page',
        label: `Go to page ${totalPages}`,
        href: lastPageHref,
      },
    };
  }

  const firstRecord = start + 1;
  const lastRecord = start + returnedRecords;
  const visibleRange = firstRecord === lastRecord
    ? String(firstRecord)
    : `${firstRecord}–${lastRecord}`;
  const candidateNoun = totalRecords === 1 ? 'candidate' : 'candidates';

  return {
    status: 'showing-results',
    summary: `Showing ${visibleRange} of ${totalRecords} ${candidateNoun}.`,
    range: {
      firstRecord,
      lastRecord,
      totalRecords,
    },
    recoveryAction: null,
  };
}

function buildResearchIntakeAdminObservation(at: Date | string | number) {
  const observedDate = new Date(at instanceof Date ? at.getTime() : at);
  const observedAt = observedDate.toISOString();
  const currentWindow = getResearchLoopWindow(observedDate);
  const receiptSnapshot = getResearchLoopReceiptSnapshot(observedDate);
  const marketingReview = getResearchLoopMarketingReview(observedDate);
  const researchLoop = {
    observedAt,
    alignment: 'UTC' as const,
    cadence: 'PT3H' as const,
    currentWindow,
    nextRolloverAt: currentWindow.endsAt,
    ...receiptSnapshot,
  };

  return {
    observedAt,
    observedAtMs: observedDate.getTime(),
    marketingReview,
    researchLoop,
  };
}

function buildResearchIntakeAdminProjectionStartHere(
  observation: ReturnType<typeof buildResearchIntakeAdminObservation>,
  currentResource: ResearchIntakeCurrentResource,
): ResearchIntakeAdminStartHere {
  const nextReviewHandoff = observation.marketingReview.handoffs[0] ?? null;
  return buildResearchIntakeAdminStartHere({
    currentWindowStatus: observation.researchLoop.currentWindowStatus,
    currentWindowId: observation.researchLoop.currentWindow.id,
    currentWindowReceiptCount: observation.researchLoop.currentWindowReceipts.length,
    availableDrafts: observation.marketingReview.summary.availableDrafts,
    publicationApprovedDrafts:
      observation.marketingReview.summary.publicationApprovedDrafts,
    nextReviewHeadline: nextReviewHandoff?.draft.title ?? null,
    nextReviewPacketHref: nextReviewHandoff
      ? buildResearchIntakeAdminReviewPacketHref(nextReviewHandoff.taskId)
      : null,
    evidenceCount: RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS.length,
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    currentResource,
  });
}

function toAdminRecord(
  record: ResearchIntakeRecord,
  marketingHandoffVisible: boolean,
): ResearchIntakeAdminRecord {
  return {
    ...record,
    evidenceState: buildResearchIntakeEvidenceState(record),
    marketingReviewDraft: marketingHandoffVisible
      ? buildMarketingReviewDraft(record)
      : null,
  };
}

function buildResearchIntakeCandidateLinks(candidateId: string): ResearchIntakeCandidateLinks {
  return {
    adminCandidate: buildResearchIntakeCandidateHref(candidateId, 'admin'),
    publicCandidate: buildResearchIntakeCandidateHref(candidateId, 'public'),
  };
}

function buildResearchIntakeAdminReviewItemHref(
  taskId: ResearchLoopMarketingHandoff['taskId'],
): string {
  return `${RESEARCH_INTAKE_ADMIN_RESOURCES.marketingReview}/${encodeURIComponent(taskId)}`;
}

function buildResearchIntakeAdminReviewPacketHref(
  taskId: ResearchLoopMarketingHandoff['taskId'],
): string {
  return `${buildResearchIntakeAdminReviewItemHref(taskId)}/packet.md`;
}

function buildResearchIntakeAdminReviewLinks(
  candidateId: string,
  taskId: ResearchLoopMarketingHandoff['taskId'],
): ResearchIntakeAdminReviewLinks {
  return {
    ...buildResearchIntakeCandidateLinks(candidateId),
    reviewItem: buildResearchIntakeAdminReviewItemHref(taskId),
    reviewPacket: buildResearchIntakeAdminReviewPacketHref(taskId),
  };
}

function toAdminCatalogRecord(
  record: ResearchIntakeRecord,
  marketingHandoffVisible: boolean,
): ResearchIntakeAdminCatalogRecord {
  return {
    ...toAdminRecord(record, marketingHandoffVisible),
    links: buildResearchIntakeCandidateLinks(record.id),
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

function evidenceBasisForAdmin(
  record: ResearchIntakeRecord,
): ResearchIntakeAdminEvidenceBasis {
  if (record.tradeClawEvidence) return 'tradeclaw-replication-record';
  if (record.tradeClawSourceAudit) return 'tradeclaw-source-audit-only';
  return 'upstream-gross-discovery-only';
}

function compactAdminEvidenceState(
  record: ResearchIntakeRecord,
): ResearchIntakeAdminEvidenceIndexState {
  const state = buildResearchIntakeEvidenceState(record);
  if (state.decisionSummary === null || state.evidenceRecordedOn === null) {
    throw new Error(`examined research record ${record.id} has incomplete decision context`);
  }
  return {
    performanceEvidenceStatus: state.performanceEvidenceStatus,
    label: state.label,
    performanceGatesEvaluated: state.performanceGatesEvaluated,
    taskId: state.taskId,
    decisionSummary: state.decisionSummary,
    evidenceRecordedOn: state.evidenceRecordedOn,
  };
}

function toAdminEvidenceIndexItem(
  record: ResearchIntakeRecord,
  index: number,
  observation: ReturnType<typeof buildResearchIntakeAdminObservation>,
): ResearchIntakeAdminEvidenceIndexItem {
  const candidateWorkflow = buildResearchIntakeAdminCandidateWorkflow(
    record,
    observation,
  );
  return {
    evidencePosition: index + 1,
    candidate: {
      id: record.id,
      title: record.title,
      assetClass: record.assetClass,
      sourcePosition: record.sourcePosition,
      stage: record.stage,
      verdict: record.verdict,
      costStatus: record.costStatus,
      evidenceBasis: evidenceBasisForAdmin(record),
      evidenceState: compactAdminEvidenceState(record),
    },
    workflow: {
      receiptCount: candidateWorkflow.receiptCount,
      hasMarketingHandoff: candidateWorkflow.marketingHandoff !== null,
      nextAction: record.nextAction,
    },
    links: buildResearchIntakeCandidateLinks(record.id),
  };
}

/**
 * Protected, record-free orientation projection. Receipt and review state is
 * observed once at `at`; candidate records, review handoffs, and draft bodies
 * remain on their dedicated protected resources.
 */
export function buildResearchIntakeAdminOverviewPayload(
  at: Date | string | number = new Date(),
): ResearchIntakeAdminOverviewPayload {
  const observation = buildResearchIntakeAdminObservation(at);

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(observation, 'overview'),
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    marketingReview: {
      status: observation.marketingReview.status,
      summary: observation.marketingReview.summary,
      currentWindowDraftCount: observation.marketingReview.currentWindowHandoffs.length,
      nextReview: buildResearchIntakeAdminNextReview(observation),
      controls: observation.marketingReview.controls,
    },
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
    evidenceSummary: summarizeResearchIntake(RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS),
    evidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS,
    ),
  };
}

/**
 * Protected lightweight evidence list. One authenticated observation supplies
 * receipt and handoff presence; complete workflow and evidence bodies remain
 * on the existing candidate, evidence, and review resources.
 */
export function buildResearchIntakeAdminEvidenceIndexPayload(
  at: Date | string | number = new Date(),
): ResearchIntakeAdminEvidenceIndexPayload {
  const observation = buildResearchIntakeAdminObservation(at);

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(
      observation,
      'evidence-index',
    ),
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    marketingReview: {
      status: observation.marketingReview.status,
      summary: observation.marketingReview.summary,
      currentWindowDraftCount: observation.marketingReview.currentWindowHandoffs.length,
      nextReview: buildResearchIntakeAdminNextReview(observation),
      controls: observation.marketingReview.controls,
    },
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
    evidenceSummary: summarizeResearchIntake(RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS),
    evidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS,
    ),
    evidenceIndex: {
      selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
      order: 'pinned-source-order',
      performanceRanked: false,
      includesEveryAvailableOverlay: true,
    },
    items: RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS.map((record, index) => (
      toAdminEvidenceIndexItem(record, index, observation)
    )),
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

export const RESEARCH_INTAKE_ADMIN_REVIEW_PROTOCOL: ResearchIntakeAdminReviewProtocol =
  Object.freeze({
    schemaVersion: 1,
    status: 'manual-review-required',
    completionTracking: 'not-recorded-by-this-read-only-api',
    mutationSupported: false,
    checks: Object.freeze([
      Object.freeze({
        id: 'verify-numeric-claims',
        instruction: 'Compare every numeric claim with the result and artifact files.',
        required: true,
      }),
      Object.freeze({
        id: 'preserve-evidence-framing',
        instruction:
          'Preserve the evidence-state label, frozen verdict, and modeled-research framing.',
        required: true,
      }),
      Object.freeze({
        id: 'reject-live-or-advice-framing',
        instruction:
          'Do not present modeled results as live performance, financial advice, or trading authority.',
        required: true,
      }),
      Object.freeze({
        id: 'require-separate-owner-decision',
        instruction:
          'Record a separate explicit owner decision before any publication, posting, or promotion.',
        required: true,
      }),
    ]),
  });

function reviewSignedPercent(ratio: number): string {
  const value = ratio * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function freezeReviewClaim(
  id: string,
  statement: string,
  references: readonly ResearchIntakeAdminClaimReference[],
): ResearchIntakeAdminClaim {
  return Object.freeze({
    id,
    statement,
    references: Object.freeze(references),
  });
}

function buildResearchIntakeAdminClaimVerification(
  candidate: ResearchIntakeRecord,
  reviewItem: ResearchIntakeAdminReviewItem,
): ResearchIntakeAdminClaimVerification {
  const evidence = candidate.tradeClawEvidence;
  if (!evidence || evidence.taskId !== reviewItem.handoff.taskId) {
    throw new Error(
      `marketing review ${reviewItem.handoff.taskId} has no claim-verification evidence`,
    );
  }
  if (
    evidence.resultPath !== reviewItem.handoff.draft.resultPath ||
    evidence.artifactPath !== reviewItem.handoff.draft.artifactPath
  ) {
    throw new Error(
      `marketing review ${reviewItem.handoff.taskId} has mismatched evidence files`,
    );
  }

  const files = Object.freeze({
    candidateJsonHref: reviewItem.links.adminCandidate,
    preregistrationPath: evidence.preregistrationPath,
    resultPath: evidence.resultPath,
    artifactPath: evidence.artifactPath,
  });
  const candidateReference = (
    jsonPointer: string,
    rawValue: unknown,
    renderedValue: string,
  ): ResearchIntakeAdminCandidateClaimReference => Object.freeze({
    source: 'protected-candidate-json',
    path: files.candidateJsonHref,
    jsonPointer,
    rawValue,
    renderedValue,
  });
  const preregistrationReference = (
    locator: string,
    renderedValue: string,
  ): ResearchIntakeAdminPreregistrationClaimReference => Object.freeze({
    source: 'preregistration-file',
    path: files.preregistrationPath,
    locator,
    renderedValue,
  });

  let claims: readonly ResearchIntakeAdminClaim[];

  if (evidence.taskId === 'TC-255') {
    const roundTripFeeAndSlippage = 2 * (
      evidence.costs.feePctPerSide + evidence.costs.slippagePctPerSide
    );
    claims = [
      freezeReviewClaim(
        'tc255-btc-full-history',
        `BTC full-history gross return was ${reviewSignedPercent(evidence.btc.grossCompoundedReturn)}, net return was ${reviewSignedPercent(evidence.btc.netCompoundedReturn)}, across ${evidence.btc.completedTrades.toLocaleString('en-US')} completed trades.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/btc/grossCompoundedReturn',
            evidence.btc.grossCompoundedReturn,
            reviewSignedPercent(evidence.btc.grossCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/netCompoundedReturn',
            evidence.btc.netCompoundedReturn,
            reviewSignedPercent(evidence.btc.netCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/completedTrades',
            evidence.btc.completedTrades,
            evidence.btc.completedTrades.toLocaleString('en-US'),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc255-eth-full-history',
        `ETH full-history gross return was ${reviewSignedPercent(evidence.eth.grossCompoundedReturn)} and net return was ${reviewSignedPercent(evidence.eth.netCompoundedReturn)}.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/eth/grossCompoundedReturn',
            evidence.eth.grossCompoundedReturn,
            reviewSignedPercent(evidence.eth.grossCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/eth/netCompoundedReturn',
            evidence.eth.netCompoundedReturn,
            reviewSignedPercent(evidence.eth.netCompoundedReturn),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc255-fixed-portfolio',
        `The preregistered fixed 50/50 BTC/ETH portfolio returned ${reviewSignedPercent(evidence.portfolio.netCompoundedReturn)} net over the full history and ${reviewSignedPercent(evidence.portfolio.holdoutNetCompoundedReturn)} net in holdout.`,
        [
          preregistrationReference(
            'Frozen portfolio and decision gates: independent 50/50 BTC/ETH sleeves',
            '50/50',
          ),
          candidateReference(
            '/record/tradeClawEvidence/portfolio/netCompoundedReturn',
            evidence.portfolio.netCompoundedReturn,
            reviewSignedPercent(evidence.portfolio.netCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/portfolio/holdoutNetCompoundedReturn',
            evidence.portfolio.holdoutNetCompoundedReturn,
            reviewSignedPercent(evidence.portfolio.holdoutNetCompoundedReturn),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc255-fold-stability',
        `Both BTC and ETH recorded ${evidence.btc.positiveFolds} of ${evidence.btc.totalFolds} positive chronological folds.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/btc/positiveFolds',
            evidence.btc.positiveFolds,
            String(evidence.btc.positiveFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/totalFolds',
            evidence.btc.totalFolds,
            String(evidence.btc.totalFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/eth/positiveFolds',
            evidence.eth.positiveFolds,
            String(evidence.eth.positiveFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/eth/totalFolds',
            evidence.eth.totalFolds,
            String(evidence.eth.totalFolds),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc255-cost-boundary',
        `BTC mean gross return per trade renders as ${reviewSignedPercent(evidence.btc.meanGrossTradeReturn)}; the draft's ${roundTripFeeAndSlippage.toFixed(2)}% round-trip fee and slippage equals 2 × (${evidence.costs.feePctPerSide.toFixed(2)}% fee + ${evidence.costs.slippagePctPerSide.toFixed(2)}% slippage) before funding.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/btc/meanGrossTradeReturn',
            evidence.btc.meanGrossTradeReturn,
            reviewSignedPercent(evidence.btc.meanGrossTradeReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/costs/feePctPerSide',
            evidence.costs.feePctPerSide,
            `${evidence.costs.feePctPerSide.toFixed(2)}%`,
          ),
          candidateReference(
            '/record/tradeClawEvidence/costs/slippagePctPerSide',
            evidence.costs.slippagePctPerSide,
            `${evidence.costs.slippagePctPerSide.toFixed(2)}%`,
          ),
        ],
      ),
    ];
  } else if (evidence.taskId === 'TC-257') {
    const observedBps = evidence.qa.maximumErrorPct * 100;
    const toleranceBps = evidence.qa.frozenTolerancePct * 100;
    claims = [
      freezeReviewClaim(
        'tc257-qa-check-count',
        `${evidence.qa.suppliedYieldChecksAboveTolerance} of ${evidence.qa.suppliedYieldChecks.toLocaleString('en-US')} official curve checks exceeded the preregistered tolerance.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/qa/suppliedYieldChecksAboveTolerance',
            evidence.qa.suppliedYieldChecksAboveTolerance,
            String(evidence.qa.suppliedYieldChecksAboveTolerance),
          ),
          candidateReference(
            '/record/tradeClawEvidence/qa/suppliedYieldChecks',
            evidence.qa.suppliedYieldChecks,
            evidence.qa.suppliedYieldChecks.toLocaleString('en-US'),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc257-evaluation-window',
        `Input QA covered ${evidence.qa.evaluationMonths} evaluation months; the maximum reconstruction error occurred on ${evidence.qa.maximumErrorDate}.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/qa/evaluationMonths',
            evidence.qa.evaluationMonths,
            String(evidence.qa.evaluationMonths),
          ),
          candidateReference(
            '/record/tradeClawEvidence/qa/maximumErrorDate',
            evidence.qa.maximumErrorDate,
            evidence.qa.maximumErrorDate,
          ),
        ],
      ),
      freezeReviewClaim(
        'tc257-qa-tolerance-breach',
        `The maximum curve error rendered as ${observedBps.toFixed(4)} bp, above the frozen ${toleranceBps.toFixed(2)} bp tolerance.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/qa/maximumErrorPct',
            evidence.qa.maximumErrorPct,
            `${observedBps.toFixed(4)} bp`,
          ),
          candidateReference(
            '/record/tradeClawEvidence/qa/frozenTolerancePct',
            evidence.qa.frozenTolerancePct,
            `${toleranceBps.toFixed(2)} bp`,
          ),
        ],
      ),
    ];
  } else if (evidence.taskId === 'TC-258') {
    claims = [
      freezeReviewClaim(
        'tc258-rule-and-holdout-window',
        'The preregistered MAX10/MIN10 rule uses the draft shorthand 2022-2026 for the frozen 2022-02-04 through 2026-07-31 holdout.',
        [
          preregistrationReference(
            'Objective and frozen configurations: MAX10 OR MIN10',
            'MAX10/MIN10',
          ),
          preregistrationReference(
            'Frozen windows and folds: holdout 2022-02-04 through 2026-07-31',
            '2022-2026',
          ),
        ],
      ),
      freezeReviewClaim(
        'tc258-paper-window-control',
        `The zero-cost paper-window control annualized at ${reviewSignedPercent(evidence.paperWindowGrossControl.annualizedReturn)} versus the source audit target of ${reviewSignedPercent(evidence.paperWindowGrossControl.sourceTargetAnnualizedReturn)}.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/paperWindowGrossControl/annualizedReturn',
            evidence.paperWindowGrossControl.annualizedReturn,
            reviewSignedPercent(evidence.paperWindowGrossControl.annualizedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/paperWindowGrossControl/sourceTargetAnnualizedReturn',
            evidence.paperWindowGrossControl.sourceTargetAnnualizedReturn,
            reviewSignedPercent(
              evidence.paperWindowGrossControl.sourceTargetAnnualizedReturn,
            ),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc258-btc-full-and-holdout',
        `BTC returned ${reviewSignedPercent(evidence.btc.grossCompoundedReturn)} gross and ${reviewSignedPercent(evidence.btc.netCompoundedReturn)} net over full history; holdout moved from ${reviewSignedPercent(evidence.btc.holdoutGrossCompoundedReturn)} gross to ${reviewSignedPercent(evidence.btc.holdoutFeeOnlyCompoundedReturn)} with the fee alone and ${reviewSignedPercent(evidence.btc.holdoutNetCompoundedReturn)} under the ${evidence.costs.headlineTotalPctPerSide.toFixed(2)}%-per-side headline cost.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/btc/grossCompoundedReturn',
            evidence.btc.grossCompoundedReturn,
            reviewSignedPercent(evidence.btc.grossCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/netCompoundedReturn',
            evidence.btc.netCompoundedReturn,
            reviewSignedPercent(evidence.btc.netCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/holdoutGrossCompoundedReturn',
            evidence.btc.holdoutGrossCompoundedReturn,
            reviewSignedPercent(evidence.btc.holdoutGrossCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/holdoutFeeOnlyCompoundedReturn',
            evidence.btc.holdoutFeeOnlyCompoundedReturn,
            reviewSignedPercent(evidence.btc.holdoutFeeOnlyCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/holdoutNetCompoundedReturn',
            evidence.btc.holdoutNetCompoundedReturn,
            reviewSignedPercent(evidence.btc.holdoutNetCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/costs/headlineTotalPctPerSide',
            evidence.costs.headlineTotalPctPerSide,
            `${evidence.costs.headlineTotalPctPerSide.toFixed(2)}%`,
          ),
        ],
      ),
      freezeReviewClaim(
        'tc258-eth-holdout-and-folds',
        `ETH holdout moved from ${reviewSignedPercent(evidence.eth.holdoutGrossCompoundedReturn)} gross to ${reviewSignedPercent(evidence.eth.holdoutNetCompoundedReturn)} net; both assets recorded ${evidence.btc.positiveFolds} of ${evidence.btc.totalFolds} positive chronological folds.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/eth/holdoutGrossCompoundedReturn',
            evidence.eth.holdoutGrossCompoundedReturn,
            reviewSignedPercent(evidence.eth.holdoutGrossCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/eth/holdoutNetCompoundedReturn',
            evidence.eth.holdoutNetCompoundedReturn,
            reviewSignedPercent(evidence.eth.holdoutNetCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/positiveFolds',
            evidence.btc.positiveFolds,
            String(evidence.btc.positiveFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/btc/totalFolds',
            evidence.btc.totalFolds,
            String(evidence.btc.totalFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/eth/positiveFolds',
            evidence.eth.positiveFolds,
            String(evidence.eth.positiveFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/eth/totalFolds',
            evidence.eth.totalFolds,
            String(evidence.eth.totalFolds),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc258-intraday-cost-no-go',
        `The excluded intraday lane's published-result break-even cost was ${evidence.intradayCostNoGo.breakEvenCostPctPerSide.toFixed(4)}% per side.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/intradayCostNoGo/breakEvenCostPctPerSide',
            evidence.intradayCostNoGo.breakEvenCostPctPerSide,
            `${evidence.intradayCostNoGo.breakEvenCostPctPerSide.toFixed(4)}%`,
          ),
        ],
      ),
    ];
  } else {
    const holdoutLabel = '2023-2026';
    claims = [
      freezeReviewClaim(
        'tc259-rule-cost-and-holdout-window',
        `The preregistered MA40 rule uses a 40-month moving average and a ${evidence.costs.headlineSideBps} bp-per-side headline roll cost; ${holdoutLabel} abbreviates the frozen 2023-02 through 2026-07 holdout.`,
        [
          preregistrationReference(
            'Frozen signal and required artifact: 40-month canonical average / MA40',
            'MA40',
          ),
          candidateReference(
            '/record/tradeClawEvidence/costs/headlineSideBps',
            evidence.costs.headlineSideBps,
            `${evidence.costs.headlineSideBps} bp`,
          ),
          preregistrationReference(
            'Frozen calendar and windows: post-publication holdout 2023-02 through 2026-07',
            holdoutLabel,
          ),
        ],
      ),
      freezeReviewClaim(
        'tc259-full-history',
        `The canonical full-history headline return was ${reviewSignedPercent(evidence.full.headlineCompoundedReturn)}.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/full/headlineCompoundedReturn',
            evidence.full.headlineCompoundedReturn,
            reviewSignedPercent(evidence.full.headlineCompoundedReturn),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc259-stability-and-holdout',
        `Only ${evidence.stability.passingPaperFolds}/${evidence.stability.totalPaperFolds} (${evidence.stability.passingPaperFolds} of ${evidence.stability.totalPaperFolds}) paper folds beat both benchmarks; canonical holdout returned ${reviewSignedPercent(evidence.holdout.headlineCompoundedReturn)} versus ${reviewSignedPercent(evidence.holdout.alwaysOneMonthHeadlineCompoundedReturn)} for the identically costed one-month sleeve.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/stability/passingPaperFolds',
            evidence.stability.passingPaperFolds,
            String(evidence.stability.passingPaperFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/stability/totalPaperFolds',
            evidence.stability.totalPaperFolds,
            String(evidence.stability.totalPaperFolds),
          ),
          candidateReference(
            '/record/tradeClawEvidence/holdout/headlineCompoundedReturn',
            evidence.holdout.headlineCompoundedReturn,
            reviewSignedPercent(evidence.holdout.headlineCompoundedReturn),
          ),
          candidateReference(
            '/record/tradeClawEvidence/holdout/alwaysOneMonthHeadlineCompoundedReturn',
            evidence.holdout.alwaysOneMonthHeadlineCompoundedReturn,
            reviewSignedPercent(
              evidence.holdout.alwaysOneMonthHeadlineCompoundedReturn,
            ),
          ),
        ],
      ),
      freezeReviewClaim(
        'tc259-prior-only-control',
        `The frozen prior-only ambiguity control returned ${reviewSignedPercent(evidence.holdout.priorOnlyHeadlineCompoundedReturn)} in holdout.`,
        [
          candidateReference(
            '/record/tradeClawEvidence/holdout/priorOnlyHeadlineCompoundedReturn',
            evidence.holdout.priorOnlyHeadlineCompoundedReturn,
            reviewSignedPercent(evidence.holdout.priorOnlyHeadlineCompoundedReturn),
          ),
        ],
      ),
    ];
  }

  return Object.freeze({
    schemaVersion: 1,
    status: 'manual-cross-check-required',
    mappingPurpose: 'draft-claim-to-canonical-evidence-navigation',
    sourceOfTruth: 'result-and-artifact-files',
    verificationRecorded: false,
    mutationSupported: false,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
    files,
    claims: Object.freeze(claims),
  });
}

function recordForAdminReviewHandoff(
  handoff: ResearchLoopMarketingHandoff,
): ResearchIntakeRecord {
  const candidate = SYSTEMATIC_RESEARCH_INTAKE.find(
    (record) => record.id === handoff.candidateId,
  );
  if (!candidate || candidate.tradeClawEvidence?.taskId !== handoff.taskId) {
    throw new Error(`marketing review ${handoff.taskId} has no matching evidence record`);
  }
  return candidate;
}

function toAdminReviewItem(
  handoff: ResearchLoopMarketingHandoff,
  candidate: ResearchIntakeRecord,
  queuePosition: number,
  observedAtMs: number,
): ResearchIntakeAdminReviewItem {

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
      evidenceState: buildResearchIntakeEvidenceState(candidate),
    },
    handoff,
    receipt,
    links: buildResearchIntakeAdminReviewLinks(candidate.id, handoff.taskId),
    controls: ADMIN_REVIEW_CONTROLS,
  };
}

function buildResearchIntakeAdminNextReview(
  observation: ReturnType<typeof buildResearchIntakeAdminObservation>,
): ResearchIntakeAdminNextReview | null {
  const handoff = observation.marketingReview.handoffs[0];
  if (!handoff) return null;

  const candidate = recordForAdminReviewHandoff(handoff);
  const evidenceState = compactAdminEvidenceState(candidate);
  if (evidenceState.taskId !== handoff.taskId) {
    throw new Error(`next marketing review ${handoff.taskId} has mismatched evidence state`);
  }

  return {
    selection: 'oldest-visible-human-review-handoff',
    queuePosition: 1,
    taskId: handoff.taskId,
    candidate: {
      id: candidate.id,
      title: candidate.title,
      evidenceState,
    },
    handoff: {
      availableAt: handoff.availableAt,
      basis: handoff.basis,
      cycleId: handoff.cycleId,
      headline: handoff.draft.title,
      summary: handoff.draft.summary,
    },
    links: buildResearchIntakeAdminReviewLinks(candidate.id, handoff.taskId),
    controls: ADMIN_REVIEW_CONTROLS,
  };
}

function buildResearchIntakeAdminReviewItems(
  observation: ReturnType<typeof buildResearchIntakeAdminObservation>,
): readonly ResearchIntakeAdminReviewItem[] {
  const reviewRecords = observation.marketingReview.handoffs.map(
    recordForAdminReviewHandoff,
  );

  return observation.marketingReview.handoffs.map((handoff, index) => (
    toAdminReviewItem(
      handoff,
      reviewRecords[index],
      index + 1,
      observation.observedAtMs,
    )
  ));
}

function buildResearchIntakeAdminReviewNavigationItem(
  item: ResearchIntakeAdminReviewItem,
): ResearchIntakeAdminReviewNavigationItem {
  return {
    taskId: item.handoff.taskId,
    queuePosition: item.queuePosition,
    headline: item.handoff.draft.title,
    href: buildResearchIntakeAdminReviewItemHref(item.handoff.taskId),
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
  const filtered = filterResearchIntakeForAdmin(SYSTEMATIC_RESEARCH_INTAKE, query);
  const start = (query.page - 1) * query.limit;
  const records = filtered
    .slice(start, start + query.limit)
    .map((record) => toAdminCatalogRecord(
      record,
      visibleMarketingCandidates.has(record.id),
    ));
  const totalPages = Math.ceil(filtered.length / query.limit);
  const hasPreviousPage = filtered.length > 0 && query.page > 1;
  const hasNextPage = start + records.length < filtered.length;
  const filterNavigation = buildResearchIntakeAdminFilterNavigation(query);
  const paginationLinks = buildResearchIntakeAdminPaginationLinks(
    query,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  );

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(observation, 'catalog'),
    queryContract: RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT,
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    marketingReview: {
      ...observation.marketingReview,
      nextReview: buildResearchIntakeAdminNextReview(observation),
    },
    appliedFilters: query,
    filterFacets: buildResearchIntakeAdminFilterFacets(query),
    filterNavigation,
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    filteredSummary: summarizeResearchIntake(filtered),
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
    filteredEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(filtered),
    pagination: {
      page: query.page,
      limit: query.limit,
      totalRecords: filtered.length,
      totalPages,
      returnedRecords: records.length,
      hasPreviousPage,
      hasNextPage,
      links: paginationLinks,
    },
    resultView: buildResearchIntakeAdminResultView(
      query,
      filtered.length,
      totalPages,
      start,
      records.length,
      filterNavigation.clearAllHref,
      paginationLinks.last,
    ),
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
  const navigation = buildResearchIntakeCandidateNavigation(candidateId, 'admin');
  if (!navigation) return null;

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
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(observation, 'candidate'),
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
    navigation,
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

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(observation, 'evidence'),
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
    evidenceIndex: {
      selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
      order: 'pinned-source-order',
      performanceRanked: false,
      includesEveryAvailableOverlay: true,
    },
    evidenceSummary: summarizeResearchIntake(RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS),
    evidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS,
    ),
    items: RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS.map((record, index) => {
      const candidateWorkflow = buildResearchIntakeAdminCandidateWorkflow(
        record,
        observation,
      );
      return {
        evidencePosition: index + 1,
        record: toAdminRecord(
          record,
          candidateWorkflow.marketingHandoff !== null,
        ),
        candidateWorkflow,
        links: buildResearchIntakeCandidateLinks(record.id),
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
  const items = buildResearchIntakeAdminReviewItems(observation);
  const reviewRecords = observation.marketingReview.handoffs.map(
    recordForAdminReviewHandoff,
  );

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(
      observation,
      'marketing-review',
    ),
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
    queue: {
      status: observation.marketingReview.status,
      summary: observation.marketingReview.summary,
      evidenceStateSummary: summarizeResearchIntakeEvidenceStates(reviewRecords),
      nextReview: buildResearchIntakeAdminNextReview(observation),
      latestItem: items.at(-1) ?? null,
      currentWindowItems: items.filter(
        (item) => item.handoff.cycleId === observation.researchLoop.currentWindow.id,
      ),
      items,
      controls: ADMIN_REVIEW_CONTROLS,
    },
  };
}

/**
 * Protected exact-task projection for one observation-visible marketing review.
 * Unknown, non-canonical, and not-yet-visible task IDs share the same null result.
 */
export function buildResearchIntakeAdminReviewItemPayload(
  taskId: string,
  at: Date | string | number = new Date(),
): ResearchIntakeAdminReviewItemPayload | null {
  const observation = buildResearchIntakeAdminObservation(at);
  const items = buildResearchIntakeAdminReviewItems(observation);
  const currentIndex = items.findIndex((item) => item.handoff.taskId === taskId);
  if (currentIndex < 0) return null;

  const reviewItem = items[currentIndex];
  const candidate = recordForAdminReviewHandoff(reviewItem.handoff);
  const previousItem = items[currentIndex - 1] ?? null;
  const nextItem = items[currentIndex + 1] ?? null;

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: buildResearchIntakeAdminProjectionStartHere(
      observation,
      'marketing-review-item',
    ),
    researchLoop: observation.researchLoop,
    navigation: {
      order: 'oldest-visible-human-review-handoff',
      currentPosition: reviewItem.queuePosition,
      totalVisibleItems: items.length,
      queueHref: RESEARCH_INTAKE_ADMIN_RESOURCES.marketingReview,
      selfHref: buildResearchIntakeAdminReviewItemHref(reviewItem.handoff.taskId),
      previous: previousItem
        ? buildResearchIntakeAdminReviewNavigationItem(previousItem)
        : null,
      next: nextItem
        ? buildResearchIntakeAdminReviewNavigationItem(nextItem)
        : null,
    },
    reviewProtocol: RESEARCH_INTAKE_ADMIN_REVIEW_PROTOCOL,
    claimVerification: buildResearchIntakeAdminClaimVerification(
      candidate,
      reviewItem,
    ),
    reviewItem,
  };
}
