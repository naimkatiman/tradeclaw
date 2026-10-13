import { SYSTEMATIC_RESEARCH_INTAKE } from '../../../../../lib/research-intake';
import * as route from '../route';

describe('GET /api/research/intake', () => {
  it('serves the deterministic public catalog without authentication or private cache variance', async () => {
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body.access).toEqual({
      mode: 'public-read-only',
      requiresAuthentication: false,
      requiresApiKey: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(body.records).toHaveLength(61);
    expect(body.records.map((record: { id: string }) => record.id)).toEqual(
      SYSTEMATIC_RESEARCH_INTAKE.map((record) => record.id),
    );
  });

  it('exposes only GET and keeps admin workflow out of the response', async () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('DELETE');

    const response = await route.GET();
    const serialized = await response.text();

    expect(serialized).not.toMatch(
      /\"(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)\"/,
    );
  });
});
