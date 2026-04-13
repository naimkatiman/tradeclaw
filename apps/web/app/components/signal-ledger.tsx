'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { fetchWithLicense } from '@/lib/license-client';
import type { SignalHistoryRecord } from '../../lib/signal-history';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function OutcomeBadge({ record }: { record: SignalHistoryRecord }) {
  const outcome = record.outcomes['24h'];
  if (!outcome) {
    return (
      <span className="inline-flex items-center gap-1.5 text-yellow-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
        </span>
        <span className="text-xs font-mono">Pending</span>
      </span>
    );
  }
  if (outcome.hit) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">Win</span>
        </span>
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
          TARGET HIT
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-400">
      <X className="w-3.5 h-3.5" />
      <span className="text-xs font-mono">Loss</span>
    </span>
  );
}

function rowTint(record: SignalHistoryRecord): string {
  const outcome = record.outcomes['24h'];
  if (!outcome) return '';
  if (outcome.hit) return 'bg-emerald-500/[0.03]';
  return 'bg-red-500/[0.03]';
}

export function SignalLedger() {
  const [records, setRecords] = useState<SignalHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetchWithLicense('/api/signals/history?limit=50');
        if (!res.ok) return;
        const data = await res.json();
        setRecords(data.records ?? []);
        setTotal(data.total ?? 0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <section className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Signal Ledger{' '}
            <span className="text-zinc-600 font-normal">
              — Verified Against Real Market Data
            </span>
          </h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-600 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />
        )}
      </button>

      {expanded && (
        <>
          {loading ? (
            <div className="px-5 pb-5">
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-white/[0.03] rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="px-5 pb-8 pt-4 text-center">
              <p className="text-sm text-zinc-600 font-mono">
                No verified signals yet — signals are recorded and verified against real market data every hour.
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-t border-b border-white/5 text-zinc-600 uppercase tracking-wider text-[10px]">
                      <th className="text-left px-5 py-2.5 font-medium">Time</th>
                      <th className="text-left px-3 py-2.5 font-medium">Symbol</th>
                      <th className="text-left px-3 py-2.5 font-medium">Direction</th>
                      <th className="text-right px-3 py-2.5 font-medium">Entry</th>
                      <th className="text-right px-3 py-2.5 font-medium">TP1</th>
                      <th className="text-right px-3 py-2.5 font-medium">SL</th>
                      <th className="text-center px-3 py-2.5 font-medium">Outcome</th>
                      <th className="text-right px-5 py-2.5 font-medium">P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${rowTint(record)}`}
                      >
                        <td className="px-5 py-2.5 text-zinc-500 whitespace-nowrap tabular-nums">
                          {formatRelativeTime(record.timestamp)}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold whitespace-nowrap">
                          {record.pair}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {record.direction === 'BUY' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/20 tracking-wider">
                              BUY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/20 tracking-wider">
                              SELL
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                          {formatPrice(record.entryPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-emerald-400/70 tabular-nums whitespace-nowrap">
                          {record.tp1 ? formatPrice(record.tp1) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-red-400/70 tabular-nums whitespace-nowrap">
                          {record.sl ? formatPrice(record.sl) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <OutcomeBadge record={record} />
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums whitespace-nowrap">
                          {record.outcomes['24h'] ? (
                            <span className={record.outcomes['24h'].pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {record.outcomes['24h'].pnlPct >= 0 ? '+' : ''}
                              {record.outcomes['24h'].pnlPct.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-[10px] text-zinc-600 font-mono">
                <span>
                  Showing {records.length} of {total} signals
                </span>
                <span>
                  Verified via OHLCV candle data
                </span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
