import { expect, test } from '@playwright/test';

test.describe('homepage brand sculpture', () => {
  test('stays decorative and desktop-only', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name === 'mobile';
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const artwork = page.getByTestId('hero-brand-art');
    await expect(artwork).toHaveCount(1);
    await expect(artwork).toHaveAttribute('aria-hidden', 'true');
    await expect(artwork.locator('img')).toHaveAttribute('alt', '');

    if (mobile) {
      await expect(artwork).toBeHidden();
      return;
    }

    await expect(artwork).toBeVisible();
    const image = artwork.locator('img');
    await expect.poll(
      () => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
    ).toBe(true);
  });
});
