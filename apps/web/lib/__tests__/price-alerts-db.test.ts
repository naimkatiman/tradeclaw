import {
  createAlert,
  readAlerts,
  getAlert,
  updateAlert,
  deleteAlert,
  getAlertStats,
  checkAlertsAcrossUsers,
} from '../price-alerts';
import { query } from '../db-pool';
import { upsertUserByEmail } from '../db';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb('price-alerts — DB CRUD scoping', () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    const a = await upsertUserByEmail(`alerts-test-a-${Date.now()}@tradeclaw.test`);
    const b = await upsertUserByEmail(`alerts-test-b-${Date.now()}@tradeclaw.test`);
    userA = a.id;
    userB = b.id;
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE id = $1 OR id = $2', [userA, userB]);
  });

  it('createAlert stores with user_id; readAlerts scopes to caller', async () => {
    const alert = await createAlert({
      userId: userA,
      symbol: 'BTCUSD',
      direction: 'above',
      targetPrice: 90000,
      currentPrice: 87500,
    });
    expect(alert.id).toMatch(/^alert_/);
    expect(alert.userId).toBe(userA);
    expect(alert.status).toBe('active');

    const listA = await readAlerts(userA);
    const listB = await readAlerts(userB);
    expect(listA.some((a) => a.id === alert.id)).toBe(true);
    expect(listB.some((a) => a.id === alert.id)).toBe(false);
  });

  it('deleteAlert refuses cross-user delete', async () => {
    const a = await createAlert({
      userId: userA, symbol: 'ETHUSD', direction: 'below', targetPrice: 3000, currentPrice: 3400,
    });
    const okCross = await deleteAlert({ userId: userB, id: a.id });
    expect(okCross).toBe(false);
    const okSelf = await deleteAlert({ userId: userA, id: a.id });
    expect(okSelf).toBe(true);
  });

  it('updateAlert refuses cross-user patch', async () => {
    const a = await createAlert({
      userId: userA, symbol: 'XAUUSD', direction: 'above', targetPrice: 2200, currentPrice: 2180,
    });
    const patched = await updateAlert({ userId: userB, id: a.id }, { note: 'hijack' });
    expect(patched).toBeNull();
    const still = await getAlert({ userId: userA, id: a.id });
    expect(still?.note).toBeUndefined();
    await deleteAlert({ userId: userA, id: a.id });
  });

  it('readAlerts filters by status and symbol', async () => {
    const one = await createAlert({
      userId: userA, symbol: 'EURUSD', direction: 'above', targetPrice: 1.09, currentPrice: 1.08,
    });
    const two = await createAlert({
      userId: userA, symbol: 'GBPUSD', direction: 'above', targetPrice: 1.30, currentPrice: 1.26,
    });
    await updateAlert({ userId: userA, id: two.id }, { status: 'expired' });

    const active = await readAlerts(userA, { status: 'active' });
    expect(active.some((a) => a.id === one.id)).toBe(true);
    expect(active.some((a) => a.id === two.id)).toBe(false);

    const eurOnly = await readAlerts(userA, { symbol: 'EURUSD' });
    expect(eurOnly.every((a) => a.symbol === 'EURUSD')).toBe(true);

    await deleteAlert({ userId: userA, id: one.id });
    await deleteAlert({ userId: userA, id: two.id });
  });

  it('checkAlertsAcrossUsers triggers matching alerts and updates rows', async () => {
    const a = await createAlert({
      userId: userA, symbol: 'USDJPY', direction: 'above', targetPrice: 155, currentPrice: 151,
    });
    const b = await createAlert({
      userId: userB, symbol: 'USDJPY', direction: 'below', targetPrice: 150, currentPrice: 151,
    });

    const result = await checkAlertsAcrossUsers({ USDJPY: 156 });
    const triggeredIds = result.triggered.map((t) => t.id);
    expect(triggeredIds).toContain(a.id);
    expect(triggeredIds).not.toContain(b.id);

    const updatedA = await getAlert({ userId: userA, id: a.id });
    expect(updatedA?.status).toBe('triggered');
    expect(updatedA?.triggeredAt).toBeTruthy();

    await deleteAlert({ userId: userA, id: a.id });
    await deleteAlert({ userId: userB, id: b.id });
  });

  it('getAlertStats is scoped to caller and counts correctly', async () => {
    await createAlert({
      userId: userA, symbol: 'AUDUSD', direction: 'above', targetPrice: 0.7, currentPrice: 0.65,
    });
    const stats = await getAlertStats(userA);
    expect(stats.totalActive).toBeGreaterThanOrEqual(1);
    expect(stats.bySymbol.AUDUSD).toBeGreaterThanOrEqual(1);

    // B has zero alerts → zeros
    const statsB = await getAlertStats(userB);
    expect(statsB.totalActive).toBe(0);
  });
});
