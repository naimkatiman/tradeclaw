import type { Page } from '@playwright/test';

const HOUR_MS = 60 * 60 * 1000;

function buildCandles() {
  return Array.from({ length: 320 }, (_, index) => {
    const trend = 1_900 + index * 0.35;
    const open = trend + Math.sin(index / 7) * 14;
    const close = trend + Math.sin((index + 1) / 7) * 14;

    return {
      timestamp: Date.UTC(2025, 0, 1) + index * HOUR_MS,
      open,
      high: Math.max(open, close) + 2,
      low: Math.min(open, close) - 2,
      close,
      volume: 1_000 + index,
    };
  });
}

/** Keeps backtest UI tests independent from external market-data availability. */
export async function installBacktestFixture(page: Page): Promise<void> {
  const candles = buildCandles();

  await page.route('**/api/backtest?**', async (route) => {
    const requestUrl = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        available: true,
        candles,
        source: 'test-fixture',
        symbol: requestUrl.searchParams.get('symbol'),
        timeframe: requestUrl.searchParams.get('timeframe'),
        note: 'Deterministic Playwright fixture; not market evidence.',
      }),
    });
  });
}
