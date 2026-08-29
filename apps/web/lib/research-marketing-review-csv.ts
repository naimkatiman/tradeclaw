import {
  SYSTEMATIC_RESEARCH_INTAKE,
  type ResearchIntakeRecord,
} from './research-intake';
import {
  getResearchLoopMarketingReview,
  type ResearchLoopMarketingHandoff,
  type ResearchLoopMarketingTaskId,
} from './research-loop-marketing';
import {
  buildResearchIntakeEvidenceState,
  type ResearchIntakeEvidenceState,
} from './research-intake-evidence-state';

export const RESEARCH_MARKETING_REVIEW_CSV_COLUMNS = [
  'queuePosition',
  'taskId',
  'candidateId',
  'candidateTitle',
  'sourceUrl',
  'availableAt',
  'availabilityBasis',
  'cycleId',
  'workflowState',
  'stage',
  'verdict',
  'costStatus',
  'performanceEvidenceStatus',
  'performanceEvidenceLabel',
  'performanceEvidenceMeaning',
  'performanceGatesEvaluated',
  'draftTitle',
  'draftSummary',
  'draftBody',
  'evidenceBasis',
  'draftDisposition',
  'resultPath',
  'artifactPath',
  'humanReviewRequired',
  'publicationApproved',
  'publishApproved',
  'automaticPublication',
  'automaticPosting',
  'grantsTradingAuthority',
  'externalActions',
] as const;

export interface ResearchMarketingReviewCsvRow {
  queuePosition: number;
  taskId: ResearchLoopMarketingTaskId;
  candidateId: string;
  candidateTitle: string;
  sourceUrl: string;
  availableAt: string;
  availabilityBasis: ResearchLoopMarketingHandoff['basis'];
  cycleId: string;
  workflowState: ResearchLoopMarketingHandoff['workflowState'];
  stage: ResearchIntakeRecord['stage'];
  verdict: ResearchIntakeRecord['verdict'];
  costStatus: ResearchIntakeRecord['costStatus'];
  performanceEvidenceStatus: ResearchIntakeEvidenceState['performanceEvidenceStatus'];
  performanceEvidenceLabel: ResearchIntakeEvidenceState['label'];
  performanceEvidenceMeaning: ResearchIntakeEvidenceState['meaning'];
  performanceGatesEvaluated: ResearchIntakeEvidenceState['performanceGatesEvaluated'];
  draftTitle: string;
  draftSummary: string;
  draftBody: string;
  evidenceBasis: ResearchLoopMarketingHandoff['draft']['evidenceBasis'];
  draftDisposition: ResearchLoopMarketingHandoff['draft']['disposition'];
  resultPath: string;
  artifactPath: string;
  humanReviewRequired: true;
  publicationApproved: false;
  publishApproved: false;
  automaticPublication: false;
  automaticPosting: false;
  grantsTradingAuthority: false;
  externalActions: ResearchLoopMarketingHandoff['externalActions'];
}

type CsvCell = string | number | boolean;

function recordForHandoff(handoff: ResearchLoopMarketingHandoff): ResearchIntakeRecord {
  const record = SYSTEMATIC_RESEARCH_INTAKE.find(
    (candidate) => candidate.id === handoff.candidateId,
  );
  if (!record || record.tradeClawEvidence?.taskId !== handoff.taskId) {
    throw new Error(`marketing review export ${handoff.taskId} has no matching evidence record`);
  }
  return record;
}

function toCsvRow(
  handoff: ResearchLoopMarketingHandoff,
  queuePosition: number,
  controls: ReturnType<typeof getResearchLoopMarketingReview>['controls'],
): ResearchMarketingReviewCsvRow {
  const record = recordForHandoff(handoff);
  const evidenceState = buildResearchIntakeEvidenceState(record);

  return {
    queuePosition,
    taskId: handoff.taskId,
    candidateId: handoff.candidateId,
    candidateTitle: record.title,
    sourceUrl: record.sourceUrl,
    availableAt: handoff.availableAt,
    availabilityBasis: handoff.basis,
    cycleId: handoff.cycleId ?? '',
    workflowState: handoff.workflowState,
    stage: record.stage,
    verdict: record.verdict,
    costStatus: record.costStatus,
    performanceEvidenceStatus: evidenceState.performanceEvidenceStatus,
    performanceEvidenceLabel: evidenceState.label,
    performanceEvidenceMeaning: evidenceState.meaning,
    performanceGatesEvaluated: evidenceState.performanceGatesEvaluated,
    draftTitle: handoff.draft.title,
    draftSummary: handoff.draft.summary,
    draftBody: handoff.draft.body,
    evidenceBasis: handoff.draft.evidenceBasis,
    draftDisposition: handoff.draft.disposition,
    resultPath: handoff.draft.resultPath,
    artifactPath: handoff.draft.artifactPath,
    humanReviewRequired: controls.humanReviewRequired,
    publicationApproved: handoff.publicationApproved,
    publishApproved: handoff.draft.publishApproved,
    automaticPublication: controls.automaticPublication,
    automaticPosting: controls.automaticPosting,
    grantsTradingAuthority: false,
    externalActions: handoff.externalActions,
  };
}

/**
 * Flatten only the complete review queue available at the observation time.
 * This export intentionally has no search, filtering, or pagination input.
 */
export function buildResearchMarketingReviewCsvRows(
  at: Date | string | number = new Date(),
): readonly ResearchMarketingReviewCsvRow[] {
  const review = getResearchLoopMarketingReview(at);
  return review.handoffs.map((handoff, index) => (
    toCsvRow(handoff, index + 1, review.controls)
  ));
}

function csvCell(value: CsvCell): string {
  let raw = String(value);

  // Keep text from becoming an executable spreadsheet formula. Numeric values
  // bypass this branch so a real negative number remains machine-sortable.
  if (typeof value === 'string' && /^[\u0000-\u0020]*[=+\-@]/.test(value)) {
    raw = `'${value}`;
  }

  return /[",\r\n]/.test(raw)
    ? `"${raw.replace(/"/g, '""')}"`
    : raw;
}

export function researchMarketingReviewCsvRowsToString(
  rows: readonly ResearchMarketingReviewCsvRow[],
): string {
  return [
    RESEARCH_MARKETING_REVIEW_CSV_COLUMNS.join(','),
    ...rows.map((row) => (
      RESEARCH_MARKETING_REVIEW_CSV_COLUMNS
        .map((column) => csvCell(row[column]))
        .join(',')
    )),
  ].join('\r\n');
}

export function buildResearchMarketingReviewCsv(
  at: Date | string | number = new Date(),
): string {
  return researchMarketingReviewCsvRowsToString(
    buildResearchMarketingReviewCsvRows(at),
  );
}
