import { buildResearchIntakeAdminPayload } from '../research-intake-admin';
import {
  RESEARCH_INTAKE_CSV_COLUMNS,
  buildResearchIntakeCsvRows,
} from '../research-intake-csv';
import { buildResearchIntakePublicPayload } from '../research-intake-public';
import { openApiSpec } from '../openapi';

interface EvidenceStateView {
  performanceEvidenceStatus: string;
  label: string;
  meaning: string;
  performanceGatesEvaluated: boolean;
  taskId: string | null;
  evidencePath: string | null;
  artifactPath: string | null;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

interface OpenApiSchemaView {
  required?: readonly string[];
  properties?: Record<string, OpenApiSchemaView>;
  enum?: readonly string[];
  const?: unknown;
}

function evidenceState(record: unknown): EvidenceStateView | undefined {
  return (record as { evidenceState?: EvidenceStateView }).evidenceState;
}

function publicRecordByTask(taskId: string) {
  const record = buildResearchIntakePublicPayload().records.find(
    (candidate) => (
      candidate.tradeClawEvidence?.taskId === taskId
      || candidate.tradeClawSourceAudit?.taskId === taskId
    ),
  );
  if (!record) throw new Error(`Missing public research intake record for ${taskId}`);
  return record;
}

describe('shared research candidate evidence state', () => {
  it('gives discovery, source-audit, QA-only, and failed replication records distinct meanings', () => {
    const discovery = buildResearchIntakePublicPayload().records.find(
      (record) => record.tradeClawSourceAudit === null && record.tradeClawEvidence === null,
    );
    if (!discovery) throw new Error('Missing discovery-only fixture');

    expect(evidenceState(discovery)).toEqual({
      performanceEvidenceStatus: 'not-tested',
      label: 'Not tested by TradeClaw',
      meaning:
        'Only upstream gross discovery metadata is available; TradeClaw has not audited or performance-tested this candidate.',
      performanceGatesEvaluated: false,
      taskId: null,
      evidencePath: null,
      artifactPath: null,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    expect(evidenceState(publicRecordByTask('TC-262'))).toEqual({
      performanceEvidenceStatus: 'source-audit-only-no-local-backtest',
      label: 'Source audit only',
      meaning:
        'Only a TradeClaw source audit is available; no local backtest ran, so there is no performance conclusion.',
      performanceGatesEvaluated: false,
      taskId: 'TC-262',
      evidencePath: 'docs/research/2026-08-30-most-diversified-portfolio-source-audit.md',
      artifactPath: null,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    expect(evidenceState(publicRecordByTask('TC-257'))).toEqual({
      performanceEvidenceStatus: 'qa-only-no-performance-result',
      label: 'QA complete; no performance result',
      meaning:
        'TradeClaw completed replication QA but did not evaluate performance gates, so there is no performance conclusion.',
      performanceGatesEvaluated: false,
      taskId: 'TC-257',
      evidencePath:
        'docs/research/2026-08-29-end-of-month-treasury-replication-result.md',
      artifactPath:
        'docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    expect(evidenceState(publicRecordByTask('TC-255'))).toEqual({
      performanceEvidenceStatus: 'modeled-historical-fail',
      label: 'Modeled historical fail',
      meaning:
        'A modeled historical TradeClaw replication failed its frozen gates; this is not live performance.',
      performanceGatesEvaluated: true,
      taskId: 'TC-255',
      evidencePath:
        'docs/research/2026-08-29-external-multi-timeframe-replication-result.md',
      artifactPath:
        'docs/research/experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('uses the exact same evidence-state projection for public and protected records', () => {
    const publicRecords = buildResearchIntakePublicPayload().records;
    const adminRecords = buildResearchIntakeAdminPayload(
      new URLSearchParams('limit=100'),
      '2026-08-29T21:30:25.022Z',
    ).records;

    expect(publicRecords).toHaveLength(61);
    expect(adminRecords).toHaveLength(61);
    expect(publicRecords.every((record) => evidenceState(record) !== undefined)).toBe(true);
    expect(adminRecords.every((record) => evidenceState(record) !== undefined)).toBe(true);
    expect(adminRecords.map((record) => evidenceState(record))).toEqual(
      publicRecords.map((record) => evidenceState(record)),
    );
  });

  it('reuses the shared status and paths without changing the frozen CSV schema', () => {
    const publicRecords = buildResearchIntakePublicPayload().records;
    const rows = buildResearchIntakeCsvRows();

    expect(RESEARCH_INTAKE_CSV_COLUMNS).not.toContain('evidenceState');
    expect(rows.map((row) => row.performanceEvidenceStatus)).toEqual(
      publicRecords.map((record) => evidenceState(record)?.performanceEvidenceStatus),
    );
    expect(rows.map((row) => row.tradeClawEvidencePath)).toEqual(
      publicRecords.map((record) => evidenceState(record)?.evidencePath ?? ''),
    );
    expect(rows.map((row) => row.tradeClawArtifactPath)).toEqual(
      publicRecords.map((record) => evidenceState(record)?.artifactPath ?? ''),
    );
  });

  it('documents the complete public evidence-state shape and false authority', () => {
    const spec = openApiSpec as {
      components?: { schemas?: Record<string, OpenApiSchemaView> };
    };
    const schemas = spec.components?.schemas ?? {};
    const recordSchema = schemas.ResearchIntakePublicRecord;
    const stateSchema = recordSchema.properties?.evidenceState;

    expect(recordSchema.required).toContain('evidenceState');
    expect(stateSchema?.required).toEqual([
      'performanceEvidenceStatus',
      'label',
      'meaning',
      'performanceGatesEvaluated',
      'taskId',
      'evidencePath',
      'artifactPath',
      'grantsPublicationAuthority',
      'grantsTradingAuthority',
    ]);
    expect(stateSchema?.properties?.performanceEvidenceStatus.enum).toEqual([
      'not-tested',
      'source-audit-only-no-local-backtest',
      'qa-only-no-performance-result',
      'modeled-historical-pass',
      'modeled-historical-fail',
      'modeled-historical-inconclusive',
    ]);
    expect(stateSchema?.properties?.grantsPublicationAuthority.const).toBe(false);
    expect(stateSchema?.properties?.grantsTradingAuthority.const).toBe(false);
  });
});
