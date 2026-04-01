import { NextRequest, NextResponse } from 'next/server';
import { calculateRSI, calculateMACD, calculateEMAs } from '../../../lib/ta-engine';

interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalPoint {
  barIndex: number;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp: number;
  sl: number;
  date: string;
}

interface TradeResult {
  id: number;
  date: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp: number;
  sl: number;
  exit: number;
  pnlPct: number;
  outcome: 'WIN' | 'LOSS' | 'OPEN';
  exitReason: 'TP' | 'SL' | 'EOD';
  barsHeld: number;
}

function calcATR(candles: OHLCVCandle[], barIndex: number, period = 14): number {
  const start = Math.max(1, barIndex - period + 1);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= barIndex; i++) {
    const { high, low } = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sum += tr;
    count++;
  }
  return count > 0 ? sum / count : candles[barIndex].close * 0.005;
}

function resolveOutcome(
  candles: OHLCVCandle[],
  signalBar: number,
  direction: 'BUY' | 'SELL',
  entry: number,
  tp: number,
  sl: number,
  maxBars = 20,
): { outcome: 'WIN' | 'LOSS' | 'OPEN'; exit: number; bars: number; exitReason: 'TP' | 'SL' | 'EOD' } {
  for (let offset = 1; offset <= maxBars; offset++) {
    const idx = signalBar + offset;
    if (idx >= candles.length) break;
    const { high, low } = candles[idx];
    if (direction === 'BUY') {
      if (low <= sl) return { outcome: 'LOSS', exit: sl, bars: offset, exitReason: 'SL' };
      if (high >= tp) return { outcome: 'WIN', exit: tp, bars: offset, exitReason: 'TP' };
    } else {
      if (high >= sl) return { outcome: 'LOSS', exit: sl, bars: offset, exitReason: 'SL' };
      if (low <= tp) return { outcome: 'WIN', exit: tp, bars: offset, exitReason: 'TP' };
    }
  }
  const exitBar = Math.min(signalBar + maxBars, candles.length - 1);
  const exitPrice = candles[exitBar].close;
  const win = direction === 'BUY' ? exitPrice > entry : exitPrice < entry;
  return { outcome: win ? 'WIN' : 'LOSS', exit: exitPrice, bars: exitBar - signalBar, exitReason: 'EOD' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { candles?: unknown };
    const raw = body?.candles;
    if (!Array.isArray(raw) || raw.length < 60) {
      return NextResponse.json({ error: 'Need at least 60 candles' }, { status: 400 });
    }
    if (raw.length > 10000) {
      return NextResponse.json({ error: 'Max 10,000 candles allowed' }, { status: 400 });
    }

    const candles: OHLCVCandle[] = raw as OHLCVCandle[];
    const closes = candles.map(c => c.close);

    const rsiResult = calculateRSI(closes, 14);
    const macdResult = calculateMACD(closes, 12, 26, 9);
    const emaResult = calculateEMAs(closes);

    const { values: rsiValues } = rsiResult;
    const { histogram } = macdResult;
    const { ema20, ema50 } = emaResult;

    // Detect signals
    const signals: SignalPoint[] = [];
    let lastSignalBar = -8;
    const MIN_BAR = 55;

    for (let i = MIN_BAR; i < candles.length - 5; i++) {
      if (i - lastSignalBar < 6) continue;
      const rsi = rsiValues[i];
      const macdH = histogram[i];
      const prevMacdH = histogram[i - 1];
      const e20 = ema20[i];
      const e50 = ema50[i];
      if (isNaN(rsi) || isNaN(macdH) || isNaN(prevMacdH) || isNaN(e20) || isNaN(e50)) continue;

      const atr = calcATR(candles, i);
      const entry = candles[i].close;
      const buySignal = rsi < 38 && e20 > e50 && macdH > prevMacdH;
      const sellSignal = rsi > 62 && e20 < e50 && macdH < prevMacdH;

      if (buySignal || sellSignal) {
        const direction: 'BUY' | 'SELL' = buySignal ? 'BUY' : 'SELL';
        const tp = direction === 'BUY' ? entry + atr * 2 : entry - atr * 2;
        const sl = direction === 'BUY' ? entry - atr : entry + atr;
        signals.push({
          barIndex: i,
          direction,
          entry,
          tp,
          sl,
          date: new Date(candles[i].timestamp).toISOString().slice(0, 10),
        });
        lastSignalBar = i;
      }
    }

    // Resolve trades
    let balance = 10000;
    const equityCurve: number[] = [balance];
    const trades: TradeResult[] = [];

    signals.forEach((sig, idx) => {
      const { outcome, exit, bars, exitReason } = resolveOutcome(
        candles, sig.barIndex, sig.direction, sig.entry, sig.tp, sig.sl,
      );
      const atr = calcATR(candles, sig.barIndex);
      const riskAmount = balance * 0.01; // 1% risk
      const pricePnl = sig.direction === 'BUY' ? exit - sig.entry : sig.entry - exit;
      const pnl = atr > 0 ? (pricePnl / atr) * riskAmount : 0;
      const pnlPct = (pnl / balance) * 100;
      balance = Math.max(0, balance + pnl);
      equityCurve.push(+balance.toFixed(2));

      trades.push({
        id: idx + 1,
        date: sig.date,
        direction: sig.direction,
        entry: +sig.entry.toFixed(5),
        tp: +sig.tp.toFixed(5),
        sl: +sig.sl.toFixed(5),
        exit: +exit.toFixed(5),
        pnlPct: +pnlPct.toFixed(2),
        outcome,
        exitReason,
        barsHeld: bars,
      });
    });

    // Stats
    const wins = trades.filter(t => t.outcome === 'WIN');
    const losses = trades.filter(t => t.outcome === 'LOSS');
    const totalPnlPct = trades.reduce((s, t) => s + t.pnlPct, 0);

    let peak = 10000;
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
    const sharpe = stdDev > 0 ? +((avgR / stdDev) * Math.sqrt(252)).toFixed(2) : 0;

    return NextResponse.json({
      trades,
      stats: {
        totalSignals: signals.length,
        winRate: trades.length > 0 ? +((wins.length / trades.length) * 100).toFixed(1) : 0,
        totalPnlPct: +totalPnlPct.toFixed(2),
        maxDrawdown: +(maxDD * 100).toFixed(1),
        sharpeRatio: sharpe,
        wins: wins.length,
        losses: losses.length,
      },
      equityCurve,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
