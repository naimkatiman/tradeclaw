import { test as setup, expect } from '@playwright/test';

// Warms the signal-generation paths so the first real assertion in the suite
// doesn't pay the ~10-15s cold cost. The request path warms the in-process
// OHLCV cache (lib/ohlcv.ts), shared across the suite because CI runs a single
// `next start` process. Asserts reachability only — never latency or content —
// so a genuinely broken route still fails in the real specs, not here.
setup('warm signal-generation paths', async ({ request }) => {
  const signals = await request.get('/api/signals', { timeout: 60_000 });
  expect(signals.ok()).toBeTruthy();

  // /api/screener has its own compute + OHLCV-for-sparklines path behind the
  // ~20s wait in landing-render.spec.ts; warm it directly.
  const screener = await request.get('/api/screener', { timeout: 60_000 });
  expect(screener.ok()).toBeTruthy();

  // Public teaser path (tier-journey / landing) — same OHLCV warm.
  const teaser = await request.get('/api/signals/public', { timeout: 60_000 });
  expect(teaser.ok()).toBeTruthy();
});
