import { test, expect } from '@playwright/test';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'dev-admin-secret';

test.describe('Premium strategy licenses', () => {
  test('anonymous visitor sees no license keys stored', async ({ page }) => {
    await page.goto('/dashboard');
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('tc_license_key'),
    );
    expect(stored).toBeNull();
  });

  test('admin can issue a key and it verifies', async ({ request }) => {
    const issueRes = await request.post('/api/admin/licenses', {
      headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      data: { strategies: ['hmm-top3'], issuedTo: 'e2e-test' },
    });
    expect(issueRes.ok()).toBe(true);
    const { plaintextKey, license } = await issueRes.json();
    expect(plaintextKey).toMatch(/^tck_live_[a-f0-9]{32}$/);
    expect(license.status).toBe('active');

    const verifyRes = await request.post('/api/licenses/verify', {
      data: { key: plaintextKey },
    });
    const verifyJson = await verifyRes.json();
    expect(verifyJson.valid).toBe(true);
    expect(verifyJson.unlockedStrategies).toContain('hmm-top3');

    const revokeRes = await request.post(
      `/api/admin/licenses/${license.id}/revoke`,
      { headers: { authorization: `Bearer ${ADMIN_SECRET}` } },
    );
    expect(revokeRes.ok()).toBe(true);

    const reVerify = await request.post('/api/licenses/verify', {
      data: { key: plaintextKey },
    });
    const reVerifyJson = await reVerify.json();
    expect(reVerifyJson.valid).toBe(false);
  });

  test('unlock page auto-redirects after valid key via ?key=', async ({
    page,
    request,
  }) => {
    const issueRes = await request.post('/api/admin/licenses', {
      headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      data: { strategies: ['hmm-top3'], issuedTo: 'e2e-unlock' },
    });
    const { plaintextKey } = await issueRes.json();

    await page.goto(`/unlock?key=${plaintextKey}`);
    await expect(page.getByText('Key accepted')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('tc_license_key'),
    );
    expect(stored).toBe(plaintextKey);
  });

  test('premium license lowers the confidence floor on /api/signals', async ({
    request,
  }) => {
    const anon = await request.get('/api/signals');
    expect(anon.ok()).toBe(true);
    const anonJson = await anon.json();
    const anonSignals: Array<{ confidence: number }> = anonJson.signals ?? [];
    for (const s of anonSignals) {
      expect(s.confidence).toBeGreaterThanOrEqual(70);
    }

    const issueRes = await request.post('/api/admin/licenses', {
      headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      data: { strategies: ['full-risk'], issuedTo: 'e2e-threshold' },
    });
    const { plaintextKey } = await issueRes.json();

    const premium = await request.get('/api/signals', {
      headers: { 'x-license-key': plaintextKey },
    });
    expect(premium.ok()).toBe(true);
    const premiumJson = await premium.json();
    const premiumSignals: Array<{ confidence: number }> = premiumJson.signals ?? [];
    const minPremium = premiumSignals.reduce(
      (m, s) => Math.min(m, s.confidence),
      Infinity,
    );
    // full-risk floor is 50, so at minimum the premium response must not
    // be strictly higher than the anonymous floor of 70.
    if (premiumSignals.length > 0) {
      expect(minPremium).toBeLessThanOrEqual(70);
    }
    expect(premiumSignals.length).toBeGreaterThanOrEqual(anonSignals.length);
  });

  test('verify endpoint rejects malformed keys', async ({ request }) => {
    const res = await request.post('/api/licenses/verify', {
      data: { key: 'not-a-key' },
    });
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('invalid_format');
  });
});
