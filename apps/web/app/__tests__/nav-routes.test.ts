import path from 'path';
import { routeExists, internalHrefsIn } from '../../test-utils/route-exists';

const WEB = path.join(__dirname, '..', '..');

/**
 * Navigation link registries drift out of sync with the routes they point at.
 * PageNavBar linked /admin/pro-grants long after the tier retraction deleted it,
 * and /operator linked /login, a route that has never existed. Both 404'd in
 * production and nothing caught them: tsc cannot see a string, and next build
 * runs with typescript.ignoreBuildErrors.
 */
const NAV_SOURCES = [
  'components/PageNavBar.tsx',
  'app/components/navbar.tsx',
  'app/components/mobile-nav.tsx',
  'app/components/site-footer.tsx',
];

describe.each(NAV_SOURCES)('%s', (rel) => {
  const file = path.join(WEB, rel);

  it('links only to routes that exist', () => {
    const broken = internalHrefsIn(file).filter((href) => !routeExists(href));
    expect(broken).toEqual([]);
  });
});

describe('primary journey', () => {
  it('/today is reachable from the in-app nav', () => {
    const hrefs = internalHrefsIn(path.join(WEB, 'components/PageNavBar.tsx'));
    expect(hrefs).toContain('/today');
  });

  it('every transparency page is reachable from the in-app nav', () => {
    const hrefs = internalHrefsIn(path.join(WEB, 'components/PageNavBar.tsx'));
    for (const p of [
      '/research',
      '/methodology',
      '/why-long-term',
      '/open-data',
      '/calibration',
    ]) {
      expect(hrefs).toContain(p);
    }
  });
});
