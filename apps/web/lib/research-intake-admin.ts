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
  catalog: '/api/admin/research-intake',
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
  marketingReview: ResearchLoopMarketingReview;
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
  links: ResearchIntakeCandidateLinks;
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
    startHere: buildResearchIntakeAdminStartHere({
      currentWindowStatus: receiptSnapshot.currentWindowStatus,
      currentWindowId: currentWindow.id,
      currentWindowReceiptCount: receiptSnapshot.currentWindowReceipts.length,
      availableDrafts: marketingReview.summary.availableDrafts,
      publicationApprovedDrafts: marketingReview.summary.publicationApprovedDrafts,
      evidenceCount: RESEARCH_INTAKE_ADMIN_EVIDENCE_RECORDS.length,
      resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    }),
  };
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

const ADMIN_REVIEW_CONTROLS: ResearchIntakeAdminReviewControls = {
  humanReviewRequired: true,
  publicationApproved: false,
  automaticPublication: false,
  automaticPosting: false,
  tradingApproved: false,
  automaticTrading: false,
  externalActions: 'none',
};

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
    links: buildResearchIntakeCandidateLinks(candidate.id),
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
    startHere: observation.startHere,
    queryContract: RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT,
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    researchLoop: observation.researchLoop,
    marketingReview: observation.marketingReview,
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
    startHere: observation.startHere,
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
    startHere: observation.startHere,
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
  const reviewRecords = observation.marketingReview.handoffs.map(
    recordForAdminReviewHandoff,
  );
  const items = observation.marketingReview.handoffs.map((handoff, index) => (
    toAdminReviewItem(
      handoff,
      reviewRecords[index],
      index + 1,
      observation.observedAtMs,
    )
  ));

  return {
    schemaVersion: 1,
    access: {
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_ADMIN_RESOURCES,
    startHere: observation.startHere,
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
      latestItem: items.at(-1) ?? null,
      currentWindowItems: items.filter(
        (item) => item.handoff.cycleId === observation.researchLoop.currentWindow.id,
      ),
      items,
      controls: ADMIN_REVIEW_CONTROLS,
    },
  };
}
