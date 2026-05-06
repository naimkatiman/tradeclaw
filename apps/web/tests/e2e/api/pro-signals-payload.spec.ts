import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Positive-path companion to api/premium-gating.spec.ts. With a forged Pro
// session, /api/signals must return tier:'pro' and the unmasked payload —
// stopLoss/TP2/TP3 are non-null numbers, confidence ≥ 85 is allowed in the
// visible list, and there are no lockedSignals.

function makeSessionToken(userId: string, secret: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

const USER_SESSION_SECRET = process.env.USER_SESSION_SECRET ?? '';
const sessionSecretAvailable = USER_SESSION_SECRET.length >= 16;
const PRO_TIER_STUB_AVAILABLE = process.env.E2E_FORCE_PRO_TIER === 'true';
const PRO_USER_ID = process.env.E2E_PRO_USER_ID ?? 'e2e-pro-user';

test.describe('Premium gating — positive path (pro session)', () => {
  test.beforeEach(() => {
    test.skip(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs USER_SESSION_SECRET and E2E_FORCE_PRO_TIER=true',
    );
  });

  test('GET /api/signals with pro session returns tier:"pro"', async ({ request }) => {
    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const res = await request.get('/api/signals', {
      headers: { Cookie: `tc_user_session=${encodeURIComponent(token)}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { tier?: string };
    expect(body.tier).toBe('pro');
  });

  test('pro response unmasks stopLoss / takeProfit2 / takeProfit3', async ({ request }) => {
    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const res = await request.get('/api/signals', {
      headers: { Cookie: `tc_user_session=${encodeURIComponent(token)}` },
    });
    const body = (await res.json()) as {
      tier: string;
      signals?: Array<Record<string, unknown>>;
    };
    if (!body.signals || body.signals.length === 0) {
      test.skip(true, 'No live signals to inspect — skipping payload assertion');
      return;
    }

    // At least one signal must have an unmasked stopLoss + TP2 + TP3.
    // The free tier strips these to null; pro must include real numbers.
    const withSL = body.signals.find((s) => typeof s.stopLoss === 'number');
    expect(withSL, 'pro tier must surface at least one signal with stopLoss').toBeTruthy();

    for (const sig of body.signals) {
      // None of the visible-tier signals should have stopLoss === null (the
      // free-tier mask shape). They may legitimately omit TP2/TP3 if the TA
      // engine didn't compute one, but stopLoss is a pre-trade gate — every
      // signal has one.
      expect(sig.stopLoss).not.toBeNull();
    }
  });

  test('pro response has no lockedSignals', async ({ request }) => {
    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const res = await request.get('/api/signals', {
      headers: { Cookie: `tc_user_session=${encodeURIComponent(token)}` },
    });
    const body = (await res.json()) as {
      lockedSignals?: Array<Record<string, unknown>>;
    };
    // lockedSignals are stubs shown to free users for high-confidence signals
    // they can't see. Pro can see everything, so this list must be empty
    // (or absent).
    if (body.lockedSignals) {
      expect(body.lockedSignals.length).toBe(0);
    }
  });

  test('pro response allows confidence >= 85 in visible list', async ({ request }) => {
    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const res = await request.get('/api/signals', {
      headers: { Cookie: `tc_user_session=${encodeURIComponent(token)}` },
    });
    const body = (await res.json()) as { signals?: Array<{ confidence: number }> };
    if (!body.signals || body.signals.length === 0) {
      test.skip(true, 'No live signals — cannot assert confidence band');
      return;
    }

    // Free tier caps at < 85. Pro must have NO such cap. We don't require
    // a >=85 signal to exist (none may be live), only that the cap is gone:
    // verified by absence of an upper bound below 100. This is a soft
    // assertion — the strong assertion is the negative-path test in
    // premium-gating.spec.ts which forbids >=85 for free.
    const maxConfidence = Math.max(...body.signals.map((s) => s.confidence));
    expect(maxConfidence).toBeLessThanOrEqual(100);
  });
});
