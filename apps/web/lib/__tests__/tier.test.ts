import {
  TIER_SYMBOLS,
  TIER_HISTORY_DAYS,
  TIER_DELAY_MS,
  TIER_LEVEL,
  FREE_SYMBOLS,
  isFreeSymbol,
  filterSignalByTier,
  meetsMinimumTier,
  PRO_PREMIUM_MIN_CONFIDENCE,
  getStrategiesForTier,
  resolveAccessContext,
  resolveAccessContextFromCookies,
  toLockedStub,
  splitDelayed,
} from '../tier';
import type { TradingSignal } from '../../app/lib/signals';

function makeSignal(overrides: Partial<TradingSignal> = {}): TradingSignal {
  return {
    id: 'test-sig-1',
    symbol: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entry: 50000,
    stopLoss: 49000,
    takeProfit1: 51000,
    takeProfit2: 52000,
    takeProfit3: 53000,
    timestamp: Date.now(),
    source: 'real',
    dataQuality: 'real',
    indicators: {
      rsi: { value: 55, signal: 'neutral' },
      macd: { histogram: 0.5, signal: 'bullish' },
      bollingerBands: { position: 'upper', bandwidth: 1.2 },
      stochastic: { k: 65, d: 60, signal: 'bullish' },
    },
    ...overrides,
  } as TradingSignal;
}

describe('tier — canonical constants', () => {
  it('FREE_SYMBOLS is exactly the six symbols the product advertises (one per asset class)', () => {
    expect(FREE_SYMBOLS.length).toBe(6);
    expect([...FREE_SYMBOLS]).toEqual([
      'BTCUSD',
      'ETHUSD',
      'XAUUSD',
      'EURUSD',
      'SPYUSD',
      'QQQUSD',
    ]);
  });

  it('FREE_SYMBOLS includes EURUSD, SPYUSD, QQQUSD (forex + index ETF coverage)', () => {
    expect(FREE_SYMBOLS).toContain('EURUSD');
    expect(FREE_SYMBOLS).toContain('SPYUSD');
    expect(FREE_SYMBOLS).toContain('QQQUSD');
  });

  it('TIER_SYMBOLS.free mirrors FREE_SYMBOLS (single source of truth)', () => {
    expect([...TIER_SYMBOLS.free].sort()).toEqual([...FREE_SYMBOLS].sort());
  });

  it('TIER_SYMBOLS.pro contains all free symbols plus more', () => {
    for (const s of FREE_SYMBOLS) {
      expect(TIER_SYMBOLS.pro).toContain(s);
    }
    expect(TIER_SYMBOLS.pro.length).toBeGreaterThan(FREE_SYMBOLS.length);
  });

  it('TIER_HISTORY_DAYS.free is 7 days, pro is unlimited', () => {
    expect(TIER_HISTORY_DAYS.free).toBe(7);
    expect(TIER_HISTORY_DAYS.pro).toBeNull();
  });

  it('TIER_DELAY_MS.free is exactly 15 minutes, pro has no delay', () => {
    expect(TIER_DELAY_MS.free).toBe(15 * 60 * 1000);
    expect(TIER_DELAY_MS.pro).toBe(0);
  });

  it('TIER_LEVEL orders tiers correctly (free < pro < elite < custom)', () => {
    expect(TIER_LEVEL.free).toBeLessThan(TIER_LEVEL.pro);
    expect(TIER_LEVEL.pro).toBeLessThan(TIER_LEVEL.elite);
    expect(TIER_LEVEL.elite).toBeLessThan(TIER_LEVEL.custom);
  });

  it('PRO_PREMIUM_MIN_CONFIDENCE gates the premium band at 85+', () => {
    expect(PRO_PREMIUM_MIN_CONFIDENCE).toBe(85);
  });
});

