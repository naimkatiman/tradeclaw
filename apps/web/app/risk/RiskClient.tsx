'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, AlertTriangle, Clock, TrendingDown, Ban, Gauge, Activity, XCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type BreakerStatus = 'inactive' | 'approaching' | 'triggered';

interface CircuitBreaker {
  id: string;
  name: string;
  description: string;
  threshold: string;
  status: BreakerStatus;
  currentValue?: number;
  triggeredAt?: string;
  cooldownRemaining?: string;
}

interface RiskMetrics {
  currentDrawdown: number;
  highWaterMark: number;
  currentEquity: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
}

interface EquityPoint {
  time: string;
  equity: number;
  hwm: number;
  inDrawdown: boolean;
}

interface VetoedSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  reason: string;
  vetoedAt: string;
  breaker: string;
}

// ─── Mock Data ───────────────────────────────────────────────
// TODO: replace with real API calls

function getMockBreakers(): CircuitBreaker[] {
  return [
    {
      id: 'daily-loss',
      name: 'Daily Loss Limit',
      description: 'Halts trading when daily P&L drops below threshold',
      threshold: '-3% daily P&L',
      status: 'inactive',
      currentValue: -0.8,
    },
    {
      id: 'max-drawdown',
      name: 'Max Drawdown',
      description: 'Stops all new positions when drawdown exceeds limit',
      threshold: '-10% from HWM',
      status: 'approaching',
      currentValue: -7.2,
    },
    {
      id: 'consecutive-losses',
      name: 'Consecutive Losses',
      description: 'Pauses after N consecutive losing trades',
      threshold: '5 losses in a row',
      status: 'inactive',
      currentValue: 2,
    },
    {
      id: 'volatility-spike',
      name: 'Volatility Spike',
      description: 'Reduces exposure when realized vol exceeds 2x normal',
      threshold: '2x avg volatility',
      status: 'inactive',
      currentValue: 1.1,
    },
    {
      id: 'correlation-break',
      name: 'Correlation Breakdown',
      description: 'Triggers when cross-asset correlations spike abnormally',
      threshold: '> 0.9 avg correlation',
      status: 'triggered',
      currentValue: 0.93,
      triggeredAt: '2026-04-11T08:30:00Z',
      cooldownRemaining: '47m',
    },
  ];
}

function getMockRiskMetrics(): RiskMetrics {
  return {
    currentDrawdown: -7.2,
    highWaterMark: 108500,
    currentEquity: 100684,
    consecutiveLosses: 2,
    maxConsecutiveLosses: 5,
  };
}

function getMockEquityCurve(): EquityPoint[] {
  const points: EquityPoint[] = [];
  let equity = 100000;
  let hwm = 100000;
  const now = Date.now();
  const dayMs = 86400000;

  for (let i = 60; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 800;
    equity = Math.max(equity + change, 85000);
    hwm = Math.max(hwm, equity);
    points.push({
      time: new Date(now - i * dayMs).toISOString(),
      equity: Math.round(equity * 100) / 100,
      hwm,
      inDrawdown: equity < hwm * 0.97,
    });
  }
  return points;
}

function getMockVetoedSignals(): VetoedSignal[] {
  return [
    { id: '1', symbol: 'BTCUSD', direction: 'BUY', reason: 'Correlation breaker active — cross-asset risk too high', vetoedAt: '2026-04-11T09:15:00Z', breaker: 'correlation-break' },
    { id: '2', symbol: 'EURUSD', direction: 'SELL', reason: 'Approaching max drawdown limit (7.2% of 10%)', vetoedAt: '2026-04-11T08:45:00Z', breaker: 'max-drawdown' },
    { id: '3', symbol: 'XAUUSD', direction: 'BUY', reason: 'Correlation breaker active — cross-asset risk too high', vetoedAt: '2026-04-11T08:32:00Z', breaker: 'correlation-break' },
    { id: '4', symbol: 'GBPJPY', direction: 'SELL', reason: 'Volatility spike detected — 1.8x normal vol', vetoedAt: '2026-04-10T22:10:00Z', breaker: 'volatility-spike' },
    { id: '5', symbol: 'ETHUSD', direction: 'BUY', reason: 'Daily loss limit approaching — P&L at -2.5%', vetoedAt: '2026-04-10T18:30:00Z', breaker: 'daily-loss' },
  ];
}

