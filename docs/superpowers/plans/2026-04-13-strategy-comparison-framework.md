# Strategy Comparison Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a preset-based strategy comparison framework on the existing `/backtest` page with 5 named presets covering the iterations the codebase has been through, plus a new VWAP + EMA + Bollinger entry.

**Architecture:** New `packages/strategies/` package exposes a `Strategy` interface where **entry logic is a plugin** (one module per entry strategy) and **allocation + risk are config variants** dispatched into the existing allocator and risk pipeline. The `/backtest` page gains a preset multi-select, an equity-curve overlay, and a comparison metrics table.

**Tech Stack:** TypeScript, Next.js (monorepo `apps/web`), existing `packages/signals/` (allocator, risk, regime, indicators), Jest for unit/integration, Playwright for E2E, Market Data Hub (`MARKET_DATA_HUB_URL`) for OHLCV.

**Spec:** [docs/superpowers/specs/2026-04-13-strategy-comparison-framework-design.md](../specs/2026-04-13-strategy-comparison-framework-design.md)

---

## File Structure

**Create:**
```
packages/strategies/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── presets.ts
│   ├── run-backtest.ts
│   └── entry/
│       ├── classic.ts
│       ├── regime-aware.ts
│       ├── hmm-top3.ts
│       └── vwap-ema-bb.ts
└── src/__tests__/
    ├── entry/
    │   ├── classic.test.ts
    │   ├── regime-aware.test.ts
    │   ├── hmm-top3.test.ts
    │   └── vwap-ema-bb.test.ts
    ├── presets.test.ts
    ├── run-backtest.test.ts
    └── fixtures/
        └── candles-100.json

apps/web/app/backtest/
├── comparison-chart.tsx
└── metrics-table.tsx

apps/web/e2e/
└── backtest-comparison.spec.ts
```

**Modify:**
- `apps/web/app/backtest/page.tsx` — replace inline strategy with `runBacktest(candles, preset)`, add multi-select + comparison view
- `apps/web/package.json` — add `@tradeclaw/strategies` workspace dep
- `scripts/signal-engine.py` (or the Node entry point for the signal engine cron) — read `SIGNAL_ENGINE_PRESET`, thread preset id through to signal records
- `packages/signals/src/types.ts` — add optional `strategyId?: string` to `TradingSignal`

---

## Task 1: Scaffold `packages/strategies/` package

**Files:**
- Create: `packages/strategies/package.json`
- Create: `packages/strategies/tsconfig.json`
- Create: `packages/strategies/src/index.ts`
- Create: `packages/strategies/src/types.ts`

- [ ] **Step 1: Create `packages/strategies/package.json`**

```json
{
  "name": "@tradeclaw/strategies",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tradeclaw/signals": "workspace:*"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/strategies/tsconfig.json`**

Copy the shape from `packages/signals/tsconfig.json`. If that file extends a root config, extend the same one. Target `src/**/*`, `strict: true`.

- [ ] **Step 3: Create `packages/strategies/src/types.ts`**

```typescript
import type { OHLCV } from '@tradeclaw/signals';
// If OHLCV is not exported from signals, import from wherever it lives
// (check packages/signals/src/index.ts and apps/web/app/lib/data-providers/types.ts).

export type StrategyId =
  | 'classic'
  | 'regime-aware'
  | 'hmm-top3'
  | 'vwap-ema-bb'
  | 'full-risk';

export interface EntrySignal {
  barIndex: number;
  direction: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  reason?: string;
}

export interface EntryContext {
  symbol: string;
  timeframe: string;
}

export interface EntryModule {
  id: string;
  generateSignals(candles: OHLCV[], context: EntryContext): EntrySignal[];
}

export type AllocationConfig =
  | { kind: 'flat' }
  | { kind: 'regime-dynamic' }
  | { kind: 'risk-weighted' };

export type RiskConfig =
  | { kind: 'none' }
  | { kind: 'daily-streak' }
  | { kind: 'full-pipeline' };

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  entry: EntryModule;
  allocation: AllocationConfig;
  risk: RiskConfig;
}
```

- [ ] **Step 4: Create `packages/strategies/src/index.ts`**

```typescript
export * from './types';
export { PRESETS, getPreset, listPresets } from './presets';
export { runBacktest } from './run-backtest';
export type { BacktestResult, BacktestTrade } from './run-backtest';
```

(At this point `presets.ts` and `run-backtest.ts` don't exist yet — that's fine, this file compiles after Task 7. Or temporarily comment the last two exports until those tasks land.)

- [ ] **Step 5: Verify types compile**

Run: `pnpm --filter @tradeclaw/strategies typecheck` (or `npx tsc -p packages/strategies/tsconfig.json --noEmit`)
Expected: errors only about missing `presets`/`run-backtest` modules. Fix by commenting out those exports in `index.ts` for now.

- [ ] **Step 6: Commit**

```bash
git add packages/strategies/package.json packages/strategies/tsconfig.json packages/strategies/src/index.ts packages/strategies/src/types.ts
git commit -m "chore(strategies): scaffold @tradeclaw/strategies package with types"
```

---

## Task 2: Create candle fixture for tests

**Files:**
- Create: `packages/strategies/src/__tests__/fixtures/candles-100.json`

- [ ] **Step 1: Generate a deterministic 100-candle fixture**

Use a script to pull real MDH data once and freeze it, OR hand-craft a synthetic one. Preferred: synthetic deterministic (no network dependency in tests).

Create `packages/strategies/src/__tests__/fixtures/candles-100.json` with 100 candles shaped like:

```json
[
  { "timestamp": 1700000000000, "open": 100.0, "high": 101.2, "low": 99.8, "close": 100.5, "volume": 1000 },
  ...
]
```

Use a simple deterministic generator (e.g., a sine wave + drift) so tests are reproducible. A one-off Node script is fine:

```typescript
// scripts/gen-candle-fixture.ts
import fs from 'fs';
const candles = [];
let price = 100;
for (let i = 0; i < 100; i++) {
  const drift = Math.sin(i / 10) * 2;
  const noise = ((i * 9301 + 49297) % 233280) / 233280 - 0.5;
  const close = price + drift + noise;
  const high = Math.max(price, close) + 0.5;
  const low = Math.min(price, close) - 0.5;
  candles.push({
    timestamp: 1700000000000 + i * 3600_000,
    open: price,
    high,
    low,
    close,
    volume: 1000 + Math.floor(noise * 100),
  });
  price = close;
}
fs.writeFileSync('packages/strategies/src/__tests__/fixtures/candles-100.json', JSON.stringify(candles, null, 2));
```

Run once, then delete the script. Commit the JSON.

