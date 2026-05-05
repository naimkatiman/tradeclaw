import { test, expect } from '@playwright/test';

// /track-record reads from signal_history (Railway Postgres). It surfaces win
// rate, profit factor, and the equity curve — the core trust metrics for paid
// conversion. The page must render without 500 even when the table is empty
// (no signals yet, or DB unreachable in a CI/local env without DATABASE_URL).

test.describe('/track-record page', () => {
  test('responds 2xx and renders the page shell', async ({ page }) => {
    const res = await page.goto('/track-record', { waitUntil: 'domcontentloaded' });
    expect(res, 'navigation response').not.toBeNull();
    // Accept any 2xx — the route is statically rendered when the DB is empty
    // and SSR'd when rows exist; both should land below 400.
    expect(res!.status()).toBeLessThan(400);

    // Page-shell smoke check: at least one heading must render. Track-record
    // currently uses h2 throughout (no h1 — see TrackRecordClient.tsx).
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('does not surface an unhandled error page', async ({ page }) => {
    await page.goto('/track-record', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Application error|Internal Server Error|500/i)).toHaveCount(0);
  });

  test('GET /api/signals/history returns 200 with an array shape', async ({ request }) => {
    const res = await request.get('/api/signals/history');
    // Tighter than the existing api/signals.spec.ts which allowed 500 — this
    // endpoint backs /track-record and a 500 here is a real regression.
    expect(res.status()).toBe(200);

    const body = await res.json();
    // Response shape varies (signals[] vs trades[] vs raw array). Assert the
    // common contract: a discoverable iterable on either the root or a
    // signals/trades key.
    // Route returns `{ records, total, offset, limit, stats, ... }` — see
    // app/api/signals/history/route.ts. Older shape variants accepted for
    // forward/backward compat during refactors.
    const candidates = [
      Array.isArray(body) ? body : null,
      Array.isArray(body?.records) ? body.records : null,
      Array.isArray(body?.signals) ? body.signals : null,
      Array.isArray(body?.trades) ? body.trades : null,
      Array.isArray(body?.history) ? body.history : null,
    ].filter(Boolean);
    expect(candidates.length).toBeGreaterThan(0);
  });
});
