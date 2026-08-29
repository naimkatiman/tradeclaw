import { createHash } from 'node:crypto';
import {
  RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS,
  buildResearchIntakeAdminEvidenceCsv,
  buildResearchIntakeAdminEvidenceCsvRows,
  researchIntakeAdminEvidenceCsvRowsToString,
} from '../research-intake-admin-evidence-csv';

const RECEIPT_AVAILABLE_AT = '2026-08-29T18:00:40.000Z';
const TASK_ORDER = ['TC-259', 'TC-257', 'TC-255', 'TC-261', 'TC-258', 'TC-256', 'TC-260'];

describe('protected research evidence CSV projection', () => {
  it('exports every examined candidate in pinned source order with the public evidence fields', () => {
    const rows = buildResearchIntakeAdminEvidenceCsvRows(RECEIPT_AVAILABLE_AT);

    expect(RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS).toEqual([
      'evidencePosition',
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
    ]);
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.evidencePosition)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rows.map((row) => row.sourceOrder)).toEqual([22, 24, 32, 33, 34, 37, 61]);
    expect(rows.map((row) => row.tradeClawTaskId)).toEqual(TASK_ORDER);
    expect(rows.map((row) => row.performanceEvidenceStatus)).toEqual([
      'modeled-historical-fail',
      'qa-only-no-performance-result',
      'modeled-historical-fail',
      'source-audit-only-no-local-backtest',
      'modeled-historical-fail',
      'source-audit-only-no-local-backtest',
      'source-audit-only-no-local-backtest',
    ]);
  });

  it('joins observation-visible receipts, handoffs, paths, and fail-closed controls', () => {
    const rows = buildResearchIntakeAdminEvidenceCsvRows(RECEIPT_AVAILABLE_AT);
    const byTask = new Map(rows.map((row) => [row.tradeClawTaskId, row]));
    const tc255 = byTask.get('TC-255');
    const tc261 = byTask.get('TC-261');
    if (!tc255 || !tc261) throw new Error('Evidence CSV fixture is incomplete');

    expect(rows.map((row) => row.observedAt)).toEqual(Array(7).fill(RECEIPT_AVAILABLE_AT));
    expect(rows.map((row) => row.currentWindowId)).toEqual(
      Array(7).fill('2026-08-29T18:00:00.000Z/PT3H'),
    );
    expect(rows.map((row) => row.currentWindowStatus)).toEqual(Array(7).fill('complete'));
    expect(rows.map((row) => row.receiptCount)).toEqual([1, 1, 0, 1, 1, 1, 1]);
    expect(rows.map((row) => row.marketingHandoffTaskId)).toEqual([
      'TC-259', 'TC-257', 'TC-255', '', 'TC-258', '', '',
    ]);

    expect(tc255).toMatchObject({
      receiptCount: 0,
      receiptsJson: '[]',
      latestReceiptTaskId: '',
      marketingHandoffTaskId: 'TC-255',
      marketingHandoffBasis: 'pre-loop-closure',
      marketingWorkflowState: 'human-review-required',
      marketingDraftDisposition: 'human-review-draft-only',
      humanReviewRequired: true,
    });
    expect(tc255.marketingDraftTitle).not.toBe('');
    expect(tc255.marketingDraftSummary).not.toBe('');

    expect(tc261).toMatchObject({
      sourceOrder: 33,
      stage: 'source-audited',
      verdict: 'not-tested',
      tradeClawEvidencePath: 'docs/research/2026-08-29-crypto-factor-investing-source-audit.md',
      tradeClawArtifactPath: '',
      receiptCount: 1,
      latestReceiptTaskId: 'TC-261',
      latestReceiptCycleId: '2026-08-29T18:00:00.000Z/PT3H',
      latestReceiptRecordedAt: RECEIPT_AVAILABLE_AT,
      marketingHandoffTaskId: '',
      marketingDraftDisposition: '',
      humanReviewRequired: false,
    });
    expect(JSON.parse(tc261.receiptsJson)).toEqual([
      expect.objectContaining({
        taskId: 'TC-261',
        recordedAt: RECEIPT_AVAILABLE_AT,
        publicationApproved: false,
        tradingApproved: false,
        externalActions: 'none',
      }),
    ]);

    for (const row of rows) {
      expect(row.adminCandidatePath).toBe(`/api/admin/research-intake/${row.id}`);
      expect(row.publicCandidatePath).toBe(`/api/research/intake/${row.id}`);
      expect(row).toMatchObject({
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        tradingApproved: false,
        automaticTrading: false,
        externalActions: 'none',
      });
    }
  });

  it('does not expose the TC-261 receipt before its exact availability instant', () => {
    const before = buildResearchIntakeAdminEvidenceCsvRows('2026-08-29T18:00:39.999Z');
    const at = buildResearchIntakeAdminEvidenceCsvRows(RECEIPT_AVAILABLE_AT);
    const beforeTc261 = before.find((row) => row.tradeClawTaskId === 'TC-261');
    const atTc261 = at.find((row) => row.tradeClawTaskId === 'TC-261');
    if (!beforeTc261 || !atTc261) throw new Error('TC-261 CSV fixture is missing');

    expect(beforeTc261).toMatchObject({
      currentWindowStatus: 'awaiting-receipt',
      receiptCount: 0,
      receiptsJson: '[]',
      latestReceiptTaskId: '',
    });
    expect(atTc261).toMatchObject({
      currentWindowStatus: 'complete',
      receiptCount: 1,
      latestReceiptTaskId: 'TC-261',
    });
  });

  it('serializes deterministically and neutralizes formulas without stringifying numbers', () => {
    const first = buildResearchIntakeAdminEvidenceCsv(RECEIPT_AVAILABLE_AT);
    const second = buildResearchIntakeAdminEvidenceCsv(RECEIPT_AVAILABLE_AT);
    const row = buildResearchIntakeAdminEvidenceCsvRows(RECEIPT_AVAILABLE_AT)[0];
    const hostile = researchIntakeAdminEvidenceCsvRowsToString([{
      ...row,
      evidencePosition: -1,
      title: '=IMPORTXML("https://example.invalid")',
      marketingDraftSummary: '+SUM(1,2)',
      adminCandidatePath: '@admin-command',
    }]);

    expect(second).toBe(first);
    expect(RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS).toHaveLength(50);
    expect(Buffer.byteLength(first, 'utf8')).toBe(14_533);
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      '49c32887d5edaf402a9108ec6351e8acb2a5d567b5367df178250482b4542053',
    );
    expect(first.split('\r\n')).toHaveLength(8);
    expect(first.startsWith(`${RESEARCH_INTAKE_ADMIN_EVIDENCE_CSV_COLUMNS.join(',')}\r\n`))
      .toBe(true);
    expect(hostile.split('\r\n')[1].startsWith('-1,')).toBe(true);
    expect(hostile).toContain('"\'=IMPORTXML(""https://example.invalid"")"');
    expect(hostile).toContain('"\'+SUM(1,2)"');
    expect(hostile).toContain("'@admin-command");
  });
});
