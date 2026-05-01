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
} from '../tier';
// Transitional cross-check import: this stays in the test file only so the
// production `tier.ts` does not depend on `licenses.ts`. After Phase D removes
// `licenses.ts`, update or delete the drift-check test below.
import { ALLOWED_PREMIUM_STRATEGIES } from '../licenses';
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
  it('free caller keeps BTCUSD but TP2/TP3 are masked to null', () => {
    const out = filterSignalByTier(makeSignal({ symbol: 'BTCUSD' }), 'free');
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe('BTCUSD');
    expect(out!.takeProfit1).toBe(51000);
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

  it('drift check: pro equals classic + ALLOWED_PREMIUM_STRATEGIES from licenses.ts', () => {
    // Transitional safeguard during the license→tier migration. Production
    // `tier.ts` does NOT import from `licenses.ts`; this test does so only to
    // catch list drift during the transition window. Remove or update after
    // Phase D removes `licenses.ts`.
    expect(getStrategiesForTier('pro')).toEqual(
      new Set(['classic', ...ALLOWED_PREMIUM_STRATEGIES]),
    );
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
