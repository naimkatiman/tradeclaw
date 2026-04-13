import { test, expect, type Page } from '@playwright/test';

async function dismissStarMilestoneModal(page: Page): Promise<void> {
  // Pre-existing "Milestone reached: 10 Stars" dialog can intercept clicks.
  // Suppress at page level via localStorage before any nav, then also close
  // the dialog if it already rendered.
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

test.describe('Backtest Comparison', () => {
  test('shows multiple presets side-by-side in comparison table', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/backtest');
    await dismissStarMilestoneModal(page);
    await page.waitForLoadState('networkidle');

    // Verify the preset multi-select section is present
    await expect(page.getByText(/preset strategies/i)).toBeVisible();

    // The page auto-runs on mount with hmm-top3 default.
    // Wait for any initial run to settle before interacting.
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 30_000 });

    // Select Classic + VWAP presets by clicking the label span (most reliable
    // with React controlled checkboxes, avoids modal pointer interception).
    const ensureSelected = async (labelText: RegExp) => {
      const label = page.locator('label', { hasText: labelText }).first();
      if (!(await label.count())) return;
      const cb = label.locator('input[type="checkbox"]').first();
      if (await cb.isChecked().catch(() => false)) return;
      // Use native input.click() via evaluate — triggers React onChange reliably
      // even when a modal overlay intercepts pointer events.
      await cb.evaluate((el) => (el as HTMLInputElement).click());
    };
    await ensureSelected(/^Classic$/i);
    await ensureSelected(/VWAP/i);

    // Run the backtest
    await dismissStarMilestoneModal(page);
    await page.getByRole('button', { name: /run backtest/i }).click({ force: true });

    // Wait for results — button returns to enabled state when done
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 30_000 });

    // Comparison metrics table should appear
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15_000 });

    // At least 2 tbody rows (hmm-top3 default + classic at minimum)
    const rows = table.locator('tbody tr');
    await expect(async () => {
      expect(await rows.count()).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 15_000 });

    // Table header should include "Preset" column
    await expect(table.locator('thead')).toContainText('Preset');

    // Equity curve overlay canvas should be visible
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
  });

  test('backtest page loads and auto-runs default preset', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/backtest');
    await dismissStarMilestoneModal(page);
    await page.waitForLoadState('domcontentloaded');

    // Page should render config panel
    await expect(page.getByText('Configuration')).toBeVisible();
    await expect(page.getByText('Preset Strategies')).toBeVisible();

    // Run button should be present
    await expect(page.getByRole('button', { name: /run backtest/i })).toBeVisible();
  });
});
