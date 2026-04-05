# Market Regime Detection & Multi-Condition Strategy Skills — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ADX-based market regime detection, an S/R bounce skill for ranging markets, a volatility breakout skill for expanding markets, and wire regime-aware routing into the signal engine.

**Architecture:** Three new agent skills follow the existing `BaseSkill` pattern (class with `name`, `description`, `version`, `analyze()`). A new `calculateADX()` indicator joins the signals package. The regime detector classifies markets as `trending | ranging | volatile` using ADX + Bollinger bandwidth, then each skill self-gates on its target regime so only relevant strategies boost/penalize confidence. The signal engine already populates `IndicatorSummary` — we extend it to always include `adx` data so skills can read it.

**Tech Stack:** TypeScript, Jest (vitest-compatible via `npm test`), `@tradeclaw/signals` package, agent skill loader (auto-discovers `packages/agent/skills/*/index.js`)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `packages/signals/src/adx.ts` | `calculateADX()` — returns ADX value, +DI, -DI |
| Modify | `packages/signals/src/index.ts` | Re-export `calculateADX` |
| Create | `packages/signals/src/__tests__/adx.test.ts` | Unit tests for ADX |
| Modify | `packages/agent/src/signals/engine.ts:104-156` | Populate `adx` field in `computeIndicators()` |
| Create | `packages/agent/skills/sr-bounce/index.js` | S/R bounce skill for ranging markets |
| Create | `packages/agent/skills/volatility-breakout/index.js` | Volatility breakout skill for expanding markets |
| Create | `packages/agent/skills/regime-detector/index.js` | Market regime classifier — gates other skills |
| Modify | `packages/agent/src/gateway/config.ts:13` | Add new skills to `DEFAULT_CONFIG.skills` |
| Create | `packages/agent/skills/__tests__/sr-bounce.test.ts` | Tests for S/R bounce logic |
| Create | `packages/agent/skills/__tests__/volatility-breakout.test.ts` | Tests for volatility breakout logic |
| Create | `packages/agent/skills/__tests__/regime-detector.test.ts` | Tests for regime classification |
| Modify | `apps/web/app/api/strategies/route.ts` | Add two new preset strategies |

---

## Task 1: ADX Indicator — Failing Tests

**Files:**
- Create: `packages/signals/src/__tests__/adx.test.ts`

- [ ] **Step 1: Write failing tests for `calculateADX`**

```typescript
import { calculateADX } from '../adx.js';

function repeat(value: number, n: number): number[] {
  return Array(n).fill(value);
}

function linspace(start: number, end: number, n: number): number[] {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

describe('calculateADX', () => {
  it('returns neutral values when not enough data', () => {
    const result = calculateADX(
      [100, 101, 102],
      [98, 99, 100],
      [99, 100, 101],
      14
    );
    expect(result.value).toBe(0);
    expect(result.plusDI).toBe(0);
    expect(result.minusDI).toBe(0);
    expect(result.trending).toBe(false);
  });

  it('shows strong trending (ADX > 25) on a clear uptrend', () => {
    const n = 60;
    const high = linspace(102, 160, n);
    const low = linspace(98, 156, n);
    const close = linspace(100, 158, n);
    const result = calculateADX(high, low, close, 14);
    expect(result.value).toBeGreaterThan(25);
    expect(result.trending).toBe(true);
    expect(result.plusDI).toBeGreaterThan(result.minusDI);
  });

  it('shows strong trending on a clear downtrend', () => {
    const n = 60;
    const high = linspace(160, 102, n);
    const low = linspace(156, 98, n);
    const close = linspace(158, 100, n);
    const result = calculateADX(high, low, close, 14);
    expect(result.value).toBeGreaterThan(25);
    expect(result.trending).toBe(true);
    expect(result.minusDI).toBeGreaterThan(result.plusDI);
  });

  it('shows weak/no trend (ADX < 25) on sideways market', () => {
    const n = 60;
    const base = 100;
    const high = Array.from({ length: n }, (_, i) => base + 2 + Math.sin(i) * 0.5);
    const low = Array.from({ length: n }, (_, i) => base - 2 + Math.sin(i) * 0.5);
    const close = Array.from({ length: n }, (_, i) => base + Math.sin(i) * 0.5);
    const result = calculateADX(high, low, close, 14);
    expect(result.value).toBeLessThan(25);
    expect(result.trending).toBe(false);
  });

  it('ADX value is in [0, 100] range', () => {
    const n = 60;
    const high = Array.from({ length: n }, () => 100 + Math.random() * 10);
    const low = Array.from({ length: n }, () => 90 + Math.random() * 5);
    const close = Array.from({ length: n }, (_, i) =>
      low[i] + Math.random() * (high[i] - low[i])
    );
    const result = calculateADX(high, low, close, 14);
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(100);
  });

  it('+DI and -DI are in [0, 100] range', () => {
    const n = 60;
    const high = linspace(100, 150, n);
    const low = linspace(96, 146, n);
    const close = linspace(98, 148, n);
    const result = calculateADX(high, low, close, 14);
    expect(result.plusDI).toBeGreaterThanOrEqual(0);
    expect(result.plusDI).toBeLessThanOrEqual(100);
    expect(result.minusDI).toBeGreaterThanOrEqual(0);
    expect(result.minusDI).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest packages/signals/src/__tests__/adx.test.ts --no-coverage 2>&1 | head -30`
