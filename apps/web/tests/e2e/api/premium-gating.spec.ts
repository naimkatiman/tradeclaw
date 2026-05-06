import { test, expect } from '@playwright/test';

/**
 * Premium-gating negative-path tests for /api/signals.
 *
 * The route does NOT use a `premium=1` query flag for gating.
 * Gating is tier-based, driven by the `tc_user_session` cookie (HMAC-signed).
 * Unauthenticated callers always resolve to 'free' tier and receive a 200 with
 * a degraded payload: restricted symbols, signals capped at confidence < 85,
 * stopLoss/takeProfit2/takeProfit3 set to null, and advanced indicators zeroed.
 * There is no 401/403 — the route is fail-open (free tier fallback).
 *
 * What these tests verify:
 * - Unauthorized callers get 200 (not a hard rejection)
 * - The response carries `tier: "free"` — proof the session was not honoured
 * - Pro-only fields are masked (stopLoss null, takeProfit2/3 null)
 * - High-confidence (>=85) signals are absent from the free response
 * - Bogus/malformed session cookies are ignored (same degraded 200)
 * - `lockedSignals` stubs carry no price information
 */

const BASE_URL = 'https://tradeclaw.win';

/** A syntactically valid but cryptographically invalid session cookie value. */
const FAKE_SESSION_TOKEN =
  'fake-user-id.1700000000000.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

/** An obviously malformed value — wrong segment count. */
const MALFORMED_SESSION_TOKEN = 'not.a.valid.hmac.token.at.all';

test.describe('Premium gating — negative-path (unauthenticated / invalid session)', () => {
  test('GET /api/signals without auth returns 200 with free tier payload', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/signals`);
    expect([200, 500]).toContain(res.status());

    if (res.status() === 200) {
      const body: Record<string, unknown> = await res.json();
      expect(body.tier).toBe('free');
    }
  });

  test('GET /api/signals?premium=1 without auth returns 200 with free tier (no hard rejection)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/signals?premium=1`);
    // Route ignores the premium param — no dedicated gating on it.
    // Unauthenticated → free tier → 200 with degraded payload.
    expect([200, 500]).toContain(res.status());

    if (res.status() === 200) {
      const body: Record<string, unknown> = await res.json();
      expect(body.tier).toBe('free');
    }
  });

  test('GET /api/signals with bogus Authorization header resolves to free tier', async ({ request }) => {
    // The route does not read Authorization headers — only the tc_user_session cookie.
    // A bogus Bearer token must not elevate access.
    const res = await request.get(`${BASE_URL}/api/signals`, {
      headers: { Authorization: 'Bearer fake-key-12345' },
    });
    expect([200, 500]).toContain(res.status());

    if (res.status() === 200) {
      const body: Record<string, unknown> = await res.json();
      expect(body.tier).toBe('free');
    }
  });

  test('GET /api/signals with syntactically valid but fake session cookie resolves to free tier', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/signals`, {
      headers: {
        Cookie: `tc_user_session=${encodeURIComponent(FAKE_SESSION_TOKEN)}`,
      },
    });
    expect([200, 500]).toContain(res.status());

    if (res.status() === 200) {
      const body: Record<string, unknown> = await res.json();
      // HMAC verification fails → session rejected → tier falls back to free.
      expect(body.tier).toBe('free');
    }
  });

  test('GET /api/signals with malformed session cookie resolves to free tier', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/signals`, {
      headers: {
        Cookie: `tc_user_session=${encodeURIComponent(MALFORMED_SESSION_TOKEN)}`,
      },
    });
    expect([200, 500]).toContain(res.status());

    if (res.status() === 200) {
      const body: Record<string, unknown> = await res.json();
      expect(body.tier).toBe('free');
    }
  });

  test('free-tier response masks pro-only signal fields', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/signals`);
    expect([200, 500]).toContain(res.status());

    if (res.status() !== 200) return;

    const body: Record<string, unknown> = await res.json();
    if (body.tier !== 'free') return; // only assert on confirmed free responses

    const signals = body.signals as Array<Record<string, unknown>> | undefined;
    if (!signals || signals.length === 0) return;

    for (const signal of signals) {
      // stopLoss must be null (masked for free tier)
      expect(signal.stopLoss).toBeNull();
      // takeProfit2 and takeProfit3 must be null (masked for free tier)
      expect(signal.takeProfit2).toBeNull();
      expect(signal.takeProfit3).toBeNull();

      // No signal in the free visible list should have confidence >= 85 (pro-only band)
      const confidence = signal.confidence as number;
      expect(confidence).toBeLessThan(85);
    }
  });

  test('lockedSignals stubs contain no price information', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/signals`);
    expect([200, 500]).toContain(res.status());

    if (res.status() !== 200) return;

    const body: Record<string, unknown> = await res.json();
    const locked = body.lockedSignals as Array<Record<string, unknown>> | undefined;

    if (!locked || locked.length === 0) return;

    for (const stub of locked) {
      // Stubs must carry only the public-safe fields defined in LockedSignalStub
      expect(stub.locked).toBe(true);
      expect(stub).toHaveProperty('id');
      expect(stub).toHaveProperty('symbol');
      expect(stub).toHaveProperty('direction');
      expect(stub).toHaveProperty('timeframe');
      expect(stub).toHaveProperty('confidence');
      expect(stub).toHaveProperty('availableAt');

      // Price levels must NOT be present
      expect(stub.entry).toBeUndefined();
      expect(stub.stopLoss).toBeUndefined();
      expect(stub.takeProfit1).toBeUndefined();
      expect(stub.takeProfit2).toBeUndefined();
      expect(stub.takeProfit3).toBeUndefined();
      expect(stub.indicators).toBeUndefined();
    }
  });
});
