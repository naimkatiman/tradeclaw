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
      catalogSummary: {
        total: 61,
        discovered: 57,
        sourceAudited: 1,
        replicated: 3,
        failed: 2,
        inconclusive: 1,
        untested: 58,
        sourceNoGo: 1,
      },
      pagination: {
        page: 1,
        limit: 25,
        totalRecords: 61,
        totalPages: 3,
        returnedRecords: 25,
        hasPreviousPage: false,
        hasNextPage: true,
      },
    });
    expect(body.selectionPolicy).toMatch(/never TradeClaw evidence.*default sort/i);
    expect(body.workflow).toHaveLength(5);
    expect(body.records[0].id).toBe(
      'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
    );
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
    });
    expect(body.access).toEqual({
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('exposes the source-audit no-go without relabeling it as a local failure', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request('?stage=source-audited&sourceAuditDisposition=no-go&limit=100'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalRecords: 1, returnedRecords: 1 });
    expect(body.filteredSummary).toMatchObject({
      sourceAudited: 1,
      sourceNoGo: 1,
      failed: 0,
      untested: 1,
    });
    expect(body.records[0]).toMatchObject({
      id: 'price-overreactions-in-the-cryptocurrency-market',
      stage: 'source-audited',
      verdict: 'not-tested',
      marketingDisposition: 'none',
      tradeClawEvidence: null,
      tradeClawSourceAudit: {
        disposition: 'no-go',
        tradeClawBacktestRun: false,
        publishedResult: { conclusion: 'no-exploitable-profit' },
      },
    });
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
    expect(body.records[0].tradeClawEvidence).not.toHaveProperty('btc');
  });

  it('exposes the failed MAX10/MIN10 receipt with its holdout and no authority', async () => {
    mockedAdmin.mockResolvedValue(null);

    const response = await GET(
      request('?stage=replicated&verdict=fail&sourceAuditDisposition=advance&limit=100'),
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
