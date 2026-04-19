import { test, expect } from '@playwright/test';

// Tier-journey E2E: verify the public/private visibility contract end-to-end.
// Anonymous visitors should never see entry / SL / TP values on any surface —
// not in the wire payload, not in the landing DOM, not on the detail page.

test.describe('public teaser API — /api/signals/public', () => {
  test('returns teaser shape only (no entry/SL/TP/id)', async ({ request }) => {
    const res = await request.get('/api/signals/public');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('signals');
    expect(Array.isArray(body.signals)).toBe(true);

    for (const sig of body.signals) {
      // Whitelisted display-safe fields
      expect(sig).toHaveProperty('symbol');
      expect(sig).toHaveProperty('timeframe');
      expect(sig).toHaveProperty('direction');
      expect(sig).toHaveProperty('confidence');
      expect(sig).toHaveProperty('timestamp');

      // Blacklisted tradable fields — contract violation if any are present
      expect(sig).not.toHaveProperty('id');
      expect(sig).not.toHaveProperty('entry');
      expect(sig).not.toHaveProperty('stopLoss');
      expect(sig).not.toHaveProperty('takeProfit1');
      expect(sig).not.toHaveProperty('takeProfit2');
      expect(sig).not.toHaveProperty('takeProfit3');
      expect(sig).not.toHaveProperty('indicators');
    }
  });

  test('confidence is rounded to an integer', async ({ request }) => {
    const res = await request.get('/api/signals/public');
    const body = await res.json();
    for (const sig of body.signals) {
      expect(Number.isInteger(sig.confidence)).toBe(true);
    }
  });
});

test.describe('landing hero — anonymous visitor', () => {
  test('hero renders without exposing tradable numbers', async ({ page }) => {
    await page.goto('/');
    // Wait for either live signals or placeholder state to render.
    await expect(page.getByText(/Live signals|Generating signals/)).toBeVisible({
      timeout: 15_000,
    });

    // The hero strip must not reference Entry / SL / TP as labels — those
    // only exist on the private detail page and dashboard signal cards.
    const heroRegion = page.locator('section').filter({ hasText: /Live signals/ }).first();
    if (await heroRegion.count()) {
      await expect(heroRegion).not.toContainText(/Entry/i);
      await expect(heroRegion).not.toContainText(/Stop Loss/i);
      await expect(heroRegion).not.toContainText(/\bTP[123]\b/);
    }
  });
});

test.describe('signal detail page — anonymous tier gating', () => {
  test('anonymous view shows locked pills and an upgrade CTA', async ({ page, request }) => {
    // Pull a real signal triple from the public teaser so the URL routes to an
    // active signal rather than a made-up symbol.
    const teaserRes = await request.get('/api/signals/public');
    const teaser = await teaserRes.json();
    test.skip(
      !teaser.signals || teaser.signals.length === 0,
      'No live signals available to exercise detail page — skipping.',
    );

    const sig = teaser.signals[0];
    const detailPath = `/signal/${sig.symbol}-${sig.timeframe}-${sig.direction}`;
    await page.goto(detailPath);

    // The upgrade CTA must be visible for anon — it's the conversion funnel.
    const cta = page.getByRole('link', { name: /upgrade to pro/i }).first();
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toHaveAttribute('href', /\/pricing(\?|$)/);

    // The locked-price pills use `••••` as the masked visual. At least one
    // should be present on the page (entry, SL, or TP1 — all masked for anon).
    await expect(page.getByText('••••').first()).toBeVisible();

    // The chart section should be replaced with the gate card, so the Pro
    // chart-only copy "Price chart with entry, SL, and TP lines is a Pro
    // feature" must appear.
    await expect(
      page.getByText(/Price chart with entry, SL, and TP lines is a Pro feature/i),
    ).toBeVisible();
  });

  test('clicking the upgrade CTA lands on /pricing', async ({ page, request }) => {
    const teaserRes = await request.get('/api/signals/public');
    const teaser = await teaserRes.json();
    test.skip(
      !teaser.signals || teaser.signals.length === 0,
      'No live signals available — skipping CTA navigation test.',
    );

    const sig = teaser.signals[0];
    await page.goto(`/signal/${sig.symbol}-${sig.timeframe}-${sig.direction}`);
    await page.getByRole('link', { name: /upgrade to pro/i }).first().click();

    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole('heading', { name: /stop renting your edge/i })).toBeVisible();
  });
});

test.describe('tier badge — navbar', () => {
  test('anonymous visitor sees no tier badge in the navbar', async ({ page }) => {
    await page.goto('/');
    // Badge copy is lowercase "free" / "pro" uppercased via CSS; rendered
    // only when session data exists. Anon callers should get null back.
    const badge = page.getByRole('link', {
      name: /current plan: (Free|Pro|Elite|Custom)/i,
    });
    await expect(badge).toHaveCount(0);
  });
});
