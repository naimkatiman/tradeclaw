import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
  type ResearchIntakePublicPayload,
  type ResearchIntakePublicRecord,
} from './research-intake-public';
import type { ResearchIntakePerformanceEvidenceStatus } from './research-intake-evidence-state';

export type { ResearchIntakePerformanceEvidenceStatus } from './research-intake-evidence-state';

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

function toCsvRow(
  record: ResearchIntakePublicRecord,
  payload: ResearchIntakePublicPayload,
): ResearchIntakeCsvRow {
  return {
    sourceOrder: record.sourcePosition + 1,
    id: record.id,
    title: record.title,
    assetClass: record.assetClass,
    sourceUrl: record.sourceUrl,
    evidenceBasis: record.evidenceBasis,
    performanceEvidenceStatus: record.evidenceState.performanceEvidenceStatus,
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
    tradeClawTaskId: record.evidenceState.taskId ?? '',
    tradeClawEvidencePath: record.evidenceState.evidencePath ?? '',
    tradeClawArtifactPath: record.evidenceState.artifactPath ?? '',
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

export function buildResearchIntakeEvidenceCsv(): string {
  return researchIntakeCsvRowsToString(
    buildResearchIntakeCsvRows(buildResearchIntakePublicEvidencePayload()),
  );
}
