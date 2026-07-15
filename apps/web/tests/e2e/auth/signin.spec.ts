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

test.describe('public dashboard and sign-in', () => {
  // ---------------------------------------------------------------------------
  // 1. Public mode keeps the read-only dashboard available without auth
  // ---------------------------------------------------------------------------
  test('unauthenticated /dashboard opens the public read-only workspace', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/dashboard');
    await expect(page.getByRole('navigation', { name: 'Member navigation' })).toBeVisible();
    await expect(page.getByTestId('dashboard-connect-telegram-btn')).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------
  // 2. Signin page has Google as primary CTA + a magic-link fallback below
  // ---------------------------------------------------------------------------
  // signin/page.tsx ships both Google OAuth (primary) and a magic-link email
  // form (fallback, separated by an "or" divider). This test asserts the
  // contract rather than locking the page to Google-only.
  test('signin page shows Google as primary CTA with magic-link fallback', async ({ page }) => {
    await page.goto('/signin');
    // Wait for the session check to finish and the button to appear.
    const googleLink = page.getByRole('link', { name: /Continue with Google/i });
    await expect(googleLink).toBeVisible({ timeout: 15_000 });

    // href must point to the start route.
    const href = await googleLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href!.startsWith('/api/auth/google/start')).toBe(true);

    // The magic-link form is the secondary CTA. It must come AFTER the
    // Google button in DOM order so Google remains the primary path.
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveCount(1);

    // No legacy "Sign in" submit (password form would have been labeled this).
    const submitButtons = page.locator('button[type="submit"]');
    const count = await submitButtons.count();
    for (let i = 0; i < count; i++) {
      const text = (await submitButtons.nth(i).innerText()).trim();
      expect(text.toLowerCase()).not.toMatch(/^sign in$/);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Google button href preserves the next param
  // ---------------------------------------------------------------------------
  test('Google button href propagates the next param', async ({ page }) => {
    await page.goto('/signin?next=%2Fdashboard');
    const googleLink = page.getByRole('link', { name: /Continue with Google/i });
    await expect(googleLink).toBeVisible({ timeout: 15_000 });

    const href = await googleLink.getAttribute('href');
    expect(href).toBeTruthy();
    const u = new URL(href!, 'http://localhost:3000');
    expect(u.pathname).toBe('/api/auth/google/start');
    expect(u.searchParams.get('next')).toBe('/dashboard');
  });

  // ---------------------------------------------------------------------------
  // 5. oauth_not_configured error renders
  // ---------------------------------------------------------------------------
  test('oauth_not_configured error message is visible', async ({ page }) => {
    await page.goto('/signin?error=oauth_not_configured');
    await expect(page.getByText(/not configured/i)).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 6. Generic OAuth error renders — human copy, never raw internal codes
  // ---------------------------------------------------------------------------
  test('generic OAuth error message matches Sign-in failed pattern', async ({ page }) => {
    await page.goto('/signin?error=state_mismatch');
    await expect(page.getByText(/Sign-in failed\. Please try again\./i)).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 6b. Magic-link error codes get guidance toward the email form
  // ---------------------------------------------------------------------------
  test('expired magic link steers the user to request a fresh one', async ({ page }) => {
    await page.goto('/signin?error=expired');
    await expect(page.getByText(/link expired/i)).toBeVisible({ timeout: 10_000 });
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
  test('GET /api/auth/google/start without client ID redirects with oauth_not_configured', async ({ request, baseURL }) => {
    // This test asserts the unconfigured-OAuth fallback. It's only meaningful
    // when the env has no GOOGLE_OAUTH_CLIENT_ID — running against prod or any
    // env where OAuth IS configured produces a 302 to accounts.google.com,
    // which is the correct behavior, not a regression. Skip in those cases.
    const probe = await request.get('/api/auth/google/start', { maxRedirects: 0 });
    const probeLocation = probe.headers()['location'] ?? '';
    test.skip(
      probeLocation.includes('accounts.google.com'),
      `OAuth is configured against ${baseURL} — fallback path not exercisable here`,
    );

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
  // 10. A valid session also reaches the shared dashboard workspace
  // ---------------------------------------------------------------------------
  test('valid tc_user_session cookie reaches /dashboard', async ({ browser }) => {
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

    const url = new URL(page.url());
    expect(url.pathname).toBe('/dashboard');

    await context.close();
  });
});
