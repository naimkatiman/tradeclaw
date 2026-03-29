'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
<<<<<<< HEAD
import type { Portfolio, Position, Trade, EquityPoint } from '../../lib/paper-trading';
=======
import { PageNavBar } from '../../components/PageNavBar';
import type { Portfolio, Trade, EquityPoint } from '../../lib/paper-trading';
>>>>>>> origin/main

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Signal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timeframe: string;
}

interface TooltipState {
  x: number;
  y: number;
  equity: number;
  date: string;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYMBOLS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD', 'USDCAD'];
const SIZE_PCTS = [0.01, 0.02, 0.05, 0.10];
const SIZE_LABELS = ['1%', '2%', '5%', '10%'];

const BASE_PRICES: Record<string, number> = {
  BTCUSD: 87500, ETHUSD: 3400, XAUUSD: 2180, EURUSD: 1.083,
  GBPUSD: 1.264, USDJPY: 151.2, XAGUSD: 24.8, AUDUSD: 0.654,
  XRPUSD: 0.615, USDCAD: 1.365,
};

<<<<<<< HEAD
const NAV_PAGES = [
  { href: '/dashboard', label: 'Signals' },
  { href: '/paper-trading', label: 'Paper Trade' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/strategy-builder', label: 'Strategy' },
];
=======
>>>>>>> origin/main

const HIST_PAGE_SIZE = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

<<<<<<< HEAD
function fmtPrice(n: number): string {
=======
function fmtPrice(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
>>>>>>> origin/main
  return n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(5);
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtSignedMoney(n: number): string {
  return (n >= 0 ? '+' : '') + fmtMoney(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtTradeDuration(openedAt: string, closedAt: string): string {
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const _priceSeeds: Record<string, number> = {};
function noisyPrice(sym: string, base: number): number {
  const prev = _priceSeeds[sym] ?? base;
  const drift = (Math.sin(Date.now() / 3000 + sym.charCodeAt(0)) * 0.0005);
  const noise = (Math.random() - 0.5) * 0.002;
  const next = prev * (1 + drift + noise);
  _priceSeeds[sym] = next;
  return +next.toFixed(next >= 100 ? 2 : 5);
}

// ---------------------------------------------------------------------------
// Canvas equity curve
// ---------------------------------------------------------------------------

function drawEquityCurve(
  canvas: HTMLCanvasElement,
  points: EquityPoint[],
  tooltip: TooltipState,
): void {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, W, H);

  if (points.length < 2) {
    // Flat dashed line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  const PAD_L = 8, PAD_R = 8, PAD_T = 12, PAD_B = 24;
  const cW = W - PAD_L - PAD_R;
  const cH = H - PAD_T - PAD_B;

  const values = points.map((p) => p.equity);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const xOf = (i: number) => PAD_L + (i / (points.length - 1)) * cW;
  const yOf = (v: number) => PAD_T + cH - ((v - minV) / range) * cH;

  // Gradient fill
  const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + cH);
  const isPositive = points[points.length - 1].equity >= points[0].equity;
  if (isPositive) {
    grad.addColorStop(0, 'rgba(52,211,153,0.18)');
    grad.addColorStop(1, 'rgba(52,211,153,0)');
  } else {
    grad.addColorStop(0, 'rgba(239,68,68,0.18)');
    grad.addColorStop(1, 'rgba(239,68,68,0)');
  }

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(points[0].equity));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(xOf(i), yOf(points[i].equity));
  }
  ctx.lineTo(xOf(points.length - 1), PAD_T + cH);
  ctx.lineTo(PAD_L, PAD_T + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(points[0].equity));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(xOf(i), yOf(points[i].equity));
  }
  ctx.strokeStyle = isPositive ? 'rgb(52,211,153)' : 'rgb(239,68,68)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tooltip line + dot
  if (tooltip.visible) {
    const nearestIdx = Math.round((Math.max(0, Math.min(tooltip.x - PAD_L, cW)) / cW) * (points.length - 1));
    const ptX = xOf(nearestIdx);
    const ptY = yOf(points[nearestIdx].equity);

    ctx.beginPath();
    ctx.moveTo(ptX, PAD_T);
    ctx.lineTo(ptX, PAD_T + cH);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(ptX, ptY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? 'rgb(52,211,153)' : 'rgb(239,68,68)';
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

<<<<<<< HEAD
function StatCard({ label, value, sub, color = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
      <div className={`text-base font-mono font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{sub}</div>}
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-1">{label}</div>
=======
function StatCard({ label, value, sub, color = 'text-[var(--foreground)]' }: StatCardProps) {
  return (
    <div className="bg-white/[0.02] border border-[var(--border)] rounded-xl p-3">
      <div className={`text-base font-mono font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">{sub}</div>}
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-1">{label}</div>
>>>>>>> origin/main
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PaperTradingPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>(BASE_PRICES);
  const [signals, setSignals] = useState<Signal[]>([]);

  // Form state
  const [symbol, setSymbol] = useState('XAUUSD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [sizePct, setSizePct] = useState(0.05);
  const [autoFollow, setAutoFollow] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [histPage, setHistPage] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, equity: 0, date: '', visible: false });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipNearestRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/paper-trading');
      if (res.ok) {
        const data = await res.json() as Portfolio;
        setPortfolio(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      if (res.ok) {
        const data = await res.json() as { signals: Signal[] };
        setSignals((data.signals ?? []).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPortfolio(), fetchSignals()]).then(() => setLoading(false));
  }, [fetchPortfolio, fetchSignals]);

  // ---------------------------------------------------------------------------
  // Price simulation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => {
      setPrices((prev) => {
        const next: Record<string, number> = {};
        for (const sym of SYMBOLS) {
          next[sym] = noisyPrice(sym, prev[sym] ?? BASE_PRICES[sym] ?? 1);
        }
        return next;
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Auto SL/TP close
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!portfolio) return;
    for (const pos of portfolio.positions) {
      const price = prices[pos.symbol];
      if (!price) continue;
      let reason: string | null = null;
      if (pos.stopLoss !== undefined) {
        if (pos.direction === 'BUY' && price <= pos.stopLoss) reason = 'stopLoss';
        if (pos.direction === 'SELL' && price >= pos.stopLoss) reason = 'stopLoss';
      }
      if (pos.takeProfit !== undefined && reason === null) {
        if (pos.direction === 'BUY' && price >= pos.takeProfit) reason = 'takeProfit';
        if (pos.direction === 'SELL' && price <= pos.takeProfit) reason = 'takeProfit';
      }
      if (reason !== null) {
        (async () => {
          try {
            await fetch('/api/paper-trading/close', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ positionId: pos.id, exitPrice: price }),
            });
            fetchPortfolio();
          } catch {
            // ignore
          }
        })();
      }
    }
  }, [prices, portfolio, fetchPortfolio]);

  // ---------------------------------------------------------------------------
  // Auto-follow signals
  // ---------------------------------------------------------------------------

  const followedSignalIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!autoFollow) return;
    for (const sig of signals) {
      if (followedSignalIds.current.has(sig.id)) continue;
      followedSignalIds.current.add(sig.id);
      (async () => {
        try {
          await fetch('/api/paper-trading/follow-signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: sig.id,
              symbol: sig.symbol,
              direction: sig.direction,
              entry: sig.entry,
              stopLoss: sig.stopLoss,
              takeProfit: sig.takeProfit,
              positionSizePct: sizePct,
            }),
          });
          fetchPortfolio();
        } catch {
          // ignore
        }
      })();
    }
  }, [autoFollow, signals, sizePct, fetchPortfolio]);

  // ---------------------------------------------------------------------------
  // Canvas draw
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!canvasRef.current || !portfolio) return;
    drawEquityCurve(canvasRef.current, portfolio.equityCurve, tooltip);
  }, [portfolio, tooltip]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleOpenPosition = async () => {
    setActionLoading(true);
    try {
      const bal = portfolio?.balance ?? 10000;
      await fetch('/api/paper-trading/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, direction, quantity: Math.round(bal * sizePct) }),
      });
      await fetchPortfolio();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (positionId: string) => {
    const pos = portfolio?.positions.find((p) => p.id === positionId);
    const exitPrice = pos ? prices[pos.symbol] : undefined;
    try {
      await fetch('/api/paper-trading/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId, exitPrice }),
      });
      await fetchPortfolio();
    } catch {
      // ignore
    }
  };

  const handleCloseAll = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/paper-trading/close-all', { method: 'POST' });
      await fetchPortfolio();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setShowReset(false);
    setActionLoading(true);
    try {
      await fetch('/api/paper-trading/reset', { method: 'POST' });
      followedSignalIds.current.clear();
      await fetchPortfolio();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleFollowSignal = async (sig: Signal) => {
    setActionLoading(true);
    try {
      await fetch('/api/paper-trading/follow-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sig.id,
          symbol: sig.symbol,
          direction: sig.direction,
          entry: sig.entry,
          stopLoss: sig.stopLoss,
          takeProfit: sig.takeProfit,
          positionSizePct: sizePct,
        }),
      });
      await fetchPortfolio();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const bal = portfolio?.balance ?? 10000;
  const startBal = portfolio?.startingBalance ?? 10000;
  const openPnl = (portfolio?.positions ?? []).reduce((s, pos) => {
    const price = prices[pos.symbol] ?? pos.entryPrice;
    const dirMult = pos.direction === 'BUY' ? 1 : -1;
    const movePct = ((price - pos.entryPrice) / pos.entryPrice) * dirMult;
    return s + pos.quantity * movePct;
  }, 0);
  const equity = bal + openPnl;
  const totalReturn = ((equity - startBal) / startBal) * 100;
  const stats = portfolio?.stats;

  const histTrades = portfolio?.history ?? [];
  const histTotal = histTrades.length;
  const histStart = histPage * HIST_PAGE_SIZE;
  const histSlice = histTrades.slice(histStart, histStart + HIST_PAGE_SIZE);
  const histPages = Math.ceil(histTotal / HIST_PAGE_SIZE);

  // ---------------------------------------------------------------------------
  // Canvas mouse events
  // ---------------------------------------------------------------------------

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !portfolio) return;
    const x = e.clientX - rect.left;
    const pts = portfolio.equityCurve;
    if (pts.length < 2) return;
    const PAD_L = 8, PAD_R = 8;
    const cW = rect.width - PAD_L - PAD_R;
    const nearestIdx = Math.round((Math.max(0, Math.min(x - PAD_L, cW)) / cW) * (pts.length - 1));
    tooltipNearestRef.current = nearestIdx;
    setTooltip({
      x,
      y: e.clientY - rect.top,
      equity: pts[nearestIdx].equity,
      date: fmtDate(pts[nearestIdx].timestamp),
      visible: true,
    });
  };

  const handleCanvasMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
