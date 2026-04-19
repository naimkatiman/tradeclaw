import {
  getPortfolio,
  openPosition,
  closePosition,
  closeAllPositions,
  resetPortfolio,
  getAllOpenPositionsForSweep,
  getDemoUserId,
} from '../paper-trading';
import { query } from '../db-pool';
import { upsertUserByEmail } from '../db';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describe('paper-trading — env helpers', () => {
  const ORIGINAL = process.env.PUBLIC_WIDGET_DEMO_USER_ID;
  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.PUBLIC_WIDGET_DEMO_USER_ID;
    else process.env.PUBLIC_WIDGET_DEMO_USER_ID = ORIGINAL;
  });

  it('getDemoUserId returns null when PUBLIC_WIDGET_DEMO_USER_ID is unset', () => {
    delete process.env.PUBLIC_WIDGET_DEMO_USER_ID;
    expect(getDemoUserId()).toBeNull();
  });

  it('getDemoUserId trims and returns the configured id', () => {
    process.env.PUBLIC_WIDGET_DEMO_USER_ID = '  abc-123  ';
    expect(getDemoUserId()).toBe('abc-123');
  });

  it('getDemoUserId treats empty/whitespace as unset', () => {
    process.env.PUBLIC_WIDGET_DEMO_USER_ID = '   ';
    expect(getDemoUserId()).toBeNull();
  });
});

describeDb('paper-trading — DB scoping', () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    const a = await upsertUserByEmail(`pt-test-a-${Date.now()}@tradeclaw.test`);
    const b = await upsertUserByEmail(`pt-test-b-${Date.now()}@tradeclaw.test`);
    userA = a.id;
    userB = b.id;
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE id = $1 OR id = $2', [userA, userB]);
  });

  it('getPortfolio auto-creates with starting balance for a new user', async () => {
    const p = await getPortfolio(userA);
    expect(p.balance).toBe(10000);
    expect(p.startingBalance).toBe(10000);
    expect(p.positions).toEqual([]);
    expect(p.history).toEqual([]);
    expect(p.equityCurve.length).toBeGreaterThanOrEqual(1);
  });

  it('openPosition stores with user_id; scoped getPortfolio shows it', async () => {
    const { position } = await openPosition({
      userId: userA,
      symbol: 'BTCUSD',
      direction: 'BUY',
      quantity: 500,
      entryPrice: 87500,
    });
    expect(position.userId).toBe(userA);
    expect(position.symbol).toBe('BTCUSD');

    const pA = await getPortfolio(userA);
    const pB = await getPortfolio(userB);
    expect(pA.positions.some((p) => p.id === position.id)).toBe(true);
    expect(pB.positions.some((p) => p.id === position.id)).toBe(false);

    await closePosition({ userId: userA, positionId: position.id }, 88000);
  });

  it('closePosition refuses cross-user close', async () => {
    const { position } = await openPosition({
      userId: userA, symbol: 'ETHUSD', direction: 'BUY', quantity: 200, entryPrice: 3400,
    });
    const byOther = await closePosition({ userId: userB, positionId: position.id }, 3500);
    expect(byOther).toBeNull();

    const pA = await getPortfolio(userA);
    expect(pA.positions.some((p) => p.id === position.id)).toBe(true);

    const bySelf = await closePosition({ userId: userA, positionId: position.id }, 3500);
    expect(bySelf).not.toBeNull();
    expect(bySelf?.trade.pnl).toBeGreaterThan(0);
  });

  it('closePosition updates balance, equity curve, and stats', async () => {
    await resetPortfolio(userA);
    const { position } = await openPosition({
      userId: userA, symbol: 'XAUUSD', direction: 'BUY', quantity: 1000, entryPrice: 2000,
    });
    // Close at 2% gain
    await closePosition({ userId: userA, positionId: position.id }, 2040);
    const p = await getPortfolio(userA);
    expect(p.balance).toBeGreaterThan(10000);
    expect(p.history).toHaveLength(1);
    expect(p.stats.totalTrades).toBe(1);
    expect(p.equityCurve.length).toBeGreaterThanOrEqual(2);
  });

  it('resetPortfolio wipes positions, trades, balance back to starting', async () => {
    await openPosition({
      userId: userA, symbol: 'XAUUSD', direction: 'BUY', quantity: 500, entryPrice: 2000,
    });
    const before = await getPortfolio(userA);
    expect(before.positions.length + before.history.length).toBeGreaterThan(0);

    const after = await resetPortfolio(userA);
    expect(after.balance).toBe(10000);
    expect(after.positions).toEqual([]);
    expect(after.history).toEqual([]);
  });

  it('closeAllPositions closes all user positions only', async () => {
    await resetPortfolio(userA);
    await resetPortfolio(userB);
    await openPosition({ userId: userA, symbol: 'BTCUSD', direction: 'BUY', quantity: 100, entryPrice: 87500 });
    await openPosition({ userId: userA, symbol: 'ETHUSD', direction: 'SELL', quantity: 100, entryPrice: 3400 });
    const bPos = await openPosition({ userId: userB, symbol: 'XAUUSD', direction: 'BUY', quantity: 100, entryPrice: 2180 });

    const afterA = await closeAllPositions(userA, 'manual');
    expect(afterA.positions).toHaveLength(0);

    const pB = await getPortfolio(userB);
    expect(pB.positions.some((p) => p.id === bPos.position.id)).toBe(true);
    await closePosition({ userId: userB, positionId: bPos.position.id });
  });

  it('getAllOpenPositionsForSweep returns rows across users with user_id', async () => {
    await resetPortfolio(userA);
    await resetPortfolio(userB);
    const { position: pA } = await openPosition({
      userId: userA, symbol: 'BTCUSD', direction: 'BUY', quantity: 100, entryPrice: 87500,
    });
    const { position: pB } = await openPosition({
      userId: userB, symbol: 'ETHUSD', direction: 'SELL', quantity: 100, entryPrice: 3400,
    });

    const all = await getAllOpenPositionsForSweep();
    const found = all.filter((p) => p.id === pA.id || p.id === pB.id);
    expect(found).toHaveLength(2);
    const fromA = found.find((p) => p.id === pA.id);
    const fromB = found.find((p) => p.id === pB.id);
    expect(fromA?.userId).toBe(userA);
    expect(fromB?.userId).toBe(userB);
  });
});