- [ ] **Step 2: Commit**

```bash
git add packages/strategies/src/__tests__/fixtures/candles-100.json
git commit -m "test(strategies): add deterministic 100-candle fixture"
```

---

## Task 3: Implement `classic` entry module (baseline)

**Files:**
- Create: `packages/strategies/src/entry/classic.ts`
- Create: `packages/strategies/src/__tests__/entry/classic.test.ts`

The "classic" entry is the **original** scoring-based signal generator, before any regime filtering. Find it: it's the pre-regime-filter signal code. Check `apps/web/app/lib/signal-generator.ts` and `packages/signals/src/index.ts`. If it's been replaced in place, read commit `95ff3fc4^` for the pre-regime version.

- [ ] **Step 1: Write failing test**

Create `packages/strategies/src/__tests__/entry/classic.test.ts`:

```typescript
import candles from '../fixtures/candles-100.json';
import { classicEntry } from '../../entry/classic';

describe('classic entry module', () => {
  it('has id "classic"', () => {
    expect(classicEntry.id).toBe('classic');
  });

  it('produces signals deterministically on fixture candles', () => {
    const sigs1 = classicEntry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    const sigs2 = classicEntry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    expect(sigs1).toEqual(sigs2);
  });

  it('produces at least one signal on the fixture', () => {
    const sigs = classicEntry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    expect(sigs.length).toBeGreaterThan(0);
    expect(sigs[0]).toMatchObject({
      barIndex: expect.any(Number),
      direction: expect.stringMatching(/^(BUY|SELL)$/),
      price: expect.any(Number),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/classic`
Expected: FAIL — `classicEntry` not defined.

- [ ] **Step 3: Implement `classic.ts`**

Create `packages/strategies/src/entry/classic.ts`. Wrap the original signal-generation function. Import from existing location (likely `apps/web/app/lib/signal-generator.ts` or `packages/signals/src/`). If it lives in `apps/web`, move the pure scoring function into `packages/signals/src/` first, then wrap here.

```typescript
import type { EntryModule, EntrySignal, EntryContext } from '../types';
import { calculateRSI, calculateMACD, calculateEMA } from '@tradeclaw/signals';
import type { OHLCV } from '@tradeclaw/signals';

/**
 * Classic entry: baseline scoring (RSI + MACD + EMA trend).
 * This reproduces the pre-regime-filter signal generator.
 */
export const classicEntry: EntryModule = {
  id: 'classic',
  generateSignals(candles: OHLCV[], _ctx: EntryContext): EntrySignal[] {
    if (candles.length < 50) return [];

    const closes = candles.map((c) => c.close);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const ema50 = calculateEMA(closes, 50);

    const signals: EntrySignal[] = [];
    for (let i = 50; i < candles.length; i++) {
      const r = rsi[i];
      const m = macd.histogram[i];
      const trendUp = closes[i] > ema50[i];

      if (r !== undefined && m !== undefined) {
        // Long: oversold + macd turning up + uptrend
        if (r < 35 && m > 0 && trendUp) {
          signals.push({
            barIndex: i,
            direction: 'BUY',
            price: candles[i].close,
            confidence: Math.min(1, (35 - r) / 35),
            reason: 'rsi-oversold+macd-up',
          });
        }
        // Short: overbought + macd turning down + downtrend
        if (r > 65 && m < 0 && !trendUp) {
          signals.push({
            barIndex: i,
            direction: 'SELL',
            price: candles[i].close,
            confidence: Math.min(1, (r - 65) / 35),
            reason: 'rsi-overbought+macd-down',
          });
        }
      }
    }
    return signals;
  },
};
```

If the existing production code has a different structure, match THAT instead. The goal is to wrap existing behavior, not invent new scoring. **Verify by reading the codebase before writing this file.**

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/classic`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/strategies/src/entry/classic.ts packages/strategies/src/__tests__/entry/classic.test.ts
git commit -m "feat(strategies): add classic entry module"
```

---

## Task 4: Implement `regime-aware` entry module

**Files:**
- Create: `packages/strategies/src/entry/regime-aware.ts`
- Create: `packages/strategies/src/__tests__/entry/regime-aware.test.ts`

`regime-aware` = classic signals filtered by the regime classifier (from commit `95ff3fc4`). Use `classifyRegime` from `@tradeclaw/signals` to reject signals in unfavorable regimes.

- [ ] **Step 1: Write failing test**

```typescript
import candles from '../fixtures/candles-100.json';
import { regimeAwareEntry } from '../../entry/regime-aware';
import { classicEntry } from '../../entry/classic';

describe('regime-aware entry module', () => {
  it('has id "regime-aware"', () => {
    expect(regimeAwareEntry.id).toBe('regime-aware');
  });

  it('produces a subset of classic signals (filters, never adds)', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    const classic = classicEntry.generateSignals(candles as any, ctx);
    const regime = regimeAwareEntry.generateSignals(candles as any, ctx);
    expect(regime.length).toBeLessThanOrEqual(classic.length);
    for (const sig of regime) {
      expect(classic.find((c) => c.barIndex === sig.barIndex && c.direction === sig.direction)).toBeDefined();
    }
  });

  it('is deterministic', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    const a = regimeAwareEntry.generateSignals(candles as any, ctx);
    const b = regimeAwareEntry.generateSignals(candles as any, ctx);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/regime-aware`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `regime-aware.ts`**

```typescript
import type { EntryModule, EntrySignal, EntryContext } from '../types';
import { classifyRegime, getDefaultModel } from '@tradeclaw/signals';
import type { OHLCV } from '@tradeclaw/signals';
import { classicEntry } from './classic';

/**
 * Regime-aware entry: classic signals filtered by regime classifier.
 * Rejects BUY signals in 'bear' regimes and SELL signals in 'bull' regimes.
 * Reproduces commit 95ff3fc4 ("regime-aware filtering").
 */
export const regimeAwareEntry: EntryModule = {
  id: 'regime-aware',
  generateSignals(candles: OHLCV[], ctx: EntryContext): EntrySignal[] {
    const raw = classicEntry.generateSignals(candles, ctx);
    if (raw.length === 0) return [];

    const model = getDefaultModel();
    return raw.filter((sig) => {
      // Classify regime at the bar the signal fires on, using history up to that bar
      const window = candles.slice(0, sig.barIndex + 1);
      const bars = window.map((c) => ({ high: c.high, low: c.low, close: c.close, open: c.open }));
      const result = classifyRegime(bars, model);
      const regime = result.regime;
      if (sig.direction === 'BUY') return regime === 'bull' || regime === 'neutral';
      if (sig.direction === 'SELL') return regime === 'bear' || regime === 'neutral';
      return true;
    });
  },
};
```

