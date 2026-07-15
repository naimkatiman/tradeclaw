import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function path(relativePath: string): string {
  return resolve(__dirname, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(path(relativePath), 'utf8');
}

describe('public badge, feed, and widget truth boundaries', () => {
  it('publishes badge values only from eligible real-quality recorded signals', () => {
    const state = read('../../app/api/badge/badge-state.ts');
    const badgeRoutes = [
      read('../../app/api/badge/route.ts'),
      read('../../app/api/badge/[pair]/route.ts'),
      read('../../app/api/badge/[pair]/json/route.ts'),
      read('../../app/api/badges/route.ts'),
    ].join('\n');

    expect(state).toContain("candidate.dataQuality === 'real'");
    expect(state).toMatch(/confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE/);
    expect(state).toMatch(/if \(!recordedAt\) return unavailableBadgeState/);
    expect(state).toMatch(/direction: null[\s\S]*confidence: null[\s\S]*rsi: null/);
    expect(state).toMatch(/No placeholder values were substituted/i);
    expect(badgeRoutes).not.toMatch(/getBadgeCache|setBadgeCache/);
    expect(badgeRoutes).not.toMatch(/\?\? 'NEUTRAL'|\?\? 50|\?\? 0/);
    expect(badgeRoutes).toMatch(/X-TradeClaw-Data-State/);
    expect(badgeRoutes).toMatch(/Cache-Control': 'no-store/);
    expect(badgeRoutes).not.toContain('https://tradeclaw.win/api/badge/${pair}');
  });

  it('fails closed for empty or unavailable public feeds and extension data', () => {
    const feed = read('../../app/api/live-feed/route.ts');
    const extension = read('../../app/api/widget/extension/route.ts');

    expect(feed).toContain("signal.dataQuality === 'real'");
    expect(feed).toMatch(/available: latest.length > 0/);
    expect(feed).toMatch(/no-eligible-recorded-signal/);
    expect(feed).toMatch(/status: 503/);
    expect(feed).toMatch(/no publication cadence/i);
    expect(feed).not.toMatch(/updatedAt: new Date/);

    expect(extension).toContain("signal.dataQuality === 'real'");
    expect(extension).toMatch(/direction: null[\s\S]*confidence: null[\s\S]*recordedAt: null/);
    expect(extension).toMatch(/no synthetic direction, confidence, or timestamp/i);
    expect(extension).not.toMatch(/source: 'fallback'|direction: 'NEUTRAL'|dataFallbackTimestamp/);
  });

  it('makes the profile widget unavailable instead of substituting values', () => {
    const profile = read('../../app/api/widget/profile/route.ts');

    expect(profile).toContain("candidate.dataQuality === 'real'");
    expect(profile).toMatch(/SIGNAL UNAVAILABLE/);
    expect(profile).toMatch(/No confidence, entry price, or RSI placeholder is shown/);
    expect(profile).toMatch(/unsupported-symbol/);
    expect(profile).not.toMatch(/Live Signal Feed|Open Source AI Trading Signals/);
    expect(profile).not.toMatch(/\?\? 'NEUTRAL'|\?\? 50|\?\? 0/);
  });

  it('labels portfolio widgets as paper simulations without invented mark prices', () => {
    const widgetSources = [
      read('../../app/api/widget/badge/route.ts'),
      read('../../app/api/widget/portfolio/route.ts'),
      read('../../app/api/widget/portfolio/badge/route.ts'),
      read('../../app/api/widget/portfolio/card/route.ts'),
      read('../../app/api/widget/portfolio/embed/route.ts'),
    ].join('\n');

    expect(widgetSources).not.toMatch(/BASE_PRICES/);
    expect(widgetSources).toMatch(/paper-simulation|paper simulation/i);
    expect(widgetSources).toMatch(/not broker/i);
    expect(widgetSources).toMatch(/openPnl: null/);
    expect(widgetSources).toMatch(/openPnlAvailable: false/);
    expect(widgetSources).not.toMatch(/setTimeout\([\s\S]*60000/);
    expect(widgetSources).not.toMatch(/TradeClaw Portfolio/);
  });

  it('does not promise live or fixed-cadence badge publication in public clients', () => {
    const badgeClient = read('../../app/badge/BadgeClient.tsx');
    const badgePage = read('../../app/badge/page.tsx');
    const readmeRedirect = read('../../app/badges/readme/page.tsx');

    expect(badgeClient).toMatch(/Recorded Signal Badges/);
    expect(badgeClient).toMatch(/no publication cadence is guaranteed/i);
    expect(badgeClient).not.toMatch(/setInterval|every 5 minutes|Live Signal Badges|Powered by real TA/i);
    expect(badgePage).toMatch(/Recorded Signal Badges/);
    expect(badgePage).toMatch(/no freshness guarantee/i);
    expect(readmeRedirect).toContain("redirect('/badge')");
    expect(existsSync(path('../../app/badges/readme/BadgesReadmeClient.tsx'))).toBe(false);
    expect(existsSync(path('../../app/badges/readme/BadgesReadmeLoader.tsx'))).toBe(false);
    expect(existsSync(path('../../components/badges-client.tsx'))).toBe(false);
  });
});
