import { SYSTEMATIC_RESEARCH_INTAKE } from '../research-intake';
import {
  RESEARCH_INTAKE_CSV_COLUMNS,
  buildResearchIntakeCsvRows,
  researchIntakeCsvRowsToString,
} from '../research-intake-csv';

describe('public research intake CSV projection', () => {
  it('uses the frozen 25-column spreadsheet schema in exact source order', () => {
    const rows = buildResearchIntakeCsvRows();

    expect(RESEARCH_INTAKE_CSV_COLUMNS).toEqual([
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
    ]);
    expect(RESEARCH_INTAKE_CSV_COLUMNS).toHaveLength(25);
    expect(rows).toHaveLength(61);
    expect(rows.map((row) => row.id)).toEqual(
      SYSTEMATIC_RESEARCH_INTAKE.map((record) => record.id),
    );
    expect(rows.map((row) => row.sourceOrder)).toEqual(
      Array.from({ length: 61 }, (_, index) => index + 1),
    );
  });

  it('keeps discovery, source-audit, QA-only, and failed replication evidence distinct', () => {
    const rows = buildResearchIntakeCsvRows();
    const counts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.performanceEvidenceStatus] = (acc[row.performanceEvidenceStatus] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts).toEqual({
      'not-tested': 52,
      'source-audit-only-no-local-backtest': 5,
      'modeled-historical-fail': 3,
      'qa-only-no-performance-result': 1,
    });

    const sourceNoGos = rows.filter(
      (row) => row.performanceEvidenceStatus === 'source-audit-only-no-local-backtest',
    );
    const sourceNoGo = rows.find((row) => row.tradeClawTaskId === 'TC-256');
    const riskBasedSourceNoGo = rows.find((row) => row.tradeClawTaskId === 'TC-260');
    const cryptoFactorSourceNoGo = rows.find((row) => row.tradeClawTaskId === 'TC-261');
    const mdpSourceNoGo = rows.find((row) => row.tradeClawTaskId === 'TC-262');
    const qaOnly = rows.find((row) => row.tradeClawTaskId === 'TC-257');

    expect(sourceNoGo).toEqual(expect.objectContaining({
      evidenceBasis: 'tradeclaw-source-audit-only',
      performanceEvidenceStatus: 'source-audit-only-no-local-backtest',
      verdict: 'not-tested',
      tradeClawArtifactPath: '',
    }));
    expect(sourceNoGos).toHaveLength(5);
    expect(riskBasedSourceNoGo).toEqual(expect.objectContaining({
      evidenceBasis: 'tradeclaw-source-audit-only',
      performanceEvidenceStatus: 'source-audit-only-no-local-backtest',
      verdict: 'not-tested',
      tradeClawArtifactPath: '',
    }));
    expect(cryptoFactorSourceNoGo).toEqual(expect.objectContaining({
      sourceOrder: 33,
      evidenceBasis: 'tradeclaw-source-audit-only',
      performanceEvidenceStatus: 'source-audit-only-no-local-backtest',
      verdict: 'not-tested',
      tradeClawEvidencePath: 'docs/research/2026-08-29-crypto-factor-investing-source-audit.md',
      tradeClawArtifactPath: '',
    }));
    expect(mdpSourceNoGo).toEqual(expect.objectContaining({
      sourceOrder: 7,
      evidenceBasis: 'tradeclaw-source-audit-only',
      performanceEvidenceStatus: 'source-audit-only-no-local-backtest',
      verdict: 'not-tested',
      tradeClawEvidencePath:
        'docs/research/2026-08-30-most-diversified-portfolio-source-audit.md',
      tradeClawArtifactPath: '',
    }));
    expect(qaOnly).toEqual(expect.objectContaining({
      evidenceBasis: 'tradeclaw-replication-record',
      performanceEvidenceStatus: 'qa-only-no-performance-result',
      verdict: 'inconclusive',
    }));
  });

  it('repeats provenance and false authority boundaries on every portable row', () => {
    const rows = buildResearchIntakeCsvRows();

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
      expect(row.grantsPublicationAuthority).toBe(false);
      expect(row.grantsTradingAuthority).toBe(false);
    }
  });

  it('serializes deterministically and omits every protected workflow field', () => {
    const first = researchIntakeCsvRowsToString(buildResearchIntakeCsvRows());
    const second = researchIntakeCsvRowsToString(buildResearchIntakeCsvRows());

    expect(second).toBe(first);
    expect(first.split('\r\n')).toHaveLength(62);
    expect(first.startsWith(RESEARCH_INTAKE_CSV_COLUMNS.join(','))).toBe(true);
    expect(first).not.toMatch(
      /(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)/,
    );
  });

  it('escapes structural text and neutralizes formulas without stringifying negative numbers', () => {
    const [base] = buildResearchIntakeCsvRows();
    const csv = researchIntakeCsvRowsToString([
      {
        ...base,
        id: 'candidate,quoted',
        title: '=HYPERLINK("https://example.invalid")',
        tradeClawEvidencePath: 'docs/a,\r\n"b".md',
        upstreamTStatistic: -1.5,
      },
    ]);

    expect(csv).toContain('"candidate,quoted"');
    expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
    expect(csv).toContain('"docs/a,\r\n""b"".md"');
    expect(csv).toContain(',-1.5,');
    expect(csv).not.toContain("'-1.5");
  });
});
