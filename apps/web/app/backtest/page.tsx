'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateRSI, calculateMACD, calculateEMAs } from '../lib/ta-engine';

// ─── Types ───────────────────────────────────────────────────

interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SignalPoint {
  barIndex: number;
  direction: 'BUY' | 'SELL';
  price: number;
}

interface Trade {
  id: number;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pnl: number;
  pnlPct: number;
  bars: number;
  win: boolean;
  entryBar: number;
  monthKey: string;
  exitReason: 'TP' | 'SL' | 'EOD';
}

interface MonthReturn {
  year: number;
  month: number;
  returnPct: number;
}

interface BacktestResult {
  trades: Trade[];
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalReturn: number;
  equityCurve: number[];
  startBalance: number;
  endBalance: number;
  priceData: OHLCVCandle[];
  rsiValues: number[];
  macdLine: number[];
  macdSignalLine: number[];
  macdHistogram: number[];
  ema20: number[];
  ema50: number[];
  signals: SignalPoint[];
  monthlyReturns: MonthReturn[];
  dataSource: string;
}

interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategy: string;
  initialBalance: number;
  riskPercent: number;
}

// ─── Constants ───────────────────────────────────────────────

const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];
const STRATEGIES = ['EMA Crossover + RSI', 'MACD Divergence', 'Bollinger Breakout', 'ATR Trend Follow'];

function fmt(v: number): string {
  return v < 10 ? v.toFixed(5) : v < 100 ? v.toFixed(3) : v.toFixed(2);
}

// ─── Fetch Real OHLCV from API ──────────────────────────────

