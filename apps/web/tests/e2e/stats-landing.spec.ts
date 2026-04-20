import { test, expect } from '@playwright/test';

test.describe('/api/stats/landing', () => {
  test('returns expected shape', async ({ request }) => {
    const res = await request.get('/api/stats/landing');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('signalsToday');
    expect(typeof body.signalsToday).toBe('number');
    expect(body).toHaveProperty('cumulativePnlPct');
    expect(body).toHaveProperty('profitFactor');
    expect(body).toHaveProperty('closedSignals30d');
    expect(body).toHaveProperty('latestSignal');
    expect(body).toHaveProperty('samples');
  });
});
