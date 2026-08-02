import { expect, test } from '@playwright/test';

const DESTINATIONS = [
  { name: 'Live app', href: '/dashboard' },
  { name: 'How it works', href: '/how-it-works' },
  { name: 'Research', href: '/research' },
  { name: 'Methodology', href: '/methodology' },
  { name: 'Open data', href: '/open-data' },
] as const;

test.describe('homepage destinations', () => {
  test('keeps five semantic links to the deeper product surfaces', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const strip = page.getByRole('region', { name: /go deeper/i });
    await expect(strip).toBeVisible();
    await expect(strip.getByRole('list')).toHaveCount(1);
    await expect(strip.getByRole('listitem')).toHaveCount(DESTINATIONS.length);

    for (const destination of DESTINATIONS) {
      const link = strip.getByRole('link', { name: new RegExp(destination.name, 'i') });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', destination.href);
    }
  });

  test('keeps every destination readable inside a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const strip = page.getByRole('region', { name: /go deeper/i });
    await expect(strip).toBeVisible();

    for (const destination of DESTINATIONS) {
      await expect(strip.getByRole('link', { name: new RegExp(destination.name, 'i') })).toBeVisible();
    }

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });
});
