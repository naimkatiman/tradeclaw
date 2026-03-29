'use client';

import { useState, useEffect, useRef } from 'react';
import { useSignalStream, type StreamSignal } from '../lib/hooks/use-price-stream';

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

interface ToastItem extends StreamSignal {
  dismissing: boolean;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(5);
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const isBuy = toast.direction === 'BUY';

  return (
    <div
<<<<<<< HEAD
      className={`pointer-events-auto w-72 rounded-xl border bg-[#0c0c0c] p-4 shadow-2xl transition-all duration-300 ${
=======
      className={`pointer-events-auto w-72 rounded-xl border bg-white dark:bg-[#0c0c0c] p-4 shadow-2xl transition-all duration-300 ${
>>>>>>> origin/main
        toast.dismissing
          ? 'opacity-0 translate-x-3'
          : 'opacity-100 translate-x-0'
      } ${
        isBuy ? 'border-emerald-500/25' : 'border-rose-500/25'
      }`}
      style={{ boxShadow: isBuy
        ? '0 8px 32px rgba(16,185,129,0.08)'
        : '0 8px 32px rgba(244,63,94,0.08)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
            isBuy
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
          }`}>
            {toast.direction}
          </span>
<<<<<<< HEAD
          <span className="text-sm font-semibold font-mono text-white">{toast.pair}</span>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex items-center justify-center w-5 h-5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
=======
          <span className="text-sm font-semibold font-mono text-gray-900 dark:text-white">{toast.pair}</span>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-700 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors shrink-0"
>>>>>>> origin/main
          aria-label="Dismiss"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Reason */}
<<<<<<< HEAD
      <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">{toast.reason}</p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-600 tabular-nums">
=======
      <p className="mt-2 text-[11px] text-gray-500 dark:text-zinc-500 leading-relaxed">{toast.reason}</p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-600 tabular-nums">
>>>>>>> origin/main
          @ {formatPrice(toast.entry)}
        </span>
        <span className={`text-[10px] font-mono font-bold tabular-nums ${
          isBuy ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {toast.confidence}% conf
        </span>
      </div>

      {/* Progress bar */}
<<<<<<< HEAD
      <div className="mt-3 h-0.5 w-full rounded-full bg-white/5 overflow-hidden">
=======
      <div className="mt-3 h-0.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
>>>>>>> origin/main
        <div
          className={`h-full rounded-full ${isBuy ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}
          style={{ animation: `toast-progress ${AUTO_DISMISS_MS}ms linear forwards` }}
        />
      </div>

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export function SignalToast() {
  const { signals } = useSignalStream();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  function dismiss(id: string) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, dismissing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }

  useEffect(() => {
    if (signals.length === 0) return;
    const latest = signals[0];
    if (seenIds.current.has(latest.id)) return;
    seenIds.current.add(latest.id);

    const t0 = setTimeout(() => setToasts(prev => [{ ...latest, dismissing: false }, ...prev].slice(0, MAX_TOASTS)), 0);
    const timer = setTimeout(() => dismiss(latest.id), AUTO_DISMISS_MS);
    return () => { clearTimeout(t0); clearTimeout(timer); };
<<<<<<< HEAD
  }, [signals]); // eslint-disable-line react-hooks/exhaustive-deps
=======
  }, [signals]);
>>>>>>> origin/main

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