// ─── Sub-components ──────────────────────────────────────────

function getBreakerStatusStyle(status: BreakerStatus): { bg: string; border: string; dot: string; label: string } {
  switch (status) {
    case 'inactive': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', label: 'Inactive' };
    case 'approaching': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', label: 'Approaching' };
    case 'triggered': return { bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-500', label: 'Triggered' };
  }
}

function getBreakerIcon(id: string) {
  switch (id) {
    case 'daily-loss': return <TrendingDown className="w-5 h-5" />;
    case 'max-drawdown': return <Gauge className="w-5 h-5" />;
    case 'consecutive-losses': return <Ban className="w-5 h-5" />;
    case 'volatility-spike': return <Activity className="w-5 h-5" />;
    case 'correlation-break': return <AlertTriangle className="w-5 h-5" />;
    default: return <Shield className="w-5 h-5" />;
  }
}

function BreakerCard({ breaker }: { breaker: CircuitBreaker }) {
  const style = getBreakerStatusStyle(breaker.status);
  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-[var(--foreground)]">
          {getBreakerIcon(breaker.id)}
          <span className="text-sm font-semibold">{breaker.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${style.dot} ${breaker.status === 'triggered' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {style.label}
          </span>
        </div>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-2">{breaker.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[var(--text-secondary)]">Threshold: {breaker.threshold}</span>
        {breaker.currentValue !== undefined && (
          <span className="font-mono font-medium text-[var(--foreground)]">
            Current: {typeof breaker.currentValue === 'number' && breaker.currentValue < 0 ? '' : ''}{breaker.currentValue}
          </span>
        )}
      </div>
      {breaker.status === 'triggered' && breaker.triggeredAt && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-rose-400">
            <Clock className="w-3 h-3" />
            <span>Triggered: {new Date(breaker.triggeredAt).toLocaleTimeString()}</span>
          </div>
          {breaker.cooldownRemaining && (
            <span className="text-amber-400 font-mono">Cooldown: {breaker.cooldownRemaining}</span>
          )}
        </div>
      )}
    </div>
  );
}

function EquityCurveCanvas({ data }: { data: EquityPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Calculate ranges
    const equities = data.map((d) => d.equity);
    const hwms = data.map((d) => d.hwm);
    const allValues = [...equities, ...hwms];
    const minVal = Math.min(...allValues) * 0.995;
    const maxVal = Math.max(...allValues) * 1.005;
    const range = maxVal - minVal;

    function xPos(i: number) { return padding.left + (i / (data.length - 1)) * chartW; }
    function yPos(val: number) { return padding.top + (1 - (val - minVal) / range) * chartH; }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (i / gridSteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - (i / gridSteps) * range;
      ctx.fillStyle = 'rgba(161,161,170,0.6)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`$${(val / 1000).toFixed(1)}k`, padding.left - 8, y + 3);
    }

    // Draw drawdown shading
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].inDrawdown) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
        ctx.fillRect(xPos(i), padding.top, xPos(i + 1) - xPos(i), chartH);
      }
    }

    // Draw HWM line (dashed)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = xPos(i);
      const y = yPos(data[i].hwm);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw equity line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = xPos(i);
      const y = yPos(data[i].equity);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Equity area gradient
    const grad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = xPos(i);
      const y = yPos(data[i].equity);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(xPos(data.length - 1), h - padding.bottom);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // X-axis labels (first, middle, last)
    ctx.fillStyle = 'rgba(161,161,170,0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
    for (const idx of labelIndices) {
      const d = new Date(data[idx].time);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      ctx.fillText(label, xPos(idx), h - padding.bottom + 16);
    }

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.fillRect(w - padding.right - 120, 8, 10, 2);
    ctx.fillStyle = 'rgba(161,161,170,0.8)';
    ctx.font = '10px sans-serif';
    ctx.fillText('Equity', w - padding.right - 106, 12);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w - padding.right - 60, 9);
    ctx.lineTo(w - padding.right - 50, 9);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('HWM', w - padding.right - 46, 12);
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────

