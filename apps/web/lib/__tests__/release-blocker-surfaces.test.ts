import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

describe('release blocker public surfaces', () => {
  it('does not expose a fake exchange catalog or credential flow', () => {
    const api = source('app/api/exchanges/route.ts');
    const page = source('app/exchanges/ExchangesClient.tsx');
    const combined = `${api}\n${page}`;

    expect(combined).not.toContain('100+');
    expect(combined).not.toContain('Supported via CCXT');
    expect(combined).not.toContain('Test Connection');
    expect(combined).not.toContain('localStorage');
    expect(combined).not.toContain('latencyMs');
    expect(api).toContain('Credentials were not processed or stored');
  });

  it('does not publish placeholder sponsor identities, quotes, or totals', () => {
    const api = source('app/api/sponsors/route.ts');
    const page = source('app/sponsors/SponsorsClient.tsx');
    const combined = `${api}\n${page}`;

    expect(combined).not.toContain('Alex Chen');
    expect(combined).not.toContain('Sarah K.');
    expect(combined).not.toContain('free forever');
    expect(combined).not.toContain('This is the trading tool I wish existed');
    expect(combined).not.toContain('12+');
    expect(api).toContain('monthlyRevenueUsd: null');
  });

  it('has no generated star-history fallback and renders an unavailable state', () => {
    const api = source('app/api/star-history/route.ts');
    const page = source('app/star-history/StarHistoryClient.tsx');

    expect(api).not.toContain('mulberry32');
    expect(api).not.toContain('Math.random');
    expect(api).not.toContain('repoStart');
    expect(page).toContain('GitHub star history unavailable');
    expect(page).toContain('does not generate or estimate missing');
  });

  it('keeps public leaderboard reads side-effect free and labels legacy outcomes', () => {
    const cache = source('lib/leaderboard-cache.ts');
    const trackRecord = source('app/track-record/TrackRecordClient.tsx');
    const equityCurve = source('app/components/equity-curve.tsx');

    expect(cache).not.toContain('resolveRealOutcomes');
    expect(trackRecord).not.toContain('Outcome tracker live');
    expect(trackRecord).toContain("text: 'unverified'");
    expect(equityCurve).toContain('No zero-return placeholder is shown');
  });
});
