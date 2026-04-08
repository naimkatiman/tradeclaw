import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('renders login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('TradeClaw Admin');
    await expect(page.locator('input#secret')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Login');
  });

  test('submit button is disabled when input is empty', async ({ page }) => {
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeDisabled();
  });

  test('submit button enables when secret is entered', async ({ page }) => {
    await page.locator('input#secret').fill('some-secret');
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeEnabled();
  });

  test('shows error on invalid secret', async ({ page }) => {
    // Mock the login API to return 401
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid secret' }),
      });
    });

    await page.locator('input#secret').fill('wrong-secret');
    await page.locator('button[type="submit"]').click();

    // Should show error message
    await expect(page.locator('text=Invalid secret')).toBeVisible();
  });

  test('redirects to dashboard on successful login', async ({ page }) => {
    // Mock the login API to return success
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
        headers: {
          'Set-Cookie': 'tc_admin=test-secret; Path=/; HttpOnly',
        },
      });
    });

    await page.locator('input#secret').fill('correct-secret');
    await page.locator('button[type="submit"]').click();

    // Should navigate to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('shows loading state during submission', async ({ page }) => {
    // Slow down the API response
    await page.route('/api/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.locator('input#secret').fill('secret');
    await page.locator('button[type="submit"]').click();

    // Button should show loading text
    await expect(page.locator('button[type="submit"]')).toContainText('Authenticating');
  });
});
