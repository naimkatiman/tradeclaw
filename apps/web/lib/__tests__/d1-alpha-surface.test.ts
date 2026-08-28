import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('prospective D1 alpha public surface', () => {
  const page = read('apps/web/app/track-record/alpha/page.tsx');
  const nav = read('apps/web/app/track-record/evidence-controls.tsx');
  const sitemap = read('apps/web/app/sitemap.ts');
  const protocol = read('docs/plans/2026-08-10-d1-alpha-ledger.md');

  it('separates prospective evidence from the observed archive and retrospective studies', () => {
    expect(page).toContain('Prospective D1 Alpha Ledger');
    expect(page).toContain('Not the current strategy.');
    expect(page).toContain('Losing observed archive');
    expect(page).toContain('Retrospective studies');
    expect(page).toContain('href="/track-record"');
    expect(page).toContain('href="/track-record/study"');
  });

  it('publishes the route in evidence navigation and the sitemap', () => {
    expect(nav).toContain("href: '/track-record/alpha'");
    expect(nav).toContain("value: 'alpha'");
    expect(sitemap).toContain("{ path: '/track-record/alpha'");
  });

  it('states the predeclared gate, immutable epoch, and no-auto-promotion boundary', () => {
    expect(protocol).toContain('at least 365 calendar days');
    expect(protocol).toContain('at least 365 consecutive daily snapshots');
    expect(protocol).toContain('at least 12 prospectively closed sleeve trades');
    expect(protocol).toMatch(/Missing historical snapshots are\s+never inserted later\./);
    expect(protocol).toContain('Neither state promotes the strategy automatically.');
    expect(page).toContain('promotion requires a separate owner');
    expect(page).toContain('Empty evidence is shown as');
  });
});
