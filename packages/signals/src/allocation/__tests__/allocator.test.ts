/**
 * Unit tests for the dynamic allocation engine (structural regimes, plan D2/D3).
 */

import {
  computeAllocation,
  computeVolatilityScaler,
  getSymbolTier,
  getTierWeight,
  SYMBOL_TIER,
} from '../allocator.js';
import { REGIME_ALLOCATION_RULES, getAllocationRules } from '../regime-rules.js';
import type { PortfolioState } from '../types.js';
import type { MarketRegime } from '../../regime/types.js';
import type { SignalInput } from '../allocator.js';

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

// ─── Trend Regime ───────────────────────────────────────────────────────────

describe('trend regime', () => {
  it('allows both BUY and SELL', () => {
    const buyResult = computeAllocation(
      makeSignal({ direction: 'BUY' }),
      'trend',
      makePortfolio({ positionsValue: 0 }),
    );
    const sellResult = computeAllocation(
      makeSignal({ direction: 'SELL' }),
      'trend',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(buyResult.approved).toBe(true);
    expect(sellResult.approved).toBe(true);
  });

  it('allows leverage of 2', () => {
    const result = computeAllocation(
      makeSignal(),
      'trend',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.leverageMultiplier).toBe(2);
  });

  it('caps single position at 15%', () => {
    const result = computeAllocation(
      makeSignal({ confidence: 100, symbol: 'XAUUSD' }),
      'trend',
      makePortfolio({ positionsValue: 0 }),
    );
    // Tier 1 at 100% confidence: 15% * 1.0 * 1.0 = 15%
    expect(result.positionSizePct).toBe(15);
  });

  it('allows larger positions than range', () => {
    const signal = makeSignal({ confidence: 100, symbol: 'XAUUSD' });
    const portfolio = makePortfolio({ positionsValue: 0 });

    const trendResult = computeAllocation(signal, 'trend', portfolio);
    const rangeResult = computeAllocation(signal, 'range', portfolio);

    expect(trendResult.positionSizePct).toBeGreaterThan(rangeResult.positionSizePct);
  });

  it('does not tighten stops', () => {
    const result = computeAllocation(
      makeSignal(),
      'trend',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.rules.tightenStops).toBe(false);
  });
});

// ─── Volatile Regime ────────────────────────────────────────────────────────

describe('volatile regime', () => {
  it('allows both directions (direction routing is Phase 4)', () => {
    const rules = REGIME_ALLOCATION_RULES['volatile'];
    expect(rules.allowedDirections).toContain('BUY');
    expect(rules.allowedDirections).toContain('SELL');
  });

  it('tightens from trend levels', () => {
    const signal = makeSignal({ confidence: 100, symbol: 'XAUUSD' });
    const portfolio = makePortfolio({ positionsValue: 0 });

    const volatileResult = computeAllocation(signal, 'volatile', portfolio);
    const trendResult = computeAllocation(signal, 'trend', portfolio);

    // Volatile max single position is 8% vs trend 15%
    expect(volatileResult.positionSizePct).toBeLessThan(trendResult.positionSizePct);
    // Volatile leverage 1 vs trend 2
    expect(volatileResult.leverageMultiplier).toBeLessThan(trendResult.leverageMultiplier);
  });

  it('caps single position at 8%', () => {
    const result = computeAllocation(
      makeSignal({ confidence: 100, symbol: 'XAUUSD' }),
      'volatile',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.positionSizePct).toBe(8);
  });

  it('tightens stops', () => {
    const result = computeAllocation(
      makeSignal(),
      'volatile',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.rules.tightenStops).toBe(true);
  });

  it('caps exposure lower than trend', () => {
    const volatileRules = REGIME_ALLOCATION_RULES['volatile'];
    const trendRules = REGIME_ALLOCATION_RULES['trend'];
    expect(volatileRules.maxExposurePct).toBeLessThan(trendRules.maxExposurePct);
  });
});

// ─── Range Regime ───────────────────────────────────────────────────────────

describe('range regime', () => {
  it('allows both BUY and SELL', () => {
    const buyResult = computeAllocation(
      makeSignal({ direction: 'BUY' }),
      'range',
      makePortfolio({ positionsValue: 0 }),
    );
    const sellResult = computeAllocation(
      makeSignal({ direction: 'SELL' }),
      'range',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(buyResult.approved).toBe(true);
    expect(sellResult.approved).toBe(true);
  });

  it('has leverage of 1', () => {
    const result = computeAllocation(
      makeSignal(),
      'range',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.leverageMultiplier).toBe(1);
  });

  it('caps single position at 6%', () => {
    const result = computeAllocation(
      makeSignal({ confidence: 100, symbol: 'XAUUSD' }),
      'range',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.positionSizePct).toBe(6);
  });

  it('has the smallest exposure cap of the three regimes', () => {
    const { trend, volatile, range } = REGIME_ALLOCATION_RULES;
    expect(range.maxExposurePct).toBeLessThan(volatile.maxExposurePct);
    expect(range.maxExposurePct).toBeLessThan(trend.maxExposurePct);
  });

  it('does not tighten stops', () => {
    const result = computeAllocation(
      makeSignal(),
      'range',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.rules.tightenStops).toBe(false);
  });
});

// ─── Unknown-Regime Fallback (plan D1) ──────────────────────────────────────

describe('getAllocationRules fallback', () => {
  it('falls back to range rules for unknown regime labels', () => {
    const rules = getAllocationRules('definitely-not-a-regime' as MarketRegime);
    expect(rules).toEqual(REGIME_ALLOCATION_RULES['range']);
  });
});

// ─── Volatility Scaler ──────────────────────────────────────────────────────

describe('computeVolatilityScaler', () => {
  it('returns 1.0 at or below the regime baseline', () => {
    expect(computeVolatilityScaler(0.01, 'trend')).toBe(1.0);
    expect(computeVolatilityScaler(0, 'range')).toBe(1.0);
  });

  it('shrinks proportionally above the baseline with a 0.25 floor', () => {
    // trend baseline 0.025: vol 0.05 → 0.5
    expect(computeVolatilityScaler(0.05, 'trend')).toBeCloseTo(0.5, 9);
    // extreme vol hits the floor
    expect(computeVolatilityScaler(10, 'trend')).toBe(0.25);
  });

  it('never returns NaN for an unknown regime (falls back to range baseline)', () => {
    const scaler = computeVolatilityScaler(0.05, 'mystery' as MarketRegime);
    expect(Number.isFinite(scaler)).toBe(true);
    // range baseline 0.015: 0.015 / 0.05 = 0.3
    expect(scaler).toBeCloseTo(0.3, 9);
  });
});

// ─── Confidence Scaling ─────────────────────────────────────────────────────

describe('confidence scaling', () => {
  it('higher confidence produces larger position size', () => {
    const portfolio = makePortfolio({ positionsValue: 0 });
    const low = computeAllocation(
      makeSignal({ confidence: 30 }),
      'trend',
      portfolio,
    );
    const high = computeAllocation(
      makeSignal({ confidence: 90 }),
      'trend',
      portfolio,
    );
    expect(high.positionSizePct).toBeGreaterThan(low.positionSizePct);
  });

  it('zero confidence produces zero-size position', () => {
    const result = computeAllocation(
      makeSignal({ confidence: 0 }),
      'trend',
      makePortfolio({ positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.positionSizePct).toBe(0);
  });

  it('confidence is clamped to 0-100 range', () => {
    const portfolio = makePortfolio({ positionsValue: 0 });
    const over = computeAllocation(
      makeSignal({ confidence: 150 }),
      'trend',
      portfolio,
    );
    const atMax = computeAllocation(
      makeSignal({ confidence: 100 }),
      'trend',
      portfolio,
    );
    expect(over.positionSizePct).toBe(atMax.positionSizePct);
  });
});

// ─── Max Exposure Cap ───────────────────────────────────────────────────────

describe('maxExposure cap', () => {
  it('blocks allocation when exposure already at max', () => {
    // Trend max exposure = 80%. Portfolio already at 80%.
    const result = computeAllocation(
      makeSignal(),
      'trend',
      makePortfolio({ totalEquity: 100_000, positionsValue: 80_000 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('already at or above max');
  });

  it('caps position size to remaining headroom', () => {
    // Trend max exposure = 80%. Currently at 75%, so only 5% headroom.
    const result = computeAllocation(
      makeSignal({ confidence: 100, symbol: 'XAUUSD' }),
      'trend',
      makePortfolio({ totalEquity: 100_000, positionsValue: 75_000 }),
    );
    expect(result.approved).toBe(true);
    // Tier 1, 100% confidence would give 15% raw size, but capped at 5% headroom
    expect(result.positionSizePct).toBeLessThanOrEqual(5);
  });

  it('handles zero equity gracefully', () => {
    const result = computeAllocation(
      makeSignal(),
      'trend',
      makePortfolio({ totalEquity: 0, positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('zero or negative');
  });

  it('blocks allocation when equity is negative', () => {
    const result = computeAllocation(
      makeSignal(),
      'trend',
      makePortfolio({ totalEquity: -1000, positionsValue: 0 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('zero or negative');
  });

  it('blocks allocation when positions value is negative', () => {
    const result = computeAllocation(
      makeSignal(),
      'trend',
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
      'trend',
      portfolio,
    );
    const tier2 = computeAllocation(
      makeSignal({ symbol: 'BTCUSD', confidence }),
      'trend',
      portfolio,
    );
    const tier3 = computeAllocation(
      makeSignal({ symbol: 'GBPUSD', confidence }),
      'trend',
      portfolio,
    );

    // Tier 1 = 15% * 1.0 = 15%
    // Tier 2 = 15% * 0.8 = 12%
    // Tier 3 = 15% * 0.6 = 9%
    expect(tier1.positionSizePct).toBe(15);
    expect(tier2.positionSizePct).toBe(12);
    expect(tier3.positionSizePct).toBe(9);

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
      'trend',
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
    // Exposure already at the volatile cap (40%)
    const result = computeAllocation(
      makeSignal(),
      'volatile',
      makePortfolio({ totalEquity: 100_000, positionsValue: 40_000 }),
    );
    expect(result.approved).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason!.length).toBeGreaterThan(0);
  });
});
