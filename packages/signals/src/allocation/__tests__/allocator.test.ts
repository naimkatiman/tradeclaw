/**
 * Unit tests for the dynamic allocation engine.
 */

import {
  computeAllocation,
  getSymbolTier,
  getTierWeight,
  SYMBOL_TIER,
} from '../allocator';
import { REGIME_ALLOCATION_RULES } from '../regime-rules';
import type { PortfolioState } from '../types';
import type { MarketRegime } from '../../regime/types';
import type { SignalInput } from '../allocator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePortfolio(overrides: Partial<PortfolioState> = {}): PortfolioState {
  return {
    totalEquity: 100_000,
    cash: 80_000,
    positionsValue: 20_000,
    openPositions: [],
    highWaterMark: 100_000,
    drawdownPct: 0,
    ...overrides,
  };
}

function makeSignal(overrides: Partial<SignalInput> = {}): SignalInput {
  return {
    symbol: 'XAUUSD',
    direction: 'BUY',
    confidence: 75,
    ...overrides,
  };
}

// ─── Crash Regime ───────────────────────────────────────────────────────────

describe('crash regime', () => {
  it('blocks BUY direction', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'BUY' }),
      'crash',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.positionSizePct).toBe(0);
    expect(result.reason).toContain('not allowed');
    expect(result.regime).toBe('crash');
  });

  it('allows small SELL positions', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'SELL', confidence: 80 }),
      'crash',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(true);
    expect(result.positionSizePct).toBeLessThanOrEqual(3);
  });

  it('caps single position at 3%', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'SELL', confidence: 100, symbol: 'XAUUSD' }),
      'crash',
      makePortfolio({ positionsValue: 0 }),
    );
    // Tier 1 at 100% confidence: 3% * 1.0 * 1.0 = 3%
    expect(result.positionSizePct).toBeLessThanOrEqual(3);
  });
});

// ─── Bear Regime ────────────────────────────────────────────────────────────

describe('bear regime', () => {
  it('blocks BUY direction', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'BUY' }),
      'bear',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('not allowed');
  });

  it('allows SELL direction', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'SELL', confidence: 80 }),
      'bear',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(true);
    expect(result.positionSizePct).toBeGreaterThan(0);
  });

  it('caps single position at 8%', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'SELL', confidence: 100, symbol: 'XAUUSD' }),
      'bear',
      makePortfolio({ positionsValue: 0 }),
    );
    // Tier 1 at 100% confidence: 8% * 1.0 * 1.0 = 8%
    expect(result.positionSizePct).toBeLessThanOrEqual(8);
  });

  it('tightens stops', () => {
    const result = computeAllocation(
      makeSignal({ direction: 'SELL' }),
      'bear',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.rules.tightenStops).toBe(true);
  });
});

// ─── Neutral Regime ─────────────────────────────────────────────────────────

describe('neutral regime', () => {
  it('allows both BUY and SELL', () => {
    const buyResult = computeAllocation(
      makeSignal({ direction: 'BUY' }),
      'neutral',
      makePortfolio({ positionsValue: 0 }),
    );
    const sellResult = computeAllocation(
      makeSignal({ direction: 'SELL' }),
      'neutral',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(buyResult.approved).toBe(true);
    expect(sellResult.approved).toBe(true);
  });

  it('has leverage of 1.5', () => {
    const result = computeAllocation(
      makeSignal(),
      'neutral',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.leverageMultiplier).toBe(1.5);
  });
});

// ─── Bull Regime ────────────────────────────────────────────────────────────

describe('bull regime', () => {
  it('allows larger positions than neutral', () => {
    const signal = makeSignal({ confidence: 100, symbol: 'XAUUSD' });
    const portfolio = makePortfolio({ positionsValue: 0 });

    const bullResult = computeAllocation(signal, 'bull', portfolio);
    const neutralResult = computeAllocation(signal, 'neutral', portfolio);

    expect(bullResult.positionSizePct).toBeGreaterThan(neutralResult.positionSizePct);
  });

  it('allows leverage of 2', () => {
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.leverageMultiplier).toBe(2);
  });

  it('allows both directions', () => {
    const rules = REGIME_ALLOCATION_RULES['bull'];
    expect(rules.allowedDirections).toContain('BUY');
    expect(rules.allowedDirections).toContain('SELL');
  });

  it('does not tighten stops', () => {
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.rules.tightenStops).toBe(false);
  });
});

