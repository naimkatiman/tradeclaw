import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('renders hero section with CTA', async ({ page }) => {
    // Main navbar should be visible (first nav = desktop, second = mobile bottom)
    await expect(page.locator('nav').first()).toBeVisible();

    // Hero heading should exist
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Should have at least one CTA (button or link) in the hero area
    const cta = page.locator('main a, main button').first();
    await expect(cta).toBeVisible();
  });

  test('renders key landing sections', async ({ page }) => {
    // Scroll to bottom to trigger lazy sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // FAQ section should exist somewhere on the page (A/B variants may differ)
    const faq = page.getByText(/faq|frequently asked/i).first();
    await expect(faq).toBeVisible({ timeout: 10_000 });
  });

  test('navbar links are functional', async ({ page }) => {
    // Use first nav (desktop) to avoid strict mode violation
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Should have links to major sections
    const links = nav.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Filter out expected dev-mode warnings and hydration mismatches (A/B test variants)
    const real = errors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('DevTools') &&
        !e.includes('Hydration'),
    );
    expect(real).toHaveLength(0);
  });
});
