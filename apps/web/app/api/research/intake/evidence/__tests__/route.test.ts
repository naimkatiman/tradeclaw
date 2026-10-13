import { NextRequest } from 'next/server';
import * as route from '../route';

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

describe('GET /api/research/intake/evidence', () => {
  it('serves the complete deterministic evidence index without authentication', async () => {
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
    expect(body.evidenceIndex).toEqual({
      selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
      order: 'pinned-source-order',
      performanceRanked: false,
      includesEveryAvailableOverlay: true,
    });
    expect(body.records.map((record: {
      tradeClawEvidence: { taskId: string } | null;
      tradeClawSourceAudit: { taskId: string } | null;
    }) => record.tradeClawEvidence?.taskId ?? record.tradeClawSourceAudit?.taskId)).toEqual([
      'TC-262',
      'TC-259',
      'TC-257',
      'TC-268',
      'TC-264',
      'TC-265',
      'TC-255',
      'TC-261',
      'TC-258',
      'TC-256',
      'TC-263',
      'TC-267',
      'TC-266',
      'TC-260',
    ]);
  });

  it('ignores query filters and exposes only GET', async () => {
    const unfiltered = await route.GET();
    const queried = await (route.GET as (request?: NextRequest) => ReturnType<typeof route.GET>)(
      new NextRequest(
        'http://localhost/api/research/intake/evidence?verdict=pass&sort=sharpe&limit=1',
      ),
    );

    expect(await queried.text()).toBe(await unfiltered.text());
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });

  it('keeps admin and marketing workflow out of the response', async () => {
    const response = await route.GET();
    const serialized = await response.text();

    expect(serialized).not.toMatch(
      /"(?:nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts)"/,
    );
  });
});