// ─── Euphoria Regime ────────────────────────────────────────────────────────

describe('euphoria regime', () => {
  it('tightens from bull levels', () => {
    const signal = makeSignal({ confidence: 100, symbol: 'XAUUSD' });
    const portfolio = makePortfolio({ positionsValue: 0 });

    const euphoriaResult = computeAllocation(signal, 'euphoria', portfolio);
    const bullResult = computeAllocation(signal, 'bull', portfolio);

    // Euphoria max single position is 15% vs bull 20%
    expect(euphoriaResult.positionSizePct).toBeLessThan(bullResult.positionSizePct);
    // Euphoria leverage 1.5 vs bull 2
    expect(euphoriaResult.leverageMultiplier).toBeLessThan(bullResult.leverageMultiplier);
  });

  it('does not tighten stops (let trend run)', () => {
    const result = computeAllocation(
      makeSignal(),
      'euphoria',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.rules.tightenStops).toBe(false);
  });

  it('caps exposure lower than bull', () => {
    const euphoriaRules = REGIME_ALLOCATION_RULES['euphoria'];
    const bullRules = REGIME_ALLOCATION_RULES['bull'];
    expect(euphoriaRules.maxExposurePct).toBeLessThan(bullRules.maxExposurePct);
  });
});

// ─── Confidence Scaling ─────────────────────────────────────────────────────

describe('confidence scaling', () => {
  it('higher confidence produces larger position size', () => {
    const portfolio = makePortfolio({ positionsValue: 0 });
    const low = computeAllocation(
      makeSignal({ confidence: 30 }),
      'bull',
      portfolio,
    );
    const high = computeAllocation(
      makeSignal({ confidence: 90 }),
      'bull',
      portfolio,
    );
    expect(high.positionSizePct).toBeGreaterThan(low.positionSizePct);
  });

  it('zero confidence produces zero-size position', () => {
    const result = computeAllocation(
      makeSignal({ confidence: 0 }),
      'bull',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.positionSizePct).toBe(0);
  });

  it('confidence is clamped to 0-100 range', () => {
    const portfolio = makePortfolio({ positionsValue: 0 });
    const over = computeAllocation(
      makeSignal({ confidence: 150 }),
      'bull',
      portfolio,
    );
    const atMax = computeAllocation(
      makeSignal({ confidence: 100 }),
      'bull',
      portfolio,
    );
    expect(over.positionSizePct).toBe(atMax.positionSizePct);
  });
});

// ─── Max Exposure Cap ───────────────────────────────────────────────────────

describe('maxExposure cap', () => {
  it('blocks allocation when exposure already at max', () => {
    // Bull max exposure = 85%. Portfolio already at 85%.
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ totalEquity: 100_000, positionsValue: 85_000 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('already at or above max');
  });

  it('caps position size to remaining headroom', () => {
    // Bull max exposure = 85%. Currently at 80%, so only 5% headroom.
    const result = computeAllocation(
      makeSignal({ confidence: 100, symbol: 'XAUUSD' }),
      'bull',
      makePortfolio({ totalEquity: 100_000, positionsValue: 80_000 }),
    );
    expect(result.approved).toBe(true);
    // Tier 1, 100% confidence would give 20% raw size, but capped at 5% headroom
    expect(result.positionSizePct).toBeLessThanOrEqual(5);
  });

  it('handles zero equity gracefully', () => {
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ totalEquity: 0, positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('zero or negative');
  });

  it('blocks allocation when equity is negative', () => {
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ totalEquity: -1000, positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('zero or negative');
  });

  it('blocks allocation when positions value is negative', () => {
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ totalEquity: 100_000, positionsValue: -5000 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('negative positions value');
  });
});

