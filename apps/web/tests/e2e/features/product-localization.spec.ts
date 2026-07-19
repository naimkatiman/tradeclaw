import { expect, test, type BrowserContext, type Page } from '@playwright/test';

type ProductLocale = 'en' | 'es' | 'zh' | 'ms' | 'ar';
const LOCALE_EXPECT_TIMEOUT = 30_000;
const pageErrors = new WeakMap<Page, string[]>();

const localeCases: Array<{
  locale: ProductLocale;
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  screenerTitle: string;
  dashboardTitle: RegExp;
  trackRecordEyebrow: string;
}> = [
  {
    locale: 'en',
    htmlLang: 'en',
    dir: 'ltr',
    screenerTitle: 'Asset Screener',
    dashboardTitle: /TradeClaw — Live Signals/,
    trackRecordEyebrow: 'OHLCV-Resolved Signal Record',
  },
  {
    locale: 'es',
    htmlLang: 'es',
    dir: 'ltr',
    screenerTitle: 'Analizador de activos',
    dashboardTitle: /TradeClaw — Señales en vivo/,
    trackRecordEyebrow: 'Registro de señales resuelto con OHLCV',
  },
  {
    locale: 'zh',
    htmlLang: 'zh-CN',
    dir: 'ltr',
    screenerTitle: '资产筛选器',
    dashboardTitle: /TradeClaw — 实时信号/,
    trackRecordEyebrow: 'OHLCV 已解析信号记录',
  },
  {
    locale: 'ms',
    htmlLang: 'ms',
    dir: 'ltr',
    screenerTitle: 'Penyaring Aset',
    dashboardTitle: /TradeClaw — Isyarat Langsung/,
    trackRecordEyebrow: 'Rekod Isyarat Diselesaikan OHLCV',
  },
  {
    locale: 'ar',
    htmlLang: 'ar',
    dir: 'rtl',
    screenerTitle: 'ماسح الأصول',
    dashboardTitle: /TradeClaw — إشارات مباشرة/,
    trackRecordEyebrow: 'سجل الإشارات المحسومة ببيانات OHLCV',
  },
];

async function setProductLocale(
  context: BrowserContext,
  locale: ProductLocale,
  baseURL: string | undefined,
) {
  const url = new URL('/', baseURL ?? 'http://localhost:3000').toString();
  await context.addCookies([
    { name: 'tc_locale', value: locale, url, sameSite: 'Lax' },
  ]);
}

test.describe('product localization', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    pageErrors.set(page, errors);
    page.on('pageerror', (error) => errors.push(error.message));
  });

  test.afterEach(async ({ page }) => {
    expect(pageErrors.get(page) ?? []).toEqual([]);
  });

  test('renders the core product surfaces in every supported locale', async ({ context, page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The locale matrix runs once in desktop Chromium.');
    test.setTimeout(240_000);
    page.setDefaultNavigationTimeout(60_000);
    for (const localeCase of localeCases) {
      await setProductLocale(context, localeCase.locale, baseURL);

      await page.goto('/screener', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('lang', localeCase.htmlLang);
      await expect(page.locator('html')).toHaveAttribute('dir', localeCase.dir);
      await expect(page.getByRole('heading', { name: localeCase.screenerTitle })).toBeVisible({ timeout: LOCALE_EXPECT_TIMEOUT });
      await expect(page).toHaveTitle(new RegExp(localeCase.screenerTitle), { timeout: LOCALE_EXPECT_TIMEOUT });

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(localeCase.dashboardTitle, { timeout: LOCALE_EXPECT_TIMEOUT });

      await page.goto('/track-record', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(localeCase.trackRecordEyebrow, { exact: true })).toBeVisible({ timeout: LOCALE_EXPECT_TIMEOUT });
      await expect(page).toHaveTitle(new RegExp(localeCase.trackRecordEyebrow), { timeout: LOCALE_EXPECT_TIMEOUT });
    }
  });

  test('falls back to the locale cookie when localStorage is invalid', async ({ context, page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The storage fallback runs once in desktop Chromium.');
    await page.addInitScript(() => window.localStorage.setItem('tc_locale', 'bogus'));
    await setProductLocale(context, 'ar', baseURL);

    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { name: 'ماسح الأصول' })).toBeVisible();
  });

  test('falls back to the locale cookie when localStorage is blocked', async ({ context, page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The blocked-storage fallback runs once in desktop Chromium.');
    await page.addInitScript(() => {
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function getItem(key: string) {
        if (key === 'tc_locale') throw new DOMException('Blocked', 'SecurityError');
        return originalGetItem.call(this, key);
      };
      Storage.prototype.setItem = function setItem(key: string, value: string) {
        if (key === 'tc_locale') throw new DOMException('Blocked', 'SecurityError');
        return originalSetItem.call(this, key, value);
      };
    });
    await setProductLocale(context, 'ar', baseURL);

    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { name: 'ماسح الأصول' })).toBeVisible();
  });

  test('switches in place and persists Arabic across a reload', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'The compact desktop selector is exercised here.');

    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    const language = page.getByRole('combobox', { name: 'Language' }).first();
    await language.selectOption('ar');

    await expect(page).toHaveURL(/\/screener$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'ماسح الأصول' })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'ماسح الأصول' })).toBeVisible();

    // The shared brand link opens the English landing page without erasing
    // the app preference. Returning to a product route must still be Arabic.
    await page.locator('nav a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.locator('nav').getByRole('link', { name: 'Open the app' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page).toHaveTitle(/TradeClaw — إشارات مباشرة/);

    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { name: 'ماسح الأصول' })).toBeVisible();
  });

  test('keeps Arabic product and marketing chrome inside a mobile viewport', async ({ context, page, baseURL }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setProductLocale(context, 'ar', baseURL);

    await page.goto('/screener', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'ماسح الأصول' })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(overflow.content).toBeLessThanOrEqual(overflow.viewport + 1);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('nav').getByRole('link', { name: 'Open the app' })).toBeVisible();
    const landingOverflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(landingOverflow.content).toBeLessThanOrEqual(landingOverflow.viewport + 1);
  });
});
