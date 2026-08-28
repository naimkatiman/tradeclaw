import { expect, test } from '@playwright/test';

test.describe('retired EarningsEdge pricing path', () => {
  test('redirects into the focused research journey without viewport overflow', async ({ page, request }) => {
    const response = await request.get('/earningsedge/pricing', { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(response.headers()['location']).toMatch(/\/research$/);

    await page.goto('/earningsedge/pricing');
    await expect(page).toHaveURL(/\/research$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/what we tested/i);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
});