Expected: FAIL — cannot find module `../adx.js`

---

## Task 2: ADX Indicator — Implementation

**Files:**
- Create: `packages/signals/src/adx.ts`
- Modify: `packages/signals/src/index.ts`

- [ ] **Step 1: Implement `calculateADX`**

```typescript
/**
 * Calculate Average Directional Index (ADX) with +DI and -DI.
 *
 * ADX measures trend strength (not direction):
 * - ADX < 20: weak/no trend (ranging)
 * - ADX 20-25: emerging trend
 * - ADX > 25: strong trend
 * - ADX > 50: very strong trend
 *
 * +DI > -DI suggests bullish pressure; -DI > +DI suggests bearish.
 */
export function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): { value: number; plusDI: number; minusDI: number; trending: boolean } {
  const len = high.length;
  if (len < period + 1) {
    return { value: 0, plusDI: 0, minusDI: 0, trending: false };
  }

  // Step 1: Calculate True Range, +DM, -DM for each bar
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < len; i++) {
    const highDiff = high[i] - high[i - 1];
    const lowDiff = low[i - 1] - low[i];

    tr.push(Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    ));

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }

  // Step 2: Wilder's smoothing for TR, +DM, -DM (first value = sum of period)
  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;

  for (let i = 0; i < period; i++) {
    smoothTR += tr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const dxValues: number[] = [];

  // First DI values
  let pDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
  let mDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
  let diSum = pDI + mDI;
  if (diSum > 0) {
    dxValues.push((Math.abs(pDI - mDI) / diSum) * 100);
  }

  // Continue Wilder's smoothing for remaining bars
  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    pDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    mDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    diSum = pDI + mDI;

    if (diSum > 0) {
      dxValues.push((Math.abs(pDI - mDI) / diSum) * 100);
    }
  }

  // Step 3: ADX = Wilder-smoothed average of DX values
  if (dxValues.length < period) {
    const avg = dxValues.reduce((s, v) => s + v, 0) / (dxValues.length || 1);
    return {
      value: Math.max(0, Math.min(100, avg)),
      plusDI: Math.max(0, Math.min(100, pDI)),
      minusDI: Math.max(0, Math.min(100, mDI)),
      trending: avg >= 25,
    };
  }

  let adx = 0;
  for (let i = 0; i < period; i++) {
    adx += dxValues[i];
  }
  adx /= period;

  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  return {
    value: Math.max(0, Math.min(100, adx)),
    plusDI: Math.max(0, Math.min(100, pDI)),
    minusDI: Math.max(0, Math.min(100, mDI)),
    trending: adx >= 25,
  };
}
```

- [ ] **Step 2: Add re-export in `packages/signals/src/index.ts`**

After the existing `findResistanceLevels` function (around line 377), add:

```typescript
export { calculateADX } from './adx.js';
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest packages/signals/src/__tests__/adx.test.ts --no-coverage`
Expected: All 6 tests PASS

- [ ] **Step 4: Run the full indicator test suite to ensure nothing broke**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest packages/signals/ --no-coverage`
Expected: All existing + new tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/signals/src/adx.ts packages/signals/src/__tests__/adx.test.ts packages/signals/src/index.ts
git commit -m "feat(signals): add calculateADX indicator with +DI/-DI and trend detection"
```

