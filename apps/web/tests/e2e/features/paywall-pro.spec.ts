import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Authenticated Pro paywall — the unlocked side of tier-journey.spec.ts which
// only covers the anonymous lockdown. After payment the user must SEE entry,
// stop-loss, and TP values rather than the `••••` masked pills.
//
// Session is forged with the same HMAC pattern used in auth/signin.spec.ts so
// the test does not need a live OAuth round-trip. The cookie is the only auth
// surface the layout gate checks.

function makeSessionToken(userId: string, secret: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

const USER_SESSION_SECRET = process.env.USER_SESSION_SECRET ?? '';
const sessionSecretAvailable = USER_SESSION_SECRET.length >= 16;

// TODO: once the test env can mint a Pro tier in DB (or stub the tier lookup),
// flip these to run by default. Today the forged cookie authenticates the user
// but their tier is whatever the DB row says — typically `free` for an unknown
// user id. Without a tier-stub mechanism, the unlocked-content assertions
// below would behave identically to the anonymous case.
const PRO_TIER_STUB_AVAILABLE =
  process.env.E2E_FORCE_PRO_TIER === 'true' || process.env.STRIPE_TEST_PRO_USER_ID !== undefined;

test.describe('authenticated pro paywall — unlocked state', () => {
  test('pro user sees entry/SL/TP values on a signal detail page', async ({ browser, request }) => {
    test.fixme(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs USER_SESSION_SECRET (≥16 chars) AND a way to assert the test user is Pro tier (E2E_FORCE_PRO_TIER=true or STRIPE_TEST_PRO_USER_ID set)',
    );

    // Pull a real triple from the public teaser so the URL routes to a live
    // signal — same trick as tier-journey.spec.ts.
    const teaserRes = await request.get('/api/signals/public');
    const teaser = await teaserRes.json();
    test.skip(!teaser?.signals?.length, 'No live signals available — skipping unlocked-detail test');

    const sig = teaser.signals[0];
    const proUserId = process.env.STRIPE_TEST_PRO_USER_ID ?? 'e2e-pro-user';
    const token = makeSessionToken(proUserId, USER_SESSION_SECRET);

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'tc_user_session',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const page = await context.newPage();
    await page.goto(`/signal/${sig.symbol}-${sig.timeframe}-${sig.direction}`, {
      waitUntil: 'domcontentloaded',
    });

    // Mask should be gone — `••••` is the anon-only pill.
    await expect(page.getByText('••••')).toHaveCount(0);

    // The Pro chart-only copy must be GONE — that string is shown only when
    // the chart is locked behind the gate card.
    await expect(
      page.getByText(/Price chart with entry, SL, and TP lines is a Pro feature/i),
    ).toHaveCount(0);

    // Real data labels must be visible. Capitalized "Entry"/"Stop Loss"/"TP1"
    // are the data labels per tier-journey.spec.ts:55-60.
    await expect(page.getByText(/\bEntry\b/).first()).toBeVisible();
    await expect(page.getByText(/\bStop Loss\b/).first()).toBeVisible();
    await expect(page.getByText(/\bTP[123]\b/).first()).toBeVisible();

    await context.close();
  });

  test('pro user navbar shows the Pro tier badge', async ({ browser }) => {
    test.fixme(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs forged session AND Pro-tier stub — see test above',
    );

    const proUserId = process.env.STRIPE_TEST_PRO_USER_ID ?? 'e2e-pro-user';
    const token = makeSessionToken(proUserId, USER_SESSION_SECRET);

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'tc_user_session',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const page = await context.newPage();
    await page.goto('/');

    const badge = page.getByRole('link', { name: /current plan: Pro/i });
    await expect(badge).toBeVisible();

    await context.close();
  });
});
