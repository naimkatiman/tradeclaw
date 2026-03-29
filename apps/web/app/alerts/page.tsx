'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { PriceAlert } from '../../lib/price-alerts';

const SUPPORTED_SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD',
  'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD', 'USDCAD',
];
import {
  requestNotificationPermission,
  getNotificationPermission,
  sendAlertTriggeredNotification,
  registerServiceWorker,
} from '../../lib/notifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function distancePct(current: number, target: number): number {
  return Math.abs(((target - current) / current) * 100);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface CreateAlertModalProps {
  onClose: () => void;
  onCreated: (alert: PriceAlert) => void;
  prefillSymbol?: string;
  prefillPrice?: number;
}

const BASE_PRICES: Record<string, number> = {
  BTCUSD: 87500, ETHUSD: 3400, XAUUSD: 2180, EURUSD: 1.083,
  GBPUSD: 1.264, USDJPY: 151.2, XAGUSD: 24.8, AUDUSD: 0.654,
  XRPUSD: 0.615, USDCAD: 1.365,
};

function CreateAlertModal({ onClose, onCreated, prefillSymbol, prefillPrice }: CreateAlertModalProps) {
  const [symbol, setSymbol] = useState(prefillSymbol ?? 'BTCUSD');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [note, setNote] = useState('');
  const [percentMove, setPercentMove] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentPrice = prefillPrice ?? BASE_PRICES[symbol] ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const tp = parseFloat(targetPrice);
    if (isNaN(tp) || tp <= 0) {
      setError('Enter a valid target price');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          direction,
          targetPrice: tp,
          currentPrice,
          note: note || undefined,
          percentMove: percentMove ? parseFloat(percentMove) : undefined,
          timeWindow: timeWindow || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onCreated(data.alert);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
<<<<<<< HEAD
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">New Price Alert</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors">
=======
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--foreground)]">New Price Alert</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors">
>>>>>>> origin/main
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol */}
          <div>
<<<<<<< HEAD
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Symbol</label>
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
=======
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Symbol</label>
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
>>>>>>> origin/main
            >
              {SUPPORTED_SYMBOLS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Direction toggle */}
          <div>
<<<<<<< HEAD
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Direction</label>
=======
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Direction</label>
>>>>>>> origin/main
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('above')}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  direction === 'above'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
<<<<<<< HEAD
                    : 'bg-white/[0.03] text-zinc-500 border-white/5 hover:border-white/10'
=======
                    : 'bg-white/[0.03] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border)]'
>>>>>>> origin/main
                }`}
              >
                ▲ Above
              </button>
              <button
                type="button"
                onClick={() => setDirection('below')}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  direction === 'below'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
<<<<<<< HEAD
                    : 'bg-white/[0.03] text-zinc-500 border-white/5 hover:border-white/10'
=======
                    : 'bg-white/[0.03] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border)]'
>>>>>>> origin/main
                }`}
              >
                ▼ Below
              </button>
            </div>
          </div>

          {/* Target price */}
          <div>
