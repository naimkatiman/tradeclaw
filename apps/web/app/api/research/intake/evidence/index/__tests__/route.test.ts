import { NextRequest } from 'next/server';
import * as route from '../route';

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

describe('GET /api/research/intake/evidence/index', () => {
  it('serves every examined candidate as compact source-ordered identity', async () => {
    const response = await route.GET();
    const body = await response.json();

    expect(route.revalidate).toBe(3600);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body.items.map((item: {
      evidencePosition: number;
      candidate: { evidenceState: { taskId: string } };
    }) => [item.evidencePosition, item.candidate.evidenceState.taskId])).toEqual([
      [1, 'TC-262'],
      [2, 'TC-259'],
      [3, 'TC-257'],
      [4, 'TC-268'],
      [5, 'TC-264'],
      [6, 'TC-265'],
      [7, 'TC-255'],
      [8, 'TC-261'],
      [9, 'TC-258'],
      [10, 'TC-256'],
      [11, 'TC-263'],
      [12, 'TC-267'],
      [13, 'TC-266'],
      [14, 'TC-260'],
    ]);
    expect(body.startHere).toMatchObject({
      kind: 'browse-evidence-index',
      href: '/api/research/intake/evidence/index',
      targetResource: 'evidence-index',
      targetIsCurrentResource: true,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('ignores query filters and exposes only GET', async () => {
    const unfiltered = await route.GET();
    const queried = await (route.GET as (request?: NextRequest) => ReturnType<typeof route.GET>)(
      new NextRequest(
        'http://localhost/api/research/intake/evidence/index?verdict=pass&sort=sharpe&limit=1',
      ),
    );

    expect(await queried.text()).toBe(await unfiltered.text());
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });

  it('omits nested evidence, admin workflow, and repeated evidence meanings', async () => {
    const response = await route.GET();
    const body = await response.json();
    const serialized = JSON.stringify(body.items);

    expect(serialized).not.toMatch(
      /"(?:tradeClawSourceAudit|tradeClawEvidence|nextAction|marketingDisposition|marketingReviewDraft|researchLoop|marketingReview|latestReceipt|currentWindowReceipts|meaning|evidencePath|artifactPath)"/,
    );
  });
});
