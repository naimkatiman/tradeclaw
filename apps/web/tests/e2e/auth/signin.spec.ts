import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Inline reimplementation of createSessionToken from lib/user-session.ts.
// We cannot import that file in Playwright because it carries `import 'server-only'`
// which throws outside the Next.js RSC bundler.
function makeSessionToken(userId: string, secret: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// Read USER_SESSION_SECRET once at module load so skip decisions are clear.
const USER_SESSION_SECRET = process.env.USER_SESSION_SECRET ?? '';
const sessionSecretAvailable = USER_SESSION_SECRET.length >= 16;

test.describe('signin page — Google-only auth', () => {
  // ---------------------------------------------------------------------------
  // 1. Unauthenticated /dashboard redirects to /signin with next param
  // ---------------------------------------------------------------------------
  test('unauthenticated /dashboard redirects to /signin?next=%2Fdashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/signin/, { timeout: 15_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/signin');
    const next = url.searchParams.get('next');
    expect(next).not.toBeNull();
    // The layout hard-codes next=%2Fdashboard; accept either encoded or decoded form.
    expect(decodeURIComponent(next!)).toBe('/dashboard');
  });

  // ---------------------------------------------------------------------------
  // 2. Unauthenticated /dashboard/billing redirects to /signin
  // ---------------------------------------------------------------------------
  test('unauthenticated /dashboard/billing redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/signin/, { timeout: 15_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/signin');
  });

  // ---------------------------------------------------------------------------
  // 3. Signin page has Google button and NO email form
  // ---------------------------------------------------------------------------
  test('signin page shows Google button and has no email input', async ({ page }) => {
    await page.goto('/signin');
    // Wait for the session check to finish and the button to appear.
    const googleLink = page.getByRole('link', { name: /Continue with Google/i });
    await expect(googleLink).toBeVisible({ timeout: 15_000 });

    // href must point to the start route.
    const href = await googleLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href!.startsWith('/api/auth/google/start')).toBe(true);

    // No email input must exist.
    await expect(page.locator('input[type="email"]')).toHaveCount(0);

    // No submit button labeled "Sign in" (without Google text).
    const submitButtons = page.locator('button[type="submit"]');
    const count = await submitButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await submitButtons.nth(i).innerText();
      expect(text.toLowerCase()).not.toMatch(/^sign in$/i);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Google button href preserves checkout query params
  // ---------------------------------------------------------------------------
  test('Google button href propagates priceId and next params', async ({ page }) => {
    await page.goto('/signin?priceId=price_test&next=%2Fwelcome');
    const googleLink = page.getByRole('link', { name: /Continue with Google/i });
    await expect(googleLink).toBeVisible({ timeout: 15_000 });

    const href = await googleLink.getAttribute('href');
    expect(href).toBeTruthy();
    const u = new URL(href!, 'http://localhost:3000');
    expect(u.pathname).toBe('/api/auth/google/start');
    expect(u.searchParams.get('priceId')).toBe('price_test');
    expect(u.searchParams.get('next')).toBe('/welcome');
  });

  // ---------------------------------------------------------------------------
  // 5. oauth_not_configured error renders
  // ---------------------------------------------------------------------------
  test('oauth_not_configured error message is visible', async ({ page }) => {
    await page.goto('/signin?error=oauth_not_configured');
    await expect(page.getByText(/not configured/i)).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 6. Generic OAuth error renders
  // ---------------------------------------------------------------------------
  test('generic OAuth error message matches Sign-in failed pattern', async ({ page }) => {
    await page.goto('/signin?error=state_mismatch');
    await expect(page.getByText(/Sign-in failed.*state_mismatch/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('session API — POST is 410, GET returns null without cookie', () => {
  // ---------------------------------------------------------------------------
  // 7. POST /api/auth/session returns 410 Gone
  // ---------------------------------------------------------------------------
  test('POST /api/auth/session returns 410 with success:false', async ({ request }) => {
    const res = await request.post('/api/auth/session', {
      data: { email: 'x@y.com' },
    });
    expect(res.status()).toBe(410);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
  });

  // ---------------------------------------------------------------------------
  // 8. GET /api/auth/session without cookie returns null user
  // ---------------------------------------------------------------------------
  test('GET /api/auth/session without cookie returns {success:true, data:null}', async ({ request }) => {
    const res = await request.get('/api/auth/session');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
  });
});

test.describe('Google OAuth start route', () => {
  // ---------------------------------------------------------------------------
  // 9. /api/auth/google/start without GOOGLE_OAUTH_CLIENT_ID redirects to /signin?error=oauth_not_configured
  // ---------------------------------------------------------------------------
  test('GET /api/auth/google/start without client ID redirects with oauth_not_configured', async ({ request }) => {
    // This test relies on GOOGLE_OAUTH_CLIENT_ID being unset in the test env.
    // No .env.local exists in this repo (only .env.example with empty values),
    // so the route will hit the unconfigured branch.
    const res = await request.get('/api/auth/google/start', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const location = res.headers()['location'];
    expect(location).toBeTruthy();
    expect(location).toContain('/signin');
    expect(location).toContain('error=oauth_not_configured');
  });
});

test.describe('authenticated dashboard access', () => {
  // ---------------------------------------------------------------------------
  // 10. Forged tc_user_session cookie bypasses redirect gate
  // ---------------------------------------------------------------------------
  test('valid tc_user_session cookie reaches /dashboard without redirect', async ({ browser }) => {
    if (!sessionSecretAvailable) {
      test.skip(true, 'USER_SESSION_SECRET not set or < 16 chars in test env — cannot forge session cookie');
      return;
    }

    const token = makeSessionToken('test-user-id-123', USER_SESSION_SECRET);
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
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // The layout gate passes when cookie is valid. Should NOT end up at /signin.
    const url = new URL(page.url());
    expect(url.pathname).toBe('/dashboard');

    await context.close();
  });
});
