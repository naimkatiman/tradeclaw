import type { Strategy, StrategyId, EntrySignal, AllocationConfig, RiskConfig } from './types';
import type { OHLCV } from '@tradeclaw/core';
import { FIXED_LEGACY_GEOMETRY, ZERO_COSTS, type BacktestOptions, type Geometry } from './backtest-options';

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
  /**
   * 'FLIP' only occurs under `exitMode: 'signal-flip'` (an opposite-direction
   * entry signal closed the position). The default geometry path never emits
   * it, so widening this union does not change any default-path output.
   */
  exitReason: 'TP' | 'SL' | 'EOD' | 'FLIP';
  /** Total friction charged on this trade, % of notional (fees + slippage + funding). Only present when a cost model was supplied. */
  costPct?: number;
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

/**
 * ATR as a simple average of the last `period` true ranges (prev-close
 * aware). Deliberately NOT Wilder's recursive smoothing — the shipped
 * engine's calculateATR uses exactly this SMA-of-TR method, and live
 * parity is the point of LIVE_GEOMETRY. Returns null during warmup or on
 * an out-of-range barIndex.
 */
function smaTrueRangeAtr(candles: OHLCV[], barIndex: number, period: number): number | null {
  if (barIndex < period || barIndex >= candles.length) return null;
  let sum = 0;
  for (let i = barIndex - period + 1; i <= barIndex; i++) {
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose),
    );
    sum += tr;
  }
  return sum / period;
}

/** TP/SL price levels for a signal under the configured geometry. Null = signal not tradable (ATR warmup). */
function stopLevels(
  geometry: Geometry,
  candles: OHLCV[],
  sig: EntrySignal,
): { tp: number; sl: number } | null {
  const entry = sig.price;
  if (geometry.mode === 'fixed') {
    return sig.direction === 'BUY'
      ? { tp: entry * (1 + geometry.tpPct), sl: entry * (1 - geometry.slPct) }
      : { tp: entry * (1 - geometry.tpPct), sl: entry * (1 + geometry.slPct) };
  }
  const atr = smaTrueRangeAtr(candles, sig.barIndex, geometry.period);
  if (atr === null || atr <= 0) return null;
  const risk = atr * geometry.slMult;
  return sig.direction === 'BUY'
    ? { tp: entry + risk * geometry.tpRMultiple, sl: entry - risk }
    : { tp: entry - risk * geometry.tpRMultiple, sl: entry + risk };
}

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
      return balance * (0.05 + 0.1 * signal.confidence);
    case 'risk-weighted': {
      const recentLosses = recent.slice(-5).filter((t) => !t.win).length;
      const scaler = 1 - recentLosses * 0.15;
      return balance * 0.1 * Math.max(0.2, scaler);
    }
  }
}

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
  if (curve.length === 0) return 0;
  let peak = curve[0];
  let maxDd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

function computeSharpe(trades: BacktestTrade[]): number {
  if (trades.length < 2) return 0;
  const returns = trades.map((t) => t.pnlPct);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  return std > 0 ? (mean / std) * Math.sqrt(trades.length) : 0;
}