export function RiskClient() {
  const [breakers, setBreakers] = useState<CircuitBreaker[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [vetoedSignals, setVetoedSignals] = useState<VetoedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    // TODO: replace with real API calls to /api/v1/risk, /api/v1/risk/breakers, etc.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setBreakers(getMockBreakers());
    setMetrics(getMockRiskMetrics());
    setEquityCurve(getMockEquityCurve());
    setVetoedSignals(getMockVetoedSignals());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const triggeredCount = breakers.filter((b) => b.status === 'triggered').length;
  const approachingCount = breakers.filter((b) => b.status === 'approaching').length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Risk <span className="text-rose-400">Dashboard</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Circuit breakers, drawdown tracking, and risk management
              </p>
            </div>
          </div>
          {!loading && (
            <div className="flex items-center gap-3">
              {triggeredCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {triggeredCount} Triggered
                </span>
              )}
              {approachingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {approachingCount} Approaching
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* Risk Metrics */}
            {metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Current Drawdown</span>
                  <p className={`text-2xl font-bold font-mono mt-1 ${metrics.currentDrawdown < -5 ? 'text-rose-400' : metrics.currentDrawdown < -2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {metrics.currentDrawdown.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">High Water Mark</span>
                  <p className="text-2xl font-bold font-mono mt-1 text-purple-400">
                    ${(metrics.highWaterMark / 1000).toFixed(1)}k
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Current Equity</span>
                  <p className="text-2xl font-bold font-mono mt-1 text-[var(--foreground)]">
                    ${(metrics.currentEquity / 1000).toFixed(1)}k
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Consecutive Losses</span>
                  <p className={`text-2xl font-bold font-mono mt-1 ${metrics.consecutiveLosses >= 4 ? 'text-rose-400' : metrics.consecutiveLosses >= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {metrics.consecutiveLosses} / {metrics.maxConsecutiveLosses}
                  </p>
                </div>
              </div>
            )}

            {/* Circuit Breaker Cards */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">Circuit Breakers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {breakers.map((breaker) => (
                  <BreakerCard key={breaker.id} breaker={breaker} />
                ))}
              </div>
            </div>

            {/* Equity Curve */}
            {equityCurve.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-8">
                <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">Equity Curve</h2>
                <div className="h-64 sm:h-80">
                  <EquityCurveCanvas data={equityCurve} />
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-emerald-500 rounded" />
                    <span>Equity</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-purple-400 rounded border-b border-dashed border-purple-400" />
                    <span>High Water Mark</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-rose-500/10 rounded" />
                    <span>Drawdown Zone</span>
                  </div>
                </div>
              </div>
            )}

            {/* Vetoed Signals Log */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Vetoed Signals</h2>
                <span className="text-xs text-[var(--text-secondary)] ml-auto">{vetoedSignals.length} recent</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-5 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Time</th>
                      <th className="text-left px-5 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Symbol</th>
                      <th className="text-left px-5 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Direction</th>
                      <th className="text-left px-5 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Breaker</th>
                      <th className="text-left px-5 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vetoedSignals.map((signal) => (
                      <tr key={signal.id} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-5 py-2 font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(signal.vetoedAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-2 font-bold text-[var(--foreground)]">{signal.symbol}</td>
                        <td className="px-5 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                            signal.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}>
                            {signal.direction}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-xs text-[var(--text-secondary)] font-mono">{signal.breaker}</td>
                        <td className="px-5 py-2 text-xs text-[var(--text-secondary)] max-w-xs truncate">{signal.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
