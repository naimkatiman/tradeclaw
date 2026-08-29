import {
  buildResearchIntakeAdminEvidencePayload,
  type ResearchIntakeAdminEvidencePayload,
} from './research-intake-admin';
import {
  RESEARCH_INTAKE_CSV_COLUMNS,
  buildResearchIntakeCsvRows,
  type ResearchIntakeCsvRow,
} from './research-intake-csv';
import { buildResearchIntakePublicEvidencePayload } from './research-intake-public';

export const RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS = [
  'evidencePosition',
  ...RESEARCH_INTAKE_CSV_COLUMNS,
  'observedAt',
  'currentWindowId',
  'currentWindowStatus',
  'receiptCount',
  'receiptsJson',
  'latestReceiptTaskId',
  'latestReceiptCycleId',
  'latestReceiptRecordedAt',
  'marketingHandoffTaskId',
  'marketingHandoffAvailableAt',
  'marketingHandoffBasis',
  'marketingWorkflowState',
  'marketingDraftTitle',
  'marketingDraftSummary',
  'marketingDraftDisposition',
  'humanReviewRequired',
  'adminCandidatePath',
  'publicCandidatePath',
  'publicationApproved',
  'automaticPublication',
  'automaticPosting',
  'tradingApproved',
  'automaticTrading',
  'externalActions',
] as const;

export interface ResearchIntakeAdminEvidenceCsvRow extends ResearchIntakeCsvRow {
  evidencePosition: number;
  observedAt: string;
  currentWindowId: string;
  currentWindowStatus: ResearchIntakeAdminEvidencePayload['researchLoop']['currentWindowStatus'];
  receiptCount: number;
  receiptsJson: string;
  latestReceiptTaskId: string;
  latestReceiptCycleId: string;
  latestReceiptRecordedAt: string;
  marketingHandoffTaskId: string;
  marketingHandoffAvailableAt: string;
  marketingHandoffBasis: string;
  marketingWorkflowState: string;
  marketingDraftTitle: string;
  marketingDraftSummary: string;
  marketingDraftDisposition: string;
  humanReviewRequired: boolean;
  adminCandidatePath: string;
  publicCandidatePath: string;
  publicationApproved: false;
  automaticPublication: false;
  automaticPosting: false;
  tradingApproved: false;
  automaticTrading: false;
  externalActions: 'none';
}

type CsvCell = string | number | boolean;

/**
 * Flatten the protected evidence desk at one observation instant. The canonical
 * admin JSON remains the complete nested record; this projection carries every
 * examined row plus enough exact receipt and handoff state for spreadsheet audit.
 */
export function buildResearchIntakeAdminEvidenceCsvRows(
  at: Date | string | number = new Date(),
): readonly ResearchIntakeAdminEvidenceCsvRow[] {
  const adminPayload = buildResearchIntakeAdminEvidencePayload(at);
  const publicRows = buildResearchIntakeCsvRows(buildResearchIntakePublicEvidencePayload());
  const publicRowsById = new Map(publicRows.map((row) => [row.id, row]));

  if (publicRowsById.size !== adminPayload.items.length) {
    throw new Error('admin evidence export does not match the public evidence index');
  }

  return adminPayload.items.map((item) => {
    const publicRow = publicRowsById.get(item.record.id);
    const taskId = item.record.tradeClawEvidence?.taskId
      ?? item.record.tradeClawSourceAudit?.taskId;
    if (!publicRow || !taskId || publicRow.tradeClawTaskId !== taskId) {
      throw new Error(`admin evidence export cannot reconcile ${item.record.id}`);
    }

    const { latestReceipt, marketingHandoff, controls } = item.candidateWorkflow;

    return {
      evidencePosition: item.evidencePosition,
      ...publicRow,
      observedAt: adminPayload.researchLoop.observedAt,
      currentWindowId: adminPayload.researchLoop.currentWindow.id,
      currentWindowStatus: adminPayload.researchLoop.currentWindowStatus,
      receiptCount: item.candidateWorkflow.receiptCount,
      receiptsJson: JSON.stringify(item.candidateWorkflow.receipts),
      latestReceiptTaskId: latestReceipt?.taskId ?? '',
      latestReceiptCycleId: latestReceipt?.cycleId ?? '',
      latestReceiptRecordedAt: latestReceipt?.recordedAt ?? '',
      marketingHandoffTaskId: marketingHandoff?.taskId ?? '',
      marketingHandoffAvailableAt: marketingHandoff?.availableAt ?? '',
      marketingHandoffBasis: marketingHandoff?.basis ?? '',
      marketingWorkflowState: marketingHandoff?.workflowState ?? '',
      marketingDraftTitle: marketingHandoff?.draft.title ?? '',
      marketingDraftSummary: marketingHandoff?.draft.summary ?? '',
      marketingDraftDisposition: marketingHandoff?.draft.disposition ?? '',
      humanReviewRequired: controls.humanReviewRequired,
      adminCandidatePath: item.links.adminCandidate,
      publicCandidatePath: item.links.publicCandidate,
      publicationApproved: controls.publicationApproved,
      automaticPublication: controls.automaticPublication,
      automaticPosting: controls.automaticPosting,
      tradingApproved: controls.tradingApproved,
      automaticTrading: controls.automaticTrading,
      externalActions: controls.externalActions,
    };
  });
}

function csvCell(value: CsvCell): string {
  let raw = String(value);

  // Preserve real numeric negatives while preventing text cells from becoming
  // executable formulas in common spreadsheet programs.
  if (typeof value === 'string' && /^[\u0000-\u0020]*[=+\-@]/.test(value)) {
    raw = `'${value}`;
  }

  return /[",\r\n]/.test(raw)
    ? `"${raw.replace(/"/g, '""')}"`
    : raw;
}

export function researchIntakeAdminEvidenceCsvRowsToString(
  rows: readonly ResearchIntakeAdminEvidenceCsvRow[],
): string {
  return [
    RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS.join(','),
    ...rows.map((row) => (
      RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS
        .map((column) => csvCell(row[column]))
        .join(',')
    )),
  ].join('\r\n');
}

export function buildResearchIntakeAdminEvidenceCsv(
  at: Date | string | number = new Date(),
): string {
  return researchIntakeAdminEvidenceCsvRowsToString(
    buildResearchIntakeAdminEvidenceCsvRows(at),
  );
}