describe('tier — toLockedStub', () => {
  it('emits only id, symbol, direction, timeframe, confidence, availableAt, locked — no price levels', () => {
    const sig = makeSignal({
      id: 'sig-locked-1',
      symbol: 'XAUUSD',
      direction: 'BUY',
      timeframe: 'H1',
      confidence: 78,
      timestamp: '2026-05-02T12:00:00.000Z',
    });
    const stub = toLockedStub(sig, 15 * 60 * 1000);

    expect(stub).toEqual({
      id: 'sig-locked-1',
      symbol: 'XAUUSD',
      direction: 'BUY',
      timeframe: 'H1',
      confidence: 78,
      availableAt: '2026-05-02T12:15:00.000Z',
      locked: true,
    });
    expect(Object.keys(stub).sort()).toEqual(
      ['availableAt', 'confidence', 'direction', 'id', 'locked', 'symbol', 'timeframe'],
    );
    // No price/indicator fields leak through
    expect(stub).not.toHaveProperty('entry');
    expect(stub).not.toHaveProperty('stopLoss');
    expect(stub).not.toHaveProperty('takeProfit1');
    expect(stub).not.toHaveProperty('takeProfit2');
    expect(stub).not.toHaveProperty('takeProfit3');
    expect(stub).not.toHaveProperty('indicators');
  });

  it('availableAt = timestamp + delayMs', () => {
    const tsMs = Date.UTC(2026, 4, 2, 12, 0, 0);
    const sig = makeSignal({ timestamp: new Date(tsMs).toISOString() });
    const stub = toLockedStub(sig, 15 * 60 * 1000);
    expect(new Date(stub.availableAt).getTime()).toBe(tsMs + 15 * 60 * 1000);
  });

  it('locked is the literal true (not just truthy)', () => {
    const stub = toLockedStub(makeSignal(), 60_000);
    expect(stub.locked).toBe(true);
  });

  it('splitDelayed separates visible signals from locked public-safe stubs', () => {
    const delayMs = 15 * 60 * 1000;
    const now = Date.now();
    const old = makeSignal({
      id: 'old-signal',
      timestamp: new Date(now - delayMs - 1_000).toISOString(),
    });
    const fresh = makeSignal({
      id: 'fresh-signal',
      timestamp: new Date(now - 1_000).toISOString(),
    });

    const out = splitDelayed([old, fresh], delayMs);

    expect(out.visible.map(s => s.id)).toEqual(['old-signal']);
    expect(out.locked).toHaveLength(1);
    expect(out.locked[0]).toEqual({
      id: 'fresh-signal',
      symbol: 'BTCUSD',
      direction: 'BUY',
      timeframe: 'H1',
      confidence: 80,
      availableAt: new Date(new Date(fresh.timestamp).getTime() + delayMs).toISOString(),
      locked: true,
    });
    expect(out.locked[0]).not.toHaveProperty('entry');
    expect(out.locked[0]).not.toHaveProperty('stopLoss');
  });
});

