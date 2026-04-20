import { test, expect } from '@playwright/test';

test.describe('landing proof hero', () => {
  test('renders the proof hero block', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('proof-hero')).toBeVisible();
  });

  test('shows the delivery lag tile', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('proof-hero');
    await expect(hero).toContainText(/Pro:\s*<1s/i);
    await expect(hero).toContainText(/Free:\s*15\s*min/i);
  });

  test('does NOT lead hero with a standalone win-rate percentage', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('proof-hero');
    const heroText = (await hero.textContent()) ?? '';
    expect(heroText).not.toMatch(/\d+%\s*Win Rate/i);
  });
});
