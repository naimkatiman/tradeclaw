import { NextRequest } from 'next/server';
import { buildResearchIntakeEvidenceCsv } from '../../../../../../lib/research-intake-csv';
import * as route from '../route';

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

describe('GET /api/research/intake/evidence.csv', () => {
  it('downloads the complete ten-row evidence spreadsheet with public caching', async () => {
    const response = route.GET();
    const body = await response.text();

    expect(route.revalidate).toBe(3600);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="tradeclaw-systematic-research-evidence-2026-08-29.csv"',
    );
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body).toBe(buildResearchIntakeEvidenceCsv());
    expect(body.split('\r\n')).toHaveLength(11);
  });

  it('ignores query filters and exposes only GET', async () => {
    const unfiltered = route.GET();
    const queried = (route.GET as (request?: NextRequest) => ReturnType<typeof route.GET>)(
      new NextRequest(
        'http://localhost/api/research/intake/evidence.csv?verdict=pass&sort=sharpe&limit=1',
      ),
    );

    expect(await queried.text()).toBe(await unfiltered.text());
    expect(route).not.toHaveProperty('HEAD');
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
    expect(route).not.toHaveProperty('OPTIONS');
  });

  it('carries no protected workflow or publication-ready selection', async () => {
    const body = await route.GET().text();

    expect(body).not.toMatch(
      /(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)/,
    );
    expect(body).not.toContain('modeled-historical-pass');
  });
});
