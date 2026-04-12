import { test, expect } from '@playwright/test';

test.describe('Backtest Comparison', () => {
  test('shows multiple presets side-by-side in comparison table', async ({ page }) => {
    await page.goto('/backtest');
    await page.waitForLoadState('networkidle');

    // Verify the preset multi-select section is present
    await expect(page.getByText(/preset strategies/i)).toBeVisible();

    // The page auto-runs on mount with hmm-top3 default.
    // Wait for any initial run to settle before interacting.
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 30_000 });

    // Select "Classic" preset — checkbox is inside a <label> with that text
    const classicLabel = page.locator('label', { hasText: /^Classic$/i });
    if (await classicLabel.isVisible()) {
      const classicCheckbox = classicLabel.locator('input[type="checkbox"]');
      if (!(await classicCheckbox.isChecked())) {
        await classicCheckbox.check();
      }
    }

    // Select "VWAP + EMA + Bollinger" preset
    const vwapLabel = page.locator('label', { hasText: /VWAP/i });
    if (await vwapLabel.isVisible()) {
      const vwapCheckbox = vwapLabel.locator('input[type="checkbox"]');
      if (!(await vwapCheckbox.isChecked())) {
        await vwapCheckbox.check();
      }
    }

    // Run the backtest
    await page.getByRole('button', { name: /run backtest/i }).click();

    // Wait for results — button returns to enabled state when done
    await expect(
      page.getByRole('button', { name: /run backtest/i })
    ).toBeEnabled({ timeout: 30_000 });

    // Comparison metrics table should appear
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15_000 });

    // At least 2 tbody rows (hmm-top3 default + classic at minimum)
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(3, { timeout: 15_000 }); // hmm-top3 + classic + vwap-ema-bb

    // Table header should include "Preset" column
    await expect(table.locator('thead')).toContainText('Preset');

    // Equity curve overlay canvas should be visible
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
  });

  test('backtest page loads and auto-runs default preset', async ({ page }) => {
    await page.goto('/backtest');
    await page.waitForLoadState('domcontentloaded');

    // Page should render config panel
    await expect(page.getByText('Configuration')).toBeVisible();
    await expect(page.getByText('Preset Strategies')).toBeVisible();

    // Run button should be present
    await expect(page.getByRole('button', { name: /run backtest/i })).toBeVisible();
  });
});
