import { test, expect } from '@playwright/test';

// /signals is a permanent (301) redirect to /screener — see next.config.ts.
// This spec verifies the redirect contract and that /screener (the real page)
// renders correctly. The original spec navigated to /signals expecting a page
// to load there, which broke when the redirect was added.

const IGNORED_CONSOLE_PATTERNS = [
  'analytics',
  'telemetry',
  'googletagmanager',
  'vercel-insights',
  'gtag',
  'hotjar',
  // Rate-limit noise from parallel test traffic — not a page-load defect.
  '429',
  'too many requests',
  // Benign CSP report-only diagnostics — frame-ancestors is ignored in
  // report-only mode and there's no report-to endpoint. Enforced CSP
  // violations are NOT report-only, so they still fail the test.
  'report-only',
  'frame-ancestors',
];

function isIgnoredConsoleMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => lower.includes(pattern));
}

test.describe('/signals → /screener redirect contract', () => {
  test('GET /signals returns a permanent redirect to /screener', async ({ request }) => {
    const res = await request.get('/signals', { maxRedirects: 0 });
    // Next.js returns 308 for `permanent: true`; some proxies normalize to 301.
    expect([301, 308]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/\/screener/);
  });

  test('navigating to /signals lands on /screener after the redirect', async ({ page }) => {
    await page.goto('/signals');
    await expect(page).toHaveURL(/\/screener/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('/screener page render (real signals UI)', () => {
  test('renders core layout with at least one heading', async ({ page }) => {
    await page.goto('/screener');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });

  test('renders screener results or an honest empty state', async ({ page }) => {
    test.setTimeout(90_000);

    // Cold upstream OHLCV fallbacks can legitimately take longer than 20s.
    // Match the route regardless of status so failures report the HTTP result
    // instead of presenting as a misleading response timeout.
    const responsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/screener',
      { timeout: 60_000 },
    );

    await page.goto('/screener');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const body = await response.json() as { results?: unknown[] };
    expect(Array.isArray(body.results)).toBe(true);
    if ((body.results?.length ?? 0) > 0) {
      // Both responsive views remain in the DOM. Select only the visible action:
      // mobile labels it "View Signal" and desktop labels it "View".
      await expect(
        page
          .getByRole('link', { name: /^View(?: Signal)?$/ })
          .filter({ visible: true })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(
        page
          .getByText('No candidates passed this scan', { exact: true })
          .filter({ visible: true })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('direct GET /api/signals returns 200 with shape', async ({ request }) => {
    const res = await request.get('/api/signals');
    expect(res.status()).toBe(200);

    const body: unknown = await res.json();

    if (Array.isArray(body)) {
      if (body.length > 0) {
        const first = body[0] as Record<string, unknown>;
        expect(first).toHaveProperty('symbol');
        expect(first).toHaveProperty('direction');
      }
    } else if (body !== null && typeof body === 'object') {
      const wrapped = body as Record<string, unknown>;
      expect(Array.isArray(wrapped['signals'])).toBe(true);
      const signals = wrapped['signals'] as unknown[];
      if (signals.length > 0) {
        const first = signals[0] as Record<string, unknown>;
        expect(first).toHaveProperty('symbol');
        expect(first).toHaveProperty('direction');
      }
    } else {
      expect(body).toBeDefined();
    }
  });

  test('no console errors on /screener page load', async ({ page }) => {
    const appErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnoredConsoleMessage(msg.text())) {
        appErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      if (!isIgnoredConsoleMessage(err.message)) {
        appErrors.push(err.message);
      }
    });

    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    // Avoid networkidle — /screener has long-polling feeds. domcontentloaded
    // is sufficient to surface real load-time errors.
    await page.waitForLoadState('domcontentloaded');

    expect(appErrors).toHaveLength(0);
  });
});
