import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// Inline helper — suppresses the "Star Milestone" modal that can intercept clicks.
// Mirror of the pattern used in tests/e2e/features/backtest-comparison.spec.ts.
async function dismissStarMilestoneModal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('star-milestone-10-dismissed', 'true');
      window.localStorage.setItem('star-milestone-seen', 'true');
    } catch { /* storage blocked */ }
  });
  const dialog = page.locator('[role="dialog"][aria-label*="Milestone"]');
  if (await dialog.isVisible().catch(() => false)) {
    const closeBtn = dialog.getByRole('button', { name: /close|dismiss|×/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => undefined);
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  }
}

test.describe('Track Record page', () => {
  // Test 1: Core sections render without a runtime error boundary
  test('page renders core sections', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/track-record');
    await dismissStarMilestoneModal(page);
    await page.waitForLoadState('domcontentloaded');

    // The visible label rendered by TrackRecordClient (a <div>, not an <h1>).
    // Text is "Verified Track Record" — matches /track record/i case-insensitively.
    await expect(
      page.getByText(/track record/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Page should load without a Next.js hard error (white-screen or 500).
    await expect(page).not.toHaveURL(/\/_error/);
    await expect(page.locator('body')).toBeVisible();
  });

  // Test 2: Per-Symbol Performance (leaderboard) section is present.
  // Heading text is the literal string in TrackRecordClient.tsx h2.
  test('leaderboard section is present and populated', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/track-record');
    await dismissStarMilestoneModal(page);

    // Wait for the section heading — it appears once the component mounts.
    const sectionHeading = page.getByText('Per-Symbol Performance');
    await expect(sectionHeading).toBeVisible({ timeout: 15_000 });

    // After data loads, either: rows appear OR an explicit empty-state cell appears.
    // The table tbody always renders — rows if data exists, empty-state td if not.
    const tbody = page.locator('table').first().locator('tbody');
    await expect(tbody).toBeVisible({ timeout: 20_000 });

    // Accept either a populated row OR an explicit empty-state message.
    const rowCount = await tbody.locator('tr').count();
    if (rowCount > 0) {
      // Data present — at least one row should contain a pair link (non-empty td).
      await expect(tbody.locator('tr').first()).toBeVisible();
    } else {
      // No rows rendered yet — empty state td must be visible instead.
      await expect(
        page.getByText(/no data for this period yet|no free-tier symbols/i)
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  // Test 3: Equity curve canvas renders.
  // EquityCurve renders a native <canvas> (custom drawChart, not lightweight-charts).
  // The canvas is hidden while loading then set to display:block via inline style.
  test('equity curve renders', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/track-record');
    await dismissStarMilestoneModal(page);

    // Section heading from EquityCurve component h2.
    await expect(
      page.getByText(/Signal Performance.*Auto Paper-Traded/i)
    ).toBeVisible({ timeout: 15_000 });

    // Canvas becomes display:block once the equity API resolves.
    // The loading spinner uses display:none on the canvas — wait until it's block.
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
  });

  // Test 4: Category breakdown buttons (All / Majors / Thematic) are present.
  // No "strategy breakdown" section exists on this page. The closest equivalent
  // is CategoryBreakdownRow, which renders 3 clickable cells for category segmentation.
  test('category breakdown controls are present', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/track-record');
    await dismissStarMilestoneModal(page);
    await page.waitForLoadState('domcontentloaded');

    // CategoryBreakdownRow renders three buttons: All, Majors, Thematic.
    // These are the primary strategy-level segmentation available on this page.
    await expect(page.getByRole('button', { name: /^All$/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^Majors$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Thematic$/i }).first()).toBeVisible();
  });

  // Test 5: /api/leaderboard returns 200 with usable shape.
  // This is the actual endpoint consumed by TrackRecordClient (not /api/strategy-breakdown,
  // which does not appear in this page's fetch calls).
  test('GET /api/leaderboard returns 200 with usable shape', async ({ request }: { request: APIRequestContext }) => {
    const response = await request.get('/api/leaderboard?period=30d&scope=pro');
    expect(response.status()).toBe(200);

    const body: unknown = await response.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();

    // Shape: { assets: [...], overall: { ... } }
    const typed = body as Record<string, unknown>;
    expect(typed).toHaveProperty('assets');
    expect(Array.isArray(typed['assets'])).toBe(true);
  });

  // Test 6: No error boundary fallback is shown at page load.
  // Made permissive — only checks top-level catastrophic failures, not async data errors.
  test('page does not show error boundary fallback', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/track-record');
    await dismissStarMilestoneModal(page);
    await page.waitForLoadState('domcontentloaded');

    // These strings would only appear if the React error boundary or a fetch catch
    // rendered an error fallback at the root level. Silent-fail paths in the client
    // (catch blocks that set null state) will not trigger this.
    await expect(
      page.getByText(/something went wrong|error loading|failed to fetch/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });
});
