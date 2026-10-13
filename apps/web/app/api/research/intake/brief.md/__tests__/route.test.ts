import { NextRequest } from 'next/server';
import * as route from '../route';

const PUBLIC_CACHE =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

describe('GET /api/research/intake/brief.md', () => {
  it('serves the public evidence orientation as cacheable inline Markdown', async () => {
    const response = route.GET();
    const brief = await response.text();

    expect(route.revalidate).toBe(3600);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="tradeclaw-research-evidence-brief.md"',
    );
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('vary')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(brief).toContain('# TradeClaw research evidence brief');
    expect(brief).toContain(
      '**3 of 61 pinned candidates reached TradeClaw performance gates; all 3 failed. The other 58 have no evaluated TradeClaw performance gate.**',
    );
    expect(brief).toContain(
      '- Open human-readable index: `/api/research/intake/evidence/index.md`',
    );
    expect(brief).toContain(
      '- Machine-readable index: `/api/research/intake/evidence/index`',
    );
    expect(brief).toContain('- Executes trades: No');
    expect(brief).not.toContain('/api/admin');
  });

  it('ignores query parameters and exposes only GET', async () => {
    const plain = route.GET();
    const queried = (route.GET as (request?: NextRequest) => ReturnType<typeof route.GET>)(
      new NextRequest(
        'http://localhost/api/research/intake/brief.md?verdict=pass&sort=sharpe',
      ),
    );

    expect(await queried.text()).toBe(await plain.text());
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });
});
