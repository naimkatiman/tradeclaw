import fs from 'fs';
import path from 'path';
import sitemap from '../sitemap';

const APP_DIR = path.join(__dirname, '..');
const BASE = 'https://tradeclaw.win';

/**
 * A sitemap entry is only valid if the URL it advertises actually renders.
 * Shipping a URL with no route serves search engines a 404 -- which is exactly
 * what `${base}/alert` did (app/alert contains only an [id] segment).
 */
function routeExists(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);

  const resolve = (dir: string, rest: string[]): boolean => {
    if (rest.length === 0) {
      return ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((f) =>
        fs.existsSync(path.join(dir, f)),
      );
    }

    const [head, ...tail] = rest;

    const literal = path.join(dir, head);
    if (fs.existsSync(literal) && fs.statSync(literal).isDirectory()) {
      if (resolve(literal, tail)) return true;
    }

    // A dynamic segment ([slug], [id], [...all]) can stand in for any literal.
    if (!fs.existsSync(dir)) return false;
    const dynamic = fs
      .readdirSync(dir)
      .filter((e) => e.startsWith('[') && fs.statSync(path.join(dir, e)).isDirectory());

    return dynamic.some((d) => resolve(path.join(dir, d), tail));
  };

  return resolve(APP_DIR, segments);
}

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
