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
  records: readonly ResearchIntakeRecord[];
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

export function buildResearchIntakeAdminPayload(
  searchParams: URLSearchParams,
): ResearchIntakeAdminPayload {
  const query = parseResearchIntakeAdminQuery(searchParams);
  const filtered = filterResearchIntake(
    SYSTEMATIC_RESEARCH_INTAKE,
    asIntakeFilters(query),
  );
  const start = (query.page - 1) * query.limit;
  const records = filtered.slice(start, start + query.limit);
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