async function fetchOHLCV(symbol: string, timeframe: string): Promise<{ candles: OHLCVCandle[]; source: string }> {
  const res = await fetch(`/api/backtest?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(body.error || `Failed to fetch data (${res.status})`);
  }
  const data = await res.json();
  return { candles: data.candles, source: data.source };
}

// ─── Price-Based Trade Outcome ──────────────────────────────

/**
 * Determines trade outcome using real candle high/low prices.
 * Walks forward bar-by-bar from the signal bar, checking whether
 * TP or SL is hit first based on actual price wicks.
 */
function resolveTradeOutcome(
  priceData: OHLCVCandle[],
  signalBar: number,
  direction: 'BUY' | 'SELL',
  entry: number,
  atr: number,
  maxBars: number = 20,
): { win: boolean; exit: number; bars: number; exitReason: 'TP' | 'SL' | 'EOD' } {
  const tpDistance = atr * 2.0; // 2:1 reward-to-risk
  const slDistance = atr;

  const tp = direction === 'BUY' ? entry + tpDistance : entry - tpDistance;
  const sl = direction === 'BUY' ? entry - slDistance : entry + slDistance;

  for (let offset = 1; offset <= maxBars; offset++) {
    const barIdx = signalBar + offset;
    if (barIdx >= priceData.length) break;

    const candle = priceData[barIdx];

    if (direction === 'BUY') {
      // Check SL first (worst case) — did the low wick hit SL?
      if (candle.low <= sl) {
        return { win: false, exit: sl, bars: offset, exitReason: 'SL' };
      }
      // Did the high wick hit TP?
      if (candle.high >= tp) {
        return { win: true, exit: tp, bars: offset, exitReason: 'TP' };
      }
    } else {
      // SELL: check SL first — did the high wick hit SL?
      if (candle.high >= sl) {
        return { win: false, exit: sl, bars: offset, exitReason: 'SL' };
      }
      // Did the low wick hit TP?
      if (candle.low <= tp) {
        return { win: true, exit: tp, bars: offset, exitReason: 'TP' };
      }
    }
  }

  // Neither TP nor SL hit within maxBars — close at last bar's close
  const exitBar = Math.min(signalBar + maxBars, priceData.length - 1);
  const exitPrice = priceData[exitBar].close;
  const pnlRaw = direction === 'BUY' ? exitPrice - entry : entry - exitPrice;
  return {
    win: pnlRaw > 0,
    exit: exitPrice,
    bars: exitBar - signalBar,
    exitReason: 'EOD',
  };
}

/**
 * Calculate ATR (Average True Range) for a given bar index.
 */
function calcATR(priceData: OHLCVCandle[], barIndex: number, period: number = 14): number {
  const start = Math.max(1, barIndex - period + 1);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= barIndex; i++) {
    const high = priceData[i].high;
    const low = priceData[i].low;
    const prevClose = priceData[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sum += tr;
    count++;
  }
  return count > 0 ? sum / count : priceData[barIndex].close * 0.005;
}

// ─── Backtest Engine ─────────────────────────────────────────

async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  // Fetch real OHLCV data
  const { candles: rawCandles, source } = await fetchOHLCV(params.symbol, params.timeframe);

  const priceData: OHLCVCandle[] = rawCandles.map(c => ({
    timestamp: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));

  const closes = priceData.map(c => c.close);

  // Real TA indicators
  const rsiResult = calculateRSI(closes, 14);
  const macdResult = calculateMACD(closes, 12, 26, 9);
  const emaResult = calculateEMAs(closes);

  const { values: rsiValues } = rsiResult;
  const { macdLine, signalLine, histogram } = macdResult;
  const { ema20, ema50 } = emaResult;

  // Signal detection with indicator confluence
  const signals: SignalPoint[] = [];
  let lastSignalBar = -8;
  const MIN_BAR = 55;

  for (let i = MIN_BAR; i < priceData.length - 5; i++) {
    if (i - lastSignalBar < 6) continue;

    const rsi = rsiValues[i];
    const macdH = histogram[i];
    const prevMacdH = histogram[i - 1];
    const e20 = ema20[i];
    const e50 = ema50[i];

    if (isNaN(rsi) || isNaN(macdH) || isNaN(prevMacdH) || isNaN(e20) || isNaN(e50)) continue;

    const buySignal = rsi < 38 && e20 > e50 && macdH > prevMacdH;
    const sellSignal = rsi > 62 && e20 < e50 && macdH < prevMacdH;

    if (buySignal) {
      signals.push({ barIndex: i, direction: 'BUY', price: priceData[i].close });
      lastSignalBar = i;
    } else if (sellSignal) {
      signals.push({ barIndex: i, direction: 'SELL', price: priceData[i].close });
      lastSignalBar = i;
    }
  }

  // Build trades from signals using real price-based outcomes
  let balance = params.initialBalance;
  const equityCurve: number[] = [balance];
  const trades: Trade[] = [];
  const monthlyPnlMap = new Map<string, number>();

  signals.forEach((signal, idx) => {
    const entry = signal.price;
    const atr = calcATR(priceData, signal.barIndex);
    const outcome = resolveTradeOutcome(priceData, signal.barIndex, signal.direction, entry, atr);

    const riskAmount = balance * (params.riskPercent / 100);
    // PnL based on actual price movement scaled by risk
    const pricePnl = signal.direction === 'BUY'
      ? outcome.exit - entry
      : entry - outcome.exit;
    const pnl = atr > 0 ? (pricePnl / atr) * riskAmount : 0;
    const pnlPct = (pnl / balance) * 100;
    balance += pnl;
    if (balance < 0) balance = 0;

    const date = new Date(priceData[signal.barIndex].timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyPnlMap.set(monthKey, (monthlyPnlMap.get(monthKey) ?? 0) + pnl);

    trades.push({
      id: idx + 1,
      symbol: params.symbol,
      direction: signal.direction,
      entry: +fmt(entry),
      exit: +fmt(outcome.exit),
      pnl: +pnl.toFixed(2),
      pnlPct: +pnlPct.toFixed(2),
      bars: outcome.bars,
      win: outcome.win,
      entryBar: signal.barIndex,
      monthKey,
      exitReason: outcome.exitReason,
    });

    equityCurve.push(+balance.toFixed(2));
  });

  // Build monthly returns from actual trade timestamps
  const monthlyReturns: MonthReturn[] = [];
  const allMonthKeys = [...monthlyPnlMap.keys()].sort();
  for (const key of allMonthKeys) {
    const [yearStr, moStr] = key.split('-');
    const pnl = monthlyPnlMap.get(key) ?? 0;
    monthlyReturns.push({
      year: parseInt(yearStr),
      month: parseInt(moStr),
      returnPct: +((pnl / params.initialBalance) * 100).toFixed(2),
    });
  }

  // Metrics
  const wins = trades.filter(t => t.win);
  const losses = trades.filter(t => !t.win);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  let peak = params.initialBalance;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = (peak - eq) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
  const n = returns.length || 1;
  const avgR = returns.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(returns.reduce((a, b) => a + (b - avgR) ** 2, 0) / n);
  const sharpe = stdDev > 0 ? (avgR / stdDev) * Math.sqrt(252) : 0;

  return {
    trades,
    totalTrades: trades.length,
    winRate: trades.length > 0 ? +(wins.length / trades.length * 100).toFixed(1) : 0,
    profitFactor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : 0,
    maxDrawdown: +(maxDD * 100).toFixed(1),
    sharpeRatio: +sharpe.toFixed(2),
    totalReturn: +((balance - params.initialBalance) / params.initialBalance * 100).toFixed(2),
    equityCurve,
    startBalance: params.initialBalance,
    endBalance: +balance.toFixed(2),
    priceData,
    rsiValues,
    macdLine,
    macdSignalLine: signalLine,
    macdHistogram: histogram,
    ema20,
    ema50,
    signals,
    monthlyReturns,
    dataSource: source,
  };
}

// ─── CSV Export ──────────────────────────────────────────────

function exportCSV(trades: Trade[], symbol: string) {
  const headers = ['#', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'P&L ($)', 'P&L (%)', 'Bars', 'Result', 'Exit Reason'];
  const rows = trades.map(t => [
    t.id, t.symbol, t.direction, t.entry, t.exit,
    t.pnl.toFixed(2), t.pnlPct.toFixed(2), t.bars, t.win ? 'Win' : 'Loss', t.exitReason,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${symbol}_backtest.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Canvas Hook ─────────────────────────────────────────────

function useCanvas(draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, deps: unknown[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);
      draw(ctx, rect.width, rect.height);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}

// ─── Equity Curve Canvas ─────────────────────────────────────

function EquityCurveCanvas({ curve, startBalance }: { curve: number[]; startBalance: number }) {
  const canvasRef = useCanvas((ctx, W, H) => {
    if (curve.length < 2) return;
    const pad = { top: 16, right: 16, bottom: 28, left: 52 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    const min = Math.min(...curve) * 0.995;
    const max = Math.max(...curve) * 1.005;
    const range = max - min || 1;
    const toX = (i: number) => pad.left + (i / (curve.length - 1)) * cW;
    const toY = (v: number) => pad.top + cH - ((v - min) / range) * cH;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    const zeroY = toY(startBalance);
    if (zeroY >= pad.top && zeroY <= pad.top + cH) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke();
      ctx.setLineDash([]);
    }

    const isProfit = curve[curve.length - 1] >= startBalance;
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)');
    grad.addColorStop(1, isProfit ? 'rgba(16,185,129,0.0)' : 'rgba(239,68,68,0.0)');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(curve[0]));
    for (let i = 1; i < curve.length; i++) ctx.lineTo(toX(i), toY(curve[i]));
    ctx.lineTo(toX(curve.length - 1), pad.top + cH);
    ctx.lineTo(toX(0), pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(curve[0]));
    for (let i = 1; i < curve.length; i++) ctx.lineTo(toX(i), toY(curve[i]));
    ctx.strokeStyle = isProfit ? '#10B981' : '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 4; g++) {
      const v = min + (range * (4 - g)) / 4;
      const y = pad.top + (g / 4) * cH;
      ctx.fillText(v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`, pad.left - 4, y + 4);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const i = Math.floor(p * (curve.length - 1));
      ctx.fillText(`T${i}`, toX(i), pad.top + cH + 18);
    });
  }, [curve, startBalance]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Price Chart Canvas ──────────────────────────────────────

