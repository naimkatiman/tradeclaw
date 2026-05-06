import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

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

test.describe('welcome onboarding', () => {
  test('redirects to signin with next param when unauthenticated', async ({ page }) => {
    await page.goto('/welcome?session_id=cs_test_ignored', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL(/\/signin/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/signin');
    const next = url.searchParams.get('next');
    expect(next).not.toBeNull();
    expect(next).toContain('/welcome');
    expect(next).toContain('cs_test_ignored');
  });

  // Authenticated branch: with a valid session cookie but NO session_id param,
  // the page renders the unverified copy. The verified-state branch additionally
  // calls stripe.checkout.sessions.retrieve which can't be intercepted from
  // Playwright (server-side Stripe SDK call) without a real test session.
  test('authenticated visit without session_id renders unverified onboarding copy', async ({ browser, baseURL }) => {
    test.skip(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs USER_SESSION_SECRET and E2E_FORCE_PRO_TIER=true',
    );

    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const context = await browser.newContext();
    const cookieDomain = new URL(baseURL ?? 'http://localhost:3000').hostname;
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
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });

    // Should NOT redirect to /signin — the cookie is valid.
    expect(new URL(page.url()).pathname).toBe('/welcome');

    // The hero copy distinguishes verified from unverified. Without session_id,
    // the page falls into the "Finish setting up your account." branch.
    await expect(
      page.getByRole('heading', { name: /Finish setting up your account/i }),
    ).toBeVisible({ timeout: 10_000 });

    // The "Welcome to Pro" eyebrow must be present in both branches.
    await expect(page.getByText(/Welcome to Pro/i)).toBeVisible();

    await context.close();
  });
});