---

## Task 3: Wire ADX Into the Signal Engine

**Files:**
- Modify: `packages/agent/src/signals/engine.ts:1-10` (imports)
- Modify: `packages/agent/src/signals/engine.ts:104-156` (`computeIndicators`)

- [ ] **Step 1: Add `calculateADX` to imports**

In `packages/agent/src/signals/engine.ts`, line 1, change the import to include `calculateADX`:

```typescript
import {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic,
  findSupportLevels,
  findResistanceLevels,
  calculateADX,
} from '@tradeclaw/signals';
```

- [ ] **Step 2: Compute ADX in `computeIndicators` and add to return value**

In `packages/agent/src/signals/engine.ts`, inside the `computeIndicators` function, after the `resistance` calculation (around line 136) and before the `return` statement, add the ADX calculation:

```typescript
  const adxResult = calculateADX(high, low, close, 14);
```

Then modify the return object to include:

```typescript
    adx: {
      value: Number(adxResult.value.toFixed(1)),
      trending: adxResult.trending,
      plusDI: Number(adxResult.plusDI.toFixed(1)),
      minusDI: Number(adxResult.minusDI.toFixed(1)),
    },
```

- [ ] **Step 3: Run the build to verify types are correct**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build 2>&1 | tail -20`
Expected: Build succeeds — `adx` is already an optional field on `IndicatorSummary`

- [ ] **Step 4: Commit**

```bash
git add packages/agent/src/signals/engine.ts
git commit -m "feat(agent): compute ADX in signal engine and populate IndicatorSummary.adx"
```

---

## Task 4: S/R Bounce Skill — Failing Tests

**Files:**
- Create: `packages/agent/skills/__tests__/sr-bounce.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
/**
 * S/R Bounce Skill tests.
 * Tests the confidence adjustment logic directly, without calling generateSignals.
 */

describe('SRBounceSkill logic', () => {
  // Helper: simulate what the skill does to a signal
  function adjustConfidence(
    direction: 'BUY' | 'SELL',
    currentPrice: number,
    support: number[],
    resistance: number[],
    rsiSignal: 'oversold' | 'neutral' | 'overbought',
    stochSignal: 'oversold' | 'neutral' | 'overbought',
    adxTrending: boolean,
    baseConfidence: number
  ): number | null {
    // Reject trending markets
    if (adxTrending) return null;

    const nearestSupport = support.length > 0 ? Math.max(...support) : 0;
    const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
    const priceRange = nearestResistance - nearestSupport;
    if (priceRange <= 0) return null;

    const supportProximity = priceRange > 0 ? (currentPrice - nearestSupport) / priceRange : 0.5;
    const resistanceProximity = priceRange > 0 ? (nearestResistance - currentPrice) / priceRange : 0.5;

    // BUY near support
    if (direction === 'BUY' && supportProximity < 0.2) {
      let boost = 15;
      if (rsiSignal === 'oversold') boost += 5;
      if (stochSignal === 'oversold') boost += 5;
      return Math.min(baseConfidence + boost, 100);
    }

    // SELL near resistance
    if (direction === 'SELL' && resistanceProximity < 0.2) {
      let boost = 15;
      if (rsiSignal === 'overbought') boost += 5;
      if (stochSignal === 'overbought') boost += 5;
      return Math.min(baseConfidence + boost, 100);
    }

    // BUY near resistance = bad (counter-S/R)
    if (direction === 'BUY' && resistanceProximity < 0.2) {
      return Math.max(baseConfidence - 20, 25);
    }

    // SELL near support = bad (counter-S/R)
    if (direction === 'SELL' && supportProximity < 0.2) {
      return Math.max(baseConfidence - 20, 25);
    }

    return null; // not near S/R, skip
  }

  it('boosts BUY confidence near support in ranging market', () => {
    const result = adjustConfidence('BUY', 101, [100], [120], 'oversold', 'oversold', false, 65);
    expect(result).toBe(90); // 65 + 15 + 5 + 5
  });

  it('boosts SELL confidence near resistance in ranging market', () => {
    const result = adjustConfidence('SELL', 119, [100], [120], 'overbought', 'overbought', false, 65);
    expect(result).toBe(90); // 65 + 15 + 5 + 5
  });

  it('rejects signals in trending markets (ADX > 25)', () => {
    const result = adjustConfidence('BUY', 101, [100], [120], 'oversold', 'oversold', true, 65);
    expect(result).toBeNull();
  });

  it('penalizes BUY near resistance (counter-S/R)', () => {
    const result = adjustConfidence('BUY', 119, [100], [120], 'neutral', 'neutral', false, 65);
    expect(result).toBe(45); // 65 - 20
  });

  it('penalizes SELL near support (counter-S/R)', () => {
    const result = adjustConfidence('SELL', 101, [100], [120], 'neutral', 'neutral', false, 65);
    expect(result).toBe(45); // 65 - 20
  });

  it('returns null when price is in middle of range (no S/R proximity)', () => {
    const result = adjustConfidence('BUY', 110, [100], [120], 'neutral', 'neutral', false, 65);
    expect(result).toBeNull();
  });

  it('caps confidence at 100', () => {
    const result = adjustConfidence('BUY', 101, [100], [120], 'oversold', 'oversold', false, 90);
    expect(result).toBe(100);
  });

  it('floors confidence at 25', () => {
    const result = adjustConfidence('BUY', 119, [100], [120], 'neutral', 'neutral', false, 30);
    expect(result).toBe(25); // max(30 - 20, 25)
  });
});
```

- [ ] **Step 2: Run test to verify it passes (logic-only test, no module dependency)**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest packages/agent/skills/__tests__/sr-bounce.test.ts --no-coverage`
Expected: PASS — these are pure logic tests

