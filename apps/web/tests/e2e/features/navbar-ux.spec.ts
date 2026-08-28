import { test, expect } from '@playwright/test';

/**
 * Two navbar contracts (DESIGN.md Layering):
 * - '/' renders the focused variant: Evidence/Lab/Build on desktop and one
 *   evidence action on compact viewports.
 * - Product routes use the same three-section public information architecture.
 */

test.describe('Navbar UX — layer 1 (minimal, /)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('does not render tier badges in the header', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Desktop header layout');

    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Tiers no longer exist: the header must never render a tier pill,
    // regardless of auth state.
    const tierMatches = nav.getByText(/^(FREE|PRO|PROFESSIONAL|TEAM|ELITE)$/);
    await expect(tierMatches).toHaveCount(0);
  });

  test('renders the three-section map without growth or More controls', async ({ page }, testInfo) => {
    const nav = page.locator('nav').first();
    const evidenceAction = nav.locator('a[href="/track-record"]').last();
    await expect(evidenceAction).toBeVisible();
    await expect(nav.getByRole('button', { name: /^More/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: /^Star$/ })).toHaveCount(0);
    await expect(nav.getByText(/^Sign in$/)).toHaveCount(0);
    if (testInfo.project.name !== 'mobile') {
      await expect(nav.getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/dashboard');
      await expect(nav.getByRole('link', { name: 'Build' })).toHaveAttribute('href', '/start');
    }
  });

  test('header does not throw console errors on initial load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const navErrors = errors.filter((e) => /TierBadge|UserMenu|navbar/i.test(e));
    expect(navErrors).toEqual([]);
  });
});

test.describe('Navbar UX — layer 2 (full, /research)', () => {
  // /research renders the shared Navbar (full variant). /track-record has its
  // own page-local nav, so it is not a valid target for these assertions.
  test.beforeEach(async ({ page }) => {
    await page.goto('/research');
    await page.waitForLoadState('domcontentloaded');
  });

  test('primary navigation links route correctly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Desktop link layout');

    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await nav.getByRole('link', { name: 'Lab' }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('keeps only Evidence, Lab, and Build as primary destinations', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Primary section links are desktop-only');
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.getByRole('link', { name: 'Evidence' })).toHaveAttribute('href', '/track-record');
    await expect(nav.getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/dashboard');
    await expect(nav.getByRole('link', { name: 'Build' })).toHaveAttribute('href', '/start');
    await expect(nav.getByRole('button', { name: /^More/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: /Live signals/i })).toHaveCount(0);
  });
});
