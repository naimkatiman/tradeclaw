import {
  buildResearchIntakePublicPayload,
  type ResearchIntakePublicPayload,
  type ResearchIntakePublicRecord,
} from './research-intake-public';

export const RESEARCH_INTAKE_CSV_COLUMNS = [
  'sourceOrder',
  'id',
  'title',
  'assetClass',
  'sourceUrl',
  'evidenceBasis',
  'performanceEvidenceStatus',
  'stage',
  'verdict',
  'costStatus',
  'upstreamGrossSharpe',
  'upstreamTStatistic',
  'upstreamVolatilityPct',
  'upstreamYearsTested',
  'sourceCatalogRepository',
  'sourceCatalogCommit',
  'sourceCatalogReadmeSha256',
  'sourceCatalogSnapshotDate',
  'upstreamPerformanceBasis',
  'tradeClawTreatment',
  'tradeClawTaskId',
  'tradeClawEvidencePath',
  'tradeClawArtifactPath',
  'grantsPublicationAuthority',
  'grantsTradingAuthority',
] as const;

export type ResearchIntakePerformanceEvidenceStatus =
  | 'not-tested'
  | 'source-audit-only-no-local-backtest'
  | 'qa-only-no-performance-result'
  | 'modeled-historical-pass'
  | 'modeled-historical-fail'
  | 'modeled-historical-inconclusive';

export interface ResearchIntakeCsvRow {
  sourceOrder: number;
  id: string;
  title: string;
  assetClass: string;
  sourceUrl: string;
  evidenceBasis: ResearchIntakePublicRecord['evidenceBasis'];
  performanceEvidenceStatus: ResearchIntakePerformanceEvidenceStatus;
  stage: ResearchIntakePublicRecord['stage'];
  verdict: ResearchIntakePublicRecord['verdict'];
  costStatus: ResearchIntakePublicRecord['costStatus'];
  upstreamGrossSharpe: number;
  upstreamTStatistic: number;
  upstreamVolatilityPct: number;
  upstreamYearsTested: number;
  sourceCatalogRepository: string;
  sourceCatalogCommit: string;
  sourceCatalogReadmeSha256: string;
  sourceCatalogSnapshotDate: string;
  upstreamPerformanceBasis: 'gross-of-trading-costs';
  tradeClawTreatment: 'discovery-only';
  tradeClawTaskId: string;
  tradeClawEvidencePath: string;
  tradeClawArtifactPath: string;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

type CsvCell = string | number | boolean;

function performanceEvidenceStatus(
  record: ResearchIntakePublicRecord,
): ResearchIntakePerformanceEvidenceStatus {
  if (!record.tradeClawEvidence) {
    return record.tradeClawSourceAudit
      ? 'source-audit-only-no-local-backtest'
      : 'not-tested';
  }

  if (
    'performanceGatesEvaluated' in record.tradeClawEvidence
    && record.tradeClawEvidence.performanceGatesEvaluated === false
  ) {
    return 'qa-only-no-performance-result';
  }

  if (
    record.verdict === 'pass'
    || record.verdict === 'fail'
    || record.verdict === 'inconclusive'
  ) {
    return `modeled-historical-${record.verdict}`;
  }

  throw new Error(`replication record ${record.id} cannot export not-tested performance`);
}

function evidencePath(record: ResearchIntakePublicRecord): string {
  if (record.tradeClawEvidence) return record.tradeClawEvidence.resultPath;
  if (record.tradeClawSourceAudit) return record.tradeClawSourceAudit.researchPath;
  return '';
}

function toCsvRow(
  record: ResearchIntakePublicRecord,
  payload: ResearchIntakePublicPayload,
): ResearchIntakeCsvRow {
  const taskId = record.tradeClawEvidence?.taskId
    ?? record.tradeClawSourceAudit?.taskId
    ?? '';

  return {
    sourceOrder: record.sourcePosition + 1,
    id: record.id,
    title: record.title,
    assetClass: record.assetClass,
    sourceUrl: record.sourceUrl,
    evidenceBasis: record.evidenceBasis,
    performanceEvidenceStatus: performanceEvidenceStatus(record),
    stage: record.stage,
    verdict: record.verdict,
    costStatus: record.costStatus,
    upstreamGrossSharpe: record.upstreamGrossSharpe,
    upstreamTStatistic: record.upstreamTStatistic,
    upstreamVolatilityPct: record.upstreamVolatilityPct,
    upstreamYearsTested: record.upstreamYearsTested,
    sourceCatalogRepository: payload.source.repository,
    sourceCatalogCommit: payload.source.commit,
    sourceCatalogReadmeSha256: payload.source.readmeSha256,
    sourceCatalogSnapshotDate: payload.source.snapshotDate,
    upstreamPerformanceBasis: payload.source.reportedPerformanceBasis,
    tradeClawTreatment: payload.source.tradeClawTreatment,
    tradeClawTaskId: taskId,
    tradeClawEvidencePath: evidencePath(record),
    tradeClawArtifactPath: record.tradeClawEvidence?.artifactPath ?? '',
    grantsPublicationAuthority: payload.access.grantsPublicationAuthority,
    grantsTradingAuthority: payload.access.grantsTradingAuthority,
  };
}

/**
 * Flatten the safe public projection only. Admin timing, selection, and
 * marketing fields cannot enter this module through the input type.
 */
export function buildResearchIntakeCsvRows(
  payload: ResearchIntakePublicPayload = buildResearchIntakePublicPayload(),
): readonly ResearchIntakeCsvRow[] {
  return payload.records.map((record) => toCsvRow(record, payload));
}

function csvCell(value: CsvCell): string {
  let raw = String(value);

  // Spreadsheet programs may evaluate text cells that begin with these
  // characters. Numeric values bypass this branch so genuine negative metrics
  // stay numbers rather than becoming quoted text.
  if (typeof value === 'string' && /^[\u0000-\u0020]*[=+\-@]/.test(value)) {
    raw = `'${value}`;
  }

  return /[",\r\n]/.test(raw)
    ? `"${raw.replace(/"/g, '""')}"`
    : raw;
}

export function researchIntakeCsvRowsToString(
  rows: readonly ResearchIntakeCsvRow[],
): string {
  return [
    RESEARCH_INTAKE_CSV_COLUMNS.join(','),
    ...rows.map((row) => (
      RESEARCH_INTAKE_CSV_COLUMNS
        .map((column) => csvCell(row[column]))
        .join(',')
    )),
  ].join('\r\n');
}

export function buildResearchIntakeCsv(): string {
  return researchIntakeCsvRowsToString(buildResearchIntakeCsvRows());
}
