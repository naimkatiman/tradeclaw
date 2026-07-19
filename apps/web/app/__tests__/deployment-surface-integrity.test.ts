import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..', '..');

function source(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('retired deployment surfaces', () => {
  it.each(['fly', 'replit'])('redirects /%s to the maintained start guide', (route) => {
    const page = source(`apps/web/app/${route}/page.tsx`);

    expect(page).toContain("redirect('/start')");
    expect(page).not.toContain('Client');
  });

  it('keeps Fly configuration fail-closed until the target is verified', () => {
    const config = source('fly.toml');
    const guide = source('docs/FLYIO.md');

    expect(config).toContain('Intentionally non-deployable');
    expect(config).not.toMatch(/^app\s*=/m);
    expect(config).not.toContain('[build]');
    expect(existsSync(resolve(ROOT, 'Dockerfile.fly'))).toBe(false);
    expect(guide).toContain('not currently a supported or end-to-end verified');
    expect(guide).toContain('DATABASE_URL');
    expect(guide).toContain('apps/web/migrations');
    expect(guide).toContain('USER_SESSION_SECRET');
    expect(guide).toContain('ADMIN_SECRET');
  });

  it('keeps Replit explicitly development-only and uses current domain guidance', () => {
    const config = source('.replit');
    const guide = source('docs/REPLIT.md');
    const combined = `${config}\n${guide}`;

    expect(config).toContain('Development preview only');
    expect(config).toContain('onBoot = "npm ci && npm run build:signals"');
    expect(config).toContain('npm run dev --workspace=apps/web');
    expect(config).not.toContain('npm install &&');
    expect(guide).toContain('not a supported TradeClaw production target');
    expect(guide).toContain('DATABASE_URL');
    expect(guide).toContain('npm run migrate --workspace=apps/web');
    expect(guide).toContain('REPLIT_DEV_DOMAIN');
    expect(combined).not.toContain('.repl.co');
  });
});