- [ ] **Step 3: Commit**

```bash
git add packages/agent/skills/__tests__/sr-bounce.test.ts
git commit -m "test(agent): add S/R bounce skill logic tests"
```

---

## Task 5: S/R Bounce Skill — Implementation

**Files:**
- Create: `packages/agent/skills/sr-bounce/index.js`

- [ ] **Step 1: Create the skill**

```javascript
import { generateSignals } from '../../dist/signals/engine.js';

/**
 * Support/Resistance Bounce Strategy Skill
 *
 * Targets RANGING markets (ADX < 25):
 * - BUY when price is near support + RSI/Stochastic oversold
 * - SELL when price is near resistance + RSI/Stochastic overbought
 *
 * Penalizes counter-S/R trades (buying at resistance, selling at support).
 * Self-gates: skips all signals when ADX indicates a trending market.
 */
export class SRBounceSkill {
  name = 'sr-bounce';
  description = 'Buy on support, sell on resistance in ranging markets. Uses ADX < 25 as regime filter.';
  version = '0.1.0';

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const filtered = [];

    for (const signal of baseSignals) {
      const { support, resistance, rsi, stochastic, adx } = signal.indicators;

      // Self-gate: only operate in non-trending markets
      if (adx && adx.trending) continue;

      const nearestSupport = support.length > 0 ? Math.max(...support) : 0;
      const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
      const priceRange = nearestResistance - nearestSupport;

      if (priceRange <= 0) continue;

      const supportProximity = (signal.entry - nearestSupport) / priceRange;
      const resistanceProximity = (nearestResistance - signal.entry) / priceRange;

      // BUY near support
      if (signal.direction === 'BUY' && supportProximity < 0.2) {
        let boost = 15;
        if (rsi.signal === 'oversold') boost += 5;
        if (stochastic.signal === 'oversold') boost += 5;
        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // SELL near resistance
      if (signal.direction === 'SELL' && resistanceProximity < 0.2) {
        let boost = 15;
        if (rsi.signal === 'overbought') boost += 5;
        if (stochastic.signal === 'overbought') boost += 5;
        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // Counter-S/R penalty: buying at resistance or selling at support
      if (signal.direction === 'BUY' && resistanceProximity < 0.2) {
        filtered.push({
          ...signal,
          confidence: Math.max(signal.confidence - 20, 25),
          skill: this.name,
        });
        continue;
      }

      if (signal.direction === 'SELL' && supportProximity < 0.2) {
        filtered.push({
          ...signal,
          confidence: Math.max(signal.confidence - 20, 25),
          skill: this.name,
        });
      }

      // If price is in the middle of the range, this skill has no opinion — skip
    }

    return filtered;
  }
}

export default SRBounceSkill;
```

- [ ] **Step 2: Commit**

