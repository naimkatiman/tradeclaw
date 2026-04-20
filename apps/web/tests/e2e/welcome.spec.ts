import { test, expect } from '@playwright/test';

test.describe('welcome onboarding', () => {
  test('redirects to signin with next param when unauthenticated', async ({ page }) => {
    await page.goto('/welcome?session_id=cs_test_ignored', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL(/\/signin/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/signin');
    const next = url.searchParams.get('next');
    expect(next).not.toBeNull();
    expect(next).toContain('/welcome');
    expect(next).toContain('cs_test_ignored');
  });
});
