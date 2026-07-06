import { test, expect } from '@playwright/test';

// Tier-gating E2E: verify the public/private visibility contract end-to-end.
// Anonymous visitors should never see entry / SL / TP values on any surface —
// not in the wire payload, not in the landing DOM, not on the detail page.
// (Harvested from the retired tier-journey spec; the checkout/pricing journey
// no longer exists, but the tier gate is live until Phase 2.)

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
  test('hero strip renders without exposing tradable numbers', async ({ page }) => {
    await page.goto('/');
    // Wait for the public-preview strip to render in live, recent, or empty state.
    await expect(page.getByText(/— public preview/).first()).toBeVisible({
      timeout: 15_000,
    });

    // The hero strip must not reference Entry / SL / TP as data labels — those
    // only exist on the private detail page and dashboard signal cards.
    // Case-sensitive: actual data labels are always capitalized ("Entry",
    // "Stop Loss", "TP1").
    const heroRegion = page.locator('section').filter({ hasText: /public preview/ }).first();
    if (await heroRegion.count()) {
      await expect(heroRegion).not.toContainText(/\bEntry\b/);
      await expect(heroRegion).not.toContainText(/\bStop Loss\b/);
      await expect(heroRegion).not.toContainText(/\bTP[123]\b/);
    }
  });
});

test.describe('signal detail page — anonymous tier gating', () => {
  test('anonymous view shows locked pills and the gate card', async ({ page, request }) => {
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

    // Signals are generated fresh per request — the teaser triple may not
    // resolve a few hundred ms later when the page re-runs TA. Wait for
    // either the not-found heading or a masked pill to materialize, then
    // skip if we landed on 404.
    const notFoundHeading = page.getByRole('heading', { name: /page not found/i });
    const maskedPill = page.getByText('••••').first();
    await Promise.race([
      notFoundHeading.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
      maskedPill.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ]);
    const notFoundCount = await notFoundHeading.count();
    test.skip(notFoundCount > 0, 'Teaser→detail signal race produced 404 — skipping gating assertion.');

    // The locked-price pills use `••••` as the masked visual. At least one
    // should be present on the page (entry, SL, or TP1 — all masked for anon).
    await expect(maskedPill).toBeVisible();

    // The chart section should be replaced with the gate card, so the Pro
    // chart-only copy "Price chart with entry, SL, and TP lines is a Pro
    // feature" must appear.
    await expect(
      page.getByText(/Price chart with entry, SL, and TP lines is a Pro feature/i),
    ).toBeVisible();
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
