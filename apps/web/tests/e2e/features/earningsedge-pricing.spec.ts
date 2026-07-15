import { expect, test } from '@playwright/test';

test.describe('EarningsEdge pricing layout', () => {
  test('keeps the header CTA and page content inside the viewport', async ({ page }) => {
    await page.goto('/earningsedge/pricing');

    const cta = page.getByRole('link', { name: 'Try Free' });
    await expect(cta).toBeVisible();

    const ctaBox = await cta.boundingBox();
    expect(ctaBox).not.toBeNull();
    expect(ctaBox!.x).toBeGreaterThanOrEqual(0);
    expect(ctaBox!.x + ctaBox!.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
});
