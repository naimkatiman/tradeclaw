import { test, expect } from '@playwright/test';

test.describe('landing proof hero', () => {
  test('renders the proof hero block', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('proof-hero')).toBeVisible();
  });

  test('links to the full track record as the primary CTA', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('proof-hero');
    await expect(hero.getByRole('link', { name: /See the full track record/i })).toBeVisible();
  });

  test('does NOT lead hero with a standalone win-rate percentage', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('proof-hero');
    const heroText = (await hero.textContent()) ?? '';
    expect(heroText).not.toMatch(/\d+%\s*Win Rate/i);
  });
});
