import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(__dirname, '..', 'app');
const PAGE_FILES = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];

/**
 * Does `pathname` (e.g. "/track-record", "/blog/some-slug") render a real page?
 *
 * A dynamic segment ([slug], [id], [...all]) stands in for any literal segment,
 * so /blog/anything resolves via app/blog/[slug]/page.tsx.
 */
export function routeExists(pathname: string, appDir: string = APP_DIR): boolean {
  const segments = pathname.split('/').filter(Boolean);

  const resolve = (dir: string, rest: string[]): boolean => {
    if (!fs.existsSync(dir)) return false;

    if (rest.length === 0) {
      return PAGE_FILES.some((f) => fs.existsSync(path.join(dir, f)));
    }

    const [head, ...tail] = rest;

    const literal = path.join(dir, head);
    if (fs.existsSync(literal) && fs.statSync(literal).isDirectory()) {
      if (resolve(literal, tail)) return true;
    }

    return fs
      .readdirSync(dir)
      .filter((e) => e.startsWith('[') && fs.statSync(path.join(dir, e)).isDirectory())
      .some((d) => resolve(path.join(dir, d), tail));
  };

  return resolve(appDir, segments);
}

/** Internal hrefs declared as string literals in a source file, query/hash stripped. */
export function internalHrefsIn(sourceFile: string): string[] {
  const src = fs.readFileSync(sourceFile, 'utf8');
  const found = new Set<string>();

  for (const m of src.matchAll(/href[:=]\s*["'`](\/[^"'`\s]*)["'`]/g)) {
    const raw = m[1].split('?')[0].split('#')[0];
    // Skip the root and any href built from a template expression.
    if (raw === '/' || raw.includes('${')) continue;
    found.add(raw);
  }

  return [...found].sort();
}
