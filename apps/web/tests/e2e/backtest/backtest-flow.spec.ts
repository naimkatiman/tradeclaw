import { test, expect, type Page } from '@playwright/test';

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

test.describe('Backtest Single-Preset Flow', () => {
  test('page loads with config panel and run button', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/backtest');
    await dismissStarMilestoneModal(page);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Configuration')).toBeVisible();
    await expect(page.getByText('Preset Strategies')).toBeVisible();
    await expect(page.getByRole('button', { name: /run backtest/i })).toBeVisible();
  });

  test('auto-run completes and shows metrics table', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/backtest');
    await dismissStarMilestoneModal(page);

    // Page auto-runs hmm-top3 on mount — wait for button to re-enable
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 60_000 });

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15_000 });

    // At least one result row in tbody
    const rows = table.locator('tbody tr');
    await expect(async () => {
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10_000 });

    // Metrics table always has a "Preset" column header
    await expect(table.locator('thead')).toContainText('Preset');
  });

  test('selecting a different preset and re-running updates results', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/backtest');
    await dismissStarMilestoneModal(page);

    // Wait for initial auto-run to finish
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 60_000 });

    // Ensure the Classic preset is selected (add it if not already checked)
    const classicLabel = page.locator('label', { hasText: /^Classic$/i }).first();
    if (await classicLabel.count()) {
      const cb = classicLabel.locator('input[type="checkbox"]').first();
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.evaluate((el) => (el as HTMLInputElement).click());
      }
    }

    // Re-run
    await dismissStarMilestoneModal(page);
    await page.getByRole('button', { name: /run backtest/i }).click({ force: true });

    // Wait for run to complete
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 60_000 });

    // Table should still be visible with at least one row
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15_000 });
    const rows = table.locator('tbody tr');
    await expect(async () => {
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10_000 });
  });

  test('equity curve canvas renders after run', async ({ page }) => {
    await dismissStarMilestoneModal(page);
    await page.goto('/backtest');
    await dismissStarMilestoneModal(page);

    // Wait for auto-run to complete
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 60_000 });

    // Canvas from ComparisonChart or EquityCurveCanvas should be visible
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  });
});
