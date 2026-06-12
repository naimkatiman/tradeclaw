/**
 * Migration-048 broadcast-scope persistence: Tier-0 INSERT, graceful fallback
 * when the migration is unapplied, tri-state row mapping, and the catch-up
 * late-stamp that must never overwrite an existing decision.
 */

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(() => Promise.resolve()),
}));

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

beforeAll(() => {
  process.env.DATABASE_URL = 'postgres://test/test';
});

afterAll(() => {
  if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
});

type SignalHistoryModule = typeof import('../signal-history');

function freshModule(): { mod: SignalHistoryModule; query: jest.Mock } {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dbPool = require('../db-pool') as { query: jest.Mock };
  dbPool.query.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../signal-history') as SignalHistoryModule;
  return { mod, query: dbPool.query };
}

const baseRow = {
  id: 'sig-1',
  pair: 'BTCUSD',
  timeframe: 'H1',
  direction: 'BUY',
  confidence: 80,
  entry_price: 50000,
  tp1: 51000,
  sl: 49500,
  is_simulated: false,
  outcome_4h: null,
  outcome_24h: null,
  telegram_posted_at: null,
  telegram_message_id: null,
  created_at: new Date().toISOString(),
  last_verified: null,
  strategy_id: 'hmm-top3',
  mode: 'swing',
  entry_atr: null,
  atr_multiplier: null,
  max_adverse_excursion: null,
  gate_blocked: false,
  gate_reason: null,
};

describe('recordSignalAsync with a broadcast decision (Tier 0)', () => {
  it('inserts the regime / broadcast_blocked / reason / allocation columns', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([{ id: 'sig-1' }]);

    await mod.recordSignalAsync(
      'BTCUSD', 'H1', 'BUY', 80, 50000, 'sig-1', 51000, 49500, Date.now(), 'hmm-top3',
      undefined, undefined, undefined, undefined, undefined,
      { regime: 'trend', blocked: true, blockReason: 'circuit_breaker: streak', allocationPct: 7.5 },
    );

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('broadcast_blocked');
    expect(sql).toContain('broadcast_block_reason');
    expect(sql).toContain('allocation_pct');
    expect(sql).toContain('regime');
    expect(params).toEqual(expect.arrayContaining(['trend', true, 'circuit_breaker: streak', 7.5]));
  });

  it('falls back to the pre-048 INSERT when the broadcast columns are missing, and skips Tier 0 afterwards', async () => {
    const { mod, query } = freshModule();
    const missingErr = Object.assign(new Error('column "broadcast_blocked" of relation "signal_history" does not exist'), { code: '42703' });
    query
      .mockRejectedValueOnce(missingErr)        // Tier 0 probe fails
      .mockResolvedValue([{ id: 'sig-1' }]);    // Tier 1 succeeds

    await mod.recordSignalAsync(
      'BTCUSD', 'H1', 'BUY', 80, 50000, 'sig-1', 51000, 49500, Date.now(), 'hmm-top3',
      undefined, undefined, undefined, undefined, undefined,
      { blocked: false },
    );

    expect(query).toHaveBeenCalledTimes(2);
    const tier1Sql = query.mock.calls[1][0] as string;
    expect(tier1Sql).not.toContain('broadcast_blocked');
    expect(tier1Sql).toContain('gate_blocked');

    // Second record: Tier 0 is not probed again.
    query.mockClear();
    query.mockResolvedValue([{ id: 'sig-2' }]);
    await mod.recordSignalAsync(
      'ETHUSD', 'H1', 'BUY', 80, 3000, 'sig-2', 3100, 2950, Date.now(), 'hmm-top3',
      undefined, undefined, undefined, undefined, undefined,
      { blocked: false },
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0] as string).not.toContain('broadcast_blocked');
  });

  it('skips the Tier-0 probe entirely when no broadcast decision is supplied', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([{ id: 'sig-1' }]);

    await mod.recordSignalAsync('BTCUSD', 'H1', 'BUY', 80, 50000, 'sig-1', 51000, 49500, Date.now(), 'hmm-top3');

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0] as string).not.toContain('broadcast_blocked');
  });
});

