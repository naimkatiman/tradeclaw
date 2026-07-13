import { test, expect } from '@playwright/test';

/**
 * Brand states: the 404 page speaks the house voice on design tokens, and
 * the landing content stays fully visible under prefers-reduced-motion
 * (the scroll-reveal system is progressive enhancement only).
 */

test.describe('branded 404', () => {
  test('unknown route shows the house 404 and the way back', async ({ page }) => {
    await page.goto('/definitely-not-a-page-9f3k');
    await expect(page.locator('h1')).toContainText(/no edge found/i);
    await expect(page.locator('h1')).toContainText(/no page, either/i);
    const home = page.getByRole('link', { name: /back to the evidence/i });
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute('href', '/');
    // .first() — the 404 body CTA; the global footer carries the same link text
    await expect(
      page.getByRole('link', { name: /what we tested and killed/i }).first(),
    ).toHaveAttribute('href', '/research');
  });
});

test.describe('landing under reduced motion', () => {
  test('hero and below-fold sections stay visible', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByTestId('proof-hero')).toBeVisible();
    // Hero headline (staggered entrance must be disabled, not hidden)
    await expect(page.locator('h1')).toContainText(/we measured/i);
    // A below-fold reveal-wrapped section must be visible once scrolled to.
    // toBeVisible() ignores opacity — assert it explicitly, since a
    // reduced-motion regression would fail exactly there.
    const faq = page.locator('.reveal').last();
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toBeVisible();
    await expect(faq).toHaveCSS('opacity', '1');
    await context.close();
  });
});
