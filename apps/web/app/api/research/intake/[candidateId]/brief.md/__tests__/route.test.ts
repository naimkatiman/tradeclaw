import { NextRequest } from 'next/server';
import * as route from '../route';

const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const UNTOUCHED_ID =
  'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe';
const PUBLIC_CACHE =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

function request(candidateId: string, query = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/research/intake/${encodeURIComponent(candidateId)}/brief.md${query}`,
  );
}

function context(candidateId: string): {
  params: Promise<{ candidateId: string }>;
} {
  return { params: Promise.resolve({ candidateId }) };
}

describe('GET /api/research/intake/[candidateId]/brief.md', () => {
  it('serves one exact source-audit record as cacheable inline Markdown', async () => {
    const response = await route.GET(request(CANDIDATE_ID), context(CANDIDATE_ID));
    const body = await response.text();

    expect(route.revalidate).toBe(3600);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="tradeclaw-research-candidate-brief.md"',
    );
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body).toContain('# A Risk Based Approach to Tactical Asset Allocation');
    expect(body).toContain('- Evidence status: Source audit only');
    expect(body).toContain('`TC-260`');
    expect(body).toContain('- Selects or recommends a strategy: No');
    expect(body).not.toContain('/api/admin');
  });

  it('renders an untouched discovery honestly and ignores query parameters', async () => {
    const plain = await route.GET(request(UNTOUCHED_ID), context(UNTOUCHED_ID));
    const queried = await route.GET(
      request(UNTOUCHED_ID, '?verdict=pass&sort=sharpe'),
      context(UNTOUCHED_ID),
    );
    const body = await plain.text();

    expect(plain.status).toBe(200);
    expect(await queried.text()).toBe(body);
    expect(body).toContain('- Evidence status: Not tested by TradeClaw');
    expect(body).toContain(
      'No TradeClaw audit or replication decision is recorded.',
    );
    expect(body).toContain('- Performance gates evaluated: No');
  });

  it('returns one generic non-reflective Markdown 404 for non-canonical IDs', async () => {
    for (const candidateId of [
      'missing-candidate',
      CANDIDATE_ID.toUpperCase(),
      ` ${CANDIDATE_ID}`,
    ]) {
      const response = await route.GET(request(candidateId), context(candidateId));
      const body = await response.text();

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toBe(
        'text/markdown; charset=utf-8',
      );
      expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(body).toBe(
        '# Research intake candidate not found\n\nResearch intake candidate not found. Use an exact canonical candidate ID.\n',
      );
      expect(body).not.toContain(candidateId);
    }
  });

  it('exposes only GET', () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });
});