Verify the `classifyRegime` signature by reading `packages/signals/src/regime/index.ts` — adjust the call if it takes different arguments. The exact regime labels may differ (`bullish`/`bearish`, `trending`/`ranging`); read the type and match.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/regime-aware`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/strategies/src/entry/regime-aware.ts packages/strategies/src/__tests__/entry/regime-aware.test.ts
git commit -m "feat(strategies): add regime-aware entry module"
```

---

## Task 5: Implement `hmm-top3` entry module (default/production)

**Files:**
- Create: `packages/strategies/src/entry/hmm-top3.ts`
- Create: `packages/strategies/src/__tests__/entry/hmm-top3.test.ts`

`hmm-top3` = HMM regime classification + take only the top-3 highest-confidence signals per bar window. This is **current production** (commit `bbcb39f6`). **This module must reproduce production behavior exactly.**

- [ ] **Step 1: Read production signal engine**

Read `scripts/signal-engine.py`, `apps/web/app/lib/signal-generator.ts`, `apps/web/app/api/cron/signals/route.ts`, and `packages/signals/src/regime/` to understand exactly what the production top-3 selection does. Match it.

- [ ] **Step 2: Write failing test**

```typescript
import candles from '../fixtures/candles-100.json';
import { hmmTop3Entry } from '../../entry/hmm-top3';

describe('hmm-top3 entry module', () => {
  it('has id "hmm-top3"', () => {
    expect(hmmTop3Entry.id).toBe('hmm-top3');
  });

  it('returns at most 3 signals per call on the fixture', () => {
    // Fixture is 100 bars; production picks top-3 overall
    const sigs = hmmTop3Entry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    expect(sigs.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    expect(hmmTop3Entry.generateSignals(candles as any, ctx))
      .toEqual(hmmTop3Entry.generateSignals(candles as any, ctx));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/hmm-top3`
Expected: FAIL.

- [ ] **Step 4: Implement `hmm-top3.ts`**

```typescript
import type { EntryModule, EntrySignal, EntryContext } from '../types';
import { classifyRegime, getDefaultModel } from '@tradeclaw/signals';
import type { OHLCV } from '@tradeclaw/signals';
import { regimeAwareEntry } from './regime-aware';

/**
 * HMM + top-3 entry: regime-aware signals ranked by confidence,
 * take only the top 3. Reproduces commit bbcb39f6 (current production).
 */
export const hmmTop3Entry: EntryModule = {
  id: 'hmm-top3',
  generateSignals(candles: OHLCV[], ctx: EntryContext): EntrySignal[] {
    const filtered = regimeAwareEntry.generateSignals(candles, ctx);
    return [...filtered]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  },
};
```

If production uses different ranking (e.g., per-symbol top-3, or a blended score), match production — this is just a placeholder shape. **Verify against production signal log before declaring done.**

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/hmm-top3`
Expected: PASS.

- [ ] **Step 6: Production parity check**

Pick the most recent signal log entry from `scripts/.signal-engine-state.json` or the latest signal log in `scripts/`. For the symbol/timeframe it used, fetch those candles via MDH (manually, one-off script), feed them to `hmmTop3Entry.generateSignals`, and compare output to the logged signals.

Acceptable outcomes:
- **Exact match**: good, done.
- **Ordering or count match, price/bar differs by ≤1 bar**: investigate — likely an off-by-one in the windowing logic. Fix before proceeding.
- **Completely different signals**: the ranking/filter logic in `hmm-top3.ts` doesn't match production. Read production code more carefully and reimplement.

Document the parity check result as a comment at the top of `hmm-top3.ts`:

```typescript
/**
 * Parity check: verified against signal log <path> on <date> — matches.
 */
```

- [ ] **Step 7: Commit**

```bash
git add packages/strategies/src/entry/hmm-top3.ts packages/strategies/src/__tests__/entry/hmm-top3.test.ts
git commit -m "feat(strategies): add hmm-top3 entry module (current production)"
```

---

## Task 6: Implement `vwap-ema-bb` entry module (new)

**Files:**
- Create: `packages/strategies/src/entry/vwap-ema-bb.ts`
- Create: `packages/strategies/src/__tests__/entry/vwap-ema-bb.test.ts`

New entry module: VWAP + EMA + Bollinger Bands. Long when price crosses above VWAP + EMA trend up + touches lower BB. Short when opposite.

- [ ] **Step 1: Write failing test**

```typescript
import candles from '../fixtures/candles-100.json';
import { vwapEmaBbEntry } from '../../entry/vwap-ema-bb';

