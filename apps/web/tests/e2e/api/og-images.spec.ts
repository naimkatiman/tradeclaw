import { expect, test } from '@playwright/test';

const routes = [
  '/api/og/leaderboard',
  '/api/og/track-record',
  '/api/og/summary?period=daily&date=2026-07-15',
] as const;

test.describe('Open Graph image routes', () => {
  for (const route of routes) {
    test(`${route} returns a rendered image`, async ({ request }) => {
      const response = await request.get(route);
      const body = await response.body();

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/^image\//);
      expect(body.byteLength).toBeGreaterThan(1_000);
    });
  }
});
