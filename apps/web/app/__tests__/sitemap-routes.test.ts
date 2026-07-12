import sitemap from '../sitemap';
import { routeExists } from '../../test-utils/route-exists';

const BASE = 'https://tradeclaw.win';

/**
 * A sitemap entry is only valid if the URL it advertises actually renders.
 * Shipping a URL with no route serves search engines a 404 -- which is exactly
 * what `${base}/alert` did (app/alert contains only an [id] segment).
 */
describe('sitemap', () => {
  const entries = sitemap();

  it('is not empty', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('advertises no URL that 404s', () => {
    const broken = entries
      .map((e) => String(e.url))
      .filter((url) => url.startsWith(BASE))
      .map((url) => url.slice(BASE.length) || '/')
      .filter((pathname) => !routeExists(pathname));

    expect(broken).toEqual([]);
  });

  it('lists every transparency page (the pivot depends on them being indexed)', () => {
    const urls = entries.map((e) => String(e.url));
    for (const p of [
      '/research',
      '/methodology',
      '/why-long-term',
      '/open-data',
      '/calibration',
      '/track-record',
    ]) {
      expect(urls).toContain(`${BASE}${p}`);
    }
  });
});
