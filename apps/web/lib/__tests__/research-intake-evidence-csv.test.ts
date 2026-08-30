import {
  RESEARCH_INTAKE_CSV_COLUMNS,
  buildResearchIntakeCsvRows,
  buildResearchIntakeEvidenceCsv,
  researchIntakeCsvRowsToString,
} from '../research-intake-csv';
import { buildResearchIntakePublicEvidencePayload } from '../research-intake-public';

describe('public research evidence CSV projection', () => {
  it('exports every evidence overlay in pinned source order through the shared schema', () => {
    const rows = buildResearchIntakeCsvRows(buildResearchIntakePublicEvidencePayload());
    const csv = buildResearchIntakeEvidenceCsv();

    expect(rows).toHaveLength(13);
    expect(rows.map((row) => row.tradeClawTaskId)).toEqual([
      'TC-262',
      'TC-259',
      'TC-257',
      'TC-264',
      'TC-265',
      'TC-255',
      'TC-261',
      'TC-258',
      'TC-256',
      'TC-263',
      'TC-267',
      'TC-266',
      'TC-260',
    ]);
    expect(rows.map((row) => row.sourceOrder)).toEqual([7, 22, 24, 27, 28, 32, 33, 34, 37, 39, 42, 60, 61]);
    expect(rows.map((row) => row.performanceEvidenceStatus)).toEqual([
      'source-audit-only-no-local-backtest',
      'modeled-historical-fail',
      'qa-only-no-performance-result',
      'source-audit-only-no-local-backtest',
      'source-audit-only-no-local-backtest',
      'modeled-historical-fail',
      'source-audit-only-no-local-backtest',
      'modeled-historical-fail',
      'source-audit-only-no-local-backtest',
      'source-audit-only-no-local-backtest',
      'source-audit-only-no-local-backtest',
      'source-audit-only-no-local-backtest',
      'source-audit-only-no-local-backtest',
    ]);
    expect(rows).not.toContainEqual(
      expect.objectContaining({ performanceEvidenceStatus: 'modeled-historical-pass' }),
    );
    expect(rows).not.toContainEqual(
      expect.objectContaining({ performanceEvidenceStatus: 'not-tested' }),
    );
    expect(csv).toBe(researchIntakeCsvRowsToString(rows));
  });

  it('retains source provenance, canonical evidence paths, and false authority per row', () => {
    const rows = buildResearchIntakeCsvRows(buildResearchIntakePublicEvidencePayload());

    for (const row of rows) {
      expect(row.sourceCatalogRepository).toBe(
        'https://github.com/paperswithbacktest/awesome-systematic-trading',
      );
      expect(row.sourceCatalogCommit).toBe('d9c98521c76662d5eae03ab97a4fc721d010dde3');
      expect(row.sourceCatalogReadmeSha256).toBe(
        '67f4c4963ce10ab5ebdc7a0b1eb578c179cf151e1ddaad990cd428a231b2b29a',
      );
      expect(row.sourceCatalogSnapshotDate).toBe('2026-08-29');
      expect(row.upstreamPerformanceBasis).toBe('gross-of-trading-costs');
      expect(row.tradeClawTreatment).toBe('discovery-only');
      expect(row.tradeClawTaskId).not.toBe('');
      expect(row.tradeClawEvidencePath).not.toBe('');
      expect(row.grantsPublicationAuthority).toBe(false);
      expect(row.grantsTradingAuthority).toBe(false);
    }
  });

  it('serializes deterministically as one shared header plus thirteen rows without protected state', () => {
    const first = buildResearchIntakeEvidenceCsv();
    const second = buildResearchIntakeEvidenceCsv();

    expect(second).toBe(first);
    expect(first.split('\r\n')).toHaveLength(14);
    expect(first.startsWith(RESEARCH_INTAKE_CSV_COLUMNS.join(','))).toBe(true);
    expect(RESEARCH_INTAKE_CSV_COLUMNS).toHaveLength(25);
    expect(first).not.toMatch(
      /(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)/,
    );
  });
});
