import { test, expect } from '@playwright/test';

test.describe('welcome onboarding', () => {
  test('redirects to signin when unauthenticated', async ({ page }) => {
    const res = await page.goto('/welcome?session_id=cs_test_ignored', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL(/\/signin/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/signin/);
  });
});