<<<<<<< HEAD
    <div className="min-h-[100dvh] bg-[#050505] text-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  page.href === '/paper-trading'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {page.label}
              </Link>
            ))}
          </div>
          <button
            onClick={() => setShowReset(true)}
            className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            Reset account
          </button>
        </div>
      </nav>
=======
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] font-sans">
      <PageNavBar />

      {/* Page controls */}
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end border-b border-[var(--border)] bg-[var(--background)]/50">
        <button
          onClick={() => setShowReset(true)}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          Reset account
        </button>
      </div>
>>>>>>> origin/main

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">

        {/* Account summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
<<<<<<< HEAD
            { label: 'Balance', value: fmtMoney(bal), color: 'text-white' },
=======
            { label: 'Balance', value: fmtMoney(bal), color: 'text-[var(--foreground)]' },
>>>>>>> origin/main
            {
              label: 'Equity',
              value: fmtMoney(equity),
              color: equity >= startBal ? 'text-emerald-400' : 'text-red-400',
            },
            {
              label: 'Open P&L',
              value: fmtSignedMoney(openPnl),
              color: openPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
            {
              label: 'Total Return',
<<<<<<< HEAD
              value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`,
              color: totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <div className={`text-xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mt-1">{label}</div>
=======
              value: `${totalReturn >= 0 ? '+' : ''}${(totalReturn ?? 0).toFixed(2)}%`,
              color: totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] border border-[var(--border)] rounded-2xl p-4 text-center">
              <div className={`text-xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
              <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mt-1">{label}</div>
>>>>>>> origin/main
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Order form */}
<<<<<<< HEAD
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="text-xs font-semibold text-white">Place order</div>

            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-emerald-500/30"
