import { NextRequest } from 'next/server';
import * as route from '../route';

const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

function request(candidateId: string): NextRequest {
  return new NextRequest(`http://localhost/api/research/intake/${encodeURIComponent(candidateId)}`);
}

function context(candidateId: string): { params: Promise<{ candidateId: string }> } {
  return { params: Promise.resolve({ candidateId }) };
}

describe('GET /api/research/intake/[candidateId]', () => {
  it('serves one deterministic safe record with public cache semantics', async () => {
    const response = await route.GET(request(CANDIDATE_ID), context(CANDIDATE_ID));
    const body = await response.json();

    expect(route.revalidate).toBe(3600);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body.record).toMatchObject({
      id: CANDIDATE_ID,
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: { taskId: 'TC-260', tradeClawBacktestRun: false },
    });
    expect(body).not.toHaveProperty('records');
    expect(body.access).toMatchObject({
      requiresAuthentication: false,
      requiresApiKey: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /\"(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)\"/,
    );
  });

  it('returns the same generic non-reflective 404 for every non-canonical ID', async () => {
    for (const candidateId of [
      'missing-candidate',
      CANDIDATE_ID.toUpperCase(),
      ` ${CANDIDATE_ID}`,
    ]) {
      const response = await route.GET(request(candidateId), context(candidateId));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(body).toEqual({ error: 'Research intake candidate not found.' });
      expect(await new Response(JSON.stringify(body)).text()).not.toContain(candidateId);
    }
  });

  it('exposes only GET', () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });
});
