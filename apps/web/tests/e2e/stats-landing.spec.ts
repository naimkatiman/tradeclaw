import { test, expect } from '@playwright/test';

// /api/stats/landing reads from signal_history in Postgres. Local dev
// without DATABASE_URL produces a 500 with the stubbed error body, which
// is correct behavior for an unconfigured env — but it makes this test
// fail noisily in every local run. Probe once and skip when the env
// can't reach the DB; against prod or any DB-backed env the assertions
// run.
test.describe('/api/stats/landing', () => {
  test('returns expected shape', async ({ request }) => {
    const probe = await request.get('/api/stats/landing');
    if (probe.status() === 500) {
      const body = (await probe.json().catch(() => ({}))) as { error?: string };
      test.skip(
        /DATABASE_URL/i.test(body.error ?? ''),
        'DATABASE_URL not set in this env — endpoint can\'t reach the stats source',
      );
    }

    const res = await request.get('/api/stats/landing');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('signalsToday');
    expect(typeof body.signalsToday).toBe('number');
    expect(body).toHaveProperty('cumulativePnlPct');
    expect(body).toHaveProperty('profitFactor');
    expect(body).toHaveProperty('closedSignals');
    expect(body).toHaveProperty('latestSignal');
    expect(body).toHaveProperty('samples');
  });
});
