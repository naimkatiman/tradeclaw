import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

import { assertAdminApi } from '../../../../../lib/admin-gate';
import { SYSTEMATIC_RESEARCH_INTAKE } from '../../../../../lib/research-intake';
import { GET } from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;

function request(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research-intake${query}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake', () => {
  it('authenticates before parsing and returns no intake detail to denied callers', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await GET(request('?unknown=would-normally-fail'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|catalog|source|query/i);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('returns the pinned admin read model in source order with private caching', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body).toMatchObject({
      schemaVersion: 1,
      access: {
        mode: 'admin-read-only',
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
      queryContract: {
        unknownParameters: 'rejected',
        duplicateParameters: 'rejected',
        parameters: {
          q: { maxLength: 120, default: null },
          assetClass: { default: 'all', values: expect.arrayContaining(['all', 'Equities']) },
          stage: { default: 'all', values: expect.arrayContaining(['all', 'replicated']) },
          verdict: { default: 'all', values: ['all', 'not-tested', 'pass', 'fail', 'inconclusive'] },
          sourceAuditDisposition: { default: 'all', values: ['all', 'advance', 'hold', 'no-go'] },
          page: { default: 1, minimum: 1, maximum: 10_000 },
          limit: { default: 25, minimum: 1, maximum: 100 },
        },
      },
      source: {
        commit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
        reportedPerformanceBasis: 'gross-of-trading-costs',
        tradeClawTreatment: 'discovery-only',
      },
      appliedFilters: {
        assetClass: 'all',
        stage: 'all',
        verdict: 'all',
        sourceAuditDisposition: 'all',
        page: 1,
        limit: 25,
      },
      filterFacets: {
        contract: {
          dimensionOrder: ['assetClass', 'stage', 'verdict', 'sourceAuditDisposition'],
          countingMode: 'disjunctive',
          scope: 'complete-catalog-before-pagination',
          queryAppliedToEveryCount: true,
          otherActiveFiltersApplied: true,
          ownDimensionReplaced: true,
          zeroCountOptionsIncluded: true,
          optionOrder: 'query-contract',
          paginationAffectsCounts: false,
        },
        dimensions: {
          assetClass: {
            label: 'Asset class',
            selected: 'all',
            options: expect.arrayContaining([
              {
                value: 'all',
                label: 'All asset classes',
                count: 61,
                selected: true,
                href: '/api/admin/research-intake?page=1&limit=25',
              },
              {
                value: 'Equities',
                label: 'Equities',
                count: 12,
                selected: false,
                href: '/api/admin/research-intake?assetClass=Equities&page=1&limit=25',
              },
            ]),
          },
          stage: {
            label: 'Research stage',
            selected: 'all',
            options: expect.arrayContaining([
              {
                value: 'discovered',
                label: 'Discovered',
                count: 54,
                selected: false,
                href: '/api/admin/research-intake?stage=discovered&page=1&limit=25',
              },
              {
                value: 'preregistered',
                label: 'Preregistered',
                count: 0,
                selected: false,
                href: '/api/admin/research-intake?stage=preregistered&page=1&limit=25',
              },
            ]),
          },
          verdict: {
            label: 'TradeClaw verdict',
            selected: 'all',
            options: expect.arrayContaining([
              {
                value: 'fail',
                label: 'Fail',
                count: 3,
                selected: false,
                href: '/api/admin/research-intake?verdict=fail&page=1&limit=25',
              },
              {
                value: 'pass',
                label: 'Pass',
                count: 0,
                selected: false,
                href: '/api/admin/research-intake?verdict=pass&page=1&limit=25',
              },
            ]),
          },
          sourceAuditDisposition: {
            label: 'Source-audit disposition',
            selected: 'all',
            options: expect.arrayContaining([
              {
                value: 'no-go',
                label: 'No-go',
                count: 3,
                selected: false,
                href:
                  '/api/admin/research-intake?sourceAuditDisposition=no-go&page=1&limit=25',
              },
              {
                value: 'hold',
                label: 'Hold',
                count: 0,
                selected: false,
                href:
                  '/api/admin/research-intake?sourceAuditDisposition=hold&page=1&limit=25',
              },
            ]),
          },
        },
      },
      filterNavigation: {
        contract: {
          activeParameterOrder: ['q', 'assetClass', 'stage', 'verdict', 'sourceAuditDisposition'],
          facetSelectionMode: 'replace-own-dimension',
          resetPageTo: 1,
          preserveLimit: true,
          preserveUnrelatedFilters: true,
          removeOneFilterAtATime: true,
          clearAllPreservesLimit: true,
          canonicalSerialization: 'query-contract',
        },
        activeFilterCount: 0,
        clearAllHref: '/api/admin/research-intake?page=1&limit=25',
        activeFilters: [],
      },
      catalogSummary: {
        total: 61,
        discovered: 54,
        sourceAudited: 3,
        replicated: 4,
        failed: 3,
        inconclusive: 1,
        untested: 57,
        sourceNoGo: 3,
      },
      pagination: {
        page: 1,
        limit: 25,
        totalRecords: 61,
        totalPages: 3,
        returnedRecords: 25,
        hasPreviousPage: false,
        hasNextPage: true,
        links: {
          self: '/api/admin/research-intake?page=1&limit=25',
          first: '/api/admin/research-intake?page=1&limit=25',
          previous: null,
          next: '/api/admin/research-intake?page=2&limit=25',
          last: '/api/admin/research-intake?page=3&limit=25',
        },
      },
      resultView: {
        status: 'showing-results',
        summary: 'Showing 1–25 of 61 candidates.',
        range: {
          firstRecord: 1,
          lastRecord: 25,
          totalRecords: 61,
        },
        recoveryAction: null,
      },
    });
    expect(body.selectionPolicy).toMatch(/never TradeClaw evidence.*default sort/i);
    expect(body.workflow).toHaveLength(5);
    expect(body.records[0].id).toBe(
      'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
    );
    expect(body.records[0].links).toEqual({
      adminCandidate:
        '/api/admin/research-intake/a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
      publicCandidate:
        '/api/research/intake/a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
    });
    expect(body.records.map((record: { sourcePosition: number }) => record.sourcePosition)).toEqual(
      Array.from({ length: 25 }, (_, index) => index),
    );
  });

  it('exposes the canonical UTC research window and next rollover', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-29T19:17:23+08:00'));
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.researchLoop).toEqual({
      observedAt: '2026-08-29T11:17:23.000Z',
      alignment: 'UTC',
      cadence: 'PT3H',
      currentWindow: {
        id: '2026-08-29T09:00:00.000Z/PT3H',
        startAt: '2026-08-29T09:00:00.000Z',
        endsAt: '2026-08-29T12:00:00.000Z',
        durationHours: 3,
      },
      nextRolloverAt: '2026-08-29T12:00:00.000Z',
      currentWindowStatus: 'complete',
      latestReceipt: expect.objectContaining({
        cycleId: '2026-08-29T09:00:00.000Z/PT3H',
        taskId: 'TC-258',
        candidateId: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
        verdict: 'fail',
        externalActions: 'none',
        publicationApproved: false,
        tradingApproved: false,
      }),
      currentWindowReceipts: [
        expect.objectContaining({ taskId: 'TC-258' }),
      ],
      integrity: {
        status: 'historical-conflict',
        receiptCount: 3,
        uniqueWindowCount: 2,
        duplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
        expectedLegacyDuplicateWindowIds: ['2026-08-29T06:00:00.000Z/PT3H'],
        additionalDuplicateWindowIds: [],
      },
      nextAction:
        'Screen the next lower-transition catalog candidate for primary-rule reconstructibility, immutable data, and full-cost headroom; do not select TC-258 controls post result',
      controls: {
        automaticCandidateSelection: false,
        automaticPublication: false,
        automaticTrading: false,
      },
    });
    expect(body.access).toEqual({
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('exposes review-ready drafts independently of filters without leaking future evidence', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-29T19:17:23+08:00'));
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request('?q=no-such-research-candidate'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toEqual([]);
    expect(body.marketingReview).toMatchObject({
      status: 'review-ready',
      summary: {
        availableDrafts: 3,
        receiptBackedDrafts: 2,
        preLoopDrafts: 1,
        publicationApprovedDrafts: 0,
      },
      latestHandoff: { taskId: 'TC-258' },
      currentWindowHandoffs: [{ taskId: 'TC-258' }],
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
      },
    });
    expect(
      body.marketingReview.handoffs.map((handoff: { taskId: string }) => handoff.taskId),
    ).toEqual(['TC-255', 'TC-257', 'TC-258']);
    expect(JSON.stringify(body.marketingReview)).not.toContain('TC-259');
    expect(
      body.marketingReview.handoffs.every(
        (handoff: { draft: { publishApproved: boolean }; publicationApproved: boolean }) =>
          handoff.publicationApproved === false && handoff.draft.publishApproved === false,
      ),
    ).toBe(true);
  });

  it('exposes all three source-audit no-go records without relabeling any as a local failure', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request('?stage=source-audited&sourceAuditDisposition=no-go&limit=100'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalRecords: 3, returnedRecords: 3 });
    expect(body.filteredSummary).toMatchObject({
      sourceAudited: 3,
      sourceNoGo: 3,
      failed: 0,
      untested: 3,
    });
    expect(body.records.map((record: { id: string }) => record.id)).toEqual([
      'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space',
      'price-overreactions-in-the-cryptocurrency-market',
      'a-risk-based-approach-to-tactical-asset-allocation',
    ]);
    expect(body.records[0].tradeClawSourceAudit).toMatchObject({
      taskId: 'TC-261',
      disposition: 'no-go',
      tradeClawBacktestRun: false,
      currentDataReceipt: { pivxPriceUsdAvailable: false },
    });
    expect(body.records[1].tradeClawSourceAudit).toMatchObject({
      taskId: 'TC-256',
      disposition: 'no-go',
      tradeClawBacktestRun: false,
      publishedResult: { conclusion: 'no-exploitable-profit' },
    });
    expect(body.records[2].tradeClawSourceAudit).toMatchObject({
      taskId: 'TC-260',
      disposition: 'no-go',
      tradeClawBacktestRun: false,
      primarySource: {
        documentSha256: 'fb43ff7f323218ea4ebe043fa7b9bbdbe2232a9b65b6b9c3461c1c4d98f2faba',
      },
    });
    expect(body.records.every(
      (record: {
        stage: string;
        verdict: string;
        marketingDisposition: string;
        tradeClawEvidence: unknown;
        marketingReviewDraft: unknown;
      }) =>
        record.stage === 'source-audited' &&
        record.verdict === 'not-tested' &&
        record.marketingDisposition === 'none' &&
        record.tradeClawEvidence === null &&
        record.marketingReviewDraft === null,
    )).toBe(true);
  });

  it('combines filters without changing pinned source order', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request('?q=bitcoin&assetClass=Cryptocurrencies&limit=100'),
    );
    const body = await response.json();

    expect(body.records.map((record: { id: string }) => record.id)).toEqual([
      'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      'seasonality-trend-following-and-mean-reversion-in-bitcoin',
    ]);
    expect(body.appliedFilters.query).toBe('bitcoin');
  });

  it('exposes the QA-only Treasury receipt without inventing performance evidence', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request('?stage=replicated&verdict=inconclusive&sourceAuditDisposition=advance&limit=100'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalRecords: 1, returnedRecords: 1 });
    expect(body.records[0]).toMatchObject({
      id: 'predictable-end-of-month-treasury-returns',
      stage: 'replicated',
      verdict: 'inconclusive',
      costStatus: 'unassessed',
      marketingDisposition: 'human-review-draft-only',
      tradeClawSourceAudit: { disposition: 'advance' },
      tradeClawEvidence: {
        taskId: 'TC-257',
        performanceGatesEvaluated: false,
        eligibleForProspectiveReview: false,
        qa: {
          suppliedYieldChecks: 27453,
          suppliedYieldChecksAboveTolerance: 1,
          standingQaPassed: false,
        },
      },
    });
    expect(body.records[0].marketingReviewDraft).toMatchObject({
      candidateId: 'predictable-end-of-month-treasury-returns',
      title: 'A Treasury replication stopped at its frozen data gate',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
    expect(body.records[0].marketingReviewDraft.summary).toMatch(
      /no performance result was published/i,
    );
    expect(body.records[0].tradeClawEvidence).not.toHaveProperty('btc');
  });

  it('exposes the failed MAX10/MIN10 receipt with its holdout and no authority', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request(
        '?q=seasonality&stage=replicated&verdict=fail&sourceAuditDisposition=advance&limit=100',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalRecords: 1, returnedRecords: 1 });
    expect(body.records[0]).toMatchObject({
      id: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
      stage: 'replicated',
      verdict: 'fail',
      costStatus: 'failed',
      tradeClawSourceAudit: {
        disposition: 'advance',
        intradayCostScreen: { disposition: 'no-go' },
      },
      tradeClawEvidence: {
        taskId: 'TC-258',
        performanceGatesEvaluated: true,
        eligibleForProspectiveReview: false,
        activationApproved: false,
        publicationApproved: false,
        btc: { holdoutNetCompoundedReturn: -0.65656935 },
        eth: { holdoutNetCompoundedReturn: -0.67282522 },
      },
    });
    expect(body.records[0].marketingReviewDraft).toMatchObject({
      candidateId: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
      title: 'Bitcoin MAX10/MIN10 failed its post-paper holdout',
      summary: 'BTC holdout gross +56.54% became -65.66% net under frozen spot costs.',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
  });

  it('exposes the failed term-premium receipt with exact QA, benchmarks, and no authority', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request(
        '?q=term%20premium&stage=replicated&verdict=fail&sourceAuditDisposition=advance&limit=100',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalRecords: 1, returnedRecords: 1 });
    expect(body.records[0]).toMatchObject({
      id: 'trading-the-term-premium',
      stage: 'replicated',
      verdict: 'fail',
      costStatus: 'failed',
      tradeClawSourceAudit: {
        disposition: 'advance',
        tradeClawBacktestRunAtAuditClose: false,
        data: {
          currentVintage: true,
          rawBytesCommitted: false,
        },
      },
      tradeClawEvidence: {
        taskId: 'TC-259',
        performanceGatesEvaluated: true,
        eligibleForProspectiveReview: false,
        activationApproved: false,
        publicationApproved: false,
        qa: {
          standingQaPassed: true,
          curveRows: 782,
          suppliedYieldChecks: 18334,
          fullOutcomes: 703,
          holdoutOutcomes: 42,
        },
        full: {
          headlineCompoundedReturn: 39.174968845477,
        },
        holdout: {
          headlineCompoundedReturn: 0.103469314645,
          alwaysOneMonthHeadlineCompoundedReturn: 0.156215427867,
        },
        stability: {
          passingPaperFolds: 1,
          totalPaperFolds: 4,
        },
        failedGates: ['paperFoldStability', 'holdoutBeatsAlwaysOneMonth'],
      },
    });
    expect(body.records[0].marketingReviewDraft).toMatchObject({
      candidateId: 'trading-the-term-premium',
      title: 'Term-spread timing failed stability and its holdout cash benchmark',
      summary:
        'Holdout headline return was +10.35% versus +15.62% for the identically costed one-month sleeve; only 1/4 paper folds beat both frozen benchmarks.',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
  });

  it('paginates deterministically over the pinned order', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request('?page=2&limit=10'));
    const body = await response.json();

    expect(body.pagination).toMatchObject({
      page: 2,
      limit: 10,
      totalRecords: 61,
      totalPages: 7,
      returnedRecords: 10,
      hasPreviousPage: true,
      hasNextPage: true,
      links: {
        self: '/api/admin/research-intake?page=2&limit=10',
        first: '/api/admin/research-intake?page=1&limit=10',
        previous: '/api/admin/research-intake?page=1&limit=10',
        next: '/api/admin/research-intake?page=3&limit=10',
        last: '/api/admin/research-intake?page=7&limit=10',
      },
    });
    expect(body.records[0].id).toBe(SYSTEMATIC_RESEARCH_INTAKE[10].id);
    expect(body.records.at(-1).id).toBe(SYSTEMATIC_RESEARCH_INTAKE[19].id);
  });

  it('returns an explicit empty filtered state without inventing pagination', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request('?q=no-such-research-candidate'));
    const body = await response.json();

    expect(body.filteredSummary.total).toBe(0);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 25,
      totalRecords: 0,
      totalPages: 0,
      returnedRecords: 0,
      hasPreviousPage: false,
      hasNextPage: false,
      links: {
        self: '/api/admin/research-intake?q=no-such-research-candidate&page=1&limit=25',
        first: '/api/admin/research-intake?q=no-such-research-candidate&page=1&limit=25',
        previous: null,
        next: null,
        last: '/api/admin/research-intake?q=no-such-research-candidate&page=1&limit=25',
      },
    });
    expect(body.resultView).toEqual({
      status: 'no-matches',
      summary: 'No candidates match the current filters.',
      range: null,
      recoveryAction: {
        kind: 'clear-filters',
        label: 'Clear all filters',
        href: '/api/admin/research-intake?page=1&limit=25',
      },
    });
    expect(body.records).toEqual([]);
  });

  it('returns an explicit out-of-range state with a canonical last-page recovery', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request('?assetClass=Equities&page=99&limit=3'));
    const body = await response.json();

    expect(body.pagination).toMatchObject({
      page: 99,
      totalRecords: 12,
      totalPages: 4,
      returnedRecords: 0,
      links: {
        self: '/api/admin/research-intake?assetClass=Equities&page=99&limit=3',
        previous: '/api/admin/research-intake?assetClass=Equities&page=98&limit=3',
        last: '/api/admin/research-intake?assetClass=Equities&page=4&limit=3',
      },
    });
    expect(body.resultView).toEqual({
      status: 'page-out-of-range',
      summary: 'Page 99 is outside the 4 available pages.',
      range: null,
      recoveryAction: {
        kind: 'last-page',
        label: 'Go to page 4',
        href: '/api/admin/research-intake?assetClass=Equities&page=4&limit=3',
      },
    });
    expect(body.records).toEqual([]);
  });

  it.each([
    ['?unknown=1', 'unknown'],
    ['?stage=live', 'stage'],
    ['?stage=discovered&stage=replicated', 'stage'],
    ['?limit=0', 'limit'],
    ['?limit=101', 'limit'],
    [`?q=${'x'.repeat(121)}`, 'q'],
  ])('fails closed on invalid query %s', async (query, parameter) => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(request(query));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: 'Invalid research intake query',
      parameter,
    });
    expect(body.records).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
  });
});
