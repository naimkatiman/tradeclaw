import { collectServerData, buildExportPayload } from '../data-export';

describe('collectServerData — scoping contract', () => {
  it('returns empty alerts/plugins/telegram when a userId is passed (unmigrated stores)', async () => {
    // Without DATABASE_URL, readWebhooksForExport fails closed → webhooks []
    // even under scoped mode. Once DB is present, scoped calls return the
    // caller's own webhooks — that's covered by webhooks-db.test.ts.
    const scoped = await collectServerData('00000000-0000-0000-0000-000000000abc');
    expect(scoped.alerts).toEqual([]);
    expect(scoped.plugins).toEqual([]);
    expect(scoped.telegramSettings).toEqual([]);
    expect(Array.isArray(scoped.webhooks)).toBe(true);
  });

  it('returns a Portfolio object even under scoped mode (shape check only)', async () => {
    const scoped = await collectServerData('00000000-0000-0000-0000-000000000abc');
    expect(scoped.paperTrading).toBeDefined();
    expect(typeof scoped.paperTrading).toBe('object');
  });

  it('unscoped call returns arrays that are at least possible to populate', async () => {
    // Under an empty test environment these will be [], but the return
    // should still be an array (not undefined) so downstream code can map.
    const global = await collectServerData();
    expect(Array.isArray(global.alerts)).toBe(true);
    expect(Array.isArray(global.webhooks)).toBe(true);
    expect(Array.isArray(global.plugins)).toBe(true);
    expect(Array.isArray(global.telegramSettings)).toBe(true);
  });
});

describe('buildExportPayload — envelope', () => {
  it('wraps server data with version, timestamp, and instance metadata', () => {
    const server = {
      alerts: [],
      paperTrading: {
        balance: 10000,
        startingBalance: 10000,
        positions: [],
        history: [],
        equityCurve: [],
      } as unknown as Awaited<ReturnType<typeof collectServerData>>['paperTrading'],
      webhooks: [],
      plugins: [],
      telegramSettings: [],
    };
    const payload = buildExportPayload(server);
    expect(payload.version).toBe('1.0');
    expect(payload.instance.name).toBe('TradeClaw');
    expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.data.strategies).toEqual([]);
    expect(payload.data.watchlist).toEqual([]);
  });

  it('merges client-side strategies and watchlist into the envelope', () => {
    const server = {
      alerts: [],
      paperTrading: {
        balance: 10000,
        startingBalance: 10000,
        positions: [],
        history: [],
        equityCurve: [],
      } as unknown as Awaited<ReturnType<typeof collectServerData>>['paperTrading'],
      webhooks: [],
      plugins: [],
      telegramSettings: [],
    };
    const payload = buildExportPayload(server, {
      strategies: [{ id: 'my-strat' }],
      watchlist: ['BTCUSD'],
    });
    expect(payload.data.strategies).toHaveLength(1);
    expect(payload.data.watchlist).toEqual(['BTCUSD']);
  });
});
