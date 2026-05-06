import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

// /api/stripe/portal opens the Stripe billing portal where the user can
// switch interval, update card, or cancel. UI entry point is the "Manage
// Billing" button on /dashboard/billing.
//
// We don't hit Stripe — the network layer is mocked and we only assert
// the integration: button click → POST → response URL → navigation.

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

test.describe('stripe billing portal', () => {
  test('POST /api/stripe/portal without session returns 401', async ({ request }) => {
    const res = await request.post('/api/stripe/portal');
    expect(res.status()).toBe(401);
  });

  test('Manage Billing click POSTs to portal and navigates to returned URL', async ({ browser, baseURL }) => {
    test.skip(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs USER_SESSION_SECRET and E2E_FORCE_PRO_TIER=true',
    );

    const fakePortalUrl = 'https://billing.stripe.com/p/session/test-portal-e2e';
    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const cookieDomain = new URL(baseURL ?? 'http://localhost:3000').hostname;

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'tc_user_session',
        value: token,
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const page = await context.newPage();

    // Mock both endpoints: portal for the POST result, and the destination
    // host so we don't navigate off-domain.
    await page.route('**/api/stripe/portal', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: fakePortalUrl }),
      }),
    );
    await page.route('https://billing.stripe.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>portal stub</html>' }),
    );

    await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });

    const manageBilling = page.getByRole('button', { name: /Manage Billing/i });
    await expect(manageBilling).toBeVisible({ timeout: 15_000 });
    await manageBilling.click();

    await page.waitForURL(fakePortalUrl, { timeout: 10_000 });
    expect(page.url()).toBe(fakePortalUrl);

    await context.close();
  });
});
