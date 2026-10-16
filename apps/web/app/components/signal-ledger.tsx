'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';
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

function OutcomeBadge({ record }: { record: SignalHistoryRecord }) {
  const outcome = record.outcomes['24h'];
  if (!outcome) {
    return (
      <span className="inline-flex items-center gap-1.5 text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-zinc-400" />
        <span className="text-xs font-mono">Awaiting 24h window</span>
      </span>
    );
  }
  if (outcome.hit) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-mono">Positive OHLCV outcome</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-red-400">
      <span className="h-2 w-2 rounded-full bg-red-400" />
      <span className="text-xs font-mono">Negative OHLCV outcome</span>
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
        const res = await fetch('/api/signals/history?limit=50');
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
    <section className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            Prospective observation rows{' '}
            <span className="font-normal text-[var(--text-secondary)]">
              — outcomes resolved after recording
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
                No observation rows are stored yet. An empty ledger is evidence too; no sample is being fabricated.
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
                      <th className="text-left px-3 py-2.5 font-medium">Window</th>
                      <th className="text-left px-3 py-2.5 font-medium">Directional case</th>
                      <th className="text-right px-3 py-2.5 font-medium">Rule score</th>
                      <th className="text-center px-3 py-2.5 font-medium">24h observation</th>
                      <th className="text-right px-5 py-2.5 font-medium">Inspect</th>
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
                          {record.timeframe}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {record.direction === 'BUY' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/20 tracking-wider">
                              UP CASE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/20 tracking-wider">
                              DOWN CASE
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                          {record.confidence}/100
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <OutcomeBadge record={record} />
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          <Link
                            href={`/signal/${record.id}`}
                            onClick={() => trackEvent('record_inspected', { source: 'prospective_ledger', recordId: record.id })}
                            className="text-[11px] font-semibold text-[var(--foreground)] underline decoration-[var(--border-strong)] underline-offset-4"
                          >
                            Record →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-[10px] text-zinc-600 font-mono">
                <span>
                  Showing {records.length} of {total} observations
                </span>
                <span>
                  Provider OHLCV · not broker fills
                </span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