<<<<<<< HEAD
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Target Price
              {currentPrice > 0 && (
                <span className="ml-2 text-zinc-600 normal-case">
=======
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
              Target Price
              {currentPrice > 0 && (
                <span className="ml-2 text-[var(--text-secondary)] normal-case">
>>>>>>> origin/main
                  (current: {formatPrice(currentPrice)})
                </span>
              )}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder={formatPrice(currentPrice * (direction === 'above' ? 1.02 : 0.98))}
<<<<<<< HEAD
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-700"
=======
              className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] font-mono tabular-nums focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-[var(--text-secondary)]"
>>>>>>> origin/main
              required
            />
          </div>

          {/* Optional % move + time window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
<<<<<<< HEAD
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">% Move (opt)</label>
=======
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">% Move (opt)</label>
>>>>>>> origin/main
              <input
                type="number"
                step="0.1"
                min="0"
                value={percentMove}
                onChange={e => setPercentMove(e.target.value)}
                placeholder="e.g. 2.5"
<<<<<<< HEAD
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-700"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Time Window (opt)</label>
              <select
                value={timeWindow}
                onChange={e => setTimeWindow(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
=======
                className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] font-mono focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Time Window (opt)</label>
              <select
                value={timeWindow}
                onChange={e => setTimeWindow(e.target.value)}
                className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500/50 transition-colors"
>>>>>>> origin/main
              >
                <option value="">Any</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
                <option value="1w">1w</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
<<<<<<< HEAD
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Note (opt)</label>
=======
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Note (opt)</label>
>>>>>>> origin/main
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Breakout above resistance"
              maxLength={100}
<<<<<<< HEAD
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-700"
=======
              className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-[var(--text-secondary)]"
>>>>>>> origin/main
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Alert'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert card
// ---------------------------------------------------------------------------

interface AlertCardProps {
  alert: PriceAlert;
  onDelete: (id: string) => void;
  onEdit: (alert: PriceAlert) => void;
  flash?: boolean;
}

function AlertCard({ alert, onDelete, onEdit, flash }: AlertCardProps) {
  const isAbove = alert.direction === 'above';
  const distance = distancePct(alert.currentPrice, alert.targetPrice);
  const isClose = distance < 1;
  const isTriggered = alert.status === 'triggered';

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        flash ? 'animate-pulse' : ''
      } ${
        isTriggered
          ? isAbove
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5'
          : isClose
          ? isAbove
            ? 'border-emerald-500/40 bg-emerald-500/8 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
            : 'border-rose-500/40 bg-rose-500/8 shadow-[0_0_12px_rgba(244,63,94,0.08)]'
<<<<<<< HEAD
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
=======
          : 'border-[var(--border)] bg-white/[0.02] hover:border-[var(--border)]'
>>>>>>> origin/main
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
<<<<<<< HEAD
            <span className="font-mono font-bold text-sm text-white">{alert.symbol}</span>
=======
            <span className="font-mono font-bold text-sm text-[var(--foreground)]">{alert.symbol}</span>
>>>>>>> origin/main
            <span className={`text-xs font-semibold ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAbove ? '▲ Above' : '▼ Below'}
            </span>
            {isClose && !isTriggered && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                CLOSE
              </span>
            )}
            {isTriggered && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                isAbove
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
              }`}>
                TRIGGERED
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <div>
<<<<<<< HEAD
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Target</div>
=======
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Target</div>
>>>>>>> origin/main
              <div className={`text-base font-mono font-bold tabular-nums ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPrice(alert.targetPrice)}
              </div>
            </div>
            <div>
<<<<<<< HEAD
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">At Creation</div>
              <div className="text-sm font-mono tabular-nums text-zinc-400">
=======
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">At Creation</div>
              <div className="text-sm font-mono tabular-nums text-[var(--text-secondary)]">
>>>>>>> origin/main
                {formatPrice(alert.currentPrice)}
              </div>
            </div>
            {!isTriggered && (
              <div>
<<<<<<< HEAD
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Distance</div>
                <div className={`text-sm font-mono tabular-nums ${isClose ? 'text-amber-400' : 'text-zinc-500'}`}>
=======
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Distance</div>
                <div className={`text-sm font-mono tabular-nums ${isClose ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
>>>>>>> origin/main
                  {distance.toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {alert.note && (
<<<<<<< HEAD
            <p className="mt-2 text-xs text-zinc-600 truncate">{alert.note}</p>
          )}

          <div className="mt-2 text-[10px] text-zinc-700 font-mono">
=======
            <p className="mt-2 text-xs text-[var(--text-secondary)] truncate">{alert.note}</p>
          )}

          <div className="mt-2 text-[10px] text-[var(--text-secondary)] font-mono">
>>>>>>> origin/main
            {isTriggered && alert.triggeredAt
              ? `Triggered ${timeAgo(alert.triggeredAt)}`
              : `Created ${timeAgo(alert.createdAt)}`}
            {alert.timeWindow && ` · ${alert.timeWindow}`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isTriggered && (
            <button
              onClick={() => onEdit(alert)}
<<<<<<< HEAD
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
=======
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--glass-bg)] transition-colors"
>>>>>>> origin/main
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(alert.id)}
<<<<<<< HEAD
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
=======
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
>>>>>>> origin/main
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit modal (reuses create modal logic but patches existing alert)
// ---------------------------------------------------------------------------

interface EditAlertModalProps {
  alert: PriceAlert;
  onClose: () => void;
  onUpdated: (alert: PriceAlert) => void;
}

function EditAlertModal({ alert, onClose, onUpdated }: EditAlertModalProps) {
  const [direction, setDirection] = useState<'above' | 'below'>(alert.direction);
  const [targetPrice, setTargetPrice] = useState(String(alert.targetPrice));
  const [note, setNote] = useState(alert.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const tp = parseFloat(targetPrice);
    if (isNaN(tp) || tp <= 0) { setError('Enter a valid target price'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, targetPrice: tp, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onUpdated(data.alert);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
<<<<<<< HEAD
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Edit Alert — <span className="font-mono text-emerald-400">{alert.symbol}</span></h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors">
=======
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Edit Alert — <span className="font-mono text-emerald-400">{alert.symbol}</span></h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors">
>>>>>>> origin/main
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
<<<<<<< HEAD
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection('above')} className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${direction === 'above' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/[0.03] text-zinc-500 border-white/5'}`}>▲ Above</button>
              <button type="button" onClick={() => setDirection('below')} className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${direction === 'below' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-white/[0.03] text-zinc-500 border-white/5'}`}>▼ Below</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Target Price</label>
            <input type="number" step="any" min="0" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500/50 transition-colors" required />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Note (opt)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} maxLength={100} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-700" />
=======
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection('above')} className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${direction === 'above' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/[0.03] text-[var(--text-secondary)] border-[var(--border)]'}`}>▲ Above</button>
              <button type="button" onClick={() => setDirection('below')} className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${direction === 'below' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-white/[0.03] text-[var(--text-secondary)] border-[var(--border)]'}`}>▼ Below</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Target Price</label>
            <input type="number" step="any" min="0" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] font-mono tabular-nums focus:outline-none focus:border-emerald-500/50 transition-colors" required />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Note (opt)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} maxLength={100} className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-[var(--text-secondary)]" />
>>>>>>> origin/main
          </div>
          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page (inner — uses useSearchParams, needs Suspense wrapper)
// ---------------------------------------------------------------------------

function AlertsPageInner() {
  const searchParams = useSearchParams();
  const prefillSymbol = searchParams.get('symbol') ?? undefined;
  const prefillPrice = searchParams.get('price') ? parseFloat(searchParams.get('price')!) : undefined;

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAlert, setEditAlert] = useState<PriceAlert | null>(null);
  const autoOpened = useRef(false);
  const [notifPerm, setNotifPerm] = useState<string>('default');
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<{
    totalActive: number;
    triggeredToday: number;
    mostWatchedSymbol: string | null;
  } | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const checkAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/check', { method: 'POST' });
      const data = await res.json();
      if (data.triggered && data.triggered.length > 0) {
        const newFlash = new Set<string>(data.triggered.map((a: PriceAlert) => a.id));
        setFlashIds(newFlash);
        setTimeout(() => setFlashIds(new Set()), 3000);

        // Fire browser notifications
        for (const a of data.triggered as PriceAlert[]) {
          sendAlertTriggeredNotification({
            symbol: a.symbol,
            direction: a.direction,
            targetPrice: a.targetPrice,
            currentPrice: a.currentPrice,
          });
        }

        // Refresh alerts list
        fetchAlerts();
        fetchStats();
      }
    } catch {
      // ignore
    }
  }, [fetchAlerts, fetchStats]);

  useEffect(() => {
    registerServiceWorker();
    setNotifPerm(getNotificationPermission());
    fetchAlerts();
    fetchStats();
    // Auto-open create modal if navigated from signal page
    if ((prefillSymbol || prefillPrice) && !autoOpened.current) {
      autoOpened.current = true;
      setShowCreate(true);
    }
    // Check alerts every 30s
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchStats, checkAlerts, prefillSymbol, prefillPrice]);

  async function handleEnableNotifications() {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
  }

  function handleDelete(id: string) {
    fetch(`/api/alerts/${id}`, { method: 'DELETE' }).then(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      fetchStats();
    }).catch(() => {/* ignore */});
  }

  function handleCreated(alert: PriceAlert) {
    setAlerts(prev => [alert, ...prev]);
    fetchStats();
  }

  function handleUpdated(alert: PriceAlert) {
    setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
  }

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered');

  return (
<<<<<<< HEAD
    <div className="min-h-[100dvh] bg-[#050505] text-white pb-20 md:pb-8">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
=======
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
>>>>>>> origin/main
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {notifPerm !== 'granted' && notifPerm !== 'unsupported' && notifPerm !== 'denied' && (
              <button
                onClick={handleEnableNotifications}
<<<<<<< HEAD
                className="text-xs text-zinc-500 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
=======
                className="text-xs text-[var(--text-secondary)] hover:text-emerald-400 border border-[var(--border)] hover:border-emerald-500/30 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
>>>>>>> origin/main
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                Enable Notifications
              </button>
            )}
            {notifPerm === 'granted' && (
              <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                Notifications on
              </span>
            )}
<<<<<<< HEAD
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
=======
            <Link href="/dashboard" className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
>>>>>>> origin/main
              Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
<<<<<<< HEAD
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
=======
            <h1 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
>>>>>>> origin/main
              Price Alerts
              {activeAlerts.length > 0 && (
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-0.5 font-mono tabular-nums">
                  {activeAlerts.length}
                </span>
              )}
            </h1>
<<<<<<< HEAD
            <p className="text-xs text-zinc-600 mt-0.5">Set target price triggers with browser notifications</p>
=======
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Set target price triggers with browser notifications</p>
>>>>>>> origin/main
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Alert
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: 'Active', value: stats.totalActive, color: 'text-emerald-400' },
              { label: 'Triggered Today', value: stats.triggeredToday, color: 'text-amber-400' },
