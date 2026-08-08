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

  /**
   * The sitemap is the story told to search engines, and it has to match the one
   * the homepage tells. It had grown to 89 URLs -- growth-era landing pages and
   * launch stunts advertised at priority 0.7-0.9 -- so search traffic landed on
   * pages carrying none of the cost-honesty framing the pivot is built on.
   *
   * These are the ratchet. `routeExists` cannot catch this: it only proves a page
   * file is on disk, never that the page belongs in the index.
   */
  it('advertises no growth-era or launch-stunt route', () => {
    const urls = entries.map((entry) => String(entry.url));

    for (const p of [
      '/roast',
      '/wrapped',
      '/quiz',
      '/tournament',
      '/producthunt',
      '/readme-score',
      '/star',
      '/star-history',
      '/pledge',
      '/vote',
      '/supabase',
      '/notion/signals',
      '/badges/readme',
      '/og-preview',
    ]) {
      expect(urls).not.toContain(`${BASE}${p}`);
    }
  });

  it('advertises one canonical URL per concept', () => {
    const urls = entries.map((entry) => String(entry.url));

    // /docs/api is the full API reference; /api-docs is the thinner duplicate.
    expect(urls).toContain(`${BASE}/docs/api`);
    expect(urls).not.toContain(`${BASE}/api-docs`);

    // /track-record is the canonical evidence surface; /proof renders a subset.
    expect(urls).toContain(`${BASE}/track-record`);
    expect(urls).not.toContain(`${BASE}/proof`);
  });

  it('stays small enough to read in one screen', () => {
    // A ceiling, not a target. Needing more than this usually means the change is
    // re-advertising the surface the pivot deliberately narrowed.
    expect(entries.length).toBeLessThanOrEqual(40);
  });
});
