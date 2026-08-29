import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

describe('public performance and accessibility boundaries', () => {
  it('keeps optional PostHog code out of the initial client graph', () => {
    const analytics = source('lib/analytics.ts');
    const layout = source('app/layout.tsx');
    const pageView = source('components/PostHogPageView.tsx');

    expect(analytics).toContain("import('posthog-js')");
    expect(analytics).not.toMatch(/import\s+posthog\s+from\s+['\"]posthog-js['\"]/);
    expect(pageView).not.toMatch(/from\s+['\"]posthog-js['\"]/);
    expect(layout).not.toContain('AnalyticsProvider');
  });

  it('does not fetch the homepage evidence through its own public origin', () => {
    const hero = source('components/landing/proof-hero.tsx');
    const exploreStrip = source('components/landing/explore-strip.tsx');
    const navbar = source('app/components/navbar.tsx');

    expect(hero).toContain('getEquitySummaryResponse(request)');
    expect(hero).not.toContain('NEXT_PUBLIC_BASE_URL');
    expect(hero).not.toMatch(/fetch\([^)]*api\/signals\/equity/);
    expect(exploreStrip).toContain('prefetch={false}');
    expect(navbar).toContain('href="/track-record"\n                prefetch={false}');
  });

  it('keeps scroll-reveal text fully opaque', () => {
    const css = source('app/globals.css');
    const keyframes = css.match(/@keyframes revealUp\s*{([\s\S]*?)\n}/)?.[1] ?? '';

    expect(keyframes).not.toContain('opacity');
  });

  it('keeps Backtest controls named, touchable, and inside a main landmark', () => {
    const backtest = source('app/backtest/page.tsx');
    const mobileNav = source('app/components/mobile-nav.tsx');

    expect(backtest).toContain('<main className=');
    expect(backtest).toContain('htmlFor="backtest-symbol"');
    expect(backtest).toContain('id="backtest-symbol"');
    expect(backtest).toContain('className="h-6 w-6 shrink-0');
    expect(mobileNav).toContain('`${t.more}: ${t.aria.openMenu}`');
  });

  it('allows the Cloudflare Insights script in the report-only CSP', () => {
    expect(source('middleware.ts')).toContain('https://static.cloudflareinsights.com');
  });
});
