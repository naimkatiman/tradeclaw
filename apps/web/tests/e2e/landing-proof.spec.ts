import { test, expect } from '@playwright/test';

test.describe('landing proof hero', () => {
  test('renders the proof hero block', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('proof-hero')).toBeVisible();
  });

  test('states the product in plain language and links to the signal record', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('proof-hero');
    await expect(
      hero.getByRole('heading', {
        name: /Open-source trading signals\./i,
      }),
    ).toBeVisible();
    await expect(hero.getByRole('link', { name: /Inspect signal rows/i })).toBeVisible();
    await expect(hero).toContainText(/TradeClaw is an open-source/i);
    await expect(hero).not.toContainText(/win rate vs break-even/i);

    // A fresh self-hosted/CI environment can truthfully have no measured
    // trades yet. When data exists, the detailed proof must remain a readable
    // causal equation; otherwise the explicit no-placeholder state is shown.
    const ledger = hero.locator('dl');
    if (await ledger.count()) {
      await expect(hero).toContainText(/Before modeled costs, per trade/i);
      await expect(hero).toContainText(/− Modeled fees \+ slippage, per trade/i);
      await expect(hero).toContainText(/= After modeled costs, per trade/i);
      await expect(hero).toContainText(/R = the amount planned to risk on one trade/i);
    } else {
      await expect(hero.getByTestId('proof-ledger-empty')).toBeVisible();
    }
  });

  test('does NOT lead hero with a standalone win-rate percentage', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('proof-hero');
    const heroText = (await hero.textContent()) ?? '';
    expect(heroText).not.toMatch(/\d+%\s*Win Rate/i);
  });

  test('keeps the primary action in common first-view viewports', async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 390, height: 664 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const hero = page.getByTestId('proof-hero');
      const cta = hero.getByRole('link', { name: /Inspect signal rows/i });
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);

      const ctaComesBeforeLedger = await cta.evaluate((element) => {
        const ledger = element.closest('[data-testid="proof-hero"]')?.querySelector('dl');
        return ledger
          ? Boolean(element.compareDocumentPosition(ledger) & Node.DOCUMENT_POSITION_FOLLOWING)
          : true;
      });
      expect(ctaComesBeforeLedger).toBe(true);
    }
  });
});
