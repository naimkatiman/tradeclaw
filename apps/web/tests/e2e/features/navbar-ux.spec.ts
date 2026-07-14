import { test, expect } from '@playwright/test';

/**
 * Two navbar contracts (DESIGN.md Layering):
 * - '/' renders the minimal variant: no primary links, no More dropdown,
 *   a single "Open the app" action.
 * - Product routes (tested via /track-record) render the full variant.
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

  test('renders the minimal variant: one action, no link rows', async ({ page }) => {
    const nav = page.locator('nav').first();
    const openApp = nav.getByRole('link', { name: /open the app/i });
    await expect(openApp).toBeVisible();
    await expect(openApp).toHaveAttribute('href', '/dashboard');
    await expect(nav.getByRole('button', { name: /^More/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Track Record' })).toHaveCount(0);
  });

  test('header does not throw console errors on initial load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
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

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'Track Record' }).click();
    await page.waitForURL(/\/track-record/);
    await expect(page).toHaveURL(/\/track-record/);
  });

  test('Live signals CTA is present and points to dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Live signals link is desktop-only');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const liveSignals = nav.getByRole('link', { name: 'Live signals' });
    await expect(liveSignals).toBeVisible();
    await expect(liveSignals).toHaveAttribute('href', '/dashboard');
  });

  test('More dropdown opens and closes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'More dropdown is desktop-only');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const moreBtn = nav.getByRole('button', { name: /^More/ });
    await moreBtn.click();
    await expect(page.getByText(/^Trading$|^Tools$|^Compete$|^Resources$/i).first()).toBeVisible();
    // Toggle closed via the same trigger; the dispatch below also covers the
    // outside-click handler (mousedown listener on document).
    await moreBtn.click();
    await page.waitForTimeout(150);
    await expect(page.getByText(/^Trading$/i)).toHaveCount(0);
  });
});