=======
          <div className="bg-white/[0.02] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div className="text-xs font-semibold text-[var(--foreground)]">Place order</div>

            <div>
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[var(--glass-bg)] border border-white/8 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-emerald-500/30"
>>>>>>> origin/main
              >
                {SYMBOLS.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">
                    {s} — {fmtPrice(prices[s] ?? BASE_PRICES[s] ?? 0)}
                  </option>
                ))}
              </select>
            </div>

            <div>
<<<<<<< HEAD
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Direction</label>
=======
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Direction</label>
>>>>>>> origin/main
              <div className="grid grid-cols-2 gap-1.5">
                {(['BUY', 'SELL'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      direction === d
                        ? d === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-red-500/15 text-red-400 border border-red-500/25'
<<<<<<< HEAD
                        : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
=======
                        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
>>>>>>> origin/main
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
<<<<<<< HEAD
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Position size</label>
=======
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Position size</label>
>>>>>>> origin/main
              <div className="flex gap-1.5">
                {SIZE_PCTS.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setSizePct(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                      sizePct === s
<<<<<<< HEAD
                        ? 'bg-white/10 text-white border border-white/15'
                        : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
=======
                        ? 'bg-[var(--glass-bg)] text-[var(--foreground)] border border-[var(--border)]'
                        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
>>>>>>> origin/main
                    }`}
                  >
                    {SIZE_LABELS[i]}
                  </button>
                ))}
              </div>
<<<<<<< HEAD
              <div className="text-[10px] text-zinc-700 font-mono mt-1.5">
=======
              <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-1.5">
>>>>>>> origin/main
                ~{fmtMoney(Math.round(bal * sizePct))} committed
              </div>
            </div>

            <div className="pt-1">
<<<<<<< HEAD
              <div className="text-[10px] text-zinc-700 font-mono mb-2">
=======
              <div className="text-[10px] text-[var(--text-secondary)] font-mono mb-2">
>>>>>>> origin/main
                Current: {fmtPrice(prices[symbol] ?? BASE_PRICES[symbol] ?? 0)}
              </div>
              <button
                onClick={handleOpenPosition}
                disabled={actionLoading || loading}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${
                  direction === 'BUY'
                    ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/20'
                }`}
              >
                {direction} {SIZE_LABELS[SIZE_PCTS.indexOf(sizePct)]} of balance
              </button>
            </div>
          </div>

          {/* Open positions */}
<<<<<<< HEAD
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-white">
                Open positions{' '}
                <span className="text-zinc-700 ml-1">({portfolio?.positions.length ?? 0})</span>
=======
          <div className="bg-white/[0.02] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Open positions{' '}
                <span className="text-[var(--text-secondary)] ml-1">({portfolio?.positions.length ?? 0})</span>
>>>>>>> origin/main
              </div>
              {(portfolio?.positions.length ?? 0) > 0 && (
                <button
                  onClick={handleCloseAll}
                  disabled={actionLoading}
<<<<<<< HEAD
                  className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/20 px-2 py-1 rounded-lg disabled:opacity-50"
=======
                  className="text-[10px] text-[var(--text-secondary)] hover:text-red-400 transition-colors border border-[var(--border)] hover:border-red-500/20 px-2 py-1 rounded-lg disabled:opacity-50"
>>>>>>> origin/main
                >
                  Close all
                </button>
              )}
            </div>

            {loading ? (
<<<<<<< HEAD
              <div className="text-center py-12 text-xs text-zinc-700">Loading…</div>
            ) : (portfolio?.positions.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-700">No open positions</div>
=======
              <div className="text-center py-12 text-xs text-[var(--text-secondary)]">Loading…</div>
            ) : (portfolio?.positions.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-secondary)]">No open positions</div>
>>>>>>> origin/main
            ) : (
              <div className="space-y-2">
                {portfolio!.positions.map((pos) => {
                  const price = prices[pos.symbol] ?? pos.entryPrice;
                  const dirMult = pos.direction === 'BUY' ? 1 : -1;
                  const movePct = ((price - pos.entryPrice) / pos.entryPrice) * dirMult;
                  const pnl = pos.quantity * movePct;
                  return (
<<<<<<< HEAD
                    <div key={pos.id} className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-white">{pos.symbol}</span>
=======
                    <div key={pos.id} className="bg-white/[0.02] rounded-xl p-3 border border-[var(--border)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-[var(--foreground)]">{pos.symbol}</span>
>>>>>>> origin/main
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              pos.direction === 'BUY'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {pos.direction}
                          </span>
<<<<<<< HEAD
                          <span className="text-[10px] text-zinc-700 font-mono">{fmtMoney(pos.quantity)}</span>
                        </div>
                        <button
                          onClick={() => handleClose(pos.id)}
                          className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/20 px-2 py-1 rounded-lg"
=======
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">{fmtMoney(pos.quantity)}</span>
                        </div>
                        <button
                          onClick={() => handleClose(pos.id)}
                          className="text-[10px] text-[var(--text-secondary)] hover:text-red-400 transition-colors border border-[var(--border)] hover:border-red-500/20 px-2 py-1 rounded-lg"
>>>>>>> origin/main
                        >
                          Close
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
<<<<<<< HEAD
                        <span className="text-zinc-700">
=======
                        <span className="text-[var(--text-secondary)]">
>>>>>>> origin/main
                          {fmtPrice(pos.entryPrice)} → {fmtPrice(price)}
                        </span>
                        <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {fmtSignedMoney(pnl)}
                        </span>
                      </div>
                      {(pos.stopLoss ?? pos.takeProfit) && (
<<<<<<< HEAD
                        <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-zinc-700">
=======
                        <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-[var(--text-secondary)]">
>>>>>>> origin/main
                          {pos.stopLoss && <span>SL {fmtPrice(pos.stopLoss)}</span>}
                          {pos.takeProfit && <span>TP {fmtPrice(pos.takeProfit)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Signal integration */}
<<<<<<< HEAD
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">Signal feed</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] text-zinc-600">Auto-follow</span>
                <div
                  onClick={() => setAutoFollow((v) => !v)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    autoFollow ? 'bg-emerald-500/50' : 'bg-white/10'
=======
          <div className="bg-white/[0.02] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--foreground)]">Signal feed</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] text-[var(--text-secondary)]">Auto-follow</span>
                <div
                  onClick={() => setAutoFollow((v) => !v)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    autoFollow ? 'bg-emerald-500/50' : 'bg-[var(--glass-bg)]'
>>>>>>> origin/main
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      autoFollow ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>
            </div>

            {signals.length === 0 ? (
<<<<<<< HEAD
              <div className="text-center py-8 text-xs text-zinc-700">No signals available</div>
            ) : (
              <div className="space-y-2">
                {signals.map((sig) => (
                  <div key={sig.id} className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-white">{sig.symbol}</span>
=======
              <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No signals available</div>
            ) : (
              <div className="space-y-2">
                {signals.map((sig) => (
                  <div key={sig.id} className="bg-white/[0.02] rounded-xl p-3 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-[var(--foreground)]">{sig.symbol}</span>
>>>>>>> origin/main
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            sig.direction === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {sig.direction}
                        </span>
<<<<<<< HEAD
                        <span className="text-[10px] text-zinc-700">{sig.timeframe}</span>
=======
                        <span className="text-[10px] text-[var(--text-secondary)]">{sig.timeframe}</span>
>>>>>>> origin/main
                      </div>
                      <button
                        onClick={() => handleFollowSignal(sig)}
                        disabled={actionLoading}
                        className="text-[10px] text-emerald-600 hover:text-emerald-400 transition-colors border border-emerald-500/10 hover:border-emerald-500/25 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        Follow
                      </button>
                    </div>
<<<<<<< HEAD
                    <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-zinc-700">
=======
                    <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-[var(--text-secondary)]">
>>>>>>> origin/main
                      <span>E {fmtPrice(sig.entry)}</span>
                      <span>SL {fmtPrice(sig.stopLoss)}</span>
                      <span>TP {fmtPrice(sig.takeProfit)}</span>
                    </div>
                    <div className="mt-1">
<<<<<<< HEAD
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
=======
                      <div className="h-1 bg-[var(--glass-bg)] rounded-full overflow-hidden">
>>>>>>> origin/main
                        <div
                          className="h-full bg-emerald-500/50 rounded-full"
                          style={{ width: `${sig.confidence}%` }}
                        />
                      </div>
<<<<<<< HEAD
                      <div className="text-[9px] text-zinc-700 font-mono mt-0.5">{sig.confidence}% confidence</div>
=======
                      <div className="text-[9px] text-[var(--text-secondary)] font-mono mt-0.5">{sig.confidence}% confidence</div>
>>>>>>> origin/main
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Equity curve + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<<<<<<< HEAD
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-white">Equity curve</div>
              {tooltip.visible && (
                <div className="text-[10px] font-mono text-zinc-500">
=======
          <div className="lg:col-span-2 bg-white/[0.02] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-[var(--foreground)]">Equity curve</div>
              {tooltip.visible && (
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
>>>>>>> origin/main
                  {tooltip.date} — {fmtMoney(tooltip.equity)}
                </div>
              )}
            </div>
            <div className="relative h-48">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
              />
            </div>
          </div>

<<<<<<< HEAD
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <div className="text-xs font-semibold text-white mb-4">Performance stats</div>
            {!stats || stats.totalTrades === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-700">No trades yet</div>
=======
          <div className="bg-white/[0.02] border border-[var(--border)] rounded-2xl p-5">
            <div className="text-xs font-semibold text-[var(--foreground)] mb-4">Performance stats</div>
            {!stats || stats.totalTrades === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No trades yet</div>
>>>>>>> origin/main
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Win rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
                <StatCard label="Total trades" value={String(stats.totalTrades)} />
                <StatCard label="Avg P&L" value={fmtSignedMoney(stats.avgPnl)} color={stats.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <StatCard label="Profit factor" value={String(stats.profitFactor)} color={stats.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'} />
<<<<<<< HEAD
                <StatCard label="Sharpe" value={String(stats.sharpeRatio)} color={stats.sharpeRatio >= 1 ? 'text-emerald-400' : 'text-zinc-400'} />
                <StatCard label="Max drawdown" value={`${stats.maxDrawdown}%`} color={stats.maxDrawdown > 20 ? 'text-red-400' : 'text-zinc-400'} />
=======
                <StatCard label="Sharpe" value={String(stats.sharpeRatio)} color={stats.sharpeRatio >= 1 ? 'text-emerald-400' : 'text-[var(--text-secondary)]'} />
                <StatCard label="Max drawdown" value={`${stats.maxDrawdown}%`} color={stats.maxDrawdown > 20 ? 'text-red-400' : 'text-[var(--text-secondary)]'} />
>>>>>>> origin/main
                <StatCard label="Best trade" value={fmtMoney(stats.bestTrade)} color="text-emerald-400" />
                <StatCard label="Worst trade" value={fmtMoney(stats.worstTrade)} color="text-red-400" />
              </div>
            )}
          </div>
        </div>

        {/* Trade history */}
<<<<<<< HEAD
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-white">
              Trade history{' '}
              <span className="text-zinc-700 ml-1">({histTotal})</span>
            </div>
            {histPages > 1 && (
              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                <button
                  onClick={() => setHistPage((p) => Math.max(0, p - 1))}
                  disabled={histPage === 0}
                  className="px-2 py-1 rounded-lg border border-white/5 hover:border-white/10 disabled:opacity-30 transition-colors"
=======
        <div className="bg-white/[0.02] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-[var(--foreground)]">
              Trade history{' '}
              <span className="text-[var(--text-secondary)] ml-1">({histTotal})</span>
            </div>
            {histPages > 1 && (
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                <button
                  onClick={() => setHistPage((p) => Math.max(0, p - 1))}
                  disabled={histPage === 0}
                  className="px-2 py-1 rounded-lg border border-[var(--border)] hover:border-[var(--border)] disabled:opacity-30 transition-colors"
>>>>>>> origin/main
                >
                  ←
                </button>
                <span className="font-mono">{histPage + 1}/{histPages}</span>
                <button
                  onClick={() => setHistPage((p) => Math.min(histPages - 1, p + 1))}
                  disabled={histPage >= histPages - 1}
<<<<<<< HEAD
                  className="px-2 py-1 rounded-lg border border-white/5 hover:border-white/10 disabled:opacity-30 transition-colors"
=======
                  className="px-2 py-1 rounded-lg border border-[var(--border)] hover:border-[var(--border)] disabled:opacity-30 transition-colors"
>>>>>>> origin/main
                >
                  →
                </button>
              </div>
            )}
          </div>

          {histTotal === 0 ? (
<<<<<<< HEAD
            <div className="text-center py-8 text-xs text-zinc-700">No closed trades yet</div>
=======
            <div className="text-center py-12 space-y-2">
              <div className="text-xs text-[var(--text-secondary)]">No trades yet</div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Open a position from the order form or{' '}
                <Link href="/dashboard" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2 transition-colors">
                  follow a signal
                </Link>{' '}
                to start paper trading.
              </div>
            </div>
>>>>>>> origin/main
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
<<<<<<< HEAD
                  <tr className="text-zinc-700 uppercase text-[9px] tracking-wider border-b border-white/5">
=======
                  <tr className="text-[var(--text-secondary)] uppercase text-[9px] tracking-wider border-b border-[var(--border)]">
>>>>>>> origin/main
                    <th className="pb-2 text-left font-normal">Symbol</th>
                    <th className="pb-2 text-left font-normal">Dir</th>
                    <th className="pb-2 text-right font-normal">Entry</th>
                    <th className="pb-2 text-right font-normal">Exit</th>
                    <th className="pb-2 text-right font-normal">P&L</th>
                    <th className="pb-2 text-right font-normal">%</th>
                    <th className="pb-2 text-right font-normal hidden md:table-cell">Duration</th>
                    <th className="pb-2 text-right font-normal hidden md:table-cell">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {histSlice.map((t: Trade) => (
                    <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
<<<<<<< HEAD
                      <td className="py-2 text-zinc-300">{t.symbol}</td>
                      <td className={`py-2 font-bold ${t.direction === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.direction}
                      </td>
                      <td className="py-2 text-right text-zinc-500">{fmtPrice(t.entryPrice)}</td>
                      <td className="py-2 text-right text-zinc-500">{fmtPrice(t.exitPrice)}</td>
                      <td className={`py-2 text-right tabular-nums ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtSignedMoney(t.pnl)}
                      </td>
                      <td className={`py-2 text-right tabular-nums ${t.pnlPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                      </td>
                      <td className="py-2 text-right text-zinc-700 hidden md:table-cell">
                        {fmtTradeDuration(t.openedAt, t.closedAt)}
                      </td>
                      <td className="py-2 text-right text-zinc-700 hidden md:table-cell">{t.exitReason}</td>
=======
                      <td className="py-2 text-[var(--foreground)]">{t.symbol}</td>
                      <td className={`py-2 font-bold ${t.direction === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.direction}
                      </td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">{fmtPrice(t.entryPrice)}</td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">{fmtPrice(t.exitPrice)}</td>
                      <td className={`py-2 text-right tabular-nums ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtSignedMoney(t.pnl)}
                      </td>
                      <td className={`py-2 text-right tabular-nums ${(t.pnlPercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {(t.pnlPercent ?? 0) >= 0 ? '+' : ''}{(t.pnlPercent ?? 0).toFixed(2)}%
                      </td>
                      <td className="py-2 text-right text-[var(--text-secondary)] hidden md:table-cell">
                        {fmtTradeDuration(t.openedAt, t.closedAt)}
                      </td>
                      <td className="py-2 text-right text-[var(--text-secondary)] hidden md:table-cell">{t.exitReason}</td>
>>>>>>> origin/main
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reset modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
<<<<<<< HEAD
          <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-sm font-semibold text-white mb-2">Reset paper account?</div>
            <div className="text-xs text-zinc-500 mb-6">
              This will wipe all positions, history, and equity curve. Your balance resets to{' '}
              <span className="text-white font-mono">$10,000</span>. This cannot be undone.
=======
          <div className="bg-[#0e0e0e] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Reset paper account?</div>
            <div className="text-xs text-[var(--text-secondary)] mb-6">
              This will wipe all positions, history, and equity curve. Your balance resets to{' '}
              <span className="text-[var(--foreground)] font-mono">$10,000</span>. This cannot be undone.
>>>>>>> origin/main
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReset(false)}
<<<<<<< HEAD
                className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:border-white/20 transition-colors"
=======
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] border border-[var(--border)] hover:border-white/20 transition-colors"
>>>>>>> origin/main
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