describe('recordSignalAsync with calibration features (migration 051, Tier 0)', () => {
  it('inserts the four 051 columns and binds their values on the Tier-0 path', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([{ id: 'sig-1' }]);

    await mod.recordSignalAsync(
      'BTCUSD', 'H1', 'BUY', 85, 50000, 'sig-1', 51000, 49500, Date.now(), 'classic',
      undefined, undefined, undefined, undefined, undefined,
      { regime: 'trend', blocked: false, allocationPct: 5 },
      { preBoostConfidence: 70, mtfAgreement: 4, confluenceBonus: 15, costEstimatePct: 0.4 },
    );

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('pre_boost_confidence');
    expect(sql).toContain('mtf_agreement');
    expect(sql).toContain('confluence_bonus');
    expect(sql).toContain('cost_estimate_pct');
    // Pre-boost 70, agreement 4, bonus +15, round-trip cost 0.4% all bound.
    expect(params).toEqual(expect.arrayContaining([70, 4, 15, 0.4]));
  });

  it('fires Tier 0 for a scanner row (cost only) — MTF triple bound as NULL', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([{ id: 'scan-1' }]);

    // Scanner row: no broadcast decision, no MTF triple, but cost_estimate_pct
    // is universal — it must still take the Tier-0 path and record NULLs for the
    // triple rather than dropping the cost on a lower tier.
    await mod.recordSignalAsync(
      'ETHUSD', 'H1', 'SELL', 80, 3000, 'scan-1', 2950, 3050, Date.now(), 'scanner',
      undefined, undefined, undefined, undefined, undefined,
      undefined,
      { costEstimatePct: 0.4 },
    );

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('cost_estimate_pct');
    // Cost present; the MTF triple columns are bound NULL (undefined → null).
    expect(params).toContain(0.4);
    const calibTail = (params as unknown[]).slice(-4);
    expect(calibTail).toEqual([null, null, null, 0.4]);
  });

  it('Tier-0b: a 42703 on a 051 column does NOT disable broadcast-decision persistence', async () => {
    // Setup: Tier-0 INSERT fails because migration 051 is not applied (a 051
    // column name appears in the error message). The Tier-0b INSERT (048 columns
    // only, no 051 calibration columns) must then succeed and carry the broadcast
    // decision values, proving that a 051-only deploy gap does not silently drop
    // the regime / broadcast_blocked / broadcast_block_reason / allocation_pct.
    const { mod, query } = freshModule();
    const calib051Err = Object.assign(
      new Error('column "cost_estimate_pct" of relation "signal_history" does not exist'),
      { code: '42703' },
    );
    query
      .mockRejectedValueOnce(calib051Err)       // Tier-0 probe fails on 051 column
      .mockResolvedValueOnce([{ id: 'sig-1' }]); // Tier-0b succeeds

    await mod.recordSignalAsync(
      'BTCUSD', 'H1', 'BUY', 80, 50000, 'sig-1', 51000, 49500, Date.now(), 'hmm-top3',
      undefined, undefined, undefined, undefined, undefined,
      { regime: 'volatile', blocked: true, blockReason: 'risk_veto: halt', allocationPct: 3 },
      { preBoostConfidence: 65, mtfAgreement: 3, confluenceBonus: 10, costEstimatePct: 0.3 },
    );

    // Two query calls: Tier-0 attempt + Tier-0b attempt.
    expect(query).toHaveBeenCalledTimes(2);

    const tier0bSql = query.mock.calls[1][0] as string;
    const tier0bParams = query.mock.calls[1][1] as unknown[];

    // (a) Tier-0b INSERT includes the 048 broadcast columns …
    expect(tier0bSql).toContain('broadcast_blocked');
    expect(tier0bSql).toContain('broadcast_block_reason');
    expect(tier0bSql).toContain('allocation_pct');
    expect(tier0bSql).toContain('regime');

    // … and must NOT include the 051 calibration columns.
    expect(tier0bSql).not.toContain('pre_boost_confidence');
    expect(tier0bSql).not.toContain('cost_estimate_pct');

    // (b) Broadcast decision values are bound in the Tier-0b params.
    expect(tier0bParams).toEqual(expect.arrayContaining(['volatile', true, 'risk_veto: halt', 3]));
  });

  it('maps the 051 columns back through rowToRecord, NULL → undefined', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([
      { ...baseRow, id: 'ta-row', pre_boost_confidence: '70', mtf_agreement: 4, confluence_bonus: '15', cost_estimate_pct: '0.4' },
      { ...baseRow, id: 'scanner-row', pre_boost_confidence: null, mtf_agreement: null, confluence_bonus: null, cost_estimate_pct: '0.4' },
    ]);

    const records = await mod.readHistoryAsync();
    const byId = new Map(records.map((r) => [r.id, r]));

    expect(byId.get('ta-row')!.preBoostConfidence).toBe(70);
    expect(byId.get('ta-row')!.mtfAgreement).toBe(4);
    expect(byId.get('ta-row')!.confluenceBonus).toBe(15);
    expect(byId.get('ta-row')!.costEstimatePct).toBe(0.4);

    // Scanner row: MTF triple NULL → undefined, cost still present.
    expect(byId.get('scanner-row')!.preBoostConfidence).toBeUndefined();
    expect(byId.get('scanner-row')!.mtfAgreement).toBeUndefined();
    expect(byId.get('scanner-row')!.confluenceBonus).toBeUndefined();
    expect(byId.get('scanner-row')!.costEstimatePct).toBe(0.4);
  });
});

