import { test, expect } from '@playwright/test';

test.describe('pricing page', () => {
  test('renders both Free and Pro cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /Stop renting your edge/i })).toBeVisible();
    await expect(page.getByTestId('free-card')).toBeVisible();
    await expect(page.getByTestId('pro-card')).toBeVisible();
  });

  test('monthly is selected by default', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Annual/i })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('pro-price-label')).toContainText('$29');
  });

  test('annual toggle swaps price label', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: /Annual/i }).click();
    await expect(page.getByRole('button', { name: /Annual/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('pro-price-label')).toContainText('$290');
  });

  test('Pro CTA posts to checkout for monthly priceId', async ({ page }) => {
    test.skip(
      !process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      'Requires NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID env var'
    );
    await page.goto('/pricing');
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/stripe/checkout') && req.method() === 'POST'
    );
    await page.getByTestId('pro-cta').click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(typeof body.priceId).toBe('string');
    expect(body.priceId.startsWith('price_')).toBe(true);
  });

  test('Pro CTA posts annual priceId after toggle', async ({ page }) => {
    test.skip(
      !process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
      'Requires NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID env var'
    );
    await page.goto('/pricing');
    await page.getByRole('button', { name: /Annual/i }).click();
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/stripe/checkout') && req.method() === 'POST'
    );
    await page.getByTestId('pro-cta').click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID;
    expect(body.priceId).toBe(annualPriceId);
  });

  test('401 from checkout redirects to signin with next and priceId', async ({ page }) => {
    test.skip(
      !process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      'Requires NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID env var'
    );
    await page.route('**/api/stripe/checkout', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' })
    );
    await page.goto('/pricing');
    await page.getByTestId('pro-cta').click();
    await page.waitForURL(/\/signin\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('next')).toBe('/pricing');
    expect(url.searchParams.get('priceId')).toBe(process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!);
  });
});
