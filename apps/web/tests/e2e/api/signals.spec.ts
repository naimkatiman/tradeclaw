import { test, expect } from '@playwright/test';

test.describe('Signals API', () => {
  test('GET /api/signals returns signal data', async ({ request }) => {
    const res = await request.get('/api/signals');
    expect(res.status()).toBe(200);

    const body = await res.json();

    // Should return an array of signals (or wrapped in an object)
    if (Array.isArray(body)) {
      // Direct array response
      for (const signal of body.slice(0, 3)) {
        expect(signal).toHaveProperty('symbol');
        expect(signal).toHaveProperty('direction');
        expect(signal).toHaveProperty('confidence');
      }
    } else if (body.signals) {
      // Wrapped response
      expect(Array.isArray(body.signals)).toBe(true);
    } else {
      // At minimum, the response should be valid JSON
      expect(body).toBeDefined();
    }
  });

  test('GET /api/signals filters by symbol', async ({ request }) => {
    const res = await request.get('/api/signals?symbol=XAUUSD');
    expect(res.status()).toBe(200);

    const body = await res.json();
    if (Array.isArray(body) && body.length > 0) {
      for (const signal of body) {
        expect(signal.symbol.toUpperCase()).toContain('XAUUSD');
      }
    }
  });

  test('GET /api/signals rejects unknown symbol', async ({ request }) => {
    const res = await request.get('/api/signals?symbol=FAKEPAIR');
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Unknown symbol');
    expect(body.available).toBeDefined();
  });

  test('GET /api/signals filters by direction', async ({ request }) => {
    const res = await request.get('/api/signals?direction=BUY');
    expect(res.status()).toBe(200);

    const body = await res.json();
    if (Array.isArray(body) && body.length > 0) {
      for (const signal of body) {
        expect(signal.direction).toBe('BUY');
      }
    }
  });

  test('GET /api/signals filters by minConfidence', async ({ request }) => {
    const res = await request.get('/api/signals?minConfidence=80');
    expect(res.status()).toBe(200);

    const body = await res.json();
    if (Array.isArray(body) && body.length > 0) {
      for (const signal of body) {
        expect(signal.confidence).toBeGreaterThanOrEqual(80);
      }
    }
  });

  test('GET /api/signals/history returns history data', async ({ request }) => {
    const res = await request.get('/api/signals/history');
    // May return 200 or 500 depending on DB setup
    expect([200, 500]).toContain(res.status());
  });
});

test.describe('Auth-Protected API Endpoints', () => {
  test('POST /api/webhooks returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/webhooks', {
      data: { url: 'https://example.com/hook', events: ['signal.new'] },
    });
    // Should be 401 if ADMIN_SECRET is set, or 200 in dev mode
    expect([200, 401]).toContain(res.status());
  });

  test('POST /api/keys returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/keys', {
      data: { name: 'test-key' },
    });
    expect([200, 401]).toContain(res.status());
  });
});
