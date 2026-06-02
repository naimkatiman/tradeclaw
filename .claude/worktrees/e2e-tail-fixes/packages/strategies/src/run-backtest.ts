import type { Strategy, StrategyId, EntrySignal, AllocationConfig, RiskConfig } from './types';
import type { OHLCV } from '@tradeclaw/core';

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
const TP_PCT = 0.02;
const SL_PCT = 0.01;

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

export function runBacktest(candles: OHLCV[], strategy: Strategy): BacktestResult {
  if (candles.length === 0) return zeroResult(strategy.id, 'no-data');

  const signals = strategy.entry.generateSignals(candles, { symbol: 'BACKTEST', timeframe: 'H1' });

  if (signals.length === 0) {
    const flat = new Array(candles.length).fill(START_BALANCE);
    return { ...zeroResult(strategy.id, 'no-signals'), equityCurve: flat };
  }

  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = new Array(candles.length).fill(START_BALANCE);
  let balance = START_BALANCE;
  let tradeId = 0;
  let openUntil = -1;

  for (const sig of signals) {
    if (sig.barIndex <= openUntil) continue;
    const currentDd = computeMaxDrawdown(equityCurve.slice(0, sig.barIndex + 1));
    if (!riskAllows(strategy.risk, trades, currentDd)) continue;

    const positionSize = sizePosition(balance, sig, strategy.allocation, trades);
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

    const pnlPct = sig.direction === 'BUY' ? (exit - entry) / entry : (entry - exit) / entry;
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

    for (let k = exitBar; k < equityCurve.length; k++) equityCurve[k] = balance;
    openUntil = exitBar;
  }

  return {
    strategyId: strategy.id,
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
