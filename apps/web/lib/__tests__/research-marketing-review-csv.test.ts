import {
  RESEARCH_MARKETING_REVIEW_CSV_COLUMNS,
  buildResearchMarketingReviewCsv,
  buildResearchMarketingReviewCsvRows,
  researchMarketingReviewCsvRowsToString,
} from '../research-marketing-review-csv';

const FOUR_DRAFTS_AVAILABLE_AT = '2026-08-29T14:59:59.999Z';

describe('admin research marketing-review CSV projection', () => {
  it('exports the complete available queue in chronological evidence order', () => {
    const rows = buildResearchMarketingReviewCsvRows(FOUR_DRAFTS_AVAILABLE_AT);

    expect(RESEARCH_MARKETING_REVIEW_CSV_COLUMNS).toEqual([
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
    ]);
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.queuePosition)).toEqual([1, 2, 3, 4]);
    expect(rows.map((row) => row.taskId)).toEqual([
      'TC-255',
      'TC-257',
      'TC-258',
      'TC-259',
    ]);
    expect(rows.map((row) => row.availableAt)).toEqual([
      '2026-08-29T04:55:27.000Z',
      '2026-08-29T08:29:58.000Z',
      '2026-08-29T09:36:14.000Z',
      '2026-08-29T12:47:51.000Z',
    ]);
    expect(rows.map((row) => row.verdict)).toEqual([
      'fail',
      'inconclusive',
      'fail',
      'fail',
    ]);
    expect(rows.map((row) => row.performanceEvidenceStatus)).toEqual([
      'modeled-historical-fail',
      'qa-only-no-performance-result',
      'modeled-historical-fail',
      'modeled-historical-fail',
    ]);
    expect(rows.map((row) => row.performanceGatesEvaluated)).toEqual([
      true,
      false,
      true,
      true,
    ]);
    expect(rows.some((row) => row.taskId === ('TC-256' as string))).toBe(false);
  });

  it('retains pre-loop and exact receipt provenance without inventing authority', () => {
    const rows = buildResearchMarketingReviewCsvRows(FOUR_DRAFTS_AVAILABLE_AT);

    expect(rows[0]).toMatchObject({
      taskId: 'TC-255',
      availabilityBasis: 'pre-loop-closure',
      cycleId: '',
    });
    expect(rows.slice(1).map((row) => row.cycleId)).toEqual([
      '2026-08-29T06:00:00.000Z/PT3H',
      '2026-08-29T09:00:00.000Z/PT3H',
      '2026-08-29T12:00:00.000Z/PT3H',
    ]);

    for (const row of rows) {
      expect(row).toMatchObject({
        workflowState: 'human-review-required',
        evidenceBasis: 'modeled-research',
        draftDisposition: 'human-review-draft-only',
        humanReviewRequired: true,
        publicationApproved: false,
        publishApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      });
      expect(row.candidateTitle).not.toBe('');
      expect(row.sourceUrl).toMatch(/^https:\/\//);
      expect(row.draftTitle).not.toBe('');
      expect(row.draftSummary).not.toBe('');
      expect(row.draftBody).not.toBe('');
      expect(row.performanceEvidenceLabel).not.toBe('');
      expect(row.performanceEvidenceMeaning).not.toBe('');
      expect(row.resultPath).toMatch(/^docs\/research\//);
      expect(row.artifactPath).toMatch(/^docs\/research\/experiments\//);
    }
  });

  it('is deterministic and does not reveal handoffs before their evidence time', () => {
    expect(buildResearchMarketingReviewCsvRows('2026-08-29T04:55:26.999Z')).toEqual([]);

    const first = buildResearchMarketingReviewCsv(FOUR_DRAFTS_AVAILABLE_AT);
    const second = buildResearchMarketingReviewCsv(FOUR_DRAFTS_AVAILABLE_AT);

    expect(second).toBe(first);
    expect(first.split('\r\n')).toHaveLength(5);
    expect(first.startsWith(`${RESEARCH_MARKETING_REVIEW_CSV_COLUMNS.join(',')}\r\n`)).toBe(true);
  });

  it('escapes structural text and neutralizes formulas without stringifying numbers', () => {
    const row = buildResearchMarketingReviewCsvRows(FOUR_DRAFTS_AVAILABLE_AT)[0];
    const csv = researchMarketingReviewCsvRowsToString([{
      ...row,
      queuePosition: -1,
      candidateTitle: '=IMPORTXML("https://example.invalid")',
      draftBody: 'first line,\r\n"second line"',
    }]);

    expect(csv.split('\r\n')[1].startsWith('-1,')).toBe(true);
    expect(csv).toContain('"\'=IMPORTXML(""https://example.invalid"")"');
    expect(csv).toContain('"first line,\r\n""second line"""');
  });
});
