import { test, expect } from '@playwright/test';

// /api/cron/signals — Writer B in the signal-history pipeline. The only path
// that resolves 4h/24h outcomes via resolveOldSignals(). If this endpoint
// regresses, equity curves and win-rate columns silently stop updating.
//
// Auth contract (route.ts → isAuthorized):
//   - CRON_SECRET set     → must send `Authorization: Bearer <secret>` else 401
//   - CRON_SECRET unset   → allowed in non-production, denied in production

const CRON_SECRET = process.env.CRON_SECRET ?? '';

test.describe('/api/cron/signals — auth contract', () => {
  test('rejects requests with a wrong bearer token', async ({ request }) => {
    const res = await request.get('/api/cron/signals', {
      headers: { authorization: 'Bearer not-the-real-secret' },
    });
    // Either 401 (secret configured, mismatch) or 200 (secret unset in dev,
    // header is ignored). The forbidden-bearer case must never expose 500.
    expect([200, 401]).toContain(res.status());
    if (CRON_SECRET) {
      expect(res.status()).toBe(401);
    }
  });

  test('GET succeeds in non-production when the dev/test guard is open', async ({ request }) => {
    test.skip(
      !!CRON_SECRET,
      'CRON_SECRET is configured in this env — bearer auth is mandatory; covered by the authorized-call test below',
    );

    const res = await request.get('/api/cron/signals');
    expect(res.status()).toBeLessThan(500);
    // 200 is the happy path. The route also tolerates 404/501-class signals
    // when no real-data triples qualify; we stop short of asserting status=200
    // to avoid coupling to TA outcomes during a CI run with empty DB.
    expect(res.status()).toBeLessThan(400);

    const body = await res.json().catch(() => null);
    expect(body).not.toBeNull();
    // route.ts returns { ok, recorded, resolved, ... } — assert the envelope
    // exists rather than the field counts (those depend on live data).
    expect(body).toHaveProperty('ok');
  });

  test('authorized GET succeeds when CRON_SECRET is set', async ({ request }) => {
    test.skip(!CRON_SECRET, 'CRON_SECRET not configured — authorized path covered by the dev-open test');

    const res = await request.get('/api/cron/signals', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status()).toBeLessThan(400);
    const body = await res.json();
    expect(body).toHaveProperty('ok');
  });
});
