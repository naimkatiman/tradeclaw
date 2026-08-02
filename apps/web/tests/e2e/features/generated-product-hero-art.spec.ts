import { expect, test } from '@playwright/test';

const HERO_PAGES = [
  { path: '/', testId: 'homepage-hero-art' },
  { path: '/today', testId: 'today-hero-art' },
  { path: '/dashboard', testId: 'signals-hero-art' },
  { path: '/copilot', testId: 'copilot-hero-art' },
  { path: '/screener', testId: 'screener-hero-art' },
  { path: '/backtest', testId: 'backtest-hero-art' },
  { path: '/leaderboard', testId: 'leaderboard-hero-art' },
  { path: '/track-record', testId: 'track-record-hero-art' },
] as const;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

test.describe('generated product hero artwork', () => {
  for (const { path, testId } of HERO_PAGES) {
    test(`${path} keeps its hero background decorative and responsive`, async ({ page }, testInfo) => {
      const mobile = testInfo.project.name === 'mobile';
      await page.setViewportSize(mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      const artwork = page.getByTestId(testId);
      const image = artwork.locator('img');

      // Keep a real decorative image in the DOM on every viewport. The mobile
      // treatment hides it visually rather than replacing it with page copy.
      await expect(artwork).toHaveCount(1);
      await expect(artwork).toHaveAttribute('aria-hidden', 'true');
      await expect(image).toHaveCount(1);
      await expect(image).toHaveAttribute('alt', '');
      await expect(artwork.locator(FOCUSABLE_SELECTOR)).toHaveCount(0);

      if (mobile) {
        await expect(artwork).toBeHidden();

        const viewport = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(viewport.scrollWidth, `${path} must not overflow horizontally`).toBeLessThanOrEqual(
          viewport.clientWidth + 1,
        );
        return;
      }

      await artwork.scrollIntoViewIfNeeded();
      await expect(artwork).toBeVisible();

      const source = await image.getAttribute('src');
      expect(source, `${path} must use a local generated asset`).toBeTruthy();

      const imageUrl = new URL(source!, page.url());
      expect(imageUrl.origin).toBe(new URL(page.url()).origin);
      const originalPath = imageUrl.pathname === '/_next/image'
        ? imageUrl.searchParams.get('url')
        : imageUrl.pathname;
      expect(originalPath, `${path} must resolve through a local brand WebP`).toMatch(
        /^\/brand\/.+\.webp$/,
      );

      await expect.poll(
        () => image.evaluate(async (node: HTMLImageElement) => {
          if (!node.complete) return false;
          try {
            await node.decode();
          } catch {
            return false;
          }
          return node.naturalWidth > 0 && node.naturalHeight > 0;
        }),
        { timeout: 10_000 },
      ).toBe(true);

      const presentation = await artwork.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          opacity: Number.parseFloat(style.opacity),
          pointerEvents: style.pointerEvents,
        };
      });
      expect(presentation.opacity, `${path} art opacity`).toBeGreaterThan(0);
      expect(presentation.opacity, `${path} art opacity`).toBeLessThanOrEqual(0.18);
      expect(presentation.pointerEvents).toBe('none');
    });
  }
});
