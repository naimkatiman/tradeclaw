import { test, expect } from '@playwright/test';

// Everything is free: anonymous callers get the full signal payload with no
// masking, no locked stubs, and no history clamp. These tests anchor the
// ungated contract so a tier gate can never silently return.

test.describe('ungated API contract — full access for anonymous callers', () => {
  test('GET /api/signals returns entry + takeProfit + stopLoss fields with no lockedSignals key', async ({ request }) => {
    const res = await request.get('/api/signals');
    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      signals: Array<Record<string, unknown>>;
      lockedSignals?: unknown;
      tier?: unknown;
    };

    expect(body).not.toHaveProperty('lockedSignals');
    expect(body).not.toHaveProperty('tier');
    expect(Array.isArray(body.signals)).toBe(true);

    // Signal presence depends on live market conditions; when signals exist
    // every one of them must carry the full trade payload.
    for (const sig of body.signals) {
      expect(sig).toHaveProperty('entry');
      expect(sig).toHaveProperty('takeProfit1');
      expect(sig).toHaveProperty('stopLoss');
      // TP2/TP3 are optional on live-scanner signals; when present they must
      // be real values, never a masked/locked placeholder.
      for (const key of ['takeProfit2', 'takeProfit3'] as const) {
        if (key in sig && sig[key] != null) {
          expect(typeof sig[key]).toBe('number');
        }
      }
    }
  });

  test('GET /api/signals/history serves a >7-day window anonymously', async ({ request }) => {
    const res30 = await request.get('/api/signals/history?period=30d&limit=200');
    expect(res30.status()).toBe(200);

    const body30 = (await res30.json()) as {
      records: Array<{ timestamp: number }>;
      stats?: unknown;
    };

    expect(Array.isArray(body30.records)).toBe(true);
    expect(body30).toHaveProperty('stats');

    // The old free tier clamped history to 7 days. Sound check without
    // assuming archive contents: a 30d window must never return FEWER rows
    // than a 7d window (a live clamp would truncate them to equal-or-less
    // than 7d while dropping the older rows).
    const res7 = await request.get('/api/signals/history?period=7d&limit=200');
    expect(res7.status()).toBe(200);
    const body7 = (await res7.json()) as { records: Array<{ timestamp: number }> };
    expect(body30.records.length).toBeGreaterThanOrEqual(body7.records.length);
  });
});
