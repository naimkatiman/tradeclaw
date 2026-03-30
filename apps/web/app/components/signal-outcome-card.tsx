'use client';

import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

export interface SignalOutcomeData {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  tp1?: number;
  sl?: number;
  timestamp: number;
  resolvedAt?: number;
  hit?: boolean;
  pnlPct?: number;
  outcomePrice?: number;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function formatDuration(startMs: number, endMs: number): string {
  const diff = Math.abs(endMs - startMs);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface SignalOutcomeCardProps {
  signal: SignalOutcomeData;
  compact?: boolean;
}

export function SignalOutcomeCard({ signal, compact = false }: SignalOutcomeCardProps) {
  const isPending = signal.hit === undefined || signal.hit === null;
  const isWin = signal.hit === true;

  const outcomeLabel = isPending ? 'PENDING' : isWin ? 'TP1 HIT' : 'SL HIT';
  const outcomeColor = isPending
    ? 'text-amber-400'
    : isWin
      ? 'text-emerald-400'
      : 'text-red-400';
  const outcomeBg = isPending
    ? 'bg-amber-500/10 border-amber-500/20'
    : isWin
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : 'bg-red-500/10 border-red-500/20';

  const pnlDisplay =
    signal.pnlPct !== undefined
      ? `${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(2)}%`
      : '--';
  const pnlColor =
    signal.pnlPct !== undefined && signal.pnlPct >= 0
      ? 'text-emerald-400'
      : 'text-red-400';

  // Progress bar: how far price moved from entry toward TP1 or SL
  let progressPct = 50; // default center for pending
  if (!isPending && signal.tp1 && signal.sl) {
    const totalRange = Math.abs(signal.tp1 - signal.sl);
    if (totalRange > 0) {
      const target = isWin ? signal.tp1 : signal.sl;
      const moved = Math.abs(target - signal.entryPrice);
      progressPct = Math.min(100, Math.max(0, (moved / totalRange) * 100));
    }
  }

  if (compact) {
    return (
      <div className="glass-card rounded-xl p-4 min-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white font-mono">{signal.pair}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${
                signal.direction === 'BUY'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/15 text-red-400 border-red-500/20'
              }`}
            >
              {signal.direction}
            </span>
          </div>
          <span className={`text-xs font-bold ${outcomeColor}`}>{outcomeLabel}</span>
        </div>

        {/* Entry and P&L */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Entry</div>
            <div className="text-xs font-mono text-zinc-300">{formatPrice(signal.entryPrice)}</div>
          </div>
          {!isPending && (
            <div className="text-right">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">P&L</div>
              <div className={`text-lg font-bold font-mono tabular-nums ${pnlColor}`}>
                {pnlDisplay}
              </div>
            </div>
          )}
          {isPending && (
            <div className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">Watching live candles</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden min-w-[360px] max-w-[420px] w-full relative">
      {/* Target hit ribbon badge */}
      {isWin && (
        <div className="absolute top-3 right-3 z-10 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold px-2 py-1 rounded-lg font-mono shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          TARGET HIT
        </div>
      )}
      {/* Top accent bar */}
      <div
        className={`h-0.5 w-full ${
          isPending ? 'bg-amber-500/40' : isWin ? 'bg-emerald-500/40' : 'bg-red-500/40'
        }`}
      />

      <div className="p-5">
        {/* Two-column layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Signal */}
          <div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mb-3">
              Signal
            </div>

            {/* Symbol + direction */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-white font-mono">{signal.pair}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${
                  signal.direction === 'BUY'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/15 text-red-400 border-red-500/20'
                }`}
              >
                {signal.direction}
              </span>
            </div>

            {/* Generated date */}
            <div className="text-[10px] text-zinc-600 mb-3">
              Generated: {formatDate(signal.timestamp)}
            </div>

            {/* Price levels */}
            <div className="space-y-1.5">
              {[
                { label: 'Entry', value: signal.entryPrice, color: 'text-white' },
                {
                  label: 'Target (TP1)',
                  value: signal.tp1,
                  color: 'text-emerald-400',
                },
                { label: 'Stop Loss', value: signal.sl, color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-600">{label}</span>
                  <span className={`text-xs font-mono font-semibold tabular-nums ${color}`}>
                    {value !== undefined ? formatPrice(value) : '--'}
                  </span>
                </div>
              ))}
            </div>

            {/* Confidence */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Confidence:</span>
              <span
                className={`text-xs font-bold font-mono ${
                  signal.confidence >= 80
                    ? 'text-emerald-400'
                    : signal.confidence >= 65
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }`}
              >
                {signal.confidence}%
              </span>
            </div>
          </div>

          {/* Center divider with arrow */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <div className="absolute left-[-8px] top-1/2 -translate-y-1/2">
              <ArrowRight className="w-4 h-4 text-zinc-600" />
            </div>

            {/* Right: Outcome */}
            <div className="pl-4">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mb-3">
                Outcome
              </div>

              {/* Status icon + label */}
              <div className="flex items-center gap-2 mb-3">
                {isPending ? (
                  <Clock className="w-6 h-6 text-amber-400" />
                ) : isWin ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${outcomeBg} ${outcomeColor}`}
                >
                  {outcomeLabel}
                </span>
              </div>

              {/* Outcome description */}
              {!isPending && signal.outcomePrice !== undefined && signal.resolvedAt && (
                <div className="text-[10px] text-zinc-500 mb-3">
                  Price reached {formatPrice(signal.outcomePrice)} in{' '}
                  {formatDuration(signal.timestamp, signal.resolvedAt)}
                </div>
              )}

              {/* P&L */}
              {!isPending ? (
                <div className={`text-2xl font-bold font-mono tabular-nums ${pnlColor}`}>
                  {pnlDisplay}
                </div>
              ) : (
                <div className="text-sm text-zinc-600 font-mono">Awaiting live candle resolution</div>
              )}

              {/* Resolved date */}
              {signal.resolvedAt && (
                <div className="text-[10px] text-zinc-600 mt-3">
                  Resolved: {formatDate(signal.resolvedAt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar: Entry -> TP1 / SL */}
        {signal.tp1 && signal.sl && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-[9px] text-zinc-600 font-mono mb-1.5">
              <span>SL {formatPrice(signal.sl)}</span>
              <span>Entry {formatPrice(signal.entryPrice)}</span>
              <span>TP1 {formatPrice(signal.tp1)}</span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              {/* SL zone (left) */}
              <div className="absolute left-0 top-0 h-full bg-red-500/20 rounded-l-full" style={{ width: '30%' }} />
              {/* TP1 zone (right) */}
              <div className="absolute right-0 top-0 h-full bg-emerald-500/20 rounded-r-full" style={{ width: '30%' }} />
              {/* Price marker */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 ${
                  isPending
                    ? 'bg-amber-400 border-amber-300'
                    : isWin
                      ? 'bg-emerald-400 border-emerald-300'
                      : 'bg-red-400 border-red-300'
                }`}
                style={{ left: `calc(${progressPct}% - 5px)` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