describe('tier — isFreeSymbol', () => {
  it.each(['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'SPYUSD', 'QQQUSD'])(
    'accepts free symbol %s',
    (sym) => {
      expect(isFreeSymbol(sym)).toBe(true);
    },
  );

  it.each(['GBPUSD', 'USDJPY', 'XRPUSD', 'XAGUSD', 'NVDAUSD', 'WTIUSD'])(
    'rejects premium symbol %s',
    (sym) => {
      expect(isFreeSymbol(sym)).toBe(false);
    },
  );

  it('is case-sensitive — lowercase BTCUSD is treated as foreign', () => {
    // Symbols are canonical uppercase; if a caller passes lowercase it's a bug
    // upstream. This test pins the behavior so we notice if someone quietly
    // relaxes it.
    expect(isFreeSymbol('btcusd')).toBe(false);
  });
});

describe('tier — filterSignalByTier', () => {
  it('free caller keeps BTCUSD but stopLoss and TP2/TP3 are masked to null', () => {
    const out = filterSignalByTier(makeSignal({ symbol: 'BTCUSD' }), 'free');
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe('BTCUSD');
    expect(out!.takeProfit1).toBe(51000);
    expect(out!.stopLoss).toBeNull();
    expect(out!.takeProfit2).toBeNull();
    expect(out!.takeProfit3).toBeNull();
  });

  it('free caller keeps EURUSD with TP2/TP3 masked and advanced indicators stripped', () => {
    const out = filterSignalByTier(
      makeSignal({ symbol: 'EURUSD', confidence: 75 }),
      'free',
    );
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe('EURUSD');
    expect(out!.takeProfit1).toBe(51000);
    expect(out!.stopLoss).toBeNull();
    expect(out!.takeProfit2).toBeNull();
    expect(out!.takeProfit3).toBeNull();
    expect(out!.indicators?.macd).toEqual({ histogram: 0, signal: 'neutral' });
    expect(out!.indicators?.bollingerBands).toEqual({
      position: 'middle',
      bandwidth: 0,
    });
    expect(out!.indicators?.stochastic).toEqual({ k: 0, d: 0, signal: 'neutral' });
  });

  it('free caller keeps SPYUSD (index ETF) with the same masking', () => {
    const out = filterSignalByTier(
      makeSignal({ symbol: 'SPYUSD', confidence: 75 }),
      'free',
    );
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe('SPYUSD');
    expect(out!.stopLoss).toBeNull();
    expect(out!.takeProfit2).toBeNull();
    expect(out!.takeProfit3).toBeNull();
  });

  it('free caller keeps QQQUSD (index ETF)', () => {
    const out = filterSignalByTier(
      makeSignal({ symbol: 'QQQUSD', confidence: 75 }),
      'free',
    );
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe('QQQUSD');
  });

  it('free caller sees all non-free symbols dropped', () => {
    const symbols = ['GBPUSD', 'USDJPY', 'XRPUSD', 'NVDAUSD', 'WTIUSD'];
    for (const symbol of symbols) {
      expect(filterSignalByTier(makeSignal({ symbol }), 'free')).toBeNull();
    }
  });

  it('free caller has advanced indicators masked (macd, bollinger, stoch)', () => {
    const out = filterSignalByTier(makeSignal({ symbol: 'ETHUSD' }), 'free');
    expect(out).not.toBeNull();
    expect(out!.indicators?.macd).toEqual({ histogram: 0, signal: 'neutral' });
    expect(out!.indicators?.bollingerBands).toEqual({
      position: 'middle',
      bandwidth: 0,
    });
    expect(out!.indicators?.stochastic).toEqual({ k: 0, d: 0, signal: 'neutral' });
  });

  it('free caller retains basic indicators (rsi stays intact)', () => {
    const out = filterSignalByTier(makeSignal({ symbol: 'BTCUSD' }), 'free');
    expect(out!.indicators?.rsi).toEqual({ value: 55, signal: 'neutral' });
  });

  it('free caller is blocked from premium band (confidence >= 85)', () => {
    const premium = makeSignal({ symbol: 'BTCUSD', confidence: 85 });
    expect(filterSignalByTier(premium, 'free')).toBeNull();

    const higher = makeSignal({ symbol: 'BTCUSD', confidence: 92 });
    expect(filterSignalByTier(higher, 'free')).toBeNull();
  });

  it('free caller keeps standard-band signals (confidence < 85)', () => {
    const standard = makeSignal({ symbol: 'BTCUSD', confidence: 84 });
    expect(filterSignalByTier(standard, 'free')).not.toBeNull();
  });

  it('pro caller sees the premium band', () => {
    const premium = makeSignal({ symbol: 'BTCUSD', confidence: 92 });
    const out = filterSignalByTier(premium, 'pro');
    expect(out).not.toBeNull();
    expect(out!.confidence).toBe(92);
  });

  it('pro caller gets EURUSD and all TPs', () => {
    const out = filterSignalByTier(makeSignal({ symbol: 'EURUSD' }), 'pro');
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe('EURUSD');
    expect(out!.takeProfit1).toBe(51000);
    expect(out!.stopLoss).toBe(49000);
    expect(out!.takeProfit2).toBe(52000);
    expect(out!.takeProfit3).toBe(53000);
  });

  it('pro caller keeps advanced indicators intact', () => {
    const out = filterSignalByTier(makeSignal({ symbol: 'EURUSD' }), 'pro');
    expect(out!.indicators?.macd?.signal).toBe('bullish');
    expect(out!.indicators?.stochastic?.k).toBe(65);
  });

  it('pro behavior on every free-tier symbol is unchanged — full signal passes through', () => {
    for (const symbol of FREE_SYMBOLS) {
      const out = filterSignalByTier(makeSignal({ symbol, confidence: 80 }), 'pro');
      expect(out).not.toBeNull();
      expect(out!.symbol).toBe(symbol);
      expect(out!.takeProfit1).toBe(51000);
      expect(out!.takeProfit2).toBe(52000);
      expect(out!.takeProfit3).toBe(53000);
      expect(out!.indicators?.macd?.signal).toBe('bullish');
      expect(out!.indicators?.bollingerBands?.position).toBe('upper');
      expect(out!.indicators?.stochastic?.k).toBe(65);
    }
  });

  it('filter is pure — does not mutate the input signal', () => {
    const input = makeSignal({ symbol: 'EURUSD' });
    filterSignalByTier(input, 'free');
    expect(input.stopLoss).toBe(49000);
    expect(input.takeProfit2).toBe(52000);
    expect(input.takeProfit3).toBe(53000);
    expect(input.indicators?.macd?.signal).toBe('bullish');
  });
});

describe('tier — meetsMinimumTier', () => {
  it('free meets free but not pro', () => {
    expect(meetsMinimumTier('free', 'free')).toBe(true);
    expect(meetsMinimumTier('free', 'pro')).toBe(false);
  });

  it('pro meets pro and free but not elite', () => {
    expect(meetsMinimumTier('pro', 'free')).toBe(true);
    expect(meetsMinimumTier('pro', 'pro')).toBe(true);
    expect(meetsMinimumTier('pro', 'elite')).toBe(false);
  });

  it('elite meets pro (superset)', () => {
    expect(meetsMinimumTier('elite', 'pro')).toBe(true);
  });

  it('custom meets elite (highest tier)', () => {
    expect(meetsMinimumTier('custom', 'elite')).toBe(true);
  });
});

describe('tier — getStrategiesForTier', () => {
  it('free returns a Set containing only classic', () => {
    const set = getStrategiesForTier('free');
    expect(set).toEqual(new Set(['classic']));
    expect(set.size).toBe(1);
    expect(set.has('classic')).toBe(true);
  });

  it('free does NOT contain premium strategy ids', () => {
    const set = getStrategiesForTier('free');
    expect(set.has('hmm-top3')).toBe(false);
    expect(set.has('tv-zaky-classic')).toBe(false);
    expect(set.has('regime-aware')).toBe(false);
    expect(set.has('full-risk')).toBe(false);
  });

  it('pro contains classic plus all built-in and TV premium strategies', () => {
    const set = getStrategiesForTier('pro');
    expect(set).toEqual(
      new Set([
        'classic',
        'regime-aware',
        'hmm-top3',
        'vwap-ema-bb',
        'full-risk',
        'tv-zaky-classic',
        'tv-hafiz-synergy',
        'tv-impulse-hunter',
      ]),
    );
  });

  it('elite matches pro today (placeholder for future elite-only strategies)', () => {
    expect(getStrategiesForTier('elite')).toEqual(getStrategiesForTier('pro'));
  });

  it('custom matches elite (custom inherits elite by default)', () => {
    expect(getStrategiesForTier('custom')).toEqual(getStrategiesForTier('elite'));
  });

  it('returns a fresh Set per call — mutation does not leak between calls', () => {
    const first = getStrategiesForTier('pro');
    first.add('mutant-strategy');
    first.delete('classic');

    const second = getStrategiesForTier('pro');
    expect(second.has('mutant-strategy')).toBe(false);
    expect(second.has('classic')).toBe(true);
  });

  it('free and pro return distinct Set instances (no shared reference)', () => {
    const free = getStrategiesForTier('free');
    free.add('hmm-top3');
    const proStrategies = getStrategiesForTier('pro');
    // Mutating the free set must not affect a fresh pro lookup.
    expect(proStrategies.size).toBe(8);
  });

});

describe('tier — resolveAccessContext', () => {
  it('anonymous request resolves to free tier with classic-only strategy access', async () => {
    // No session cookie → readSessionFromRequest returns no userId →
    // getTierFromRequest returns 'free' → unlockedStrategies = {'classic'}.
    const req = new Request('http://localhost/api/signals');
    const ctx = await resolveAccessContext(req);
    expect(ctx.tier).toBe('free');
    expect(ctx.unlockedStrategies).toEqual(new Set(['classic']));
  });

  it('returns a fresh Set so callers cannot mutate shared state', async () => {
    const req = new Request('http://localhost/api/signals');
    const first = await resolveAccessContext(req);
    first.unlockedStrategies.add('mutant');

    const second = await resolveAccessContext(req);
    expect(second.unlockedStrategies.has('mutant')).toBe(false);
    expect(second.unlockedStrategies).toEqual(new Set(['classic']));
  });
});

describe('tier — resolveAccessContextFromCookies', () => {
  // Cleanup between cases — Jest doesn't auto-reset module mocks here because
  // the dynamic imports inside resolveAccessContextFromCookies create fresh
  // module instances. Use jest.doMock so each case scopes its own mock.
  afterEach(() => {
    jest.resetModules();
  });

  it('falls back to free tier when next/headers throws (no RSC context)', async () => {
    // In a unit-test environment there is no next/headers cookie store —
    // the dynamic import inside the helper rejects, the catch block returns
    // anonymous. This pins the fail-closed posture.
    const ctx = await resolveAccessContextFromCookies();
    expect(ctx.tier).toBe('free');
    expect(ctx.unlockedStrategies).toEqual(new Set(['classic']));
  });

  it('returns free tier when readSessionFromCookies yields no session', async () => {
    jest.doMock('../user-session', () => ({
      readSessionFromCookies: jest.fn().mockResolvedValue(null),
    }));
    const { resolveAccessContextFromCookies: fn } = await import('../tier');
    const ctx = await fn();
    expect(ctx.tier).toBe('free');
    expect(ctx.unlockedStrategies).toEqual(new Set(['classic']));
  });

  it('returns pro tier with full strategy set when session resolves to a pro user', async () => {
    jest.doMock('../user-session', () => ({
      readSessionFromCookies: jest.fn().mockResolvedValue({
        userId: 'user-pro',
        issuedAt: Date.now(),
      }),
    }));
    jest.doMock('../db', () => ({
      getUserSubscription: jest
        .fn()
        .mockResolvedValue({ tier: 'pro', status: 'active' }),
    }));
    const { resolveAccessContextFromCookies: fn } = await import('../tier');
    const ctx = await fn();
    expect(ctx.tier).toBe('pro');
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
    expect(ctx.unlockedStrategies.has('tv-zaky-classic')).toBe(true);
  });
});

describe('tier — past_due grace window', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('past_due within the grace window keeps Pro access', async () => {
    jest.doMock('../db', () => ({
      getUserSubscription: jest.fn().mockResolvedValue({
        tier: 'pro',
        status: 'past_due',
        currentPeriodEnd: new Date(Date.now() - 2 * 86400 * 1000),
      }),
      getUserById: jest.fn().mockResolvedValue(null),
    }));
    const { getUserTier } = await import('../tier');
    const tier = await getUserTier('user-x');
    expect(tier).toBe('pro');
  });

  it('past_due past the grace window downgrades to free', async () => {
    jest.doMock('../db', () => ({
      getUserSubscription: jest.fn().mockResolvedValue({
        tier: 'pro',
        status: 'past_due',
        currentPeriodEnd: new Date(Date.now() - 30 * 86400 * 1000),
      }),
      getUserById: jest.fn().mockResolvedValue(null),
    }));
    const { getUserTier } = await import('../tier');
    const tier = await getUserTier('user-x');
    expect(tier).toBe('free');
  });

  it('canceled never gets the grace window (already terminated)', async () => {
    jest.doMock('../db', () => ({
      getUserSubscription: jest.fn().mockResolvedValue({
        tier: 'pro',
        status: 'canceled',
        currentPeriodEnd: new Date(Date.now() + 86400 * 1000),
      }),
      getUserById: jest.fn().mockResolvedValue(null),
    }));
    const { getUserTier } = await import('../tier');
    const tier = await getUserTier('user-x');
    expect(tier).toBe('free');
  });

  it('active passes through unchanged', async () => {
    jest.doMock('../db', () => ({
      getUserSubscription: jest.fn().mockResolvedValue({
        tier: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000),
      }),
      getUserById: jest.fn().mockResolvedValue(null),
    }));
    const { getUserTier } = await import('../tier');
    const tier = await getUserTier('user-x');
    expect(tier).toBe('pro');
  });
});

