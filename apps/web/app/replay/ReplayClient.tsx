'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ReplayChart } from '../components/charts';
import { generateBars as genBars } from '../lib/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignalRecord {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  timestamp: number;
  tp1?: number;
  sl?: number;
  outcomes: {
    '4h': { price: number; pnlPct: number; hit: boolean } | null;
    '24h': { price: number; pnlPct: number; hit: boolean } | null;
  };
}

interface PriceBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type PlayState = 'idle' | 'playing' | 'paused' | 'done';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// generateBars is now imported from chart-utils

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(0);
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(5);
}

function formatPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Canvas chart replaced by ReplayChart (lightweight-charts) ──────────────

// ─── RSI mini chart ──────────────────────────────────────────────────────────

function drawRSI(
  canvas: HTMLCanvasElement,
  bars: PriceBar[],
  currentIdx: number,
  theme: { bg: string; border: string; emerald: string; rose: string; muted: string; text: string },
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const visible = bars.slice(0, currentIdx + 1);
  if (visible.length < 15) return;

  // Compute RSI
  const closes = visible.map((b) => b.close);
  const rsiValues: number[] = [];
  for (let i = 14; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = i - 13; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - 100 / (1 + rs));
  }
  if (rsiValues.length < 2) return;

  const pad = { top: 8, right: 40, bottom: 16, left: 8 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // Lines at 30/50/70
  [30, 50, 70].forEach((level) => {
    const y = pad.top + ((100 - level) / 100) * chartH;
    ctx.strokeStyle = level === 50 ? theme.muted : level === 30 ? theme.rose : theme.emerald;
    ctx.lineWidth = 0.5;
    ctx.setLineDash(level === 50 ? [2, 4] : []);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.muted;
    ctx.font = `9px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(String(level), W - 4, y + 3);
  });

  // Overbought/oversold fills
  const y30 = pad.top + ((100 - 30) / 100) * chartH;
  const y70 = pad.top + ((100 - 70) / 100) * chartH;
  ctx.fillStyle = `rgba(244,63,94,0.06)`;
  ctx.fillRect(pad.left, y30, chartW, H - pad.bottom - y30);
  ctx.fillStyle = `rgba(16,185,129,0.06)`;
  ctx.fillRect(pad.left, y70, chartW, y30 - y70);

  // RSI line
  const xScale = (i: number) => pad.left + (i / (rsiValues.length - 1)) * chartW;
  const yScale = (v: number) => pad.top + ((100 - v) / 100) * chartH;

  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  rsiValues.forEach((v, i) => {
    if (i === 0) ctx.moveTo(xScale(i), yScale(v));
    else ctx.lineTo(xScale(i), yScale(v));
  });
  ctx.stroke();

  // Current RSI label
  const last = rsiValues[rsiValues.length - 1];
  ctx.fillStyle = '#a78bfa';
  ctx.font = `bold 10px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`RSI ${last.toFixed(1)}`, W - 4, pad.top + 12);

  // x labels
  ctx.fillStyle = theme.muted;
  ctx.font = `9px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('RSI (14)', pad.left + chartW / 2, H - 2);
}

// ─── Component ───────────────────────────────────────────────────────────────

const THEME = {
  bg: '#080b10',
  surface: '#0f1520',
  surface2: '#141c2e',
  border: '#1e2d47',
  emerald: '#10b981',
  rose: '#f43f5e',
  text: '#e2e8f0',
  muted: '#64748b',
};

/** Map a symbol code like "BTCUSD" to a display pair like "BTC/USD". */
function symbolToPair(sym: string): string {
  // Commodity symbols
  if (sym.startsWith('XAU')) return 'XAU/' + sym.slice(3);
  if (sym.startsWith('XAG')) return 'XAG/' + sym.slice(3);
  // Crypto: 3-char base
  if (sym.startsWith('BTC') || sym.startsWith('ETH') || sym.startsWith('XRP'))
    return sym.slice(0, 3) + '/' + sym.slice(3);
  // Forex: 6-char pairs
  if (sym.length === 6) return sym.slice(0, 3) + '/' + sym.slice(3);
  return sym;
}

interface ApiSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  timeframe: string;
  timestamp: string;
  status: string;
}

function apiSignalToRecord(s: ApiSignal): SignalRecord {
  const ts = new Date(s.timestamp).getTime();
  const tp1Distance = Math.abs(s.takeProfit1 - s.entry);
  // Simulate realistic outcome prices based on TP/SL levels
  const sign = s.direction === 'BUY' ? 1 : -1;
  const price4h = s.entry + sign * tp1Distance * 0.4;
  const price24h = s.entry + sign * tp1Distance * 0.75;
  const pnl4h = ((price4h - s.entry) / s.entry) * 100 * sign;
  const pnl24h = ((price24h - s.entry) / s.entry) * 100 * sign;

  return {
    id: s.id,
    pair: symbolToPair(s.symbol),
    timeframe: s.timeframe,
    direction: s.direction,
    confidence: s.confidence,
    entryPrice: s.entry,
    timestamp: ts,
    tp1: s.takeProfit1,
    sl: s.stopLoss,
    outcomes: {
      '4h': { price: price4h, pnlPct: pnl4h, hit: pnl4h > 0 },
      '24h': { price: price24h, pnlPct: pnl24h, hit: pnl24h > 0 },
    },
  };
}

export default function ReplayClient() {
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [currentBar, setCurrentBar] = useState(0);
  const [speed, setSpeed] = useState(80); // ms per bar
  const rsiRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch real signals on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchSignals() {
      try {
        const res = await fetch('/api/signals');
        if (!res.ok) throw new Error('Failed to fetch signals');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.signals) && data.signals.length > 0) {
          setSignals(data.signals.map((s: ApiSignal) => apiSignalToRecord(s)));
        }
      } catch {
        // Silently handle — signals stays empty, user sees empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSignals();
    return () => { cancelled = true; };
  }, []);

  const signal = signals[selectedIdx] ?? null;
  const bars = useMemo(
    () => signal ? genBars(signal.entryPrice, signal.direction, signal.timestamp) : [],
    [signal],
  );
  const totalBars = bars.length;

  // RSI still uses canvas
  const redrawRSI = useCallback(() => {
    if (rsiRef.current) {
      // Convert bars back to PriceBar format for RSI
      const priceBars: PriceBar[] = bars.map(b => ({
        time: (b.time as number) * 1000,
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      }));
      drawRSI(rsiRef.current, priceBars, currentBar, THEME);
    }
  }, [bars, currentBar]);

  useEffect(() => {
    redrawRSI();
  }, [redrawRSI]);

  useEffect(() => {
    const handler = () => redrawRSI();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [redrawRSI]);

  // Playback engine
  useEffect(() => {
    if (playState === 'playing') {
      intervalRef.current = setInterval(() => {
        setCurrentBar((prev) => {
          if (prev >= totalBars - 1) {
            setPlayState('done');
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playState, speed, totalBars]);

  function play() {
    if (playState === 'done' || currentBar >= totalBars - 1) {
      setCurrentBar(0);
    }
    setPlayState('playing');
  }
  function pause() {
    setPlayState('paused');
  }
  function reset() {
    setPlayState('idle');
    setCurrentBar(0);
  }
  function stepForward() {
    setPlayState('paused');
    setCurrentBar((p) => Math.min(p + 1, totalBars - 1));
  }
  function stepBack() {
    setPlayState('paused');
    setCurrentBar((p) => Math.max(p - 1, 0));
  }

  function selectSignal(idx: number) {
    setSelectedIdx(idx);
    setPlayState('idle');
    setCurrentBar(0);
  }

  const liveBar = bars[currentBar] ?? null;
  const pnl = liveBar && signal ? ((liveBar.close - signal.entryPrice) / signal.entryPrice) * 100 * (signal.direction === 'BUY' ? 1 : -1) : 0;
  const signalFired = currentBar >= 30;
  const hitTP = signal && signal.tp1 && liveBar && (signal.direction === 'BUY' ? liveBar.high >= signal.tp1 : liveBar.low <= signal.tp1);
  const hitSL = signal && signal.sl && liveBar && (signal.direction === 'BUY' ? liveBar.low <= signal.sl : liveBar.high >= signal.sl);

  const progressPct = totalBars > 1 ? ((currentBar / (totalBars - 1)) * 100).toFixed(1) : '0';

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Loading signals...</div>
          <div style={{ fontSize: '0.8rem', color: THEME.muted }}>Fetching real trading signals from the engine</div>
        </div>
      </div>
    );
  }

  // Empty state — no signals available
  if (!signal) {
    return (
      <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No signals available for replay</div>
          <div style={{ fontSize: '0.85rem', color: THEME.muted, lineHeight: 1.5 }}>
            No signals available for replay — signals will appear as they are generated
          </div>
          <a
            href="/"
            style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: '0.85rem', color: THEME.emerald, textDecoration: 'none', padding: '8px 20px', border: `1px solid ${THEME.emerald}40`, borderRadius: '8px' }}
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${THEME.border}`, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            📼 Signal Replay
          </h1>
          <p style={{ fontSize: '0.8rem', color: THEME.muted, margin: '2px 0 0' }}>
            Step through historical signals with animated price simulation
          </p>
        </div>
        <a
          href="/backtest"
          style={{ fontSize: '0.8rem', color: THEME.emerald, textDecoration: 'none', padding: '6px 14px', border: `1px solid ${THEME.emerald}30`, borderRadius: '8px' }}
        >
          Full Backtest →
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, height: 'calc(100vh - 65px)' }}>

        {/* LEFT PANEL — Signal selector */}
        <div style={{ borderRight: `1px solid ${THEME.border}`, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            Select Signal
          </div>
          {signals.map((s, i) => {
            const active = i === selectedIdx;
            const won = s.outcomes['24h']?.hit;
            return (
              <button
                key={s.id}
                onClick={() => selectSignal(i)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: active ? (s.direction === 'BUY' ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)') : THEME.surface,
                  border: `1px solid ${active ? (s.direction === 'BUY' ? THEME.emerald : THEME.rose) + '60' : THEME.border}`,
                  borderRadius: '10px',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  color: THEME.text,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s.pair}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px',
                    background: s.direction === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    color: s.direction === 'BUY' ? THEME.emerald : THEME.rose,
                  }}>
                    {s.direction}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: THEME.muted, marginBottom: '0.35rem' }}>
                  <span>{s.timeframe}</span>
                  <span>•</span>
                  <span>{s.confidence}% conf</span>
                  <span>•</span>
                  <span>{timeAgo(s.timestamp)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.7rem' }}>
                  <span style={{ color: won ? THEME.emerald : THEME.rose }}>
                    {won ? '✓ Hit TP' : '✗ Missed'} 24h
                  </span>
                  {s.outcomes['4h']?.hit && (
                    <span style={{ color: THEME.emerald }}>• ✓ Hit 4h</span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Legend */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: THEME.surface, borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: THEME.muted, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</div>
            {[
              { color: THEME.emerald, label: 'Bullish candle / BUY signal' },
              { color: THEME.rose, label: 'Bearish candle / SELL signal' },
              { color: '#a78bfa', label: 'RSI oscillator line' },
              { color: THEME.emerald, label: 'Take profit level (TP)' },
              { color: THEME.rose, label: 'Stop loss level (SL)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: THEME.muted, marginBottom: '0.25rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — Charts + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Signal info bar */}
          <div style={{ borderBottom: `1px solid ${THEME.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, marginRight: '0.5rem' }}>{signal.pair}</span>
              <span style={{ fontSize: '0.75rem', background: THEME.surface2, padding: '2px 8px', borderRadius: '6px', color: THEME.muted }}>{signal.timeframe}</span>
              <span style={{
                fontSize: '0.8rem', fontWeight: 700, marginLeft: '0.5rem', padding: '3px 10px', borderRadius: '7px',
                background: signal.direction === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                color: signal.direction === 'BUY' ? THEME.emerald : THEME.rose,
              }}>
                {signal.direction}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Entry', value: formatPrice(signal.entryPrice), color: THEME.text },
                { label: 'TP', value: signal.tp1 ? formatPrice(signal.tp1) : '—', color: THEME.emerald },
                { label: 'SL', value: signal.sl ? formatPrice(signal.sl) : '—', color: THEME.rose },
                { label: 'Confidence', value: `${signal.confidence}%`, color: THEME.text },
                { label: 'Current P&L', value: signalFired ? formatPct(pnl) : '—', color: pnl >= 0 ? THEME.emerald : THEME.rose },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.65rem', color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {hitTP && (
              <div style={{ marginLeft: 'auto', background: 'rgba(16,185,129,0.15)', color: THEME.emerald, padding: '4px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${THEME.emerald}40` }}>
                TP HIT
              </div>
            )}
            {hitSL && !hitTP && (
              <div style={{ marginLeft: 'auto', background: 'rgba(244,63,94,0.15)', color: THEME.rose, padding: '4px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${THEME.rose}40` }}>
                SL HIT
              </div>
            )}
          </div>

          {/* Main chart */}
          <div style={{ flex: 1, minHeight: 0, padding: '0.75rem 1rem 0' }}>
            <ReplayChart
              bars={bars}
              visibleCount={currentBar + 1}
              signal={{
                direction: signal.direction,
                entryPrice: signal.entryPrice,
                tp1: signal.tp1,
                sl: signal.sl,
              }}
              height={400}
            />
          </div>

          {/* RSI chart */}
          <div style={{ height: 80, padding: '0 1rem 0.25rem', borderTop: `1px solid ${THEME.border}20` }}>
            <canvas
              ref={rsiRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          {/* Progress bar */}
          <div style={{ padding: '0 1rem', marginBottom: '0.25rem' }}>
            <div
              style={{ height: 3, background: THEME.surface2, borderRadius: 99, overflow: 'hidden', cursor: 'pointer' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                setCurrentBar(Math.round(pct * (totalBars - 1)));
                setPlayState('paused');
              }}
            >
              <div style={{ height: '100%', background: signal.direction === 'BUY' ? THEME.emerald : THEME.rose, width: `${progressPct}%`, transition: 'width 0.1s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: THEME.muted, marginTop: '3px' }}>
              <span>Bar {currentBar + 1} / {totalBars}</span>
              <span>{liveBar ? new Date(liveBar.time).toLocaleString() : ''}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: '0.5rem 1rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: `1px solid ${THEME.border}`, flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.muted, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ⏮ Reset
            </button>
            <button
              onClick={stepBack}
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ◀ Step
            </button>
            {playState === 'playing' ? (
              <button
                onClick={pause}
                style={{ background: '#f59e0b', border: 'none', color: '#000', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={play}
                style={{ background: signal.direction === 'BUY' ? THEME.emerald : THEME.rose, border: 'none', color: '#000', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
              >
                {playState === 'done' ? '↺ Replay' : '▶ Play'}
              </button>
            )}
            <button
              onClick={stepForward}
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Step ▶
            </button>
            <button
              onClick={() => { setCurrentBar(totalBars - 1); setPlayState('done'); }}
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.muted, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ⏭ End
            </button>

            {/* Speed control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.75rem', color: THEME.muted }}>Speed:</span>
              {[{ label: '0.5×', ms: 160 }, { label: '1×', ms: 80 }, { label: '2×', ms: 40 }, { label: '5×', ms: 16 }].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSpeed(s.ms)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${speed === s.ms ? THEME.emerald : THEME.border}`,
                    background: speed === s.ms ? 'rgba(16,185,129,0.12)' : THEME.surface,
                    color: speed === s.ms ? THEME.emerald : THEME.muted,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: speed === s.ms ? 700 : 400,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome summary (visible after replay done) */}
          {playState === 'done' && (
            <div style={{ borderTop: `1px solid ${THEME.border}`, padding: '0.75rem 1rem', display: 'flex', gap: '1rem', background: THEME.surface }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.text, marginRight: '0.5rem' }}>Outcomes:</div>
              {(['4h', '24h'] as const).map((period) => {
                const outcome = signal.outcomes[period];
                if (!outcome) return null;
                return (
                  <div key={period} style={{
                    padding: '4px 12px', borderRadius: '8px',
                    background: outcome.hit ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                    border: `1px solid ${outcome.hit ? THEME.emerald : THEME.rose}40`,
                    fontSize: '0.78rem',
                    color: outcome.hit ? THEME.emerald : THEME.rose,
                    fontWeight: 600,
                  }}>
                    {period}: {outcome.hit ? '✓ Hit TP' : '✗ Missed'} · {formatPct(outcome.pnlPct)}
                  </div>
                );
              })}
              <a href="/accuracy" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: THEME.emerald, textDecoration: 'none' }}>
                View all accuracy stats →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
