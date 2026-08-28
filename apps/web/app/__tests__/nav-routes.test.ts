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
  it('keeps the in-app primary navigation focused on Evidence, Lab, and Build', () => {
    const hrefs = internalHrefsIn(path.join(WEB, 'components/PageNavBar.tsx'));

    expect(hrefs).toEqual(expect.arrayContaining(['/track-record', '/dashboard', '/start']));
    expect(hrefs).not.toContain('/today');
  });

  it('keeps the intentional Evidence, Lab, and Build destinations reachable', () => {
    const hrefs = new Set(
      NAV_SOURCES.flatMap((rel) => internalHrefsIn(path.join(WEB, rel))),
    );

    for (const p of [
      '/track-record',
      '/track-record/study',
      '/track-record/alpha',
      '/research',
      '/methodology',
      '/open-data',
      '/dashboard',
      '/screener',
      '/backtest',
      '/start',
      '/docs',
      '/api-docs',
    ]) {
      expect(hrefs.has(p)).toBe(true);
    }
  });
});