describe('tier — E2E_FORCE_PRO_TIER override', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = ORIGINAL_ENV;
  });

  it('returns pro for the configured user when env is set in non-production', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test', E2E_FORCE_PRO_TIER: 'true' };
    const { getUserTier } = await import('../tier');
    expect(await getUserTier('e2e-pro-user')).toBe('pro');
  });

  it('does not upgrade a different user even when env is set', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test', E2E_FORCE_PRO_TIER: 'true' };
    jest.doMock('../db', () => ({
      getUserSubscription: jest.fn().mockResolvedValue(null),
      getUserById: jest.fn().mockResolvedValue(null),
    }));
    const { getUserTier } = await import('../tier');
    expect(await getUserTier('some-other-user')).toBe('free');
  });

  it('refuses to fire in production even when env is set', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production', E2E_FORCE_PRO_TIER: 'true' };
    jest.doMock('../db', () => ({
      getUserSubscription: jest.fn().mockResolvedValue(null),
      getUserById: jest.fn().mockResolvedValue(null),
    }));
    const { getUserTier } = await import('../tier');
    expect(await getUserTier('e2e-pro-user')).toBe('free');
  });

  it('honors E2E_PRO_USER_ID override when set', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'test',
      E2E_FORCE_PRO_TIER: 'true',
      E2E_PRO_USER_ID: 'custom-pro-id',
    };
    const { getUserTier } = await import('../tier');
    expect(await getUserTier('custom-pro-id')).toBe('pro');
  });
});

describe('tier — getStrategiesForTier (PRO_STRATEGIES regression pin)', () => {
  it('free tier returns only the always-free classic preset', () => {
    expect([...getStrategiesForTier('free')].sort()).toEqual(['classic']);
  });

  it('pro tier returns the canonical PRO_STRATEGIES set — pinned to prevent silent drift', () => {
    expect([...getStrategiesForTier('pro')].sort()).toEqual([
      'classic',
      'full-risk',
      'hmm-top3',
      'regime-aware',
      'tv-hafiz-synergy',
      'tv-impulse-hunter',
      'tv-zaky-classic',
      'vwap-ema-bb',
    ]);
  });

  it('elite and custom inherit pro strategies', () => {
    const pro = [...getStrategiesForTier('pro')].sort();
    expect([...getStrategiesForTier('elite')].sort()).toEqual(pro);
    expect([...getStrategiesForTier('custom')].sort()).toEqual(pro);
  });

  it('returned set is fresh per call — caller mutation does not leak across callers', () => {
    const a = getStrategiesForTier('pro');
    a.add('mutation-attempt');
    const b = getStrategiesForTier('pro');
    expect(b.has('mutation-attempt')).toBe(false);
  });
});