export function runBacktest(candles: OHLCV[], strategy: Strategy, options?: BacktestOptions): BacktestResult {
  const costs = options?.costs ?? ZERO_COSTS;
  const geometry = options?.geometry ?? FIXED_LEGACY_GEOMETRY;
  const barHours = options?.barHours ?? 1;
  const hasCosts = options?.costs !== undefined;
  const exitMode = options?.exitMode ?? 'geometry';
  const minConfidence = options?.minConfidence;

  if (candles.length === 0) return zeroResult(strategy.id, 'no-data');

  const context = options?.context ?? { symbol: 'BACKTEST', timeframe: 'H1' };
  const generated = strategy.entry.generateSignals(candles, context);
  // Entry modules may return signals in non-chronological order (e.g. hmm-top3
  // sorts by confidence desc). The overlap guard, drawdown slice, and
  // equity-curve fill all assume chronological barIndex order, so process a
  // copy sorted by barIndex ascending without mutating the caller's array.
  // Selectivity filter (opt-in): drop weak setups before the trade loop. When
  // minConfidence is undefined the filter is a no-op, so the default path is
  // byte-identical.
  const sorted = [...generated].sort((a, b) => a.barIndex - b.barIndex);
  const signals = minConfidence !== undefined
    ? sorted.filter((s) => s.confidence >= minConfidence)
    : sorted;

  if (signals.length === 0) {
    const flat = new Array(candles.length).fill(START_BALANCE);
    return { ...zeroResult(strategy.id, 'no-signals'), equityCurve: flat };
  }

  // Signal-flip exit (opt-in): a position exits when an OPPOSITE-direction
  // entry signal fires at a later bar. Precompute a barIndex → direction lookup
  // from the (filtered, sorted) signal list ONCE so the forward-exit scan is
  // O(1) per bar instead of O(n) — the whole scan stays O(total bars), never
  // O(signals × bars). Empty Map on the geometry path; the inner scan never
  // reads it there. If two signals share a barIndex (degenerate), last wins.
  // Built from the POST-minConfidence-filter `signals` list ON PURPOSE: a
  // signal dropped by selectivity is not a tradable setup, so it must not be
  // able to close (flip) an open position either — only signals that could
  // themselves open a trade are allowed to act as flip triggers.
  const signalDirByBar = new Map<number, EntrySignal['direction']>();
  if (exitMode === 'signal-flip') {
    for (const s of signals) signalDirByBar.set(s.barIndex, s.direction);
  }

  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = new Array(candles.length).fill(START_BALANCE);
  let balance = START_BALANCE;
  let tradeId = 0;
  let openUntil = -1;

  for (const sig of signals) {
    // `<=` (not `<`) is intentional and load-bearing for signal-flip mode: a
    // flip exits at bar j and sets openUntil = j, so the opposite signal SITTING
    // ON bar j (the flip trigger) is gated out and the reversed position opens on
    // the NEXT signal bar, not the flip bar itself. Do not "tighten" this to `<`
    // — it would also change the default-path overlap semantics (byte-identical
    // contract) and let a trade re-enter on its own exit bar.
    if (sig.barIndex <= openUntil) continue;
    const currentDd = computeMaxDrawdown(equityCurve.slice(0, sig.barIndex + 1));
    if (!riskAllows(strategy.risk, trades, currentDd)) continue;

    const positionSize = sizePosition(balance, sig, strategy.allocation, trades);
    const entry = sig.price;
    const levels = stopLevels(geometry, candles, sig);
    // Null = not tradable under this geometry: ATR warmup, zero ATR on a
    // flat series, or an out-of-range barIndex from a malformed signal.
    if (!levels) continue;
    const { tp, sl } = levels;

    let exit = entry;
    let exitBar = sig.barIndex;
    let exitReason: BacktestTrade['exitReason'] = 'EOD';

    if (exitMode === 'signal-flip') {
      // Ride the trend: hold until an opposite-direction signal flips us out,
      // unless the SL is hit first. Precedence per bar: SL → flip → EOD. The
      // TP is deliberately NOT checked — the point is to capture the whole move
      // past any fixed target. SL stays active as a risk floor.
      for (let j = sig.barIndex + 1; j < candles.length; j++) {
        const bar = candles[j];
        if (sig.direction === 'BUY') {
          if (bar.low <= sl) { exit = sl; exitBar = j; exitReason = 'SL'; break; }
        } else {
          if (bar.high >= sl) { exit = sl; exitBar = j; exitReason = 'SL'; break; }
        }
        const dirAtJ = signalDirByBar.get(j);
        if (dirAtJ !== undefined && dirAtJ !== sig.direction) {
          exit = bar.close; exitBar = j; exitReason = 'FLIP'; break;
        }
        exit = bar.close;
        exitBar = j;
      }
    } else {
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
    }

    // Friction: slippage worsens both fills, fees charge both sides, funding
    // accrues with holding time. Modeled as a flat % drag on the trade's
    // return — order triggers stay at the raw levels (the exchange fills the
    // order; the friction is what YOU realize). A zero-duration trade (signal
    // on the final bar — the exit loop never ran) never opened a position,
    // so it is charged nothing rather than a phantom round trip.
    const heldHours = Math.max(0, (exitBar - sig.barIndex) * barHours);
    const costPct = hasCosts && exitBar > sig.barIndex
      ? 2 * costs.feePctPerSide + 2 * costs.slippagePctPerSide + costs.fundingPctPer8h * (heldHours / 8)
      : 0;

    const grossPnlPct = sig.direction === 'BUY' ? (exit - entry) / entry : (entry - exit) / entry;
    const pnlPct = grossPnlPct - costPct / 100;
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
      // Unrounded so trade.pnlPct + costPct/100 reconciles exactly to gross.
      ...(hasCosts ? { costPct } : {}),
    });

    for (let k = exitBar; k < equityCurve.length; k++) equityCurve[k] = balance;
    openUntil = exitBar;
  }

  return {
    strategyId: strategy.id,
    // Signals existed but none were tradable (e.g. all inside the ATR
    // warmup): surface the same 'no-signals' reason instead of an
    // unexplained empty result. Unreachable on the legacy fixed-geometry
    // path, where levels are never null and the first signal always trades.
    ...(trades.length === 0 ? { reason: 'no-signals' as const } : {}),
    totalTrades: trades.length,
    winRate: trades.length > 0 ? trades.filter((t) => t.win).length / trades.length : 0,
    profitFactor: computeProfitFactor(trades),
    maxDrawdown: computeMaxDrawdown(equityCurve),
    sharpeRatio: computeSharpe(trades),
    totalReturn: (balance - START_BALANCE) / START_BALANCE,
    startBalance: START_BALANCE,
    endBalance: balance,
    equityCurve,
    trades,
  };
}