function PriceChartCanvas({
  priceData, ema20, ema50, signals,
}: {
  priceData: OHLCVCandle[];
  ema20: number[];
  ema50: number[];
  signals: SignalPoint[];
}) {
  const canvasRef = useCanvas((ctx, W, H) => {
    if (priceData.length < 2) return;
    const pad = { top: 16, right: 16, bottom: 28, left: 60 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    const closes = priceData.map(c => c.close);
    const validEma20 = ema20.filter(v => !isNaN(v));
    const validEma50 = ema50.filter(v => !isNaN(v));
    const allPrices = [
      ...closes,
      ...validEma20,
      ...validEma50,
    ];

    const min = Math.min(...allPrices) * 0.997;
    const max = Math.max(...allPrices) * 1.003;
    const range = max - min || 1;
    const n = priceData.length;

    const toX = (i: number) => pad.left + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.top + cH - ((v - min) / range) * cH;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    // EMA50
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(ema50[i])) continue;
      if (!started) { ctx.moveTo(toX(i), toY(ema50[i])); started = true; }
      else ctx.lineTo(toX(i), toY(ema50[i]));
    }
    ctx.strokeStyle = 'rgba(251,191,36,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // EMA20
    ctx.beginPath();
    started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(ema20[i])) continue;
      if (!started) { ctx.moveTo(toX(i), toY(ema20[i])); started = true; }
      else ctx.lineTo(toX(i), toY(ema20[i]));
    }
    ctx.strokeStyle = 'rgba(99,102,241,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Price line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(toX(i), toY(closes[i]));
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Signal markers — triangles
    signals.forEach(sig => {
      const x = toX(sig.barIndex);
      const y = toY(sig.price);
      const size = 7;
      ctx.beginPath();
      if (sig.direction === 'BUY') {
        // Up triangle below price
        ctx.moveTo(x, y + size * 2.2);
        ctx.lineTo(x - size, y + size * 2.2 + size * 1.6);
        ctx.lineTo(x + size, y + size * 2.2 + size * 1.6);
        ctx.fillStyle = '#10B981';
      } else {
        // Down triangle above price
        ctx.moveTo(x, y - size * 2.2);
        ctx.lineTo(x - size, y - size * 2.2 - size * 1.6);
        ctx.lineTo(x + size, y - size * 2.2 - size * 1.6);
        ctx.fillStyle = '#EF4444';
      }
      ctx.closePath();
      ctx.fill();
    });

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 4; g++) {
      const v = min + (range * (4 - g)) / 4;
      const y = pad.top + (g / 4) * cH;
      ctx.fillText(fmt(v), pad.left - 4, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const i = Math.floor(p * (n - 1));
      const d = new Date(priceData[i].timestamp);
      const label = `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
      ctx.fillText(label, toX(i), pad.top + cH + 18);
    });

    // Legend
    const legendItems = [
      { color: 'rgba(255,255,255,0.6)', label: 'Price' },
      { color: 'rgba(99,102,241,0.6)', label: 'EMA20' },
      { color: 'rgba(251,191,36,0.5)', label: 'EMA50' },
    ];
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    let lx = pad.left + 4;
    legendItems.forEach(({ color, label }) => {
      ctx.fillStyle = color;
      ctx.fillRect(lx, pad.top + 4, 16, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(label, lx + 20, pad.top + 10);
      lx += 65;
    });
  }, [priceData, ema20, ema50, signals]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Indicators Canvas ───────────────────────────────────────

function IndicatorsCanvas({
  rsiValues, macdLine, macdSignalLine, macdHistogram,
}: {
  rsiValues: number[];
  macdLine: number[];
  macdSignalLine: number[];
  macdHistogram: number[];
}) {
  const canvasRef = useCanvas((ctx, W, H) => {
    const n = rsiValues.length;
    if (n < 2) return;

    const PAD_L = 44;
    const PAD_R = 16;
    const PAD_TOP = 8;
    const DIVIDER = 6;
    const rsiH = Math.floor((H - PAD_TOP) * 0.42);
    const macdH = H - PAD_TOP - rsiH - DIVIDER;
    const cW = W - PAD_L - PAD_R;

    const toX = (i: number) => PAD_L + (i / (n - 1)) * cW;

    // ── RSI panel ──────────────────────────────
    const rsiTop = PAD_TOP;

    // Shaded zones
    const toRsiY = (v: number) => rsiTop + rsiH - (v / 100) * rsiH;
    ctx.fillStyle = 'rgba(239,68,68,0.06)';
    ctx.fillRect(PAD_L, toRsiY(100), cW, toRsiY(70) - toRsiY(100));
    ctx.fillStyle = 'rgba(16,185,129,0.06)';
    ctx.fillRect(PAD_L, toRsiY(30), cW, toRsiY(0) - toRsiY(30));

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(v => {
      const y = toRsiY(v);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    });

    // 30 / 70 lines
    [30, 70].forEach(v => {
      const y = toRsiY(v);
      ctx.strokeStyle = v === 30 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
      ctx.setLineDash([]);
    });

    // 50 center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(PAD_L, toRsiY(50)); ctx.lineTo(W - PAD_R, toRsiY(50)); ctx.stroke();

    // RSI line
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(rsiValues[i])) continue;
      const x = toX(i);
      const y = toRsiY(rsiValues[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // RSI labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    [30, 50, 70].forEach(v => {
      ctx.fillText(String(v), PAD_L - 3, toRsiY(v) + 3);
    });
    ctx.fillStyle = 'rgba(167,139,250,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('RSI', PAD_L + 4, rsiTop + 12);

    // ── MACD panel ─────────────────────────────
    const macdTop = rsiTop + rsiH + DIVIDER;

    const validMacd = macdHistogram.filter(v => !isNaN(v));
    const validLines = [...macdLine.filter(v => !isNaN(v)), ...macdSignalLine.filter(v => !isNaN(v))];
    if (validMacd.length === 0) return;

    const macdMin = Math.min(...validMacd, ...validLines) * 1.1;
    const macdMax = Math.max(...validMacd, ...validLines) * 1.1;
    const macdRange = macdMax - macdMin || 1;
    const toMacdY = (v: number) => macdTop + macdH - ((v - macdMin) / macdRange) * macdH;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const y = macdTop + (g / 3) * macdH;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    }

    // Zero line
    const zeroY = toMacdY(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(PAD_L, zeroY); ctx.lineTo(W - PAD_R, zeroY); ctx.stroke();

    // Histogram bars
    const barW = Math.max(1, cW / n - 1);
    for (let i = 0; i < n; i++) {
      const h = macdHistogram[i];
      if (isNaN(h)) continue;
      const x = toX(i) - barW / 2;
      const y0 = zeroY;
      const y1 = toMacdY(h);
      ctx.fillStyle = h >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)';
      ctx.fillRect(x, Math.min(y0, y1), barW, Math.abs(y1 - y0));
    }

    // MACD line
    ctx.beginPath();
    started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(macdLine[i])) continue;
      const x = toX(i); const y = toMacdY(macdLine[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Signal line
    ctx.beginPath();
    started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(macdSignalLine[i])) continue;
      const x = toX(i); const y = toMacdY(macdSignalLine[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(251,191,36,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MACD', PAD_L + 4, macdTop + 12);
  }, [rsiValues, macdLine, macdSignalLine, macdHistogram]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Monthly Heatmap ─────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthlyHeatmap({ monthlyReturns }: { monthlyReturns: MonthReturn[] }) {
  if (monthlyReturns.length === 0) return null;

  const years = [...new Set(monthlyReturns.map(r => r.year))].sort();
  const maxAbs = Math.max(...monthlyReturns.map(r => Math.abs(r.returnPct)), 0.01);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Monthly Returns</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 500 }}>
          <thead>
            <tr>
              <th className="text-[9px] text-zinc-700 text-right pr-2 pb-1 font-normal w-10">Year</th>
              {MONTH_ABBR.map(m => (
                <th key={m} className="text-[9px] text-zinc-700 text-center pb-1 font-normal" style={{ width: '7%' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map(year => (
              <tr key={year}>
                <td className="text-[9px] text-zinc-600 text-right pr-2 font-mono">{year}</td>
                {Array.from({ length: 12 }, (_, mo) => {
                  const entry = monthlyReturns.find(r => r.year === year && r.month === mo + 1);
                  const val = entry?.returnPct ?? null;
                  const intensity = val !== null ? Math.min(Math.abs(val) / maxAbs, 1) : 0;
                  let bg = 'rgba(255,255,255,0.03)';
                  let textColor = 'rgba(255,255,255,0.15)';
                  if (val !== null && val !== 0) {
                    if (val > 0) {
                      bg = `rgba(16,185,129,${0.1 + intensity * 0.5})`;
                      textColor = intensity > 0.5 ? '#10B981' : 'rgba(16,185,129,0.7)';
                    } else {
                      bg = `rgba(239,68,68,${0.1 + intensity * 0.5})`;
                      textColor = intensity > 0.5 ? '#EF4444' : 'rgba(239,68,68,0.7)';
                    }
                  }
                  return (
                    <td key={mo} className="p-0.5">
                      <div
                        className="rounded text-center font-mono tabular-nums"
                        style={{
                          background: bg,
                          color: textColor,
                          fontSize: 8,
                          padding: '3px 2px',
                          lineHeight: 1.2,
                        }}
                      >
                        {val !== null ? (val > 0 ? '+' : '') + val.toFixed(1) + '%' : '\u2014'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────

function MetricCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}

// ─── Data Source Badge ───────────────────────────────────────

function DataSourceBadge({ source }: { source: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    binance: { text: 'Binance', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' },
    yahoo: { text: 'Yahoo Finance', color: 'text-purple-400 border-purple-500/20 bg-purple-500/10' },
    synthetic: { text: 'Synthetic', color: 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10' },
  };
  const config = labels[source] || labels.synthetic;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${config.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.text}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────

type Tab = 'equity' | 'price' | 'indicators' | 'trades';

export default function BacktestPage() {
  const [params, setParams] = useState<BacktestParams>({
    symbol: 'XAUUSD',
    timeframe: 'H1',
    strategy: 'EMA Crossover + RSI',
    initialBalance: 10000,
    riskPercent: 1,
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('equity');
  const [loadedStrategyName, setLoadedStrategyName] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const encoded = sp.get('strategy');
    if (!encoded) return;
    try {
      const decoded = JSON.parse(atob(encoded)) as { name?: string; symbol?: string; timeframe?: string };
      const symbol = typeof decoded.symbol === 'string' ? decoded.symbol : 'XAUUSD';
      const timeframe = typeof decoded.timeframe === 'string' ? decoded.timeframe : 'H1';
      const strategyName = typeof decoded.name === 'string' ? decoded.name : 'Custom Strategy';
      const newParams: BacktestParams = {
        symbol,
        timeframe,
        strategy: strategyName,
        initialBalance: 10000,
        riskPercent: 1,
      };
      setParams(newParams);
      setLoadedStrategyName(strategyName);
      setRunning(true);
      setError(null);
      runBacktest(newParams)
        .then(r => {
          setResult(r);
          setActiveTab('equity');
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Backtest failed');
        })
        .finally(() => setRunning(false));
    } catch { /* ignore invalid param */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRun = useCallback(() => {
    setRunning(true);
    setError(null);
    setResult(null);
    runBacktest(params)
      .then(r => {
        setResult(r);
        setActiveTab('equity');
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Backtest failed');
      })
      .finally(() => setRunning(false));
  }, [params]);

  const update = (key: keyof BacktestParams, value: string | number) =>
    setParams(p => ({ ...p, [key]: value }));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'equity', label: 'Equity Curve' },
    { id: 'price', label: 'Price Chart' },
    { id: 'indicators', label: 'Indicators' },
    { id: 'trades', label: 'Trade Log' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <strong>Live Backtest</strong> — Uses real market data from Binance and Yahoo Finance. Trade outcomes are determined by actual candle price action (TP/SL against real highs and lows).
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 8L9 11L14 4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 14H14" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            </svg>
            <h1 className="text-sm font-semibold text-white tracking-tight">Backtesting Engine</h1>
            {result && <DataSourceBadge source={result.dataSource} />}
          </div>
          <p className="text-[11px] text-zinc-600">Replay strategies against real historical data — equity curve, price chart, indicators, trade log</p>
        </div>

        {loadedStrategyName && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
              <rect x="1" y="3" width="4" height="4" rx="0.8" fill="rgba(96,165,250,0.4)"/>
              <rect x="7" y="3" width="4" height="4" rx="0.8" fill="rgba(96,165,250,0.2)"/>
              <path d="M3 5H9" stroke="rgba(96,165,250,0.4)" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
            </svg>
            <span className="text-[11px] text-blue-400">Loaded from Strategy Builder: <span className="font-semibold">{loadedStrategyName}</span></span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Config panel */}
          <div className="space-y-3">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-xs font-semibold text-white tracking-tight mb-1">Configuration</div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Symbol</label>
                <select
                  value={params.symbol}
                  onChange={e => update('symbol', e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
                >
                  {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Timeframe</label>
                <div className="grid grid-cols-4 gap-1">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf}
                      onClick={() => update('timeframe', tf)}
                      className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all duration-150 ${
                        params.timeframe === tf
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Strategy</label>
                <select
                  value={params.strategy}
                  onChange={e => update('strategy', e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
                >
                  {!STRATEGIES.includes(params.strategy) && (
                    <option value={params.strategy}>{params.strategy}</option>
                  )}
                  {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Initial Balance ($)</label>
                <input
                  type="number"
                  value={params.initialBalance}
                  onChange={e => update('initialBalance', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Risk per trade (%)</label>
                <input
                  type="number"
                  value={params.riskPercent}
                  step="0.1"
                  min="0.1"
                  max="10"
                  onChange={e => update('riskPercent', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
                />
              </div>

              <button
                onClick={handleRun}
                disabled={running}
                className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {running ? (
                  <>
                    <span className="w-3 h-3 border border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
                    Fetching data...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 2L10 6L3 10V2Z" fill="#10B981"/>
                    </svg>
                    Run Backtest
                  </>
                )}
              </button>
            </div>

            {/* Quick nav */}
            <div className="glass-card rounded-2xl p-4 space-y-1">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Quick nav</div>
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Paper Trading', href: '/paper-trading' },
                { label: 'Leaderboard', href: '/leaderboard' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">{link.label}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="M3 2L7 5L3 8" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {!result && !running && !error && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17L9 11L13 15L21 6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 21H21" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                  </svg>
                </div>
                <div className="text-sm text-zinc-500 font-medium">Configure and run a backtest</div>
                <div className="text-xs text-zinc-700 mt-1">Uses real OHLCV data from Binance and Yahoo Finance</div>
              </div>
            )}

            {error && !running && (
              <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.5"/>
                    <path d="M15 9L9 15M9 9L15 15" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-sm text-red-400 font-medium mb-1">Backtest Failed</div>
                <div className="text-xs text-zinc-500 max-w-md">{error}</div>
                <button
                  onClick={handleRun}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {running && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
                <div className="text-xs text-zinc-500">Fetching real OHLCV data for {params.symbol} {params.timeframe}...</div>
                <div className="text-[10px] text-zinc-700 mt-1">Connecting to Binance / Yahoo Finance</div>
              </div>
            )}

            {result && !running && (
              <>
                {/* Metrics grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <MetricCard
                    label="Total Return"
                    value={`${result.totalReturn > 0 ? '+' : ''}${result.totalReturn}%`}
                    sub={`$${result.endBalance.toLocaleString()}`}
                    color={result.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Win Rate"
                    value={`${result.winRate}%`}
                    sub={`${result.totalTrades} trades`}
                    color={result.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Profit Factor"
                    value={`${result.profitFactor}x`}
                    color={result.profitFactor >= 1.5 ? 'text-emerald-400' : result.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Max Drawdown"
                    value={`${result.maxDrawdown}%`}
                    color={result.maxDrawdown <= 10 ? 'text-emerald-400' : result.maxDrawdown <= 20 ? 'text-yellow-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Sharpe Ratio"
                    value={`${result.sharpeRatio}`}
                    color={result.sharpeRatio >= 1.5 ? 'text-emerald-400' : result.sharpeRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Signals"
                    value={`${result.totalTrades}`}
                    sub={`${result.signals.length} detected`}
                  />
                </div>

                {/* Monthly returns heatmap */}
                <MonthlyHeatmap monthlyReturns={result.monthlyReturns} />

                {/* Tabs */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex border-b border-white/5">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'text-emerald-400 border-b border-emerald-500/40 bg-emerald-500/5'
                            : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'equity' && (
                    <div className="p-5">
                      <div className="h-64">
                        <EquityCurveCanvas curve={result.equityCurve} startBalance={result.startBalance} />
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-zinc-600">
                        <span>Start: ${result.startBalance.toLocaleString()}</span>
                        <span className={result.endBalance >= result.startBalance ? 'text-emerald-400' : 'text-red-400'}>
                          End: ${result.endBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'price' && (
                    <div className="p-5">
                      <div className="flex items-center gap-4 mb-3 text-[9px] text-zinc-600">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> BUY signal
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-400" /> SELL signal
                        </span>
                        <span className="ml-auto font-mono">{result.signals.length} signals on {result.priceData.length} bars</span>
                      </div>
                      <div className="h-72">
                        <PriceChartCanvas
                          priceData={result.priceData}
                          ema20={result.ema20}
                          ema50={result.ema50}
                          signals={result.signals}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'indicators' && (
                    <div className="p-5">
                      <div className="flex items-center gap-4 mb-3 text-[9px] text-zinc-600">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-violet-400 rounded" /> RSI
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-white/60 rounded" /> MACD
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-yellow-400/80 rounded" /> Signal
                        </span>
                      </div>
                      <div className="h-80">
                        <IndicatorsCanvas
                          rsiValues={result.rsiValues}
                          macdLine={result.macdLine}
                          macdSignalLine={result.macdSignalLine}
                          macdHistogram={result.macdHistogram}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'trades' && (
                    <div>
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.03]">
                        <span className="text-[10px] text-zinc-600">{result.trades.length} trades</span>
                        <button
                          onClick={() => exportCSV(result.trades, params.symbol)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-white/8 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M5 1V7M2 5L5 8L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                          Export CSV
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="px-4 py-2.5 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">#</th>
                              <th className="px-4 py-2.5 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Dir</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Entry</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Exit</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">P&amp;L</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">%</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Bars</th>
                              <th className="px-4 py-2.5 text-center text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Exit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.trades.slice(0, 50).map(trade => (
                              <tr key={trade.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-2 font-mono text-zinc-600">{trade.id}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-[10px] font-bold ${trade.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trade.direction}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-zinc-400">{trade.entry}</td>
                                <td className="px-4 py-2 text-right font-mono text-zinc-400">{trade.exit}</td>
                                <td className={`px-4 py-2 text-right font-mono font-semibold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                </td>
                                <td className={`px-4 py-2 text-right font-mono tabular-nums text-[10px] ${trade.pnlPct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                  {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-zinc-600">{trade.bars}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                    trade.exitReason === 'TP' ? 'text-emerald-400 bg-emerald-500/10' :
                                    trade.exitReason === 'SL' ? 'text-red-400 bg-red-500/10' :
                                    'text-zinc-400 bg-zinc-500/10'
                                  }`}>
                                    {trade.exitReason}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {result.trades.length > 50 && (
                          <div className="px-4 py-3 text-center text-[10px] text-zinc-700">
                            Showing 50 of {result.trades.length} trades
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
