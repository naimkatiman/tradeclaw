import { test, expect } from '@playwright/test';

const DESTINATIONS = [
  { name: 'Live app', href: '/dashboard', art: 'explore-art-live-app' },
  { name: 'How it works', href: '/how-it-works', art: 'explore-art-how-it-works' },
  { name: 'Research', href: '/research', art: 'explore-art-research' },
  { name: 'Methodology', href: '/methodology', art: 'explore-art-methodology' },
  { name: 'Open data', href: '/open-data', art: 'explore-art-open-data' },
] as const;

test.describe('homepage destination artwork', () => {
  test('loads five quiet, decorative card backgrounds without changing links', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const strip = page.getByRole('region', { name: /go deeper/i });
    await expect(strip).toBeVisible();

    for (const destination of DESTINATIONS) {
      const link = strip.getByRole('link', { name: new RegExp(destination.name, 'i') });
      const art = page.getByTestId(destination.art);
      const image = art.locator('img');

      await expect(link).toHaveAttribute('href', destination.href);
      await art.scrollIntoViewIfNeeded();
      await expect(art).toBeVisible();
      await expect(art).toHaveAttribute('aria-hidden', 'true');
      await expect(image).toHaveAttribute('alt', '');
      await expect
        .poll(
          () => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
          { timeout: 10_000 },
        )
        .toBe(true);

      const presentation = await art.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          opacity: Number.parseFloat(style.opacity),
          pointerEvents: style.pointerEvents,
        };
      });
      expect(presentation.opacity).toBeGreaterThan(0);
      expect(presentation.opacity).toBeLessThanOrEqual(0.17);
      expect(presentation.pointerEvents).toBe('none');
    }
  });

  test('keeps every destination readable and inside a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const strip = page.getByRole('region', { name: /go deeper/i });
    await expect(strip).toBeVisible();

    for (const destination of DESTINATIONS) {
      await expect(strip.getByRole('link', { name: new RegExp(destination.name, 'i') })).toBeVisible();
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
