/**
 * Symbol universe screen for TradeClaw Pilot.
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
 *
 * Three quantitative gates:
 *   1. Liquidity     — 24h notional volume ≥ $100M
 *   2. Trendiness    — 20-day Efficiency Ratio ≥ 0.30
 *   3. Correlation   — drop members whose 30-day return correlation with a
 *                      higher-volume kept member exceeds 0.85
 *
 * This file holds the pure logic. The runner (Binance fetch + DB persist)
 * lives in universe-runner.ts so the math is unit-testable without network.
 */

export interface SymbolStat {
  symbol: string;
  volUsd: number;       // 24h quote volume in USD
  closes: number[];     // daily closes, oldest → newest (≥ 21 entries needed)
  returns: number[];    // log returns, length = closes.length - 1
}

export interface ScreenConfig {
  liquidityFloorUsd: number;
  erFloor: number;
  corrCeiling: number;
}

export interface IncludedSymbol {
  symbol: string;
  volUsd: number;
  er: number;
}

export interface ExcludedSymbol {
  symbol: string;
  reason: 'liquidity' | 'trendiness' | 'correlation';
  volUsd: number;
  er: number;
}

export interface ScreenResult {
  included: IncludedSymbol[];
  excluded: ExcludedSymbol[];
}

export const DEFAULT_SCREEN_CONFIG: ScreenConfig = {
  liquidityFloorUsd: 100_000_000,
  erFloor: 0.30,
  corrCeiling: 0.85,
};

export const DEFAULT_ER_WINDOW = 20;
export const DEFAULT_CORR_WINDOW = 30;

/**
 * Kaufman Efficiency Ratio over the trailing `window` closes.
 *
 *   ER = |close[t] - close[t-window]| / Σ |close[i] - close[i-1]|
 *
 * Range [0, 1]. 1 = perfect trend, 0 = perfect noise.
 * Returns 0 if window is short or path length is zero.
 */
export function efficiencyRatio(closes: number[], window = DEFAULT_ER_WINDOW): number {
  if (closes.length < window + 1) return 0;
  const slice = closes.slice(-window - 1);
  const net = Math.abs(slice[slice.length - 1] - slice[0]);
  let path = 0;
  for (let i = 1; i < slice.length; i++) {
    path += Math.abs(slice[i] - slice[i - 1]);
  }
  return path === 0 ? 0 : net / path;
}

/**
 * Log returns from a closes array. Output length = closes.length - 1.
 */
export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      out.push(Math.log(closes[i] / closes[i - 1]));
    } else {
      out.push(0);
    }
  }
  return out;
}

/**
 * Pearson correlation over the trailing `window` returns. Returns 0 if
 * either series is constant or shorter than `window`.
 */
export function pearsonCorrelation(a: number[], b: number[], window = DEFAULT_CORR_WINDOW): number {
  const n = Math.min(a.length, b.length, window);
  if (n < 2) return 0;
  const aw = a.slice(-n);
  const bw = b.slice(-n);
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sa += aw[i];
    sb += bw[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = aw[i] - ma;
    const xb = bw[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

/**
 * Greedy correlation dedup. Sort candidates by volume desc, walk down the
 * list, drop any candidate whose correlation against an already-kept
 * higher-volume candidate exceeds `corrCeiling`.
 */
export function dedupByCorrelation(stats: SymbolStat[], corrCeiling: number): SymbolStat[] {
  const sorted = [...stats].sort((a, b) => b.volUsd - a.volUsd);
  const kept: SymbolStat[] = [];
  for (const s of sorted) {
    const isDup = kept.some((k) => pearsonCorrelation(s.returns, k.returns) > corrCeiling);
    if (!isDup) kept.push(s);
  }
  return kept;
}

/**
 * Apply all three gates. Pure function — no I/O.
 */
export function screen(stats: SymbolStat[], cfg: ScreenConfig = DEFAULT_SCREEN_CONFIG): ScreenResult {
  const result: ScreenResult = { included: [], excluded: [] };

  const erBySymbol = new Map<string, number>();
  for (const s of stats) erBySymbol.set(s.symbol, efficiencyRatio(s.closes));

  // Gate 1: liquidity
  const passLiq: SymbolStat[] = [];
  for (const s of stats) {
    const er = erBySymbol.get(s.symbol) ?? 0;
    if (s.volUsd < cfg.liquidityFloorUsd) {
      result.excluded.push({ symbol: s.symbol, reason: 'liquidity', volUsd: s.volUsd, er });
    } else {
      passLiq.push(s);
    }
  }

  // Gate 2: trendiness
  const passEr: SymbolStat[] = [];
  for (const s of passLiq) {
    const er = erBySymbol.get(s.symbol) ?? 0;
    if (er < cfg.erFloor) {
      result.excluded.push({ symbol: s.symbol, reason: 'trendiness', volUsd: s.volUsd, er });
    } else {
      passEr.push(s);
    }
  }

  // Gate 3: correlation dedup
  const kept = dedupByCorrelation(passEr, cfg.corrCeiling);
  const keptSet = new Set(kept.map((k) => k.symbol));
  for (const s of passEr) {
    const er = erBySymbol.get(s.symbol) ?? 0;
    if (keptSet.has(s.symbol)) {
      result.included.push({ symbol: s.symbol, volUsd: s.volUsd, er });
    } else {
      result.excluded.push({ symbol: s.symbol, reason: 'correlation', volUsd: s.volUsd, er });
    }
  }

  return result;
}

/**
 * Plan rule: if the screen returns fewer than `minFloor` symbols, fall back
 * to a hand-curated list (env: EXEC_SYMBOLS_FALLBACK).
 */
export function applyMinFloor(result: ScreenResult, minFloor: number, fallback: string[]): IncludedSymbol[] {
  if (result.included.length >= minFloor) return result.included;
  return fallback.map((symbol) => ({ symbol, volUsd: 0, er: 0 }));
}
