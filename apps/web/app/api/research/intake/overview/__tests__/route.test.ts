import { NextRequest } from 'next/server';
import * as route from '../route';

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

describe('GET /api/research/intake/overview', () => {
  it('serves compact evidence orientation without authentication or record bodies', async () => {
    const response = await route.GET();
    const body = await response.json();

    expect(route.revalidate).toBe(3600);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body.access).toEqual({
      mode: 'public-read-only',
      requiresAuthentication: false,
      requiresApiKey: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(body.catalogSummary.total).toBe(61);
    expect(body.evidenceSummary.total).toBe(13);
    expect(body.startHere).toMatchObject({
      audience: 'public',
      kind: 'browse-evidence-index',
      href: '/api/research/intake/evidence/index',
      targetResource: 'evidence-index',
      targetIsCurrentResource: false,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(body).not.toHaveProperty('records');
    expect(body).not.toHaveProperty('items');
  });

  it('ignores query filters and exposes only GET', async () => {
    const unfiltered = await route.GET();
    const queried = await (route.GET as (request?: NextRequest) => ReturnType<typeof route.GET>)(
      new NextRequest(
        'http://localhost/api/research/intake/overview?verdict=pass&sort=sharpe&limit=1',
      ),
    );

    expect(await queried.text()).toBe(await unfiltered.text());
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });

  it('keeps admin, receipt, candidate, and marketing workflow out of the response', async () => {
    const response = await route.GET();
    const serialized = await response.text();

    expect(serialized).not.toMatch(
      /\"(?:records|items|nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)\"/,
    );
    expect(serialized).not.toContain('/api/admin/research-intake');
  });
});
