import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

import { assertAdminApi } from '../../../../../../lib/admin-gate';
import * as route from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const TC259 = 'trading-the-term-premium';
const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(candidateId: string, query = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/research-intake/${encodeURIComponent(candidateId)}${query}`,
  );
}

function context(candidateId: string): { params: Promise<{ candidateId: string }> } {
  return { params: Promise.resolve({ candidateId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/[candidateId]', () => {
  it('authenticates before awaiting path parameters or observing candidate state', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const unreadParams = {
      then: () => {
        throw new Error('path parameters were observed before authentication');
      },
    } as unknown as Promise<{ candidateId: string }>;

    const response = await route.GET(request('hidden-candidate'), { params: unreadParams });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|catalog|source|receipt|marketing/i);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one protected TC-260 record and ignores query filters', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-29T15:59:59.999Z'));
    mockedAdmin.mockResolvedValue(null);

    const response = await route.GET(
      request(TC260, '?q=another-candidate&limit=1&unknown=ignored'),
      context(TC260),
    );
    const body = await response.json();

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body.record).toMatchObject({
      id: TC260,
      stage: 'source-audited',
      verdict: 'not-tested',
      marketingReviewDraft: null,
    });
    expect(body.catalogEvidenceStateSummary).toMatchObject({
      totalCandidates: 61,
      withTradeClawRecord: 10,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
      plainLanguageSummary:
        '61 candidates: 51 not tested by TradeClaw, 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    });
    expect(body.navigation).toMatchObject({
      order: 'pinned-source-order',
      currentPosition: 61,
      totalCandidates: 61,
      catalogHref: '/api/admin/research-intake',
      selfHref: `/api/admin/research-intake/${TC260}`,
      previous: {
        id: 'risk-parity-portfolios-with-risk-factors',
        position: 60,
      },
      next: null,
    });
    expect(body.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{ taskId: 'TC-260', cycleId: '2026-08-29T15:00:00.000Z/PT3H' }],
      latestReceipt: { taskId: 'TC-260' },
      marketingHandoff: null,
      controls: {
        humanReviewRequired: false,
        automaticPublication: false,
        automaticPosting: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });
    expect(body.researchLoop.observedAt).toBe('2026-08-29T15:59:59.999Z');
    expect(body).not.toHaveProperty('records');
    expect(body).not.toHaveProperty('appliedFilters');
    expect(body).not.toHaveProperty('marketingReview');
  });

  it('returns the visible TC-259 receipt and human-review-only handoff', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-29T15:59:59.999Z'));
    mockedAdmin.mockResolvedValue(null);

    const response = await route.GET(request(TC259), context(TC259));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.record.marketingReviewDraft).toMatchObject({
      candidateId: TC259,
      publishApproved: false,
    });
    expect(body.candidateWorkflow).toMatchObject({
      receiptCount: 1,
      receipts: [{ taskId: 'TC-259', publicationApproved: false, tradingApproved: false }],
      latestReceipt: { taskId: 'TC-259' },
      marketingHandoff: {
        taskId: 'TC-259',
        workflowState: 'human-review-required',
        publicationApproved: false,
        draft: { publishApproved: false },
      },
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });
  });

  it('returns one generic non-reflective 404 for non-canonical IDs', async () => {
    mockedAdmin.mockResolvedValue(null);

    for (const candidateId of ['missing-candidate', TC260.toUpperCase(), ` ${TC260}`]) {
      const response = await route.GET(request(candidateId), context(candidateId));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: 'Research intake candidate not found.' });
      expect(JSON.stringify(body)).not.toContain(candidateId);
      expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
      expect(response.headers.get('vary')).toBe('Cookie, Authorization');
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    }
  });

  it('exposes only GET', () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });
});
