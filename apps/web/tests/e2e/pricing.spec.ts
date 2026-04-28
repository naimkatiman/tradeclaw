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

  test('Pro CTA posts tier and interval instead of a build-time priceId', async ({ page }) => {
    await page.goto('/pricing');
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/stripe/checkout') && req.method() === 'POST'
    );
    await page.getByTestId('pro-cta').click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(body).toMatchObject({ tier: 'pro', interval: 'monthly' });
    expect(body).not.toHaveProperty('priceId');
  });

  test('Pro CTA posts annual interval after toggle', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: /Annual/i }).click();
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/stripe/checkout') && req.method() === 'POST'
    );
    await page.getByTestId('pro-cta').click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(body).toMatchObject({ tier: 'pro', interval: 'annual' });
    expect(body).not.toHaveProperty('priceId');
  });

  test('401 from checkout redirects to signin with next and tier info', async ({ page }) => {
    await page.route('**/api/stripe/checkout', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' })
    );
    await page.goto('/pricing');
    await page.getByTestId('pro-cta').click();
    await page.waitForURL(/\/signin\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('next')).toBe('/pricing');
    expect(url.searchParams.get('tier')).toBe('pro');
    expect(url.searchParams.get('interval')).toBe('monthly');
    expect(url.searchParams.get('priceId')).toBeNull();
  });
});
