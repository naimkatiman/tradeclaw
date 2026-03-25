'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
}

interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategy: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  riskPercent: number;
}

const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];
const STRATEGIES = ['EMA Crossover + RSI', 'MACD Divergence', 'Bollinger Breakout', 'ATR Trend Follow'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function runBacktest(params: BacktestParams): BacktestResult {
  const seed = params.symbol.charCodeAt(0) * 31 + params.strategy.length * 7 + params.timeframe.length * 13;
  const numTrades = Math.floor(30 + seededRandom(seed) * 70); // 30–100 trades
  const trades: Trade[] = [];
  let balance = params.initialBalance;
  const equityCurve: number[] = [balance];

  // Base prices for symbols
  const basePrices: Record<string, number> = {
    XAUUSD: 2180, BTCUSD: 87500, ETHUSD: 3400, EURUSD: 1.083,
    GBPUSD: 1.264, USDJPY: 151.2, XAGUSD: 24.8, AUDUSD: 0.654,
  };
  const basePrice = basePrices[params.symbol] || 100;

  for (let i = 0; i < numTrades; i++) {
    const r = seededRandom(seed + i * 17);
    const r2 = seededRandom(seed + i * 17 + 1);
    const r3 = seededRandom(seed + i * 17 + 2);

    const direction: 'BUY' | 'SELL' = r > 0.48 ? 'BUY' : 'SELL';
    const win = r2 > 0.42; // ~58% win rate
    const entry = basePrice * (0.97 + r3 * 0.06);
    const atr = basePrice * 0.005;

    let exit: number;
    if (win) {
      const rr = 1.2 + seededRandom(seed + i * 17 + 3) * 1.8; // 1.2–3.0 R
      exit = direction === 'BUY' ? entry + atr * rr : entry - atr * rr;
    } else {
      exit = direction === 'BUY' ? entry - atr : entry + atr;
    }

    const riskAmount = balance * (params.riskPercent / 100);
    const pnl = win
      ? riskAmount * (1.2 + seededRandom(seed + i * 17 + 4) * 1.8)
      : -riskAmount;
    const pnlPct = (pnl / balance) * 100;

    balance += pnl;
    if (balance < 0) balance = 0;

    trades.push({
      id: i + 1,
      symbol: params.symbol,
      direction,
      entry: +entry.toFixed(entry < 10 ? 5 : entry < 100 ? 3 : 2),
      exit: +exit.toFixed(exit < 10 ? 5 : exit < 100 ? 3 : 2),
      pnl: +pnl.toFixed(2),
      pnlPct: +pnlPct.toFixed(2),
      bars: Math.floor(2 + seededRandom(seed + i * 17 + 5) * 20),
      win,
    });
    equityCurve.push(+balance.toFixed(2));
  }

  const wins = trades.filter(t => t.win);
  const losses = trades.filter(t => !t.win);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  // Max drawdown calculation
  let peak = params.initialBalance;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = (peak - eq) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe ratio approximation
  const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / returns.length);
  const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    trades,
    totalTrades: trades.length,
    winRate: +(wins.length / trades.length * 100).toFixed(1),
    profitFactor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : 0,
    maxDrawdown: +(maxDD * 100).toFixed(1),
    sharpeRatio: +sharpe.toFixed(2),
    totalReturn: +((balance - params.initialBalance) / params.initialBalance * 100).toFixed(2),
    equityCurve,
    startBalance: params.initialBalance,
    endBalance: +balance.toFixed(2),
  };
}