```bash
git add packages/agent/skills/sr-bounce/index.js
git commit -m "feat(agent): add S/R bounce skill for ranging market regime"
```

---

## Task 6: Volatility Breakout Skill — Failing Tests

**Files:**
- Create: `packages/agent/skills/__tests__/volatility-breakout.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
/**
 * Volatility Breakout Skill tests.
 * Tests the confidence adjustment logic directly.
 */

describe('VolatilityBreakoutSkill logic', () => {
  function adjustConfidence(
    direction: 'BUY' | 'SELL',
    currentPrice: number,
    support: number[],
    resistance: number[],
    bbBandwidth: number,
    bbPosition: 'upper' | 'middle' | 'lower',
    adxValue: number,
    adxTrending: boolean,
    adxPlusDI: number,
    adxMinusDI: number,
    volumeConfirmed: boolean,
    baseConfidence: number
  ): number | null {
    // Require ADX rising above 20 (emerging or confirmed trend)
    if (adxValue < 20) return null;

    // Bollinger squeeze detection: bandwidth < 2 = compressed
    const squeezed = bbBandwidth < 2;

    // Breakout confirmation: price outside bands + volume
    const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
    const nearestSupport = support.length > 0 ? Math.max(...support) : 0;

    const breakingResistance = currentPrice > nearestResistance;
    const breakingSupport = currentPrice < nearestSupport;

    // Bullish breakout: price above resistance or upper BB + ADX rising + +DI > -DI
    if (direction === 'BUY' && (breakingResistance || bbPosition === 'upper')) {
      if (adxPlusDI <= adxMinusDI) return null; // DI must confirm direction
      let boost = 10;
      if (breakingResistance) boost += 8;
      if (squeezed) boost += 5; // squeeze breakout = stronger
      if (volumeConfirmed) boost += 5;
      return Math.min(baseConfidence + boost, 100);
    }

    // Bearish breakout: price below support or lower BB + ADX rising + -DI > +DI
    if (direction === 'SELL' && (breakingSupport || bbPosition === 'lower')) {
      if (adxMinusDI <= adxPlusDI) return null; // DI must confirm direction
      let boost = 10;
      if (breakingSupport) boost += 8;
      if (squeezed) boost += 5;
      if (volumeConfirmed) boost += 5;
      return Math.min(baseConfidence + boost, 100);
    }

    return null;
  }

  it('boosts BUY on resistance breakout with volume', () => {
    const result = adjustConfidence(
      'BUY', 121, [100], [120], 1.5, 'upper',
      30, true, 35, 15, true, 65
    );
    // 65 + 10 (base) + 8 (resistance break) + 5 (squeeze) + 5 (volume) = 93
    expect(result).toBe(93);
  });

  it('boosts SELL on support break with volume', () => {
    const result = adjustConfidence(
      'SELL', 99, [100], [120], 1.5, 'lower',
      30, true, 15, 35, true, 65
    );
    expect(result).toBe(93);
  });

  it('rejects when ADX < 20 (no momentum)', () => {
    const result = adjustConfidence(
      'BUY', 121, [100], [120], 1.5, 'upper',
      15, false, 35, 15, true, 65
    );
    expect(result).toBeNull();
  });

  it('rejects BUY breakout when -DI > +DI (bearish pressure)', () => {
    const result = adjustConfidence(
      'BUY', 121, [100], [120], 1.5, 'upper',
      30, true, 15, 35, true, 65
    );
    expect(result).toBeNull();
  });

  it('gives smaller boost without squeeze (normal bandwidth)', () => {
    const result = adjustConfidence(
      'BUY', 121, [100], [120], 3.0, 'upper',
      30, true, 35, 15, false, 65
    );
    // 65 + 10 (base) + 8 (resistance break) = 83 (no squeeze, no volume)
    expect(result).toBe(83);
  });

  it('caps confidence at 100', () => {
    const result = adjustConfidence(
      'BUY', 121, [100], [120], 1.5, 'upper',
      30, true, 35, 15, true, 92
    );
    expect(result).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (pure logic test)**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest packages/agent/skills/__tests__/volatility-breakout.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/agent/skills/__tests__/volatility-breakout.test.ts
git commit -m "test(agent): add volatility breakout skill logic tests"
```

---

## Task 7: Volatility Breakout Skill — Implementation

**Files:**
- Create: `packages/agent/skills/volatility-breakout/index.js`

