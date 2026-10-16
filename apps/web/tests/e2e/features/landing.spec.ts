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

  test('renders the go-deeper strip (layer-2 doorway)', async ({ page }) => {
    // Scroll to bottom to complete the scroll-scrubbed reveal
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const strip = page.getByRole('region', { name: /go deeper/i });
    await expect(strip).toBeVisible({ timeout: 10_000 });
    await expect(strip.getByRole('link', { name: /see the record/i })).toHaveAttribute('href', '/track-record');
    await expect(strip.getByRole('link', { name: /test an idea/i })).toHaveAttribute('href', '/backtest');
    await expect(strip.getByRole('link', { name: /self-host the lab/i })).toHaveAttribute('href', '/start');
  });

  test('layer 1 carries no floating product chrome', async ({ page }) => {
    // The star progress bar slides in after ~5s on product pages; give it
    // time to prove absence on the marketing surface.
    await page.waitForTimeout(6000);
    await expect(page.getByText(/until 50|1,000 stars/i)).toHaveCount(0);
    // Full-navbar chrome is gone too: no More dropdown on layer 1.
    await expect(page.getByRole('button', { name: /^More/ })).toHaveCount(0);
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
    const real = errors.filter((e) => {
      const lower = e.toLowerCase();
      return (
        !e.includes('Warning:') &&
        !e.includes('DevTools') &&
        !e.includes('Hydration') &&
        // Benign CSP report-only diagnostics (frame-ancestors ignored / no
        // report-to). Enforced CSP violations are not report-only, so they
        // still fail.
        !lower.includes('report-only') &&
        !lower.includes('frame-ancestors')
      );
    });
    expect(real).toHaveLength(0);
  });
});
