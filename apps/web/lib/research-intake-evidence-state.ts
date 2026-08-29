import type { ResearchIntakeRecord } from './research-intake';

export type ResearchIntakePerformanceEvidenceStatus =
  | 'not-tested'
  | 'source-audit-only-no-local-backtest'
  | 'qa-only-no-performance-result'
  | 'modeled-historical-pass'
  | 'modeled-historical-fail'
  | 'modeled-historical-inconclusive';

export interface ResearchIntakeEvidenceState {
  performanceEvidenceStatus: ResearchIntakePerformanceEvidenceStatus;
  label: string;
  meaning: string;
  performanceGatesEvaluated: boolean;
  taskId: string | null;
  evidencePath: string | null;
  artifactPath: string | null;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

const EVIDENCE_STATUS_COPY: Readonly<
  Record<
    ResearchIntakePerformanceEvidenceStatus,
    Readonly<Pick<ResearchIntakeEvidenceState, 'label' | 'meaning'>>
  >
> = Object.freeze({
  'not-tested': Object.freeze({
    label: 'Not tested by TradeClaw',
    meaning:
      'Only upstream gross discovery metadata is available; TradeClaw has not audited or performance-tested this candidate.',
  }),
  'source-audit-only-no-local-backtest': Object.freeze({
    label: 'Source audit only',
    meaning:
      'Only a TradeClaw source audit is available; no local backtest ran, so there is no performance conclusion.',
  }),
  'qa-only-no-performance-result': Object.freeze({
    label: 'QA complete; no performance result',
    meaning:
      'TradeClaw completed replication QA but did not evaluate performance gates, so there is no performance conclusion.',
  }),
  'modeled-historical-pass': Object.freeze({
    label: 'Modeled historical pass',
    meaning:
      'A modeled historical TradeClaw replication passed its frozen gates; this is not live performance.',
  }),
  'modeled-historical-fail': Object.freeze({
    label: 'Modeled historical fail',
    meaning:
      'A modeled historical TradeClaw replication failed its frozen gates; this is not live performance.',
  }),
  'modeled-historical-inconclusive': Object.freeze({
    label: 'Modeled historical inconclusive',
    meaning:
      'A modeled historical TradeClaw replication was inconclusive under its frozen gates; this is not live performance.',
  }),
});

function performanceEvidenceStatus(
  record: ResearchIntakeRecord,
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

  throw new Error(`replication record ${record.id} cannot expose not-tested performance`);
}

export function buildResearchIntakeEvidenceState(
  record: ResearchIntakeRecord,
): ResearchIntakeEvidenceState {
  const status = performanceEvidenceStatus(record);
  const copy = EVIDENCE_STATUS_COPY[status];
  const evidence = record.tradeClawEvidence;
  const sourceAudit = record.tradeClawSourceAudit;

  return {
    performanceEvidenceStatus: status,
    label: copy.label,
    meaning: copy.meaning,
    performanceGatesEvaluated: status.startsWith('modeled-historical-'),
    taskId: evidence?.taskId ?? sourceAudit?.taskId ?? null,
    evidencePath: evidence?.resultPath ?? sourceAudit?.researchPath ?? null,
    artifactPath: evidence?.artifactPath ?? null,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
  };
}
