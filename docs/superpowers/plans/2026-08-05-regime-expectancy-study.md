# Regime Expectancy Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run `scripts/research/regime-expectancy-study.ts` — a read-only research CLI that answers, from the real production dataset, whether any regime subset of the -0.49R track record is net-positive after costs (spec: `docs/plans/2026-08-05-regime-expectancy-study.md`).

**Architecture:** Two files, matching the established `scripts/research/` pattern (`recost-segment.ts` + `recost-report.ts`): a pure assembly module (`regime-study-assembly.ts`) holding every piece of math with unit tests, and a thin CLI (`regime-expectancy-study.ts`) that loads env, queries Postgres (`signal_history` + `candles` via the existing `candle-db.ts`), and renders the report. No product code (`apps/web`, `packages/`) is touched.

**Tech Stack:** TypeScript via `npx tsx`, `pg` Client from `scripts/research/candle-db.ts`, root Jest for tests, dotenv env loading copied from `recost-segment.ts`.

## Global Constraints

- Spec: `docs/plans/2026-08-05-regime-expectancy-study.md` — decision rule and tolerances there are pre-registered; do not adjust them to fit results.
- No changes under `apps/web/` or `packages/` — research scripts inline their own math (established pattern; `@tradeclaw/signals` dist is gitignored and unbuilt).
- Database access is read-only for `signal_history` (SELECT only). Candle writes happen only through the existing idempotent `backfill-candles.ts` (ON CONFLICT DO NOTHING).
- Raw outputs go to gitignored `data/research/`; never commit data files.
- Stage by explicit filename only (autocrlf repo); single-line `git commit -m` messages.
- Counted-trade filter MUST mirror `apps/web/lib/signal-history.ts` `isCountedResolved` (keep nonzero `target='expired'` rows, require observed-OHLCV source) — NOT `recost-segment.ts`'s stricter filter which drops all expired rows. This is the reconciliation-gate make-or-break.
- Constants mirrored from the live engine: `HARD_R_CAP = 8`, fallback round-trip cost pct by asset class `{crypto: 0.40, metals: 0.10, fx: 0.04, 'stocks/cmdty': 0.04}`, observed sources `['market-data-hub','binance','stooq','kraken','cryptocompare']`.
- Pre-registered reconciliation tolerances (whole counted stream): `n >= 3095`, gross expectancy in `[-0.03, +0.07]`, avg costR in `[0.45, 0.57]`, net expectancy in `[-0.55, -0.43]`.
- Regime parameters (pre-registered): EMA200 on D1 closes, slope over trailing 20 bars, ADX(14) cuts at 20 and 25, Kaufman ER(20) cut at 0.30, `minN = 300`.

---

### Task 1: Assembly module — row filter and trade math

**Files:**
- Create: `scripts/research/regime-study-assembly.ts`
- Test: `scripts/research/__tests__/regime-study-assembly.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (used by Tasks 2–5): `StudyRow`, `StudyTrade`, `isCountedRow(r: StudyRow): boolean`, `toStudyTrade(r: StudyRow): StudyTrade | null`, constants `HARD_R_CAP`, `DAY_MS`.

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/research/__tests__/regime-study-assembly.test.ts
import {
  isCountedRow,
  toStudyTrade,
  type StudyRow,
} from '../regime-study-assembly';

const baseRow: StudyRow = {
  pair: 'BTCUSD',
  timeframe: 'M15',
  direction: 'BUY',
  confidence: 80,
  entry_price: 100,
  sl: 98,
  cost_estimate_pct: 0.4,
  strategy_id: 'classic',
  created_at: '2026-07-01T00:00:00.000Z',
  pnl_pct: 3,
  hit: true,
  target: 'TP1',
  source: 'binance',
};

describe('isCountedRow (mirrors lib isCountedResolved, NOT recost-segment)', () => {
  it('counts a resolved observed-source row', () => {
    expect(isCountedRow(baseRow)).toBe(true);
  });
  it('drops unresolved rows', () => {
    expect(isCountedRow({ ...baseRow, pnl_pct: null, hit: null })).toBe(false);
  });
  it('drops the force-expiry placeholder (pnl 0, not hit)', () => {
    expect(isCountedRow({ ...baseRow, pnl_pct: 0, hit: false })).toBe(false);
  });
  it('KEEPS a nonzero target=expired row (mark-to-market close is real)', () => {
    expect(isCountedRow({ ...baseRow, target: 'expired', pnl_pct: -1.2, hit: false })).toBe(true);
  });
  it('drops rows without approved observed-OHLCV source', () => {
    expect(isCountedRow({ ...baseRow, source: null })).toBe(false);
    expect(isCountedRow({ ...baseRow, source: 'force-expired' })).toBe(false);
  });
});

describe('toStudyTrade', () => {
  it('computes riskPct, rRaw, sized cap, costR from persisted cost', () => {
    // riskPct = |100-98|/100*100 = 2. rRaw = 3/2 = 1.5. costR = 0.4/2 = 0.2.
    const t = toStudyTrade(baseRow)!;
    expect(t.rRaw).toBeCloseTo(1.5, 10);
    expect(t.rSized).toBeCloseTo(1.5, 10);
    expect(t.costR).toBeCloseTo(0.2, 10);
    expect(t.isWin).toBe(true);
    expect(t.direction).toBe('BUY');
    expect(t.pair).toBe('BTCUSD');
    expect(t.strategyId).toBe('classic');
  });
  it('caps sized R at ±8 but keeps rRaw uncapped', () => {
    const t = toStudyTrade({ ...baseRow, pnl_pct: 40 })!; // rRaw = 20
    expect(t.rRaw).toBeCloseTo(20, 10);
    expect(t.rSized).toBe(8);
  });
  it('falls back to asset-class cost when cost_estimate_pct is null (crypto 0.40)', () => {
    const t = toStudyTrade({ ...baseRow, cost_estimate_pct: null })!;
    expect(t.costR).toBeCloseTo(0.4 / 2, 10);
  });
  it('returns null when sl is missing or entry invalid', () => {
    expect(toStudyTrade({ ...baseRow, sl: null })).toBeNull();
    expect(toStudyTrade({ ...baseRow, entry_price: 0 })).toBeNull();
  });
  it('returns null for uncounted rows', () => {
    expect(toStudyTrade({ ...baseRow, source: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: FAIL — cannot find module `../regime-study-assembly`.

- [ ] **Step 3: Write the implementation**

```ts
// scripts/research/regime-study-assembly.ts
/**
 * Pure math for the regime expectancy study (spec:
 * docs/plans/2026-08-05-regime-expectancy-study.md). No I/O, no DB — every
 * function here is unit-tested. The CLI (regime-expectancy-study.ts) is the
 * only file that talks to Postgres.
 *
 * Counted-trade semantics deliberately mirror apps/web/lib/signal-history.ts
 * isCountedResolved (dashboard parity), which KEEPS nonzero target='expired'
 * rows and REQUIRES observed-OHLCV provenance. recost-segment.ts drops all
 * expired rows — do not copy that here or the reconciliation gate fails.
 */

