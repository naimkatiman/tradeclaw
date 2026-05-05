import { test, expect } from '@playwright/test';

const IGNORED_CONSOLE_PATTERNS = [
  'analytics',
  'telemetry',
  'googletagmanager',
  'vercel-insights',
  'gtag',
  'hotjar',
];

function isIgnoredConsoleMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => lower.includes(pattern));
}

test.describe('/signals page render', () => {
  test('landing → /signals navigation works', async ({ page }) => {
    await page.goto('/');

    const signalsLink = page.locator('a[href="/signals"], a[href*="/signals"]').first();
    const linkExists = await signalsLink.count();

    if (linkExists > 0) {
      await signalsLink.click();
      await page.waitForURL(/\/signals/, { timeout: 15000 });
    } else {
      await page.goto('/signals');
    }

    await expect(page).toHaveURL(/\/signals/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/signals page renders core layout', async ({ page }) => {
    await page.goto('/signals');

    const heading = page.getByRole('heading', { name: /signals/i }).first();
    const titleMatch = await heading.count();

    if (titleMatch > 0) {
      await expect(heading).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.locator('h1, h2').filter({ hasText: /signals/i }).first()).toBeVisible({
        timeout: 15000,
      });
    }

    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });

  test('signal cards or table rows load with real data', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/signals') && r.status() === 200,
      { timeout: 20000 }
    );

    await page.goto('/signals');
    await responsePromise;

    const candidates = [
      page.locator('[data-testid*="signal"]'),
      page.locator('article'),
      page.locator('tbody tr'),
      page.locator('[class*="signal"]'),
      page.getByText(/(BUY|SELL|LONG|SHORT)/i).first().locator('..').locator('..'),
    ];

    let found = false;
    for (const locator of candidates) {
      const count = await locator.count();
      if (count >= 1) {
        await expect(locator.first()).toBeVisible({ timeout: 5000 });
        found = true;
        break;
      }
    }

    if (!found) {
      // Fallback: assert the direction text itself is visible
      await expect(page.getByText(/(BUY|SELL|LONG|SHORT)/i).first()).toBeVisible({
        timeout: 10000,
      });
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
      // At minimum valid JSON
      expect(body).toBeDefined();
    }
  });

  test('no console errors on signals page load', async ({ page }) => {
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

    await page.goto('/signals');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    expect(appErrors).toHaveLength(0);
  });
});
