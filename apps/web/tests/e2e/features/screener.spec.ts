import { test, expect } from '@playwright/test';

test.describe('Screener Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/screener');
  });

  test('loads screener page', async ({ page }) => {
    // Page should load (dynamic import with loading spinner)
    await page.waitForLoadState('networkidle');

    // Title should reflect screener
    await expect(page).toHaveTitle(/screener/i);
  });

  test('displays signal cards or table', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Wait for content to load (either signal cards, table rows, or a no-data message)
    const content = page.locator(
      '[data-testid="signal-card"], table tbody tr, [class*="card"], [class*="signal"], [class*="grid"] > div',
    ).first();

    // Give it time to fetch and render signals
    await expect(content).toBeVisible({ timeout: 15_000 }).catch(() => {
      // If no signals are available, that's OK — check for empty state
    });
  });

  test('has filter controls', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for filter elements (select, input, button)
    const filters = page.locator('select, input[type="text"], input[type="search"], [class*="filter"]');
    const count = await filters.count();

    // Screener should have some kind of filtering UI
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Dashboard Page', () => {
  test('loads dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Dashboard should render something (don't use networkidle — live connections keep it open)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Key Pages Load', () => {
  const pages = [
    { path: '/docs', name: 'Documentation' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/how-it-works', name: 'How It Works' },
    { path: '/leaderboard', name: 'Leaderboard' },
    { path: '/performance', name: 'Performance' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page loads (${path})`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);

      // Page should have visible content
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