describe('rowToRecord tri-state mapping (via readHistoryAsync)', () => {
  it('maps NULL broadcast_blocked to undefined, never to false', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([
      { ...baseRow, id: 'null-row', broadcast_blocked: null, regime: null },
      { ...baseRow, id: 'approved-row', broadcast_blocked: false, regime: 'trend', allocation_pct: '7.5' },
      { ...baseRow, id: 'blocked-row', broadcast_blocked: true, broadcast_block_reason: 'risk_veto: halt', regime: 'volatile' },
    ]);

    const records = await mod.readHistoryAsync();

    const byId = new Map(records.map((r) => [r.id, r]));
    expect(byId.get('null-row')!.broadcastBlocked).toBeUndefined();
    expect(byId.get('approved-row')!.broadcastBlocked).toBe(false);
    expect(byId.get('approved-row')!.allocationPct).toBe(7.5);
    expect(byId.get('approved-row')!.regime).toBe('trend');
    expect(byId.get('blocked-row')!.broadcastBlocked).toBe(true);
    expect(byId.get('blocked-row')!.broadcastBlockReason).toBe('risk_veto: halt');
  });
});

describe('updateBroadcastDecisionAsync (catch-up late-stamp)', () => {
  it('only fills rows whose decision is NULL', async () => {
    const { mod, query } = freshModule();
    query.mockResolvedValue([{ id: 'sig-1' }]);

    const stamped = await mod.updateBroadcastDecisionAsync([
      { id: 'sig-1', regime: 'range', blocked: false, allocationPct: 5 },
    ]);

    expect(stamped).toBe(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('broadcast_blocked IS NULL');
    expect(params).toEqual(['sig-1', 'range', false, null, 5]);
  });

  it('no-ops gracefully when migration 048 is missing', async () => {
    const { mod, query } = freshModule();
    const missingErr = Object.assign(new Error('column "broadcast_blocked" does not exist'), { code: '42703' });
    query.mockRejectedValue(missingErr);

    const stamped = await mod.updateBroadcastDecisionAsync([
      { id: 'sig-1', blocked: false },
    ]);

    expect(stamped).toBe(0);
  });
});