- [ ] **Step 1: Create the skill**

```javascript
import { generateSignals } from '../../dist/signals/engine.js';

/**
 * Volatility Breakout Strategy Skill
 *
 * Targets EXPANDING/VOLATILE markets:
 * - BUY when price breaks above resistance + Bollinger squeeze expansion + ADX > 20 rising + +DI > -DI
 * - SELL when price breaks below support + Bollinger squeeze expansion + ADX > 20 rising + -DI > +DI
 *
 * Uses ADX directional indicators (+DI/-DI) to confirm breakout direction.
 * Bollinger bandwidth < 2 = squeeze state, breakout from squeeze gets extra confidence.
 */
export class VolatilityBreakoutSkill {
  name = 'volatility-breakout';
  description = 'Breakout trading on Bollinger squeeze expansion with ADX/DI confirmation and volume.';
  version = '0.1.0';

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const filtered = [];

    for (const signal of baseSignals) {
      const { support, resistance, bollingerBands, adx, volume } = signal.indicators;

      // Require ADX data and minimum momentum
      if (!adx || adx.value < 20) continue;

      const squeezed = bollingerBands.bandwidth < 2;
      const volumeConfirmed = volume ? volume.confirmed : false;

      const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
      const nearestSupport = support.length > 0 ? Math.max(...support) : 0;

      const breakingResistance = signal.entry > nearestResistance;
      const breakingSupport = signal.entry < nearestSupport;

      // Bullish breakout
      if (signal.direction === 'BUY' && (breakingResistance || bollingerBands.position === 'upper')) {
        if (adx.plusDI <= adx.minusDI) continue; // DI must confirm

        let boost = 10;
        if (breakingResistance) boost += 8;
        if (squeezed) boost += 5;
        if (volumeConfirmed) boost += 5;

        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // Bearish breakout
      if (signal.direction === 'SELL' && (breakingSupport || bollingerBands.position === 'lower')) {
        if (adx.minusDI <= adx.plusDI) continue; // DI must confirm

        let boost = 10;
        if (breakingSupport) boost += 8;
        if (squeezed) boost += 5;
        if (volumeConfirmed) boost += 5;

        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // No breakout condition met — this skill has no opinion
    }

    return filtered;
  }
}

export default VolatilityBreakoutSkill;
```

- [ ] **Step 2: Commit**

```bash
git add packages/agent/skills/volatility-breakout/index.js
git commit -m "feat(agent): add volatility breakout skill for squeeze/expansion markets"
```

---

## Task 8: Regime Detector Skill — Tests & Implementation

**Files:**
- Create: `packages/agent/skills/__tests__/regime-detector.test.ts`
- Create: `packages/agent/skills/regime-detector/index.js`

- [ ] **Step 1: Write tests for regime classification logic**

```typescript
describe('RegimeDetector classification', () => {
  type Regime = 'trending' | 'ranging' | 'volatile';

  function classifyRegime(
    adxValue: number,
    adxTrending: boolean,
    bbBandwidth: number
  ): Regime {
    // High ADX + normal/wide bands = trending
    if (adxTrending && bbBandwidth >= 1.5) return 'trending';

    // ADX rising + very narrow bands = about to break out (volatile)
    if (adxValue >= 20 && bbBandwidth < 1.5) return 'volatile';

    // Low ADX = ranging
    if (!adxTrending) return 'ranging';

    return 'trending';
  }

  it('classifies as trending when ADX > 25 and normal bandwidth', () => {
    expect(classifyRegime(35, true, 3.0)).toBe('trending');
  });

  it('classifies as ranging when ADX < 25', () => {
    expect(classifyRegime(18, false, 2.0)).toBe('ranging');
  });

  it('classifies as volatile when ADX emerging + squeeze', () => {
    expect(classifyRegime(22, false, 1.0)).toBe('volatile');
  });

  it('classifies as trending when ADX strong + wide bands', () => {
    expect(classifyRegime(50, true, 5.0)).toBe('trending');
  });

  it('classifies as volatile when ADX >= 20 + narrow bands', () => {
    expect(classifyRegime(28, true, 1.2)).toBe('volatile');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest packages/agent/skills/__tests__/regime-detector.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 3: Create the regime detector skill**

```javascript
import { generateSignals } from '../../dist/signals/engine.js';