export const DAY_MS = 86_400_000;
/** equity/route.ts — per-trade R cap for sizing (stat R stays uncapped). */
export const HARD_R_CAP = 8;

/** apps/web/lib/outcome-provenance.ts OBSERVED_OHLCV_OUTCOME_SOURCES. */
const OBSERVED_SOURCES = new Set([
  'market-data-hub',
  'binance',
  'stooq',
  'kraken',
  'cryptocompare',
]);

type AssetClass = 'crypto' | 'metals' | 'fx' | 'stocks/cmdty';

/** Mirrors recost-segment.ts fallback for pre-051 rows (backtest-options.ts costModelFor). */
const FALLBACK_RT_COST_PCT: Record<AssetClass, number> = {
  crypto: 0.40,
  metals: 0.10,
  fx: 0.04,
  'stocks/cmdty': 0.04,
};

const FX_SET = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF']);

function assetClassFor(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (/XAU|XAG/.test(s)) return 'metals';
  if (/BTC|ETH|SOL|BNB|XRP|ADA|DOGE|DOT|LINK|AVAX/.test(s) || /USDT$/.test(s)) return 'crypto';
  if (FX_SET.has(s)) return 'fx';
  return 'stocks/cmdty';
}

export interface StudyRow {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry_price: number;
  sl: number | null;
  cost_estimate_pct: number | null;
  strategy_id: string | null;
  created_at: string;
  pnl_pct: number | null;
  hit: boolean | null;
  target: string | null;
  source: string | null;
}

export interface StudyTrade {
  ts: number;
  pair: string;
  direction: 'BUY' | 'SELL';
  strategyId: string;
  confidence: number;
  /** raw (uncapped) R — used for gross stats, dashboard parity */
  rRaw: number;
  /** sized (±HARD_R_CAP) R — what the equity path compounds */
  rSized: number;
  /** round-trip cost in R = cost%_notional / riskPct */
  costR: number;
  isWin: boolean;
}

/** Dashboard-parity counted filter (lib isCountedResolved semantics). */
export function isCountedRow(r: StudyRow): boolean {
  if (r.pnl_pct === null || r.hit === null) return false;
  if (r.pnl_pct === 0 && !r.hit) return false; // force-expiry placeholder
  return typeof r.source === 'string' && OBSERVED_SOURCES.has(r.source);
}

