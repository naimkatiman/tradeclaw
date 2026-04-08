import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with CTA', async ({ page }) => {
    // Navbar should be visible
    await expect(page.locator('nav')).toBeVisible();

    // Hero heading should exist
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Should have at least one CTA link/button
    const cta = page.locator('a[href*="screener"], a[href*="dashboard"], a[href*="github"], button').first();
    await expect(cta).toBeVisible();
  });

  test('renders key landing sections', async ({ page }) => {
    // How It Works section
    await expect(page.getByText(/how it works/i).first()).toBeVisible();

    // FAQ section
    await expect(page.getByText(/faq/i).first()).toBeVisible();
  });

  test('navbar links are functional', async ({ page }) => {
    // Check that navbar contains links to key pages
    const nav = page.locator('nav');
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
    await page.waitForLoadState('networkidle');

    // Filter out expected dev-mode warnings
    const real = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('DevTools'),
    );
    expect(real).toHaveLength(0);
  });
});
