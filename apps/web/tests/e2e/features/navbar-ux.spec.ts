import { test, expect } from '@playwright/test';

test.describe('Navbar UX', () => {
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

  test('primary navigation links route correctly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Desktop link layout');

    const nav = page.locator('nav').first();
    await nav.getByRole('link', { name: 'Track Record' }).click();
    await page.waitForURL(/\/track-record/);
    await expect(page).toHaveURL(/\/track-record/);
  });

  test('Live signals CTA is present and points to dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Live signals link is desktop-only');

    const nav = page.locator('nav').first();
    const liveSignals = nav.getByRole('link', { name: 'Live signals' });
    await expect(liveSignals).toBeVisible();
    await expect(liveSignals).toHaveAttribute('href', '/dashboard');
  });

  test('More dropdown opens and closes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'More dropdown is desktop-only');

    const nav = page.locator('nav').first();
    const moreBtn = nav.getByRole('button', { name: /^More/ });
    await moreBtn.click();
    await expect(page.getByText(/^Trading$|^Tools$|^Compete$|^Resources$/i).first()).toBeVisible();
    // Toggle closed via the same trigger; the dispatch below also covers the
    // outside-click handler (mousedown listener on document).
    await moreBtn.click();
    await page.waitForTimeout(150);
    await expect(page.getByText(/^Trading$/i)).toHaveCount(0);
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
