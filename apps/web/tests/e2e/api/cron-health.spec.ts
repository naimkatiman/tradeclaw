import { test, expect } from '@playwright/test';
import { skipIfNotLocal } from '../lib/prod-only';

// The route's isAuthorized (route.ts:28-35) returns true when CRON_SECRET is
// unset AND NODE_ENV !== 'production'. So in a dev/test env without a secret
// the unauthorized assertions below would falsely pass with 200 — those tests
// must skip unless either CRON_SECRET is set or we're running against prod.
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const enforcesAuth = !!CRON_SECRET || NODE_ENV === 'production';

test.describe('Cron /api/cron/signals health', () => {
  test.beforeAll(() => {
    skipIfNotLocal();
  });

  test('cron without secret returns 401/403', async ({ request }) => {
    test.skip(!enforcesAuth, 'CRON_SECRET unset in non-production — route allows open access by design');
    const res = await request.get('/api/cron/signals');
    expect([401, 403]).toContain(res.status());
  });

  test('cron with wrong secret returns 401/403', async ({ request }) => {
    test.skip(!enforcesAuth, 'CRON_SECRET unset in non-production — bearer is ignored');
    const res = await request.get('/api/cron/signals', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('cron with correct secret returns 200 and a status payload', async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      test.skip(true, 'CRON_SECRET not set in environment — skipping authenticated test');
      return;
    }

    const res = await request.get('/api/cron/signals', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);

    const body: {
      ok: boolean;
      recorded: number;
      resolved: number;
      pending: number;
      strategyId: string;
      timestamp: string;
    } = await res.json();

    expect(body.ok).toBe(true);
    expect(typeof body.recorded).toBe('number');
    expect(typeof body.resolved).toBe('number');
    expect(typeof body.pending).toBe('number');
    expect(typeof body.strategyId).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });

  test('cron is idempotent within dedup window', async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      test.skip(true, 'CRON_SECRET not set in environment — skipping idempotency test');
      return;
    }

    const headers = { Authorization: `Bearer ${secret}` };

    const first = await request.get('/api/cron/signals', { headers });
    expect(first.status()).toBe(200);
    const firstBody: { ok: boolean; recorded: number } = await first.json();
    expect(firstBody.ok).toBe(true);

    const second = await request.get('/api/cron/signals', { headers });
    expect(second.status()).toBe(200);
    const secondBody: { ok: boolean; recorded: number } = await second.json();
    expect(secondBody.ok).toBe(true);

    // Second run within the 2-hour dedup window must record zero new signals
    expect(secondBody.recorded).toBe(0);
  });

  test('cron route rejects POST with wrong secret', async ({ request }) => {
    test.skip(!enforcesAuth, 'CRON_SECRET unset in non-production — bearer is ignored');
    const res = await request.post('/api/cron/signals', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
