import { test, expect } from '@playwright/test';

/**
 * The four transparency pivot pages are the OSS centerpiece and the pages
 * meant to be shared. Guard: they render, keep the navbar, and carry the
 * canonical + openGraph metadata that share cards depend on.
 */

const PIVOT_PAGES = [
  { path: '/research', h1: /what we tested/i },
  { path: '/methodology', h1: /numbers are made/i },
  { path: '/why-long-term', h1: /the more you trade/i },
  { path: '/open-data', h1: /open data|every number/i },
  { path: '/faq', h1: /frequently asked/i },
] as const;

for (const { path, h1 } of PIVOT_PAGES) {
  test.describe(`pivot page ${path}`, () => {
    test('renders headline and navbar', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toContainText(h1);
      await expect(page.getByRole('navigation').first()).toBeVisible();
    });

    test('carries canonical and openGraph metadata', async ({ page }) => {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        'href',
        `https://tradeclaw.win${path}`,
      );
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /.+/);
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute(
        'content',
        `https://tradeclaw.win${path}`,
      );
      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveAttribute(
        'content',
        'https://tradeclaw.win/api/og',
      );
    });

    test('content is visible with reduced motion (reveal classes must not hide it)', async ({
      browser,
    }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(path);
      // main, not h1: /faq's h1 is intentionally sr-only, which would make
      // an h1-visibility assertion pass trivially without testing content.
      await expect(page.getByRole('main').first()).toBeVisible();
      const firstSection = page.locator('section.reveal, .reveal section').first();
      if ((await firstSection.count()) > 0) {
        await firstSection.scrollIntoViewIfNeeded();
        await expect(firstSection).toBeVisible();
        // toBeVisible() ignores opacity — assert it explicitly, since a
        // reduced-motion regression would fail exactly there.
        await expect(firstSection).toHaveCSS('opacity', '1');
      }
      await context.close();
    });
  });
}