<<<<<<< HEAD
              { label: 'Top Symbol', value: stats.mostWatchedSymbol ?? '—', color: 'text-zinc-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
                <div className={`text-sm font-bold font-mono tabular-nums ${color}`}>{value}</div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{label}</div>
=======
              { label: 'Top Symbol', value: stats.mostWatchedSymbol ?? '—', color: 'text-[var(--foreground)]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.02] border border-[var(--border)] rounded-xl px-3 py-3 text-center">
                <div className={`text-sm font-bold font-mono tabular-nums ${color}`}>{value}</div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">{label}</div>
>>>>>>> origin/main
              </div>
            ))}
          </div>
        )}

        {loading ? (
<<<<<<< HEAD
          <div className="text-center py-16 text-zinc-700 text-sm">Loading alerts…</div>
=======
          <div className="text-center py-16 text-[var(--text-secondary)] text-sm">Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-xl">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-[var(--text-secondary)]">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div className="text-[var(--text-secondary)] text-sm mb-1">No price alerts configured</div>
            <p className="text-[var(--text-secondary)] text-xs mb-4">Create an alert to get notified when prices reach your targets</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create First Alert
            </button>
          </div>
>>>>>>> origin/main
        ) : (
          <>
            {/* Active alerts */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
<<<<<<< HEAD
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Active <span className="text-zinc-700">({activeAlerts.length})</span>
                </h2>
              </div>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/[0.06] rounded-xl">
                  <div className="text-zinc-700 text-sm mb-1">No active alerts</div>
                  <button onClick={() => setShowCreate(true)} className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                    Create your first alert →
=======
                <h2 className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                  Active <span className="text-[var(--text-secondary)]">({activeAlerts.length})</span>
                </h2>
              </div>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-xl">
                  <div className="text-[var(--text-secondary)] text-sm mb-1">No active alerts</div>
                  <button onClick={() => setShowCreate(true)} className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                    Create a new alert →
>>>>>>> origin/main
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDelete={handleDelete}
                      onEdit={setEditAlert}
                      flash={flashIds.has(alert.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Triggered alerts */}
            {triggeredAlerts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
<<<<<<< HEAD
                  <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    Triggered <span className="text-zinc-700">({triggeredAlerts.length})</span>
=======
                  <h2 className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                    Triggered <span className="text-[var(--text-secondary)]">({triggeredAlerts.length})</span>
>>>>>>> origin/main
                  </h2>
                </div>
                <div className="space-y-2">
                  {triggeredAlerts.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDelete={handleDelete}
                      onEdit={setEditAlert}
                      flash={flashIds.has(alert.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          prefillSymbol={prefillSymbol}
          prefillPrice={prefillPrice}
        />
      )}
      {editAlert && (
        <EditAlertModal
          alert={editAlert}
          onClose={() => setEditAlert(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
<<<<<<< HEAD
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#050505]" />}>
=======
    <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--background)]" />}>
>>>>>>> origin/main
      <AlertsPageInner />
    </Suspense>
  );
}