// ─── Tier Weighting ─────────────────────────────────────────────────────────

describe('tier weighting', () => {
  it('Tier 1 symbols get full allocation', () => {
    expect(getSymbolTier('XAUUSD')).toBe(1);
    expect(getTierWeight(1)).toBe(1.0);
  });

  it('Tier 2 symbols get 80% allocation', () => {
    expect(getSymbolTier('BTCUSD')).toBe(2);
    expect(getTierWeight(2)).toBe(0.8);
  });

  it('Tier 3 symbols get 60% allocation', () => {
    expect(getSymbolTier('GBPUSD')).toBe(3);
    expect(getTierWeight(3)).toBe(0.6);
  });

  it('unknown symbols default to Tier 2', () => {
    expect(getSymbolTier('RANDOMUSD')).toBe(2);
  });

  it('tier weight reduces position size proportionally', () => {
    const portfolio = makePortfolio({ positionsValue: 0 });
    const confidence = 100;

    const tier1 = computeAllocation(
      makeSignal({ symbol: 'XAUUSD', confidence }),
      'bull',
      portfolio,
    );
    const tier2 = computeAllocation(
      makeSignal({ symbol: 'BTCUSD', confidence }),
      'bull',
      portfolio,
    );
    const tier3 = computeAllocation(
      makeSignal({ symbol: 'GBPUSD', confidence }),
      'bull',
      portfolio,
    );

    // Tier 1 = 20% * 1.0 = 20%
    // Tier 2 = 20% * 0.8 = 16%
    // Tier 3 = 20% * 0.6 = 12%
    expect(tier1.positionSizePct).toBe(20);
    expect(tier2.positionSizePct).toBe(16);
    expect(tier3.positionSizePct).toBe(12);

    expect(tier1.positionSizePct).toBeGreaterThan(tier2.positionSizePct);
    expect(tier2.positionSizePct).toBeGreaterThan(tier3.positionSizePct);
  });

  it('maps known symbols correctly', () => {
    expect(SYMBOL_TIER['XAUUSD']).toBe(1);
    expect(SYMBOL_TIER['USDCAD']).toBe(1);
    expect(SYMBOL_TIER['XAGUSD']).toBe(1);
    expect(SYMBOL_TIER['EURUSD']).toBe(1);
    expect(SYMBOL_TIER['AUDUSD']).toBe(2);
    expect(SYMBOL_TIER['BTCUSD']).toBe(2);
    expect(SYMBOL_TIER['ETHUSD']).toBe(2);
    expect(SYMBOL_TIER['USDJPY']).toBe(2);
    expect(SYMBOL_TIER['GBPUSD']).toBe(3);
    expect(SYMBOL_TIER['XRPUSD']).toBe(3);
  });
});

// ─── Result Shape ───────────────────────────────────────────────────────────

describe('result shape', () => {
  it('approved result includes all expected fields', () => {
    const result = computeAllocation(
      makeSignal(),
      'bull',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(true);
    expect(typeof result.positionSizePct).toBe('number');
    expect(typeof result.leverageMultiplier).toBe('number');
    expect(typeof result.regime).toBe('string');
    expect(result.rules).toBeDefined();
    expect(typeof result.reason).toBe('string');
  });

  it('rejected result includes reason', () => {
    // BUY not allowed in crash (only SELL)
    const result = computeAllocation(
      makeSignal({ direction: 'BUY' }),
      'crash',
      makePortfolio(),
    );
    expect(result.approved).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason!.length).toBeGreaterThan(0);
  });
});
