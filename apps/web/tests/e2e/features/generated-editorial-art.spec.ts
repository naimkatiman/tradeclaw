import { test, expect } from '@playwright/test';

const ART_PAGES = [
  { path: '/research', testId: 'research-hero-art' },
  { path: '/open-data', testId: 'open-data-hero-art' },
  { path: '/methodology', testId: 'methodology-hero-art' },
] as const;

test.describe('generated editorial artwork', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { path, testId } of ART_PAGES) {
    test(`${path} renders its optimized decorative asset`, async ({ page }) => {
      await page.goto(path);

      const artwork = page.getByTestId(testId);
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute('aria-hidden', 'true');

      const image = artwork.locator('img');
      await expect(image).toHaveCount(1);
      await expect(image).toHaveAttribute('alt', '');
      await expect.poll(
        () => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      ).toBe(true);
    });
  }
});

test.describe('generated editorial artwork on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { path, testId } of ART_PAGES) {
    test(`${path} keeps the reading flow image-free`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId(testId)).toBeHidden();
    });
  }
});
