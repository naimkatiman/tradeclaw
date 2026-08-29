import {
  buildResearchIntakeCsvRows,
  researchIntakeCsvRowsToString,
} from '../../../../../lib/research-intake-csv';
import * as route from '../route';

describe('GET /api/research/intake.csv', () => {
  it('downloads the deterministic public spreadsheet index with public caching', async () => {
    const response = route.GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="tradeclaw-systematic-research-intake-2026-08-29.csv"',
    );
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('vary')).toBeNull();
    expect(body).toBe(researchIntakeCsvRowsToString(buildResearchIntakeCsvRows()));
    expect(body.split('\r\n')).toHaveLength(62);
  });

  it('exposes only GET and carries no protected workflow state', async () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('DELETE');

    const body = await route.GET().text();

    expect(body).not.toMatch(
      /(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)/,
    );
  });
});
