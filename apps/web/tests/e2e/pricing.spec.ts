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

  // ---------------------------------------------------------------------------
  // Happy path: 200 response with a Stripe checkout URL must redirect the
  // browser to that URL. Mirrors the 401-redirect test above so both sides of
  // the conversion funnel are covered.
  //
  // We mock the checkout response rather than hitting Stripe — the contract
  // PricingCards.tsx depends on is `{ url: string }`, and the navigation is
  // window.location.href = payload.url. Stripe's hosted page itself is out of
  // scope for this app's e2e suite.
  // ---------------------------------------------------------------------------
  test('200 from checkout redirects browser to Stripe-hosted URL', async ({ page }) => {
    const fakeCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_e2e_happy_path';
    await page.route('**/api/stripe/checkout', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: fakeCheckoutUrl, sessionId: 'cs_test_e2e_happy_path' }),
      }),
    );
    // Block the actual Stripe URL so the test doesn't navigate off-domain
    // (the redirect is what we're asserting, not the page that follows).
    await page.route('https://checkout.stripe.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>stripe stub</html>' }),
    );

    await page.goto('/pricing');
    await page.getByTestId('pro-cta').click();
    await page.waitForURL(fakeCheckoutUrl, { timeout: 10_000 });
    expect(page.url()).toBe(fakeCheckoutUrl);
  });

  test('200 from checkout for annual billing redirects to Stripe URL', async ({ page }) => {
    const fakeCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_e2e_annual';
    await page.route('**/api/stripe/checkout', async (route) => {
      const req = route.request();
      const body = JSON.parse(req.postData() || '{}');
      // Verify the request body still carries the annual interval — the
      // happy path must not silently downgrade to monthly.
      expect(body).toMatchObject({ tier: 'pro', interval: 'annual' });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: fakeCheckoutUrl, sessionId: 'cs_test_e2e_annual' }),
      });
    });
    await page.route('https://checkout.stripe.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>stripe stub</html>' }),
    );

    await page.goto('/pricing');
    await page.getByRole('button', { name: /Annual/i }).click();
    await page.getByTestId('pro-cta').click();
    await page.waitForURL(fakeCheckoutUrl, { timeout: 10_000 });
    expect(page.url()).toBe(fakeCheckoutUrl);
  });
});
