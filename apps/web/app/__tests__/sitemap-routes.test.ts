import sitemap from '../sitemap';
import { routeExists } from '../../test-utils/route-exists';
import { getLanguageAlternates, SUPPORTED_LOCALES } from '../../lib/translations';

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
    expect(entries.length).toBeGreaterThanOrEqual(15);
    expect(entries.length).toBeLessThanOrEqual(25);
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
      '/track-record',
      '/track-record/study',
      '/track-record/alpha',
    ]) {
      expect(urls).toContain(`${BASE}${p}`);
    }
  });

  it('lists every supported localized landing page with complete alternates', () => {
    const byUrl = new Map(entries.map((entry) => [String(entry.url), entry]));
    const expectedAlternates = getLanguageAlternates(BASE);

    for (const { href } of SUPPORTED_LOCALES) {
      const url = href === '/' ? BASE : `${BASE}${href}`;
      expect(byUrl.get(url)?.alternates?.languages).toEqual(expectedAlternates);
    }
  });

  it('does not advertise unverified Fly.io or Replit deployment routes', () => {
    const urls = entries.map((entry) => String(entry.url));

    expect(urls).not.toContain(`${BASE}/fly`);
    expect(urls).not.toContain(`${BASE}/replit`);
  });

  it('does not promote trading-action or gamification surfaces', () => {
    const urls = entries.map((entry) => String(entry.url));

    for (const path of [
      '/alerts',
      '/notifications',
      '/paper-trading',
      '/demo/telegram',
      '/leaderboard',
      '/star',
      '/star-history',
      '/subscribe',
    ]) {
      expect(urls).not.toContain(`${BASE}${path}`);
    }
  });
});