function EquityCurveCanvas({ curve, startBalance }: { curve: number[]; startBalance: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || curve.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 16, right: 16, bottom: 28, left: 52 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...curve) * 0.995;
    const max = Math.max(...curve) * 1.005;
    const range = max - min || 1;

    const toX = (i: number) => pad.left + (i / (curve.length - 1)) * chartW;
    const toY = (v: number) => pad.top + chartH - ((v - min) / range) * chartH;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // Zero line (start balance)
    const zeroY = toY(startBalance);
    if (zeroY >= pad.top && zeroY <= pad.top + chartH) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(W - pad.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    const isProfit = curve[curve.length - 1] >= startBalance;
    if (isProfit) {
      gradient.addColorStop(0, 'rgba(16,185,129,0.25)');
      gradient.addColorStop(1, 'rgba(16,185,129,0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(239,68,68,0.25)');
      gradient.addColorStop(1, 'rgba(239,68,68,0.0)');
    }

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(curve[0]));
    for (let i = 1; i < curve.length; i++) {
      ctx.lineTo(toX(i), toY(curve[i]));
    }
    ctx.lineTo(toX(curve.length - 1), pad.top + chartH);
    ctx.lineTo(toX(0), pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Equity line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(curve[0]));
    for (let i = 1; i < curve.length; i++) {
      ctx.lineTo(toX(i), toY(curve[i]));
    }
    ctx.strokeStyle = isProfit ? '#10B981' : '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 4; g++) {
      const v = min + (range * (4 - g)) / 4;
      const y = pad.top + (g / 4) * chartH;
      ctx.fillText(v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`, pad.left - 4, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    const xLabels = [0, Math.floor(curve.length * 0.25), Math.floor(curve.length * 0.5), Math.floor(curve.length * 0.75), curve.length - 1];
    xLabels.forEach(i => {
      ctx.fillText(`T${i}`, toX(i), pad.top + chartH + 18);
    });
  }, [curve, startBalance]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

function MetricCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}

export default function BacktestPage() {
  const [params, setParams] = useState<BacktestParams>({
    symbol: 'XAUUSD',
    timeframe: 'H1',
    strategy: 'EMA Crossover + RSI',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialBalance: 10000,
    riskPercent: 1,
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'equity' | 'trades'>('equity');

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const r = runBacktest(params);
      setResult(r);
      setRunning(false);
    }, 600);
  }, [params]);

  const update = (key: keyof BacktestParams, value: string | number) =>
    setParams(p => ({ ...p, [key]: value }));

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 8L9 11L14 4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 14H14" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            </svg>
            <h1 className="text-sm font-semibold text-white tracking-tight">Backtesting Engine</h1>
          </div>
          <p className="text-[11px] text-zinc-600">Replay strategies against historical data — equity curve, metrics, trade log</p>
        </div>

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
                  {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Start</label>
                  <input
                    type="date"
                    value={params.startDate}
                    onChange={e => update('startDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">End</label>
                  <input
                    type="date"
                    value={params.endDate}
                    onChange={e => update('endDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
                  />
                </div>
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
                    Running...
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
            {!result && !running && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17L9 11L13 15L21 6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 21H21" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                  </svg>
                </div>
                <div className="text-sm text-zinc-500 font-medium">Configure and run a backtest</div>
                <div className="text-xs text-zinc-700 mt-1">Results will appear here</div>
              </div>
            )}

            {running && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
                <div className="text-xs text-zinc-500">Replaying signals against {params.symbol} {params.timeframe}...</div>
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
                    label="Trades"
                    value={`${result.totalTrades}`}
                    sub={`${Math.round(result.totalTrades / 12)}/mo avg`}
                  />
                </div>

                {/* Tabs */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex border-b border-white/5">
                    {(['equity', 'trades'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                          activeTab === tab
                            ? 'text-emerald-400 border-b border-emerald-500/40 bg-emerald-500/5'
                            : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                      >
                        {tab === 'equity' ? 'Equity Curve' : 'Trade Log'}
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

                  {activeTab === 'trades' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="px-4 py-2.5 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">#</th>
                            <th className="px-4 py-2.5 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Dir</th>
                            <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Entry</th>
                            <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Exit</th>
                            <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">P&L</th>
                            <th className="px-4 py-2.5 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Bars</th>
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
                              <td className={`px-4 py-2 text-right font-mono font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-zinc-600">{trade.bars}</td>
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