describe('vwap-ema-bb entry module', () => {
  it('has id "vwap-ema-bb"', () => {
    expect(vwapEmaBbEntry.id).toBe('vwap-ema-bb');
  });

  it('is deterministic', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    expect(vwapEmaBbEntry.generateSignals(candles as any, ctx))
      .toEqual(vwapEmaBbEntry.generateSignals(candles as any, ctx));
  });

  it('all signals have valid direction and price', () => {
    const sigs = vwapEmaBbEntry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    for (const s of sigs) {
      expect(['BUY', 'SELL']).toContain(s.direction);
      expect(s.price).toBeGreaterThan(0);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/vwap-ema-bb`
Expected: FAIL.

- [ ] **Step 3: Implement `vwap-ema-bb.ts`**

```typescript
import type { EntryModule, EntrySignal, EntryContext } from '../types';
import { calculateEMA, calculateBollingerBands } from '@tradeclaw/signals';
import type { OHLCV } from '@tradeclaw/signals';

/**
 * VWAP + EMA + Bollinger Bands entry.
 * BUY: price above VWAP, EMA20 > EMA50, low touches lower BB (mean reversion in uptrend).
 * SELL: price below VWAP, EMA20 < EMA50, high touches upper BB (mean reversion in downtrend).
 */

function rollingVwap(candles: OHLCV[], period: number): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    let pv = 0;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const typical = (candles[j].high + candles[j].low + candles[j].close) / 3;
      const vol = candles[j].volume ?? 1;
      pv += typical * vol;
      v += vol;
    }
    out[i] = v > 0 ? pv / v : NaN;
  }
  return out;
}

export const vwapEmaBbEntry: EntryModule = {
  id: 'vwap-ema-bb',
  generateSignals(candles: OHLCV[], _ctx: EntryContext): EntrySignal[] {
    if (candles.length < 50) return [];

    const closes = candles.map((c) => c.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const bb = calculateBollingerBands(closes, 20, 2);
    const vwap = rollingVwap(candles, 20);

    const signals: EntrySignal[] = [];
    for (let i = 50; i < candles.length; i++) {
      const close = candles[i].close;
      const low = candles[i].low;
      const high = candles[i].high;
      const lower = bb.lower[i];
      const upper = bb.upper[i];
      const v = vwap[i];
      const e20 = ema20[i];
      const e50 = ema50[i];

      if ([lower, upper, v, e20, e50].some((x) => !Number.isFinite(x))) continue;

      const trendUp = e20 > e50;
      const trendDown = e20 < e50;

      // BUY: uptrend + above VWAP + low tagged lower BB
      if (trendUp && close > v && low <= lower) {
        const pen = (lower - low) / lower;
        signals.push({
          barIndex: i,
          direction: 'BUY',
          price: close,
          confidence: Math.min(1, Math.max(0.3, pen * 10)),
          reason: 'vwap-ema-bb-long',
        });
      }

      // SELL: downtrend + below VWAP + high tagged upper BB
      if (trendDown && close < v && high >= upper) {
        const pen = (high - upper) / upper;
        signals.push({
          barIndex: i,
          direction: 'SELL',
          price: close,
          confidence: Math.min(1, Math.max(0.3, pen * 10)),
          reason: 'vwap-ema-bb-short',
        });
      }
    }
    return signals;
  },
};
```

Verify `calculateBollingerBands` returns `{ lower, upper, middle }` arrays — if the shape differs, adjust the destructuring.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- entry/vwap-ema-bb`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/strategies/src/entry/vwap-ema-bb.ts packages/strategies/src/__tests__/entry/vwap-ema-bb.test.ts
git commit -m "feat(strategies): add vwap-ema-bb entry module"
```

---

## Task 7: Implement presets registry

**Files:**
- Create: `packages/strategies/src/presets.ts`
- Create: `packages/strategies/src/__tests__/presets.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { PRESETS, getPreset, listPresets } from '../presets';
import type { StrategyId } from '../types';

describe('presets registry', () => {
  const expectedIds: StrategyId[] = ['classic', 'regime-aware', 'hmm-top3', 'vwap-ema-bb', 'full-risk'];

  it('contains all 5 preset ids', () => {
    for (const id of expectedIds) {
      expect(PRESETS[id]).toBeDefined();
      expect(PRESETS[id].id).toBe(id);
    }
  });

  it('listPresets() returns all 5', () => {
    expect(listPresets()).toHaveLength(5);
  });

  it('getPreset returns the matching strategy', () => {
    expect(getPreset('hmm-top3').id).toBe('hmm-top3');
  });

  it('getPreset throws on unknown id', () => {
    expect(() => getPreset('bogus' as StrategyId)).toThrow();
  });

  it('each preset has an entry module whose id matches a known module', () => {
    for (const p of listPresets()) {
      expect(typeof p.entry.generateSignals).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- presets`
Expected: FAIL.

- [ ] **Step 3: Implement `presets.ts`**

```typescript
import type { Strategy, StrategyId } from './types';
import { classicEntry } from './entry/classic';
import { regimeAwareEntry } from './entry/regime-aware';
import { hmmTop3Entry } from './entry/hmm-top3';
import { vwapEmaBbEntry } from './entry/vwap-ema-bb';

export const PRESETS: Record<StrategyId, Strategy> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Baseline RSI + MACD + EMA scoring. No regime filter, no risk breakers.',
    entry: classicEntry,
    allocation: { kind: 'flat' },
    risk: { kind: 'none' },
  },
  'regime-aware': {
    id: 'regime-aware',
    name: 'Regime Aware',
    description: 'Classic signals filtered by HMM regime. Rejects counter-trend trades.',
    entry: regimeAwareEntry,
    allocation: { kind: 'regime-dynamic' },
    risk: { kind: 'daily-streak' },
  },
  'hmm-top3': {
    id: 'hmm-top3',
    name: 'HMM Top-3',
    description: 'Regime-aware signals ranked by confidence, top 3 only. Current production.',
    entry: hmmTop3Entry,
    allocation: { kind: 'regime-dynamic' },
    risk: { kind: 'daily-streak' },
  },
  'vwap-ema-bb': {
    id: 'vwap-ema-bb',
    name: 'VWAP + EMA + Bollinger',
    description: 'Mean-reversion entries at BB extremes with VWAP and EMA trend confirmation.',
    entry: vwapEmaBbEntry,
    allocation: { kind: 'flat' },
    risk: { kind: 'daily-streak' },
  },
  'full-risk': {
    id: 'full-risk',
    name: 'Full Risk Pipeline',
    description: 'HMM top-3 with risk-weighted allocation and full circuit-breaker pipeline.',
    entry: hmmTop3Entry,
    allocation: { kind: 'risk-weighted' },
    risk: { kind: 'full-pipeline' },
  },
};

export function listPresets(): Strategy[] {
  return Object.values(PRESETS);
}

export function getPreset(id: StrategyId): Strategy {
  const p = PRESETS[id];
  if (!p) throw new Error(`Unknown preset id: ${id}`);
  return p;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- presets`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/strategies/src/presets.ts packages/strategies/src/__tests__/presets.test.ts
git commit -m "feat(strategies): add presets registry"
```

---

## Task 8: Implement `runBacktest`

**Files:**
- Create: `packages/strategies/src/run-backtest.ts`
- Create: `packages/strategies/src/__tests__/run-backtest.test.ts`

Port the backtest simulation logic from `apps/web/app/backtest/page.tsx` into a pure function that takes candles + strategy and returns metrics + equity curve + trades.

- [ ] **Step 1: Read existing backtest logic**

Open `apps/web/app/backtest/page.tsx` and locate the function that simulates trades (likely searches for "equityCurve" or "winRate"). Identify the pure part: takes candles + signals, returns trades + metrics. That's what we're extracting.

- [ ] **Step 2: Write failing test**

```typescript
import candles from './fixtures/candles-100.json';
import { runBacktest } from '../run-backtest';
import { getPreset } from '../presets';

describe('runBacktest', () => {
  it('is deterministic for the same inputs', () => {
    const preset = getPreset('classic');
    const a = runBacktest(candles as any, preset);
    const b = runBacktest(candles as any, preset);
    expect(a).toEqual(b);
  });

  it('returns zero-trade result on empty candles', () => {
    const result = runBacktest([], getPreset('classic'));
    expect(result.totalTrades).toBe(0);
    expect(result.equityCurve).toHaveLength(0);
    expect(result.reason).toBe('no-data');
  });

  it('result has required metric fields', () => {
    const r = runBacktest(candles as any, getPreset('hmm-top3'));
    expect(r).toMatchObject({
      strategyId: 'hmm-top3',
      totalTrades: expect.any(Number),
      winRate: expect.any(Number),
      profitFactor: expect.any(Number),
      maxDrawdown: expect.any(Number),
      sharpeRatio: expect.any(Number),
      totalReturn: expect.any(Number),
      equityCurve: expect.any(Array),
      trades: expect.any(Array),
    });
  });

  it('runs all 5 presets without throwing', () => {
    for (const id of ['classic', 'regime-aware', 'hmm-top3', 'vwap-ema-bb', 'full-risk'] as const) {
      expect(() => runBacktest(candles as any, getPreset(id))).not.toThrow();
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- run-backtest`
Expected: FAIL.

- [ ] **Step 4: Implement `run-backtest.ts`**

```typescript
import type { Strategy, StrategyId, EntrySignal } from './types';
import type { OHLCV } from '@tradeclaw/signals';

export interface BacktestTrade {
  id: number;
  direction: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  entryBar: number;
  exitBar: number;
  pnl: number;
  pnlPct: number;
  win: boolean;
  exitReason: 'TP' | 'SL' | 'EOD';
}

export interface BacktestResult {
  strategyId: StrategyId;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalReturn: number;
  startBalance: number;
  endBalance: number;
  equityCurve: number[];
  trades: BacktestTrade[];
  reason?: 'no-data' | 'no-signals';
}

const START_BALANCE = 10_000;
const TP_PCT = 0.02; // 2% take-profit
const SL_PCT = 0.01; // 1% stop-loss
const POSITION_PCT = 0.1; // 10% position sizing

export function runBacktest(candles: OHLCV[], strategy: Strategy): BacktestResult {
  if (candles.length === 0) {
    return zeroResult(strategy.id, 'no-data');
  }

  const signals = strategy.entry.generateSignals(candles, {
    symbol: 'BACKTEST',
    timeframe: 'H1',
  });

  if (signals.length === 0) {
    const flat = new Array(candles.length).fill(START_BALANCE);
    return { ...zeroResult(strategy.id, 'no-signals'), equityCurve: flat };
  }

  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = new Array(candles.length).fill(START_BALANCE);
  let balance = START_BALANCE;
  let tradeId = 0;

  // Simple sequential backtest: each signal opens a position closed at TP/SL/EOD
  for (const sig of signals) {
    const positionSize = balance * POSITION_PCT;
    const entry = sig.price;
    const tp = sig.direction === 'BUY' ? entry * (1 + TP_PCT) : entry * (1 - TP_PCT);
    const sl = sig.direction === 'BUY' ? entry * (1 - SL_PCT) : entry * (1 + SL_PCT);

    let exit = entry;
    let exitBar = sig.barIndex;
    let exitReason: BacktestTrade['exitReason'] = 'EOD';

    for (let j = sig.barIndex + 1; j < candles.length; j++) {
      const bar = candles[j];
      if (sig.direction === 'BUY') {
        if (bar.low <= sl) { exit = sl; exitBar = j; exitReason = 'SL'; break; }
        if (bar.high >= tp) { exit = tp; exitBar = j; exitReason = 'TP'; break; }
      } else {
        if (bar.high >= sl) { exit = sl; exitBar = j; exitReason = 'SL'; break; }
        if (bar.low <= tp) { exit = tp; exitBar = j; exitReason = 'TP'; break; }
      }
      exit = bar.close;
      exitBar = j;
    }

    const pnlPct = sig.direction === 'BUY'
      ? (exit - entry) / entry
      : (entry - exit) / entry;
    const pnl = positionSize * pnlPct;
    balance += pnl;

    trades.push({
      id: tradeId++,
      direction: sig.direction,
      entry,
      exit,
      entryBar: sig.barIndex,
      exitBar,
      pnl,
      pnlPct,
      win: pnl > 0,
      exitReason,
    });

    // Fill equity curve from this trade's exit bar forward
    for (let k = exitBar; k < equityCurve.length; k++) {
      equityCurve[k] = balance;
    }
  }

  return {
    strategyId: strategy.id,
    totalTrades: trades.length,
    winRate: trades.length > 0 ? trades.filter((t) => t.win).length / trades.length : 0,
    profitFactor: computeProfitFactor(trades),
    maxDrawdown: computeMaxDrawdown(equityCurve),
    sharpeRatio: computeSharpe(equityCurve),
    totalReturn: (balance - START_BALANCE) / START_BALANCE,
    startBalance: START_BALANCE,
    endBalance: balance,
    equityCurve,
    trades,
  };
}

function zeroResult(id: StrategyId, reason: 'no-data' | 'no-signals'): BacktestResult {
  return {
    strategyId: id,
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    totalReturn: 0,
    startBalance: START_BALANCE,
    endBalance: START_BALANCE,
    equityCurve: [],
    trades: [],
    reason,
  };
}

function computeProfitFactor(trades: BacktestTrade[]): number {
  const gains = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const losses = trades.filter((t) => t.pnl < 0).reduce((s, t) => s - t.pnl, 0);
  if (losses === 0) return gains > 0 ? Infinity : 0;
  return gains / losses;
}

function computeMaxDrawdown(curve: number[]): number {
  let peak = curve[0] ?? 0;
  let maxDd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

function computeSharpe(curve: number[]): number {
  if (curve.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    if (curve[i - 1] > 0) returns.push((curve[i] - curve[i - 1]) / curve[i - 1]);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  return std > 0 ? (mean / std) * Math.sqrt(252) : 0;
}
```

Allocation and risk variants are NOT yet dispatched inside `runBacktest` — this first cut uses fixed 10% position sizing and simple TP/SL. That's intentional: the entry plugins are the interesting variable in v1, and the backtest numbers stay comparable across presets. Wiring full allocation/risk into the backtest sim is an explicit follow-up task below (Task 8b).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- run-backtest`
Expected: PASS.

- [ ] **Step 6: Re-enable exports in index.ts**

Uncomment the `presets` and `run-backtest` exports in `packages/strategies/src/index.ts` if they were commented out in Task 1.

- [ ] **Step 7: Commit**

```bash
git add packages/strategies/src/run-backtest.ts packages/strategies/src/__tests__/run-backtest.test.ts packages/strategies/src/index.ts
git commit -m "feat(strategies): add runBacktest with TP/SL simulation"
```

---

## Task 8b: Dispatch allocation + risk configs inside `runBacktest`

**Files:**
- Modify: `packages/strategies/src/run-backtest.ts`
- Modify: `packages/strategies/src/__tests__/run-backtest.test.ts`

Extend `runBacktest` so that `AllocationConfig` and `RiskConfig` are actually honored. Without this, all presets differ only by entry logic and the comparison is less meaningful.

- [ ] **Step 1: Write failing test**

```typescript
it('risk-weighted allocation differs from flat on same entry signals', () => {
  const flat = getPreset('hmm-top3');   // regime-dynamic alloc
  const weighted = getPreset('full-risk'); // risk-weighted alloc, same entry
  const rFlat = runBacktest(candles as any, flat);
  const rWeighted = runBacktest(candles as any, weighted);
  // Both use hmmTop3 entry so signals are identical, but equity curves should differ
  expect(rFlat.equityCurve).not.toEqual(rWeighted.equityCurve);
});

it('full-pipeline risk can reject trades that daily-streak allows', () => {
  // Not universal, but on a losing streak fixture full-pipeline should block earlier
  // For v1: just assert full-risk totalTrades <= hmm-top3 totalTrades
  const baseline = runBacktest(candles as any, getPreset('hmm-top3'));
  const gated = runBacktest(candles as any, getPreset('full-risk'));
  expect(gated.totalTrades).toBeLessThanOrEqual(baseline.totalTrades);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tradeclaw/strategies test -- run-backtest`
Expected: FAIL on new tests.

- [ ] **Step 3: Extend `run-backtest.ts` to dispatch on config**

In `runBacktest`, replace the hardcoded `POSITION_PCT = 0.1` with a call to `sizePosition(balance, sig, strategy.allocation, recentTrades)`:

```typescript
function sizePosition(
  balance: number,
  signal: EntrySignal,
  config: AllocationConfig,
  recent: BacktestTrade[],
): number {
  switch (config.kind) {
    case 'flat':
      return balance * 0.1;
    case 'regime-dynamic':
      // Scale by signal confidence: higher confidence → larger position
      return balance * (0.05 + 0.1 * signal.confidence);
    case 'risk-weighted':
      // Shrink after losing streak
      const recentLosses = recent.slice(-5).filter((t) => !t.win).length;
      const scaler = 1 - recentLosses * 0.15;
      return balance * 0.1 * Math.max(0.2, scaler);
  }
}
```

And replace the unconditional trade execution with a risk check:

```typescript
function riskAllows(
  config: RiskConfig,
  recent: BacktestTrade[],
  currentDrawdown: number,
): boolean {
  switch (config.kind) {
    case 'none':
      return true;
    case 'daily-streak': {
      const recentLosses = recent.slice(-3).filter((t) => !t.win).length;
      return recentLosses < 3;
    }
    case 'full-pipeline': {
      const recentLosses = recent.slice(-3).filter((t) => !t.win).length;
      if (recentLosses >= 3) return false;
      if (currentDrawdown > 0.1) return false;
      return true;
    }
  }
}
```

In the main loop, before opening each trade:

```typescript
const currentDd = computeMaxDrawdown(equityCurve.slice(0, sig.barIndex + 1));
if (!riskAllows(strategy.risk, trades, currentDd)) continue;
const positionSize = sizePosition(balance, sig, strategy.allocation, trades);
```

These simulation heuristics are intentionally simple for the backtest sim. The **live** path (Task 10) uses the real allocator + risk pipeline from `@tradeclaw/signals`. Keeping the backtest sim local avoids pulling complex state (e.g., multi-day risk history) into a 100-bar test.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/strategies test -- run-backtest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/strategies/src/run-backtest.ts packages/strategies/src/__tests__/run-backtest.test.ts
git commit -m "feat(strategies): honor allocation and risk configs in runBacktest"
```

---

## Task 9: Integration snapshot test (5 presets × fixture)

**Files:**
- Create: `packages/strategies/src/__tests__/integration-snapshot.test.ts`

- [ ] **Step 1: Write snapshot test**

```typescript
import candles from './fixtures/candles-100.json';
import { runBacktest } from '../run-backtest';
import { listPresets } from '../presets';

describe('preset comparison snapshot', () => {
  it('produces stable metrics across all 5 presets', () => {
    const results = listPresets().map((p) => {
      const r = runBacktest(candles as any, p);
      return {
        id: p.id,
        totalTrades: r.totalTrades,
        winRate: Number(r.winRate.toFixed(4)),
        profitFactor: Number.isFinite(r.profitFactor) ? Number(r.profitFactor.toFixed(4)) : 'inf',
        maxDrawdown: Number(r.maxDrawdown.toFixed(4)),
        totalReturn: Number(r.totalReturn.toFixed(4)),
      };
    });
    expect(results).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @tradeclaw/strategies test -- integration-snapshot`
Expected: PASS (first run creates snapshot).

- [ ] **Step 3: Commit**

```bash
git add packages/strategies/src/__tests__/integration-snapshot.test.ts packages/strategies/src/__tests__/__snapshots__/
git commit -m "test(strategies): add integration snapshot across 5 presets"
```

---

## Task 10: Wire live signal engine to read `SIGNAL_ENGINE_PRESET`

**Files:**
- Modify: `packages/signals/src/types.ts` (add `strategyId?: string` to `TradingSignal`)
- Modify: `apps/web/app/api/cron/signals/route.ts` (or wherever the signal generator is invoked)
- Modify: `scripts/signal-engine.py` (if the Python engine is the one writing signals — mirror the env var read)

- [ ] **Step 1: Add `strategyId` to `TradingSignal`**

Open `packages/signals/src/types.ts`. Find `TradingSignal`. Add:

```typescript
strategyId?: string;
```

Run typecheck: `pnpm --filter @tradeclaw/signals typecheck`
Expected: PASS.

- [ ] **Step 2: Write failing test for preset dispatch**

Create `apps/web/app/api/cron/signals/__tests__/preset-dispatch.test.ts` (or extend an existing test file for the cron route):

```typescript
import { getPreset } from '@tradeclaw/strategies';

describe('signal engine preset dispatch', () => {
  it('defaults to hmm-top3 when SIGNAL_ENGINE_PRESET is unset', () => {
    delete process.env.SIGNAL_ENGINE_PRESET;
    // Function under test: export a small getActivePreset() from the cron route
    const { getActivePreset } = require('../route');
    expect(getActivePreset().id).toBe('hmm-top3');
  });

  it('respects SIGNAL_ENGINE_PRESET env var', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'classic';
    const { getActivePreset } = require('../route');
    expect(getActivePreset().id).toBe('classic');
    delete process.env.SIGNAL_ENGINE_PRESET;
  });

  it('falls back to hmm-top3 on invalid env value', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'bogus';
    const { getActivePreset } = require('../route');
    expect(getActivePreset().id).toBe('hmm-top3');
    delete process.env.SIGNAL_ENGINE_PRESET;
  });
});
```

Run: `pnpm --filter @tradeclaw/web test -- preset-dispatch`
Expected: FAIL — `getActivePreset` not exported.

- [ ] **Step 3: Add `getActivePreset` to the cron route**

Open `apps/web/app/api/cron/signals/route.ts`. Add near the top:

```typescript
import { getPreset, type StrategyId } from '@tradeclaw/strategies';

export function getActivePreset() {
  const raw = process.env.SIGNAL_ENGINE_PRESET;
  const validIds: StrategyId[] = ['classic', 'regime-aware', 'hmm-top3', 'vwap-ema-bb', 'full-risk'];
  if (raw && (validIds as string[]).includes(raw)) {
    return getPreset(raw as StrategyId);
  }
  return getPreset('hmm-top3');
}
```

- [ ] **Step 4: Thread preset into signal generation**

Find the call that currently produces signals in this route. Replace the hardcoded entry logic with:

```typescript
const preset = getActivePreset();
const entrySignals = preset.entry.generateSignals(candles, { symbol, timeframe });
// Tag each signal with the preset id so the UI can display a badge
const signals = entrySignals.map((sig) => ({
  ...convertToTradingSignal(sig, symbol, timeframe),
  strategyId: preset.id,
}));
```

Exact adaptation depends on the current code shape — **read the file first, make the minimal change** that routes through `preset.entry.generateSignals`. If the current route already uses `classifyRegime`/`hmmTop3` logic inline, that logic now lives in `hmmTop3Entry` and the route should just delegate.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @tradeclaw/web test -- preset-dispatch`
Expected: PASS (all 3 tests).

- [ ] **Step 6: Verify default preset produces identical signals to production**

Run the cron route locally with no env var set. Compare output against the most recent signal log in `scripts/`. They should match 1:1. If they don't, the parity check in Task 5 didn't catch something — investigate and fix before proceeding.

- [ ] **Step 7: Update `.env.example`**

Add to `.env.example`:

```
# Active signal engine preset: classic | regime-aware | hmm-top3 | vwap-ema-bb | full-risk
# Default: hmm-top3
SIGNAL_ENGINE_PRESET=hmm-top3
```

- [ ] **Step 8: Commit**

```bash
git add packages/signals/src/types.ts apps/web/app/api/cron/signals/route.ts apps/web/app/api/cron/signals/__tests__/preset-dispatch.test.ts .env.example
git commit -m "feat(signals): dispatch signal engine on SIGNAL_ENGINE_PRESET env var"
```

---

## Task 11: Extract existing backtest simulation in `/backtest` page

**Files:**
- Modify: `apps/web/app/backtest/page.tsx`
- Modify: `apps/web/package.json` (add `@tradeclaw/strategies` workspace dep)

- [ ] **Step 1: Add workspace dependency**

Edit `apps/web/package.json`, add to `dependencies`:

```json
"@tradeclaw/strategies": "workspace:*"
```

Run: `pnpm install`
Expected: success, no errors.

- [ ] **Step 2: Replace inline backtest logic with `runBacktest`**

Open `apps/web/app/backtest/page.tsx`. Locate the inline backtest simulation (the function that builds `equityCurve`, `trades`, etc.). Replace it with:

```typescript
import { runBacktest, getPreset, type BacktestResult } from '@tradeclaw/strategies';

// Inside the page component, when the user clicks "Run":
const result = runBacktest(candles, getPreset('hmm-top3'));
setBacktestResult(result);
```

Remove the now-dead inline simulation code. Keep the price chart, indicator chart, and trade list rendering — just pull their inputs from `result`.

- [ ] **Step 3: Manual verification**

Start the dev server:

```bash
pnpm --filter @tradeclaw/web dev
```

Open http://localhost:3000/backtest. Run a backtest with a symbol. Expected: same visual output as before — equity curve, trades, metrics. If numbers differ, the old inline sim had different TP/SL logic than what we ported. Reconcile: update `runBacktest` to match the old behavior, OR update the page to document the new defaults.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/backtest/page.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "refactor(backtest): use runBacktest from @tradeclaw/strategies"
```

---

## Task 12: Add preset multi-select + metrics table to `/backtest`

**Files:**
- Create: `apps/web/app/backtest/metrics-table.tsx`
- Modify: `apps/web/app/backtest/page.tsx`

- [ ] **Step 1: Create `metrics-table.tsx`**

```typescript
'use client';

import type { BacktestResult } from '@tradeclaw/strategies';

interface MetricsTableProps {
  results: BacktestResult[];
  presetNames: Record<string, string>;
}

export function MetricsTable({ results, presetNames }: MetricsTableProps) {
  if (results.length === 0) return null;

  const columns = [
    { key: 'totalReturn' as const, label: 'Total Return', format: pct, best: 'max' as const },
    { key: 'winRate' as const, label: 'Win Rate', format: pct, best: 'max' as const },
    { key: 'profitFactor' as const, label: 'Profit Factor', format: num, best: 'max' as const },
    { key: 'maxDrawdown' as const, label: 'Max Drawdown', format: pct, best: 'min' as const },
    { key: 'sharpeRatio' as const, label: 'Sharpe', format: num, best: 'max' as const },
    { key: 'totalTrades' as const, label: 'Trades', format: (n: number) => String(n), best: 'none' as const },
  ];

  const bestByColumn = new Map<string, number>();
  for (const col of columns) {
    if (col.best === 'none') continue;
    const values = results.map((r) => r[col.key] as number);
    const best = col.best === 'max' ? Math.max(...values) : Math.min(...values);
    bestByColumn.set(col.key, best);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-zinc-200">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-2">Preset</th>
            {columns.map((c) => (
              <th key={c.key} className="text-right p-2">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.strategyId} className="border-b border-white/5">
              <td className="p-2 font-medium">{presetNames[r.strategyId] ?? r.strategyId}</td>
              {columns.map((c) => {
                const v = r[c.key] as number;
                const isBest = bestByColumn.get(c.key) === v && c.best !== 'none';
                return (
                  <td
                    key={c.key}
                    className={`p-2 text-right ${isBest ? 'text-emerald-400 font-semibold' : ''}`}
                  >
                    {c.format(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return (n * 100).toFixed(2) + '%';
}

function num(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  return n.toFixed(2);
}
```

- [ ] **Step 2: Add multi-select + wiring in `page.tsx`**

In `apps/web/app/backtest/page.tsx`, add state for selected preset ids and multi-run logic:

```typescript
import { runBacktest, listPresets, getPreset, type BacktestResult, type StrategyId } from '@tradeclaw/strategies';
import { MetricsTable } from './metrics-table';

const allPresets = listPresets();
const presetNames = Object.fromEntries(allPresets.map((p) => [p.id, p.name]));

// State
const [selectedPresets, setSelectedPresets] = useState<StrategyId[]>(['hmm-top3']);
const [comparisonResults, setComparisonResults] = useState<BacktestResult[]>([]);

// Run handler
async function handleRun() {
  if (!candles || candles.length === 0) return;
  const results = await Promise.all(
    selectedPresets.map(async (id) => {
      try {
        return runBacktest(candles, getPreset(id));
      } catch (err) {
        return {
          strategyId: id,
          totalTrades: 0, winRate: 0, profitFactor: 0, maxDrawdown: 0,
          sharpeRatio: 0, totalReturn: 0, startBalance: 10000, endBalance: 10000,
          equityCurve: [], trades: [],
          reason: 'no-data' as const,
        };
      }
    }),
  );
  setComparisonResults(results);
}

// Render
<div className="mb-4">
  <h3 className="text-sm text-zinc-400 mb-2">Strategies to compare</h3>
  <div className="flex gap-2 flex-wrap">
    {allPresets.map((p) => (
      <label key={p.id} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selectedPresets.includes(p.id)}
          onChange={(e) => {
            setSelectedPresets((prev) =>
              e.target.checked
                ? [...prev, p.id]
                : prev.filter((id) => id !== p.id),
            );
          }}
        />
        <span>{p.name}</span>
      </label>
    ))}
  </div>
</div>

<MetricsTable results={comparisonResults} presetNames={presetNames} />
```

- [ ] **Step 3: Manual verification**

Dev server running. Open `/backtest`. Select 3 presets. Click run. Verify:
- Metrics table shows 3 rows
- Per-column best highlighting works
- Deselecting all but one reverts to single-preset view
- Single-preset view still shows price chart + trade list as before

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/backtest/metrics-table.tsx apps/web/app/backtest/page.tsx
git commit -m "feat(backtest): add preset multi-select and comparison metrics table"
```

---

## Task 13: Add equity curve overlay chart

**Files:**
- Create: `apps/web/app/backtest/comparison-chart.tsx`
- Modify: `apps/web/app/backtest/page.tsx`

- [ ] **Step 1: Create `comparison-chart.tsx`**

Use the same canvas approach as existing `charts.tsx` in the backtest folder. A minimal line-overlay chart:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import type { BacktestResult } from '@tradeclaw/strategies';

interface Props {
  results: BacktestResult[];
  presetNames: Record<string, string>;
}

const COLORS = ['#60a5fa', '#f97316', '#22c55e', '#e879f9', '#fbbf24'];

export function ComparisonChart({ results, presetNames }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const curves = results.filter((r) => r.equityCurve.length > 0);
    if (curves.length === 0) return;

    const allValues = curves.flatMap((r) => r.equityCurve);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const maxLen = Math.max(...curves.map((r) => r.equityCurve.length));
    const pad = 24;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(pad, pad, plotW, plotH);

    curves.forEach((r, i) => {
      ctx.strokeStyle = COLORS[i % COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      r.equityCurve.forEach((v, j) => {
        const x = pad + (j / (maxLen - 1)) * plotW;
        const y = pad + plotH - ((v - min) / (max - min || 1)) * plotH;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, [results]);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-64 bg-black/20 rounded-xl" />
      <div className="flex gap-4 mt-2 text-xs flex-wrap">
        {results.map((r, i) => (
          <div key={r.strategyId} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-zinc-300">{presetNames[r.strategyId] ?? r.strategyId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render it in `page.tsx`**

Import and place above or below the metrics table:

```typescript
import { ComparisonChart } from './comparison-chart';

{comparisonResults.length > 0 && (
  <div className="mb-4">
    <ComparisonChart results={comparisonResults} presetNames={presetNames} />
  </div>
)}
```

- [ ] **Step 3: Manual verification**

Reload `/backtest`. Run with 3 presets. Verify:
- Chart renders 3 colored lines
- Legend matches colors
- Lines scale to the combined min/max

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/backtest/comparison-chart.tsx apps/web/app/backtest/page.tsx
git commit -m "feat(backtest): add equity curve overlay chart for preset comparison"
```

---

## Task 14: E2E test for backtest comparison

**Files:**
- Create: `apps/web/e2e/backtest-comparison.spec.ts`

- [ ] **Step 1: Write Playwright test**

```typescript
import { test, expect } from '@playwright/test';

test('backtest comparison shows 3 presets side-by-side', async ({ page }) => {
  await page.goto('/backtest');

  // Wait for page to load — look for the preset checkboxes
  await expect(page.getByText('Strategies to compare')).toBeVisible();

  // Select 3 presets (HMM Top-3 is default)
  await page.getByLabel('Classic').check();
  await page.getByLabel('VWAP + EMA + Bollinger').check();

  // Pick a symbol if needed — depends on existing UI
  // await page.getByRole('combobox', { name: /symbol/i }).selectOption('BTCUSD');

  // Run backtest
  await page.getByRole('button', { name: /run/i }).click();

  // Metrics table appears with 3 rows
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(3);

  // Overlay chart renders
  await expect(page.locator('canvas').first()).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test**

```bash
pnpm --filter @tradeclaw/web exec playwright test backtest-comparison
```

Expected: PASS. If the selectors are wrong, read the rendered HTML via the Playwright trace and adjust.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/backtest-comparison.spec.ts
git commit -m "test(e2e): add backtest comparison Playwright test"
```

---

## Task 15: Full test suite + build

- [ ] **Step 1: Run the whole test suite**

```bash
pnpm test
```

Expected: all tests pass including new strategies package tests, preset dispatch tests, and E2E.

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter '*' typecheck
```

Expected: no errors.

- [ ] **Step 3: Build the web app**

```bash
pnpm --filter @tradeclaw/web build
```

Expected: clean build, no warnings about missing `@tradeclaw/strategies` imports or undefined types.

- [ ] **Step 4: Commit any lint/format fixups**

```bash
git status
git diff
# If anything changed from hooks, review then commit
git add -A
git commit -m "chore: lint fixups after strategy comparison framework"
```

---

## Done

At this point:
- 5 named presets exist as first-class `Strategy` objects
- `/backtest` page supports multi-select comparison with metrics table + equity overlay
- Signal engine cron reads `SIGNAL_ENGINE_PRESET` with `hmm-top3` default (production unchanged)
- Parity verified: default preset matches today's production signals
- Unit, integration, snapshot, and E2E coverage