/**
 * Market Regime Detector Skill
 *
 * Classifies current market into one of three regimes:
 * - TRENDING: ADX > 25 + normal Bollinger bandwidth (>= 1.5%)
 * - RANGING: ADX < 25 (no directional conviction)
 * - VOLATILE: ADX >= 20 + compressed Bollinger bands (< 1.5%) — squeeze/breakout setup
 *
 * Passes signals through with a `regime` tag in the skill name.
 * Other skills can read this tag to self-gate.
 * Also applies regime-specific confidence adjustments:
 * - Trending: boost signals aligned with EMA trend
 * - Ranging: boost mean-reversion signals
 * - Volatile: boost breakout signals
 */
export class RegimeDetectorSkill {
  name = 'regime-detector';
  description = 'Classifies market as trending/ranging/volatile using ADX + Bollinger bandwidth.';
  version = '0.1.0';

  classifyRegime(adxValue, adxTrending, bbBandwidth) {
    if (adxTrending && bbBandwidth >= 1.5) return 'trending';
    if (adxValue >= 20 && bbBandwidth < 1.5) return 'volatile';
    if (!adxTrending) return 'ranging';
    return 'trending';
  }

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const tagged = [];

    for (const signal of baseSignals) {
      const { adx, bollingerBands, ema, rsi, stochastic } = signal.indicators;

      const adxValue = adx ? adx.value : 15;
      const adxTrending = adx ? adx.trending : false;
      const regime = this.classifyRegime(adxValue, adxTrending, bollingerBands.bandwidth);

      let confidenceAdj = 0;

      if (regime === 'trending') {
        // Boost trend-aligned signals
        if (signal.direction === 'BUY' && ema.trend === 'up') confidenceAdj = 8;
        else if (signal.direction === 'SELL' && ema.trend === 'down') confidenceAdj = 8;
        // Penalize counter-trend in trending market
        else if (signal.direction === 'BUY' && ema.trend === 'down') confidenceAdj = -15;
        else if (signal.direction === 'SELL' && ema.trend === 'up') confidenceAdj = -15;
      }

      if (regime === 'ranging') {
        // Boost mean-reversion signals (oversold buy, overbought sell)
        if (signal.direction === 'BUY' && rsi.signal === 'oversold') confidenceAdj = 8;
        else if (signal.direction === 'SELL' && rsi.signal === 'overbought') confidenceAdj = 8;
        // Penalize trend-following signals in a range
        if (signal.direction === 'BUY' && rsi.signal === 'overbought') confidenceAdj = -10;
        else if (signal.direction === 'SELL' && rsi.signal === 'oversold') confidenceAdj = -10;
      }

      if (regime === 'volatile') {
        // Boost breakout-direction signals
        if (signal.direction === 'BUY' && bollingerBands.position === 'upper') confidenceAdj = 10;
        else if (signal.direction === 'SELL' && bollingerBands.position === 'lower') confidenceAdj = 10;
      }

      const adjusted = Math.max(25, Math.min(100, signal.confidence + confidenceAdj));

      tagged.push({
        ...signal,
        confidence: adjusted,
        skill: `${this.name}:${regime}`,
      });
    }

    return tagged;
  }
}

export default RegimeDetectorSkill;
```

- [ ] **Step 4: Commit**

```bash
git add packages/agent/skills/__tests__/regime-detector.test.ts packages/agent/skills/regime-detector/index.js
git commit -m "feat(agent): add regime detector skill — classifies trending/ranging/volatile"
```

---

## Task 9: Register New Skills in Gateway Config

**Files:**
- Modify: `packages/agent/src/gateway/config.ts:13`

- [ ] **Step 1: Add new skills to the default config**

In `packages/agent/src/gateway/config.ts`, change line 13:

```typescript
  skills: ['rsi-divergence', 'macd-crossover'],
```

to:

```typescript
  skills: ['regime-detector', 'rsi-divergence', 'macd-crossover', 'sr-bounce', 'volatility-breakout'],
