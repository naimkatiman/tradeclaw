import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Pro user dashboard render. Forges a Pro session and asserts:
// - the auth gate doesn't redirect to /signin
// - the page renders content (not a loading-only skeleton)
// - no "Upgrade to Pro" CTA banner pushes the user out of dashboard
//   (the upgrade banner is for the locked-signals card on free, but
//    no locked-signal stubs should render for a Pro user)
//
// Live signal counts can be zero in test envs, so we don't assert on
// signal cards directly — only on the contract that nothing about the
// page treats this user as free.

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

test.describe('pro user dashboard', () => {
  test('reaches /dashboard and treats user as paid', async ({ browser, baseURL }) => {
    test.skip(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs USER_SESSION_SECRET and E2E_FORCE_PRO_TIER=true',
    );

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
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Did not bounce to /signin.
    expect(new URL(page.url()).pathname).toBe('/dashboard');

    // Wait for client hydration. The Telegram-link button label is the
    // load-bearing tier-branched UI on this page:
    //   pro  → "Connect Telegram (Pro group access)"
    //   free → "Link Telegram for Pro"
    const connectBtn = page.getByTestId('dashboard-connect-telegram-btn');
    await expect(connectBtn).toBeVisible({ timeout: 15_000 });
    await expect(connectBtn).toContainText(/Connect Telegram \(Pro group access\)/i);

    // Free-tier copy that should NEVER appear for a Pro user.
    await expect(
      page.getByText(/Linking alone won['’]t add you to the Pro group/i),
    ).toHaveCount(0);

    await context.close();
  });
});