export function toStudyTrade(r: StudyRow): StudyTrade | null {
  if (!isCountedRow(r)) return null;
  if (r.sl === null || r.entry_price <= 0) return null;
  const riskPct = (Math.abs(r.entry_price - r.sl) / r.entry_price) * 100;
  if (!Number.isFinite(riskPct) || riskPct <= 0) return null;

  const rRaw = (r.pnl_pct as number) / riskPct;
  const rSized = Math.max(-HARD_R_CAP, Math.min(HARD_R_CAP, rRaw));
  const costPctNotional =
    r.cost_estimate_pct != null && r.cost_estimate_pct > 0
      ? r.cost_estimate_pct
      : FALLBACK_RT_COST_PCT[assetClassFor(r.pair)];

  return {
    ts: new Date(r.created_at).getTime(),
    pair: r.pair,
    direction: r.direction,
    strategyId: r.strategy_id ?? 'unknown',
    confidence: Number(r.confidence),
    rRaw,
    rSized,
    costR: costPctNotional / riskPct,
    isWin: !!r.hit,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/research/regime-study-assembly.ts scripts/research/__tests__/regime-study-assembly.test.ts
git commit -m "feat(research): regime study assembly - dashboard-parity counted filter and R/cost trade math"
```

---

### Task 2: Assembly module — indicators (ADX, efficiency ratio)

**Files:**
- Modify: `scripts/research/regime-study-assembly.ts` (append)
- Test: `scripts/research/__tests__/regime-study-assembly.test.ts` (append)

**Interfaces:**
- Consumes: `emaSeries(values: number[], period: number): (number | null)[]` imported from `./slow-gate-assembly` (existing, tested).
- Produces: `Bar { timestamp, open, high, low, close, volume }` (structural match for candle-db `StoredCandle`), `adxSeries(bars: Bar[], period?: number): (number | null)[]`, `efficiencyRatioSeries(closes: number[], window?: number): (number | null)[]`.

Contract for both series: output array aligned to input length; `adxSeries` is null until index `2*period - 1`; `efficiencyRatioSeries` is null until index `window` (first value at index `window`).

- [ ] **Step 1: Write the failing tests**

```ts
// append to regime-study-assembly.test.ts
import { adxSeries, efficiencyRatioSeries, type Bar } from '../regime-study-assembly';

function bar(close: number, spreadPct = 1): Bar {
  const half = (close * spreadPct) / 200;
  return { timestamp: 0, open: close, high: close + half, low: close - half, close, volume: 1 };
}

describe('adxSeries (Wilder, period 14)', () => {
  it('is null through the warmup (first 2*period-1 bars)', () => {
    const bars = Array.from({ length: 40 }, (_, i) => bar(100 + i));
    const adx = adxSeries(bars, 14);
    for (let i = 0; i < 27; i++) expect(adx[i]).toBeNull();
    expect(adx[27]).not.toBeNull();
    expect(adx.length).toBe(40);
  });
  it('reads high on a persistent one-way trend', () => {
    const bars = Array.from({ length: 60 }, (_, i) => bar(100 + 2 * i));
    const adx = adxSeries(bars, 14);
    expect(adx[59]!).toBeGreaterThan(60);
  });
  it('reads low on alternating chop', () => {
    const bars = Array.from({ length: 60 }, (_, i) => bar(100 + (i % 2 === 0 ? 0 : 0.5)));
    const adx = adxSeries(bars, 14);
    expect(adx[59]!).toBeLessThan(20);
  });
  it('returns all nulls when there are not enough bars', () => {
    const adx = adxSeries(Array.from({ length: 10 }, () => bar(100)), 14);
    expect(adx.every((v) => v === null)).toBe(true);
  });
});

describe('efficiencyRatioSeries (Kaufman, window 20)', () => {
  it('is 1 for a perfectly straight line', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const er = efficiencyRatioSeries(closes, 20);
    expect(er[20]!).toBeCloseTo(1, 10);
    expect(er[29]!).toBeCloseTo(1, 10);
  });
  it('is ~0 for a full round trip', () => {
    // 10 up then 10 down: net 0, path 20
    const closes: number[] = [100];
    for (let i = 0; i < 10; i++) closes.push(closes[closes.length - 1] + 1);
    for (let i = 0; i < 10; i++) closes.push(closes[closes.length - 1] - 1);
    const er = efficiencyRatioSeries(closes, 20);
    expect(er[20]!).toBeCloseTo(0, 10);
  });
  it('is null during warmup (indices 0..window-1)', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i);
    const er = efficiencyRatioSeries(closes, 20);
    for (let i = 0; i < 20; i++) expect(er[i]).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: FAIL — `adxSeries` / `efficiencyRatioSeries` not exported.

- [ ] **Step 3: Write the implementation**

```ts
// append to regime-study-assembly.ts

export interface Bar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Per-bar ADX with Wilder smoothing (same conventions as
 * packages/signals/src/regime/features.ts computeAdxSeries, re-implemented
 * here because research scripts stay off the unbuilt @tradeclaw/signals dist).
 * Output aligned to bars; null until index 2*period-1.
 */
export function adxSeries(bars: Bar[], period = 14): (number | null)[] {
  const n = bars.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 2 * period) return out;

  // tr/pdm/ndm[k] describe the move INTO bar k+1.
  const tr: number[] = [];
  const pdm: number[] = [];
  const ndm: number[] = [];
  for (let i = 1; i < n; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const pc = bars[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const up = h - bars[i - 1].high;
    const dn = bars[i - 1].low - l;
    pdm.push(up > dn && up > 0 ? up : 0);
    ndm.push(dn > up && dn > 0 ? dn : 0);
  }

  let sTr = 0;
  let sP = 0;
  let sN = 0;
  for (let k = 0; k < period; k++) {
    sTr += tr[k];
    sP += pdm[k];
    sN += ndm[k];
  }

  // dxAt[i] for bar index i = period .. n-1
  const dxAt = new Map<number, number>();
  for (let i = period; i < n; i++) {
    const pdi = sTr > 0 ? (100 * sP) / sTr : 0;
    const ndi = sTr > 0 ? (100 * sN) / sTr : 0;
    const sum = pdi + ndi;
    dxAt.set(i, sum > 0 ? (100 * Math.abs(pdi - ndi)) / sum : 0);
    if (i + 1 < n) {
      const k = i; // tr[k] is the move into bar k+1
      sTr = sTr - sTr / period + tr[k];
      sP = sP - sP / period + pdm[k];
      sN = sN - sN / period + ndm[k];
    }
  }

  // First ADX at 2*period-1 = mean of DX over bars period..2*period-1.
  let adx = 0;
  for (let i = period; i < 2 * period; i++) adx += dxAt.get(i)!;
  adx /= period;
  out[2 * period - 1] = adx;
  for (let i = 2 * period; i < n; i++) {
    adx = (adx * (period - 1) + dxAt.get(i)!) / period;
    out[i] = adx;
  }
  return out;
}

/** Kaufman efficiency ratio: |net change| / path length over `window` steps. Null until index `window`. */
export function efficiencyRatioSeries(closes: number[], window = 20): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = window; i < closes.length; i++) {
    let path = 0;
    for (let j = i - window + 1; j <= i; j++) path += Math.abs(closes[j] - closes[j - 1]);
    out[i] = path > 0 ? Math.abs(closes[i] - closes[i - window]) / path : 0;
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/research/regime-study-assembly.ts scripts/research/__tests__/regime-study-assembly.test.ts
git commit -m "feat(research): regime study indicators - Wilder ADX and Kaufman efficiency ratio with property tests"
```

---

### Task 3: Assembly module — lookahead-safe regime classification

**Files:**
- Modify: `scripts/research/regime-study-assembly.ts` (append)
- Test: `scripts/research/__tests__/regime-study-assembly.test.ts` (append)

**Interfaces:**
- Consumes: `emaSeries` from `./slow-gate-assembly`; `adxSeries`, `efficiencyRatioSeries`, `Bar`, `DAY_MS` from Task 2.
- Produces:
  - `lastClosedBarIndex(barTimestamps: number[], barMs: number, signalTs: number): number` — greatest `i` with `barTimestamps[i] + barMs <= signalTs`, else `-1`.
  - `TrendSide = 'up' | 'down' | 'none'`
  - `SymbolRegimeSeries { barTs: number[]; closes: number[]; ema200: (number|null)[]; adx14: (number|null)[]; er20: (number|null)[] }`
  - `buildRegimeSeries(bars: Bar[]): SymbolRegimeSeries`
  - `RegimeSnapshot { trendSide: TrendSide; adx: number | null; er: number | null }`
  - `regimeAt(series: SymbolRegimeSeries, signalTs: number): RegimeSnapshot | null` (null ⇒ unclassified: no closed bar or warmup)
  - `VariantName = 'adx20' | 'adx25' | 'er030'`, `VARIANTS: VariantName[]`
  - `BucketName = 'aligned' | 'counter' | 'sideways'`
  - `classifyBucket(direction: 'BUY' | 'SELL', regime: RegimeSnapshot, variant: VariantName): BucketName | null`

- [ ] **Step 1: Write the failing tests**

```ts
// append to regime-study-assembly.test.ts
import {
  lastClosedBarIndex,
  buildRegimeSeries,
  regimeAt,
  classifyBucket,
  DAY_MS,
} from '../regime-study-assembly';

describe('lastClosedBarIndex (the lookahead gate)', () => {
  const ts = [0, DAY_MS, 2 * DAY_MS, 3 * DAY_MS]; // D1 open times
  it('returns the last bar whose CLOSE is at or before the signal', () => {
    // signal exactly at close of bar 1 (open DAY_MS + DAY_MS): bar 1 usable
    expect(lastClosedBarIndex(ts, DAY_MS, 2 * DAY_MS)).toBe(1);
    // one ms earlier: bar 1 still open -> bar 0
    expect(lastClosedBarIndex(ts, DAY_MS, 2 * DAY_MS - 1)).toBe(0);
  });
  it('returns -1 when no bar has closed yet', () => {
    expect(lastClosedBarIndex(ts, DAY_MS, DAY_MS - 1)).toBe(-1);
  });
  it('returns the final bar for far-future signals', () => {
    expect(lastClosedBarIndex(ts, DAY_MS, 100 * DAY_MS)).toBe(3);
  });
});

function trendBars(n: number, step: number, start = 1000): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const close = start + step * i;
    return { timestamp: i * DAY_MS, open: close, high: close * 1.005, low: close * 0.995, close, volume: 1 };
  });
}

describe('regimeAt + classifyBucket', () => {
  it('classifies an established uptrend as up/aligned for BUY, counter for SELL', () => {
    const series = buildRegimeSeries(trendBars(260, 5));
    const signalTs = 259 * DAY_MS + DAY_MS; // after final close
    const regime = regimeAt(series, signalTs)!;
    expect(regime.trendSide).toBe('up');
    expect(classifyBucket('BUY', regime, 'adx20')).toBe('aligned');
    expect(classifyBucket('SELL', regime, 'adx20')).toBe('counter');
    expect(classifyBucket('BUY', regime, 'er030')).toBe('aligned');
  });
  it('classifies chop as sideways under every variant', () => {
    // 220 warmup up-bars then 60 alternating bars around a flat level
    const bars = trendBars(220, 5);
    const last = bars[bars.length - 1].close;
    for (let i = 0; i < 60; i++) {
      const close = last + (i % 2 === 0 ? 0 : 3);
      bars.push({ timestamp: (220 + i) * DAY_MS, open: close, high: close + 4, low: close - 4, close, volume: 1 });
    }
    const series = buildRegimeSeries(bars);
    const regime = regimeAt(series, 280 * DAY_MS)!;
    expect(classifyBucket('BUY', regime, 'adx20')).toBe('sideways');
    expect(classifyBucket('BUY', regime, 'er030')).toBe('sideways');
  });
  it('returns null (unclassified) during warmup', () => {
    const series = buildRegimeSeries(trendBars(50, 5));
    expect(regimeAt(series, 49 * DAY_MS + DAY_MS)).toBeNull();
  });
  it('returns null when the signal predates every close', () => {
    const series = buildRegimeSeries(trendBars(260, 5));
    expect(regimeAt(series, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Write the implementation**

```ts
// append to regime-study-assembly.ts
import { emaSeries } from './slow-gate-assembly';

export type TrendSide = 'up' | 'down' | 'none';
export type VariantName = 'adx20' | 'adx25' | 'er030';
export type BucketName = 'aligned' | 'counter' | 'sideways';

export const VARIANTS: VariantName[] = ['adx20', 'adx25', 'er030'];

const EMA_PERIOD = 200;
const SLOPE_LOOKBACK = 20;
const ADX_PERIOD = 14;
const ER_WINDOW = 20;
const ER_TRENDING_MIN = 0.30;

export interface SymbolRegimeSeries {
  barTs: number[];
  closes: number[];
  ema200: (number | null)[];
  adx14: (number | null)[];
  er20: (number | null)[];
}

export function buildRegimeSeries(bars: Bar[]): SymbolRegimeSeries {
  const closes = bars.map((b) => b.close);
  return {
    barTs: bars.map((b) => b.timestamp),
    closes,
    ema200: emaSeries(closes, EMA_PERIOD),
    adx14: adxSeries(bars, ADX_PERIOD),
    er20: efficiencyRatioSeries(closes, ER_WINDOW),
  };
}

/** Greatest index whose bar CLOSE (open ts + barMs) is <= signalTs; -1 if none. */
export function lastClosedBarIndex(barTimestamps: number[], barMs: number, signalTs: number): number {
  let lo = 0;
  let hi = barTimestamps.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (barTimestamps[mid] + barMs <= signalTs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export interface RegimeSnapshot {
  trendSide: TrendSide;
  adx: number | null;
  er: number | null;
}

export function regimeAt(series: SymbolRegimeSeries, signalTs: number): RegimeSnapshot | null {
  const i = lastClosedBarIndex(series.barTs, DAY_MS, signalTs);
  if (i < 0) return null;
  const ema = series.ema200[i];
  const emaPrev = i - SLOPE_LOOKBACK >= 0 ? series.ema200[i - SLOPE_LOOKBACK] : null;
  if (ema === null || emaPrev === null) return null; // warmup -> unclassified

  const close = series.closes[i];
  let trendSide: TrendSide = 'none';
  if (close > ema && ema > emaPrev) trendSide = 'up';
  else if (close < ema && ema < emaPrev) trendSide = 'down';

  return { trendSide, adx: series.adx14[i], er: series.er20[i] };
}

/** null ⇒ unclassified (detector value unavailable at this bar). */
export function classifyBucket(
  direction: 'BUY' | 'SELL',
  regime: RegimeSnapshot,
  variant: VariantName,
): BucketName | null {
  let strong: boolean;
  if (variant === 'adx20' || variant === 'adx25') {
    if (regime.adx === null) return null;
    strong = regime.adx >= (variant === 'adx20' ? 20 : 25);
  } else {
    if (regime.er === null) return null;
    strong = regime.er >= ER_TRENDING_MIN;
  }
  if (!strong || regime.trendSide === 'none') return 'sideways';
  const aligned =
    (direction === 'BUY' && regime.trendSide === 'up') ||
    (direction === 'SELL' && regime.trendSide === 'down');
  return aligned ? 'aligned' : 'counter';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/research/regime-study-assembly.ts scripts/research/__tests__/regime-study-assembly.test.ts
git commit -m "feat(research): lookahead-safe regime classification - EMA200 side, ADX/ER variants, aligned/counter/sideways buckets"
```

---

### Task 4: Assembly module — bucket stats, inversion, cost curve, reconciliation, CLI arg parsing

**Files:**
- Modify: `scripts/research/regime-study-assembly.ts` (append)
- Test: `scripts/research/__tests__/regime-study-assembly.test.ts` (append)

**Interfaces:**
- Consumes: `StudyTrade`, `HARD_R_CAP` from Task 1.
- Produces:
  - `BucketStats { n; winRatePct; avgWinR; avgLossR; grossExpectancyR; avgCostR; netExpectancyR; conclusive }`
  - `computeBucketStats(trades: StudyTrade[], minN: number): BucketStats`
  - `invertTrade(t: StudyTrade): StudyTrade`
  - `computeCostCurve(trades: StudyTrade[], multiples?: number[]): Array<{ multiple: number; avgCostR: number }>`
  - `RECONCILIATION_TOLERANCES` (const), `ReconciliationResult`, `reconcile(trades: StudyTrade[]): ReconciliationResult`
  - `CliInputError`, `CliArgs { days: number | null; minN: number; jsonPath: string | null; help: boolean }`, `parseCliArgs(argv: string[]): CliArgs`

- [ ] **Step 1: Write the failing tests**

```ts
// append to regime-study-assembly.test.ts
import {
  computeBucketStats,
  invertTrade,
  computeCostCurve,
  reconcile,
  parseCliArgs,
  type StudyTrade,
} from '../regime-study-assembly';

function trade(over: Partial<StudyTrade>): StudyTrade {
  return {
    ts: 0, pair: 'BTCUSD', direction: 'BUY', strategyId: 'classic', confidence: 80,
    rRaw: 1, rSized: 1, costR: 0.5, isWin: true, ...over,
  };
}

describe('computeBucketStats', () => {
  it('computes exact stats on a hand-built set', () => {
    const trades = [
      trade({ rRaw: 2, rSized: 2, costR: 0.4, isWin: true }),
      trade({ rRaw: -1, rSized: -1, costR: 0.6, isWin: false }),
      trade({ rRaw: 1, rSized: 1, costR: 0.5, isWin: true }),
    ];
    const s = computeBucketStats(trades, 3);
    expect(s.n).toBe(3);
    expect(s.winRatePct).toBeCloseTo(66.7, 1);
    expect(s.avgWinR).toBeCloseTo(1.5, 10);       // (2+1)/2 on rRaw
    expect(s.avgLossR).toBeCloseTo(-1, 10);
    expect(s.grossExpectancyR).toBeCloseTo((2 - 1 + 1) / 3, 10);
    expect(s.avgCostR).toBeCloseTo(0.5, 10);
    expect(s.netExpectancyR).toBeCloseTo((2 - 0.4 - 1 - 0.6 + 1 - 0.5) / 3, 10); // net uses rSized - costR
    expect(s.conclusive).toBe(true);
  });
  it('marks small samples inconclusive', () => {
    expect(computeBucketStats([trade({})], 300).conclusive).toBe(false);
  });
  it('handles the empty bucket', () => {
    const s = computeBucketStats([], 300);
    expect(s.n).toBe(0);
    expect(s.netExpectancyR).toBe(0);
  });
});

describe('invertTrade', () => {
  it('flips gross R and win flag, keeps cost, re-caps sized R', () => {
    const t = invertTrade(trade({ rRaw: 20, rSized: 8, costR: 0.5, isWin: true }));
    expect(t.rRaw).toBe(-20);
    expect(t.rSized).toBe(-8);
    expect(t.costR).toBe(0.5);
    expect(t.isWin).toBe(false);
    expect(t.direction).toBe('SELL');
  });
});

describe('computeCostCurve', () => {
  it('scales avg cost inversely with the stop-width multiple', () => {
    const trades = [trade({ costR: 0.4 }), trade({ costR: 0.6 })];
    const curve = computeCostCurve(trades, [1, 2, 5]);
    expect(curve).toEqual([
      { multiple: 1, avgCostR: 0.5 },
      { multiple: 2, avgCostR: 0.25 },
      { multiple: 5, avgCostR: 0.1 },
    ]);
  });
});

describe('reconcile (pre-registered gates)', () => {
  it('passes a stream matching the dashboard decomposition', () => {
    // 3100 trades: gross +0.02, cost 0.51 -> net -0.49
    const trades = Array.from({ length: 3100 }, () =>
      trade({ rRaw: 0.02, rSized: 0.02, costR: 0.51 }));
    const r = reconcile(trades);
    expect(r.pass).toBe(true);
    expect(r.failures).toEqual([]);
  });
  it('fails on wrong N, gross, cost, or net — with named failures', () => {
    const small = reconcile(Array.from({ length: 100 }, () => trade({})));
    expect(small.pass).toBe(false);
    expect(small.failures.join(' ')).toContain('n');
  });
});

describe('parseCliArgs', () => {
  it('applies defaults (minN 300)', () => {
    expect(parseCliArgs([])).toEqual({ days: null, minN: 300, jsonPath: null, help: false });
  });
  it('parses flags', () => {
    expect(parseCliArgs(['--days', '30', '--min-n', '100', '--json', 'out.json'])).toEqual({
      days: 30, minN: 100, jsonPath: 'out.json', help: false,
    });
  });
  it('rejects unknown flags and bad integers', () => {
    expect(() => parseCliArgs(['--nope'])).toThrow();
    expect(() => parseCliArgs(['--days', '0'])).toThrow();
    expect(() => parseCliArgs(['--days', 'abc'])).toThrow();
  });
  it('handles --help', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Write the implementation**

```ts
// append to regime-study-assembly.ts

export interface BucketStats {
  n: number;
  winRatePct: number;
  avgWinR: number;
  avgLossR: number;
  grossExpectancyR: number;
  avgCostR: number;
  netExpectancyR: number;
  conclusive: boolean;
}

export function computeBucketStats(trades: StudyTrade[], minN: number): BucketStats {
  const n = trades.length;
  if (n === 0) {
    return { n: 0, winRatePct: 0, avgWinR: 0, avgLossR: 0, grossExpectancyR: 0, avgCostR: 0, netExpectancyR: 0, conclusive: false };
  }
  let wins = 0;
  let winSum = 0;
  let lossCount = 0;
  let lossSum = 0;
  let grossSum = 0;
  let netSum = 0;
  let costSum = 0;
  for (const t of trades) {
    if (t.isWin) { wins++; winSum += t.rRaw; } else { lossCount++; lossSum += t.rRaw; }
    grossSum += t.rRaw;
    netSum += t.rSized - t.costR;
    costSum += t.costR;
  }
  return {
    n,
    winRatePct: (wins / n) * 100,
    avgWinR: wins > 0 ? winSum / wins : 0,
    avgLossR: lossCount > 0 ? lossSum / lossCount : 0,
    grossExpectancyR: grossSum / n,
    avgCostR: costSum / n,
    netExpectancyR: netSum / n,
    conclusive: n >= minN,
  };
}

/**
 * Directional inversion approximation: flips the realized gross R and the win
 * flag, keeps the cost. It does NOT re-simulate TP/SL geometry for the
 * opposite position — it answers only "was the direction the problem".
 */
export function invertTrade(t: StudyTrade): StudyTrade {
  return {
    ...t,
    direction: t.direction === 'BUY' ? 'SELL' : 'BUY',
    rRaw: -t.rRaw,
    rSized: Math.max(-HARD_R_CAP, Math.min(HARD_R_CAP, -t.rRaw)),
    isWin: t.rRaw < 0,
  };
}

/**
 * Analytic cost curve: at stop-width multiple m, costR scales 1/m
 * (costR = cost%_notional / riskPct). This is NOT a re-simulation — outcome
 * distributions at wider stops are unknowable from this dataset; the curve
 * only shows where the cost floor stops being fatal.
 */
export function computeCostCurve(
  trades: StudyTrade[],
  multiples: number[] = [1, 2, 3, 5, 8, 10],
): Array<{ multiple: number; avgCostR: number }> {
  const base = trades.length > 0 ? trades.reduce((s, t) => s + t.costR, 0) / trades.length : 0;
  return multiples.map((multiple) => ({ multiple, avgCostR: base / multiple }));
}

/** Pre-registered in the spec BEFORE any results were computed. Do not tune. */
export const RECONCILIATION_TOLERANCES = {
  minN: 3095,
  gross: [-0.03, 0.07] as const,
  cost: [0.45, 0.57] as const,
  net: [-0.55, -0.43] as const,
};

export interface ReconciliationResult {
  n: number;
  grossExpectancyR: number;
  avgCostR: number;
  netExpectancyR: number;
  pass: boolean;
  failures: string[];
}

export function reconcile(trades: StudyTrade[]): ReconciliationResult {
  const s = computeBucketStats(trades, 1);
  const t = RECONCILIATION_TOLERANCES;
  const failures: string[] = [];
  if (s.n < t.minN) failures.push(`n ${s.n} < ${t.minN}`);
  if (s.grossExpectancyR < t.gross[0] || s.grossExpectancyR > t.gross[1]) {
    failures.push(`gross ${s.grossExpectancyR.toFixed(4)} outside [${t.gross[0]}, ${t.gross[1]}]`);
  }
  if (s.avgCostR < t.cost[0] || s.avgCostR > t.cost[1]) {
    failures.push(`cost ${s.avgCostR.toFixed(4)} outside [${t.cost[0]}, ${t.cost[1]}]`);
  }
  if (s.netExpectancyR < t.net[0] || s.netExpectancyR > t.net[1]) {
    failures.push(`net ${s.netExpectancyR.toFixed(4)} outside [${t.net[0]}, ${t.net[1]}]`);
  }
  return {
    n: s.n,
    grossExpectancyR: s.grossExpectancyR,
    avgCostR: s.avgCostR,
    netExpectancyR: s.netExpectancyR,
    pass: failures.length === 0,
    failures,
  };
}

export class CliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliInputError';
  }
}

const MAX_DAYS = 36_500;

function parsePositiveInt(name: string, value: string | undefined): number {
  if (value === undefined) throw new CliInputError(`Missing value for ${name}.`);
  if (!/^\d+$/.test(value)) throw new CliInputError(`Invalid ${name}: expected a positive integer, got "${value}".`);
  const n = Number(value);
  if (n <= 0 || n > MAX_DAYS) throw new CliInputError(`Invalid ${name}: must be in 1..${MAX_DAYS}, got ${n}.`);
  return n;
}

export interface CliArgs {
  days: number | null;
  minN: number;
  jsonPath: string | null;
  help: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const out: CliArgs = { days: null, minN: 300, jsonPath: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { out.help = true; continue; }
    if (a === '--days') { out.days = parsePositiveInt('--days', argv[++i]); continue; }
    if (a === '--min-n') { out.minN = parsePositiveInt('--min-n', argv[++i]); continue; }
    if (a === '--json') {
      const v = argv[++i];
      if (v === undefined) throw new CliInputError('Missing value for --json.');
      out.jsonPath = v;
      continue;
    }
    throw new CliInputError(`Unknown option: ${JSON.stringify(a)}.`);
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: PASS (full file).

- [ ] **Step 5: Commit**

```bash
git add scripts/research/regime-study-assembly.ts scripts/research/__tests__/regime-study-assembly.test.ts
git commit -m "feat(research): bucket stats, inversion approximation, cost curve, pre-registered reconciliation gate, CLI args"
```

---

### Task 5: The CLI — query, classify, render, JSON artifact

**Files:**
- Create: `scripts/research/regime-expectancy-study.ts`

**Interfaces:**
- Consumes: everything exported from `./regime-study-assembly`; `connect`, `getStoredCandles`, `getCoverage` from `./candle-db`.
- Produces: console report + optional JSON artifact. No exports consumed by later tasks.

- [ ] **Step 1: Write the CLI**

```ts
// scripts/research/regime-expectancy-study.ts
/**
 * Regime expectancy study (spec docs/plans/2026-08-05-regime-expectancy-study.md).
 *
 * Read-only probe: can any regime subset of the losing track record clear its
 * costs? Splits counted 24h trades by regime-at-entry (EMA200 side + ADX/ER
 * strength on D1, lookahead-safe), runs the inversion test, the analytic
 * cost-vs-stop-width curve, and the per-strategy split. Interpretation is
 * BLOCKED unless the whole-stream reconciliation gate matches the public
 * dashboard decomposition (pre-registered tolerances, see assembly module).
 *
 * Mutates no database state. Reads signal_history and candles only.
 *
 * Run (needs Postgres — local checkout has none):
 *   1. Put DATABASE_PUBLIC_URL=postgresql://... in apps/web/.env.local, OR
 *   2. railway login && railway run -- npx tsx scripts/research/regime-expectancy-study.ts
 *
 *   npx tsx scripts/research/regime-expectancy-study.ts [--days N] [--min-n N] [--json path]
 *
 * D1 candle coverage comes from the candles store (migration 049); top up via
 *   railway run --service Postgres npx tsx scripts/research/backfill-candles.ts \
 *     --symbols <pairs> --timeframes D1 --years 2
 */
import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { connect, getStoredCandles, getCoverage } from './candle-db';
import {
  DAY_MS,
  VARIANTS,
  parseCliArgs,
  CliInputError,
  isCountedRow,
  toStudyTrade,
  buildRegimeSeries,
  regimeAt,
  classifyBucket,
  computeBucketStats,
  invertTrade,
  computeCostCurve,
  reconcile,
  type Bar,
  type BucketName,
  type BucketStats,
  type StudyRow,
  type StudyTrade,
  type VariantName,
} from './regime-study-assembly';

for (const p of ['apps/web/.env.local', '.env.local', 'apps/web/.env', '.env']) {
  const abs = path.resolve(process.cwd(), p);
  if (fs.existsSync(abs)) loadEnv({ path: abs });
}

const USAGE = `Usage: npx tsx scripts/research/regime-expectancy-study.ts [--days N] [--min-n N] [--json path]

Read-only regime expectancy study over resolved TradeClaw signal history.

Options:
  --days N     Restrict to the last N days (positive integer).
  --min-n N    Minimum bucket size to be conclusive (default 300, pre-registered).
  --json path  Write the full result JSON to a local artifact path.
  --help, -h   Print this help text without opening a database connection.`;

/** EMA200 + 20 slope + ADX warmup, with slack for missing bars. */
const LOOKBACK_BARS = 320;

function fmt(x: number, d = 4): string {
  return (x >= 0 ? '+' : '') + x.toFixed(d);
}

function renderBucketTable(title: string, rows: Array<{ label: string; stats: BucketStats }>): string {
  const lines = [title, 'bucket            n     win%   avgWinR  avgLossR   grossR    costR     netR  conclusive'];
  for (const { label, stats: s } of rows) {
    lines.push(
      [
        label.padEnd(14),
        String(s.n).padStart(6),
        s.winRatePct.toFixed(1).padStart(7),
        fmt(s.avgWinR, 2).padStart(9),
        fmt(s.avgLossR, 2).padStart(9),
        fmt(s.grossExpectancyR).padStart(9),
        s.avgCostR.toFixed(4).padStart(8),
        fmt(s.netExpectancyR).padStart(9),
        (s.conclusive ? 'yes' : 'NO').padStart(11),
      ].join(' '),
    );
  }
  return lines.join('\n');
}

async function main() {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof CliInputError) {
      console.error(err.message);
      console.error(USAGE);
      process.exit(2);
    }
    throw err;
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const client = await connect();
  let rows: StudyRow[];
  const candlesBySymbol = new Map<string, Bar[]>();
  try {
    const where = [
      'is_simulated = FALSE',
      'outcome_24h IS NOT NULL',
      'COALESCE(gate_blocked, FALSE) = FALSE',
    ];
    const params: number[] = [];
    if (args.days) {
      params.push(args.days);
      where.push(`created_at >= NOW() - $${params.length}::int * INTERVAL '1 day'`);
    }
    const res = await client.query(
      `SELECT pair, timeframe, direction, confidence, entry_price, sl,
              cost_estimate_pct, strategy_id, created_at,
              (outcome_24h->>'pnlPct')::float  AS pnl_pct,
              (outcome_24h->>'hit')::boolean   AS hit,
              (outcome_24h->>'target')         AS target,
              (outcome_24h->>'source')         AS source
         FROM signal_history
        WHERE ${where.join(' AND ')}
        ORDER BY created_at ASC`,
      params,
    );
    rows = res.rows as StudyRow[];

    // Candles: one D1 fetch per distinct pair, window = lookback before the
    // earliest signal through the newest signal.
    const counted = rows.filter(isCountedRow);
    const pairs = [...new Set(counted.map((r) => r.pair))];
    const minTs = Math.min(...counted.map((r) => new Date(r.created_at).getTime()));
    const maxTs = Math.max(...counted.map((r) => new Date(r.created_at).getTime()));
    for (const pair of pairs) {
      const cov = await getCoverage(client, pair, 'D1');
      if (cov.count === 0) continue; // reported as excluded below
      const candles = await getStoredCandles(
        client, pair, 'D1', minTs - LOOKBACK_BARS * DAY_MS, maxTs,
      );
      candlesBySymbol.set(pair, candles);
    }
  } finally {
    await client.end();
  }

  // ── Trades ────────────────────────────────────────────────────────────────
  const trades: StudyTrade[] = [];
  let droppedUncounted = 0;
  let droppedNoSl = 0;
  for (const r of rows) {
    if (!isCountedRow(r)) { droppedUncounted++; continue; }
    const t = toStudyTrade(r);
    if (!t) { droppedNoSl++; continue; }
    trades.push(t);
  }

  // ── Reconciliation gate (must pass before ANY interpretation) ─────────────
  const rec = reconcile(trades);
  console.log('── Reconciliation vs public dashboard ──');
  console.log(`counted n=${rec.n}  gross=${fmt(rec.grossExpectancyR)}  cost=${rec.avgCostR.toFixed(4)}  net=${fmt(rec.netExpectancyR)}`);
  console.log(`dropped: uncounted=${droppedUncounted} noSl/badEntry=${droppedNoSl}`);
  if (!rec.pass) {
    console.error(`RECONCILIATION FAILED — results below are NOT interpretable:\n  ${rec.failures.join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log('PASS — splits below are interpretable.\n');
  }

  // ── Regime classification (lookahead-safe by construction) ────────────────
  const seriesBySymbol = new Map(
    [...candlesBySymbol].map(([sym, bars]) => [sym, buildRegimeSeries(bars)]),
  );
  const excludedPairs = new Map<string, number>(); // pair -> counted signals lost
  let unclassified = 0;
  const byVariant = new Map<VariantName, Map<BucketName, StudyTrade[]>>(
    VARIANTS.map((v) => [v, new Map([['aligned', []], ['counter', []], ['sideways', []]])]),
  );
  let classified = 0;

  for (const t of trades) {
    const series = seriesBySymbol.get(t.pair);
    if (!series) {
      excludedPairs.set(t.pair, (excludedPairs.get(t.pair) ?? 0) + 1);
      continue;
    }
    const regime = regimeAt(series, t.ts);
    if (!regime) { unclassified++; continue; }
    classified++;
    for (const v of VARIANTS) {
      const bucket = classifyBucket(t.direction, regime, v);
      if (bucket) byVariant.get(v)!.get(bucket)!.push(t);
    }
  }

  console.log('── Coverage ──');
  console.log(`classified=${classified}  unclassified(warmup/no-closed-bar)=${unclassified}`);
  if (excludedPairs.size > 0) {
    const total = [...excludedPairs.values()].reduce((a, b) => a + b, 0);
    console.log(`EXCLUDED (no D1 candles): ${total} signals across ${excludedPairs.size} pairs:`);
    for (const [pair, n] of [...excludedPairs].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pair}: ${n}`);
    }
  } else {
    console.log('excluded pairs: none');
  }
  console.log('');

  // ── H1: regime split ──────────────────────────────────────────────────────
  const bucketJson: Record<string, Record<string, BucketStats>> = {};
  for (const v of VARIANTS) {
    const table = (['aligned', 'counter', 'sideways'] as BucketName[]).map((b) => ({
      label: b,
      stats: computeBucketStats(byVariant.get(v)!.get(b)!, args.minN),
    }));
    bucketJson[v] = Object.fromEntries(table.map((r) => [r.label, r.stats]));
    console.log(renderBucketTable(`── H1 regime split — variant ${v} ──`, table));
    console.log('');
  }

  // ── H2: inversion ─────────────────────────────────────────────────────────
  const inverted = computeBucketStats(trades.map(invertTrade), args.minN);
  const original = computeBucketStats(trades, args.minN);
  console.log(renderBucketTable('── H2 inversion test (approximation: flipped realized R, same cost) ──', [
    { label: 'original', stats: original },
    { label: 'inverted', stats: inverted },
  ]));
  console.log('');

  // ── H3: cost curve ────────────────────────────────────────────────────────
  const curve = computeCostCurve(trades);
  console.log('── H3 analytic cost curve (NOT a re-simulation) ──');
  console.log('stop×   avgCostR  (gross needed per trade to break even)');
  for (const p of curve) {
    console.log(`${String(p.multiple).padStart(4)}   ${p.avgCostR.toFixed(4).padStart(8)}   ${fmt(p.avgCostR)}`);
  }
  console.log('');

  // ── H4: per-strategy split ────────────────────────────────────────────────
  const byStrategy = new Map<string, StudyTrade[]>();
  for (const t of trades) {
    const list = byStrategy.get(t.strategyId) ?? [];
    list.push(t);
    byStrategy.set(t.strategyId, list);
  }
  const strategyRows = [...byStrategy]
    .map(([label, list]) => ({ label, stats: computeBucketStats(list, args.minN) }))
    .sort((a, b) => a.stats.netExpectancyR - b.stats.netExpectancyR);
  console.log(renderBucketTable('── H4 per-strategy split (worst first) ──', strategyRows));

  if (args.jsonPath) {
    const artifact = {
      generatedAt: new Date().toISOString(),
      args: { days: args.days, minN: args.minN },
      reconciliation: rec,
      dropped: { uncounted: droppedUncounted, noSl: droppedNoSl },
      coverage: {
        classified,
        unclassified,
        excludedPairs: Object.fromEntries(excludedPairs),
      },
      regimeSplit: bucketJson,
      inversion: { original, inverted },
      costCurve: curve,
      perStrategy: Object.fromEntries(strategyRows.map((r) => [r.label, r.stats])),
    };
    const abs = path.resolve(process.cwd(), args.jsonPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(artifact, null, 2));
    console.log(`\nJSON artifact written: ${abs}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-test the no-DB paths**

Run: `npx tsx scripts/research/regime-expectancy-study.ts --help`
Expected: prints usage, exit 0, no DB connection attempted.

Run: `npx tsx scripts/research/regime-expectancy-study.ts --nope`
Expected: `Unknown option` + usage, exit 2.

Run: `npx jest scripts/research/__tests__/regime-study-assembly.test.ts`
Expected: still PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/research/regime-expectancy-study.ts
git commit -m "feat(research): regime expectancy study CLI - reconciliation-gated H1-H4 report with JSON artifact"
```

---

### Task 6: Data run, results, verdict

**Files:**
- Modify: `docs/plans/2026-08-05-regime-expectancy-study.md` (append RESULTS section)

This task is operational — no new code. Requires `DATABASE_PUBLIC_URL` in `apps/web/.env.local` or a `railway login` session.

- [ ] **Step 1: First study run — record coverage gaps**

Run: `npx tsx scripts/research/regime-expectancy-study.ts` (with env set; or prefix with `railway run --service Postgres`)
Record the Coverage section's excluded-pairs list.

- [ ] **Step 2: Backfill D1 candles for excluded crypto pairs**

Use the pair list from Step 1 (crypto only — Stooq FX/metals backfill is blocked by their proof-of-work challenge; those pairs stay excluded-with-count):

```bash
railway run --service Postgres npx tsx scripts/research/backfill-candles.ts --symbols <comma-separated pairs from step 1> --timeframes D1 --years 2
```

Idempotent — safe to re-run.

- [ ] **Step 3: Full study run with artifact**

```bash
npx tsx scripts/research/regime-expectancy-study.ts --json data/research/regime-study-2026-08-05.json
```

Expected: `Reconciliation ... PASS`. If FAIL: STOP — do not interpret; diagnose the counted filter against `apps/web/lib/signal-history.ts` and re-run. The pre-registered tolerances do not move.

- [ ] **Step 4: Append RESULTS to the spec doc and map the decision rule**

Append to `docs/plans/2026-08-05-regime-expectancy-study.md`: reconciliation block, the three H1 variant tables, H2/H3/H4 tables, exclusion counts, and the verdict — which branch of the pre-registered decision rule fired and what the next build therefore is. State the two approximations explicitly (inversion is realized-R flip; cost curve is analytic).

- [ ] **Step 5: Commit results doc**

```bash
git add docs/plans/2026-08-05-regime-expectancy-study.md
git commit -m "docs(research): regime expectancy study results - verdict via pre-registered decision rule"
```

---

## Self-review notes

- Spec coverage: H1 → Task 3+5, H2 → Task 4+5 (invertTrade), H3 → Task 4+5 (computeCostCurve), H4 → Task 5 (per-strategy), reconciliation gate → Task 4+5, lookahead check → Task 3 (`lastClosedBarIndex` is the only bar-selection path; boundary-tested), exclusions-with-count → Task 5 Coverage section, deliverables → Tasks 5–6.
- Deviation from spec, resolved: the spec named the public CSV export as the signal source; the CSV lacks `cost_estimate_pct`, which the exact cost model requires. The plan reads `signal_history` directly (same read-only posture, established `recost-segment.ts` pattern). The spec's reconciliation gate is unchanged and is the check that this substitution is faithful.
- Type consistency: `StudyRow`/`StudyTrade`/`Bar`/`BucketStats`/`VariantName`/`BucketName`/`RegimeSnapshot` defined once in Tasks 1–4 and imported by Task 5 with matching names.
