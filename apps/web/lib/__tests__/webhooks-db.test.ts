import {
  addWebhook,
  readWebhooks,
  readAllEnabledForDispatch,
  removeWebhook,
  updateWebhook,
  getWebhookForUser,
  getWebhookDeliveries,
  type WebhookConfig,
} from '../webhooks';
import { query } from '../db-pool';
import { upsertUserByEmail } from '../db';

// Live Postgres is required; fall back to skip when DATABASE_URL is missing
// (local dev without docker-compose, CI without a service container).
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb('webhooks — DB CRUD scoping', () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    const a = await upsertUserByEmail(`webhook-test-a-${Date.now()}@tradeclaw.test`);
    const b = await upsertUserByEmail(`webhook-test-b-${Date.now()}@tradeclaw.test`);
    userA = a.id;
    userB = b.id;
  });

  afterAll(async () => {
    // Clean up — cascade deletes the webhooks + deliveries.
    await query('DELETE FROM users WHERE id = $1 OR id = $2', [userA, userB]);
  });

  it('addWebhook stores with user_id; readWebhooks scopes to caller', async () => {
    const wh = await addWebhook({
      userId: userA,
      url: 'https://example.com/hook',
      name: 'Test A',
      minConfidence: 70,
    });
    expect(wh.id).toMatch(/^wh_/);
    expect(wh.userId).toBe(userA);
    expect(wh.minConfidence).toBe(70);

    const listA = await readWebhooks(userA);
    const listB = await readWebhooks(userB);
    expect(listA.some((w) => w.id === wh.id)).toBe(true);
    expect(listB.some((w) => w.id === wh.id)).toBe(false);
  });

  it('removeWebhook refuses cross-user delete', async () => {
    const wh = await addWebhook({ userId: userA, url: 'https://example.com/a' });
    // B tries to delete A's webhook
    const okCross = await removeWebhook({ userId: userB, id: wh.id });
    expect(okCross).toBe(false);
    // Still there for A
    const listA = await readWebhooks(userA);
    expect(listA.some((w) => w.id === wh.id)).toBe(true);
    // A can delete their own
    const okSelf = await removeWebhook({ userId: userA, id: wh.id });
    expect(okSelf).toBe(true);
  });

  it('updateWebhook refuses cross-user patch and returns null', async () => {
    const wh = await addWebhook({ userId: userA, url: 'https://example.com/b' });
    const patched = await updateWebhook({ userId: userB, id: wh.id }, { enabled: false });
    expect(patched).toBeNull();
    const still = await getWebhookForUser({ userId: userA, id: wh.id });
    expect(still?.enabled).toBe(true);
    await removeWebhook({ userId: userA, id: wh.id });
  });

  it('updateWebhook applies name/url/pairs/minConfidence for the owner', async () => {
    const wh = await addWebhook({ userId: userA, url: 'https://example.com/c' });
    const patched = await updateWebhook(
      { userId: userA, id: wh.id },
      { name: 'Renamed', pairs: ['BTCUSD'], minConfidence: 90, enabled: false },
    );
    expect(patched?.name).toBe('Renamed');
    expect(patched?.pairs).toEqual(['BTCUSD']);
    expect(patched?.minConfidence).toBe(90);
    expect(patched?.enabled).toBe(false);
    await removeWebhook({ userId: userA, id: wh.id });
  });

  it('addWebhook rejects non-HTTPS and private URLs (SSRF guard)', async () => {
    await expect(
      addWebhook({ userId: userA, url: 'http://example.com/insecure' }),
    ).rejects.toThrow(/URL is not allowed/);
    await expect(
      addWebhook({ userId: userA, url: 'https://127.0.0.1/internal' }),
    ).rejects.toThrow(/URL is not allowed/);
    await expect(
      addWebhook({ userId: userA, url: 'https://localhost/internal' }),
    ).rejects.toThrow(/URL is not allowed/);
  });

  it('readAllEnabledForDispatch returns only enabled rows across all users', async () => {
    const whOn = await addWebhook({ userId: userA, url: 'https://example.com/on-1' });
    const whOff = await addWebhook({ userId: userB, url: 'https://example.com/off-1' });
    await updateWebhook({ userId: userB, id: whOff.id }, { enabled: false });

    const all = await readAllEnabledForDispatch();
    const ids = all.map((w: WebhookConfig) => w.id);
    expect(ids).toContain(whOn.id);
    expect(ids).not.toContain(whOff.id);

    await removeWebhook({ userId: userA, id: whOn.id });
    await removeWebhook({ userId: userB, id: whOff.id });
  });

  it('getWebhookDeliveries enforces ownership (returns null for non-owner)', async () => {
    const wh = await addWebhook({ userId: userA, url: 'https://example.com/d' });
    const asOther = await getWebhookDeliveries({ userId: userB, id: wh.id });
    expect(asOther).toBeNull();
    const asOwner = await getWebhookDeliveries({ userId: userA, id: wh.id });
    expect(Array.isArray(asOwner)).toBe(true);
    await removeWebhook({ userId: userA, id: wh.id });
  });
});
