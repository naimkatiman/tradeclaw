/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture `use` callback, not a React hook */
import { test as base, expect } from '@playwright/test';

/**
 * Extend base test with admin authentication fixture.
 * Uses the /api/auth/login endpoint to set the tc_admin cookie.
 */
export const test = base.extend<{ adminPage: ReturnType<typeof base['page']> }>({
  adminPage: async ({ page, context }, use) => {
    const secret = process.env.ADMIN_SECRET || 'test-secret';

    // Login via API to get the auth cookie
    const res = await context.request.post('/api/auth/login', {
      data: { secret },
    });

    if (res.ok()) {
      // Cookie is set automatically by the response
      await page.goto('/dashboard');
    }

    await use(page);
  },
});

export { expect };