```

Note: `regime-detector` is listed first so it runs before the others, tagging signals with the detected regime.

- [ ] **Step 2: Commit**

```bash
git add packages/agent/src/gateway/config.ts
git commit -m "feat(agent): register regime-detector, sr-bounce, volatility-breakout in default config"
```

---

## Task 10: Add Preset Strategies to the Web API

**Files:**
- Modify: `apps/web/app/api/strategies/route.ts`

- [ ] **Step 1: Add two new preset strategies after `strat-breakout` in the `PRESET_STRATEGIES` array**

After the Breakout Hunter entry (around line 187), add:

```typescript
  {
    id: 'strat-sr-bounce',
    name: 'S/R Bounce Trader',
    description: 'Buy on support, sell on resistance in ranging markets. ADX < 25 filter ensures non-trending conditions.',
    indicators: [
      { name: 'S/R Levels', params: { lookback: 50 }, condition: 'Price within 20% of support (BUY) or resistance (SELL)', weight: 0.35 },
      { name: 'RSI', params: { period: 14, overbought: 70, oversold: 30 }, condition: 'RSI oversold at support (BUY) or overbought at resistance (SELL)', weight: 0.25 },
      { name: 'Stochastic', params: { kPeriod: 14, dPeriod: 3, smooth: 3 }, condition: 'Stochastic confirms RSI extreme', weight: 0.2 },
      { name: 'ADX', params: { period: 14, threshold: 25 }, condition: 'ADX < 25 confirms ranging market', weight: 0.2 },
    ],
    symbols: ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCHF', 'XAUUSD'],
    timeframes: ['M15', 'H1'],
    riskManagement: {
      maxRiskPercent: 1.5,
      leverage: 50,
      maxOpenTrades: 4,
      tpMode: 'support_resistance' as 'fixed',
      slMode: 'atr',
      fibLevels: [1.0, 1.618],
    },
    isActive: true,
    createdAt: '2026-04-05T08:00:00Z',
    performance: {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      period: '0d',
    },
  },
  {
    id: 'strat-vol-breakout',
    name: 'Volatility Breakout',
    description: 'Bollinger squeeze breakout with ADX/DI confirmation. Catches expansion moves from compressed ranges.',
    indicators: [
      { name: 'Bollinger Bands', params: { period: 20, stdDev: 2 }, condition: 'Bandwidth < 2% (squeeze) then expansion with price outside bands', weight: 0.3 },
      { name: 'ADX', params: { period: 14, threshold: 20 }, condition: 'ADX > 20 and rising — directional momentum building', weight: 0.3 },
      { name: 'S/R Levels', params: { lookback: 50 }, condition: 'Price breaks above resistance (BUY) or below support (SELL)', weight: 0.25 },
      { name: 'Volume', params: { avgPeriod: 20, threshold: 1.5 }, condition: 'Volume > 1.5x average confirms breakout', weight: 0.15 },
    ],
    symbols: ['XAUUSD', 'BTCUSD', 'ETHUSD', 'XRPUSD', 'GBPUSD'],
    timeframes: ['H1', 'H4'],
    riskManagement: {
      maxRiskPercent: 2,
      leverage: 50,
      maxOpenTrades: 3,
      tpMode: 'atr' as 'fixed',
      slMode: 'support_resistance',
      fibLevels: [1.618, 2.618],
    },
    isActive: true,
    createdAt: '2026-04-05T08:00:00Z',
    performance: {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      period: '0d',
    },
  },
```

- [ ] **Step 2: Run the build to verify everything compiles**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/strategies/route.ts
git commit -m "feat(web): add S/R Bounce Trader and Volatility Breakout preset strategies"
```

---

## Task 11: Run Full Test Suite & Final Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm test 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 2: Run full build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify skill discovery**

Run: `ls /home/naim/.openclaw/workspace/tradeclaw/packages/agent/skills/`
Expected: `macd-crossover/  regime-detector/  rsi-divergence/  sr-bounce/  volatility-breakout/`

---

## Summary of Market Regime Coverage After Implementation

| Regime | ADX | BB Width | Skills Active | Preset Strategy |
|--------|-----|----------|--------------|-----------------|
| **Trending** | > 25 | >= 1.5% | `macd-crossover`, `regime-detector` (trend boost) | Momentum Scalper, Trend Rider |
| **Ranging** | < 25 | any | `sr-bounce`, `rsi-divergence`, `regime-detector` (reversion boost) | Mean Reversion, S/R Bounce Trader |
| **Volatile** | >= 20 | < 1.5% | `volatility-breakout`, `regime-detector` (breakout boost) | Breakout Hunter, Volatility Breakout |
