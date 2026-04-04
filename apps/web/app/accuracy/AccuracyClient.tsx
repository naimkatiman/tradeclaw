'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Check, X } from 'lucide-react';

/* ── Types ── */
interface SignalOutcome {
  price: number;
  pnlPct: number;
  hit: boolean;
}

interface SignalRecord {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  timestamp: number;
  outcomes: {
    '4h': SignalOutcome | null;
    '24h': SignalOutcome | null;
  };
  isSimulated?: boolean;
  lastVerified?: number;
}

interface Stats {
  totalSignals: number;
  resolved: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlPct: number;
  avgPnlPct: number;
  avgConfidence: number;
}

interface APIResponse {
  records: SignalRecord[];
  total: number;
  offset: number;
  limit: number;
  stats: Stats;
}

/* ── Constants ── */
const PAIRS = [
  'ALL', 'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'DOGEUSD',
  'ADAUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'LTCUSD', 'BCHUSD',
  'NEARUSD', 'SUIUSD', 'INJUSD', 'PEPEUSD', 'SHIBUSD',
  'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD',
];
const OUTCOMES = ['ALL', 'win', 'loss', 'pending'] as const;

/* ── Helpers ── */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatPrice(price: number, pair: string): string {
  if (['EURUSD', 'GBPUSD', 'AUDUSD'].includes(pair)) return price.toFixed(5);
  if (pair === 'USDJPY') return price.toFixed(3);
  if (pair === 'XAGUSD') return price.toFixed(4);
  return price.toFixed(2);
}

/* ── Component ── */
export function AccuracyClient() {
  const [records, setRecords] = useState<SignalRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState('ALL');
  const [direction, setDirection] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [outcome, setOutcome] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const fetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (pair !== 'ALL') params.set('pair', pair);
    if (direction !== 'ALL') params.set('direction', direction);
    if (outcome !== 'ALL') params.set('outcome', outcome);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/signals/history?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: APIResponse = await res.json();
      if (id !== fetchRef.current) return;
      setRecords(data.records);
      setStats(data.stats);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      if (id === fetchRef.current) setError(err instanceof Error ? err.message : 'Failed to load signal history');
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, [pair, direction, outcome, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Disclaimer banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-400/90 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> Rows marked <span className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded">Example</span> are simulated seed data used to demonstrate the interface and are <strong>excluded from all accuracy statistics</strong>. Only <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">Live tracked</span> signals represent real outcomes verified against market prices. Past performance is not indicative of future results. This is not financial advice.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
          Failed to load signal history: {error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Signal Accuracy Tracker</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Every signal recorded with timestamps, entry prices, and verified outcomes. Full transparency.
        </p>
      </div>

      {/* Empty state when no real data yet */}
      {stats && stats.totalSignals === 0 && !loading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-400 mb-1">No signal history yet</p>
          <p className="text-xs text-zinc-600">Accuracy tracking will populate as signals are recorded. Visit the <a href="/dashboard" className="text-emerald-400 hover:underline">Dashboard</a> to start generating signals.</p>
        </div>
      )}

      {/* Stats Cards */}
      {stats && stats.totalSignals > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Signals" value={stats.totalSignals.toString()} />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate}%`}
            color={stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-amber-400' : 'text-rose-400'}
          />
          <StatCard
            label="Avg P&L"
            value={`${stats.avgPnlPct >= 0 ? '+' : ''}${stats.avgPnlPct}%`}
            color={stats.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          />
          <StatCard label="Avg Confidence" value={`${stats.avgConfidence}%`} />
          <StatCard label="Wins" value={stats.wins.toString()} color="text-emerald-400" />
          <StatCard label="Losses" value={stats.losses.toString()} color="text-rose-400" />
          <StatCard
            label="Total P&L"
            value={`${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%`}
            color={stats.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          />
          <StatCard label="Resolved" value={`${stats.resolved}/${stats.totalSignals}`} />
        </div>
      )}

      {/* Win Rate Bar */}
      {stats && stats.totalSignals > 0 && stats.resolved > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Win / Loss Distribution</span>
            <span className="text-xs font-mono tabular-nums text-zinc-400">
              {stats.wins}W – {stats.losses}L
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-zinc-800 flex">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.winRate}%` }}
            />
            <div
              className="bg-rose-500 transition-all duration-500"
              style={{ width: `${100 - stats.winRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-emerald-500 font-mono">{stats.winRate}% WIN</span>
            <span className="text-[10px] text-rose-500 font-mono">{(100 - stats.winRate).toFixed(1)}% LOSS</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Pair filter */}
        <select
          value={pair}
          onChange={e => { setPair(e.target.value); setPage(0); }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
        >
          {PAIRS.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Pairs' : p}</option>)}
        </select>

        {/* Direction filter */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-800">
          {(['ALL', 'BUY', 'SELL'] as const).map(d => (
            <button
              key={d}
              onClick={() => { setDirection(d); setPage(0); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                direction === d
                  ? d === 'BUY' ? 'bg-emerald-500/20 text-emerald-400'
                    : d === 'SELL' ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Outcome filter */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-800">
          {OUTCOMES.map(o => (
            <button
              key={o}
              onClick={() => { setOutcome(o); setPage(0); }}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                outcome === o
                  ? o === 'win' ? 'bg-emerald-500/20 text-emerald-400'
                    : o === 'loss' ? 'bg-rose-500/20 text-rose-400'
                    : o === 'pending' ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {o === 'ALL' ? 'All' : o}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Time</th>
                <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Pair</th>
                <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Signal</th>
                <th className="text-right px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Entry</th>
                <th className="text-right px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Conf</th>
                <th className="text-center px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">4h Result</th>
                <th className="text-center px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">24h Result</th>
                <th className="text-right px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">P&L</th>
                <th className="text-center px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Data source</th>
                <th className="text-right px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Last verified</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/30">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-zinc-800/50 rounded animate-pulse" style={{ width: `${[62, 78, 55, 70, 85, 60, 73, 68, 80, 65][j % 10]}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-600">
                    No signals match the current filters
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className={`border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors ${r.isSimulated ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs tabular-nums whitespace-nowrap">
                      {formatTime(r.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-200">{r.pair}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        r.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {r.direction === 'BUY' ? '▲' : '▼'} {r.direction}
                      </span>
                      <span className="ml-2 text-[10px] text-zinc-600">{r.timeframe}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-300 text-xs">
                      {formatPrice(r.entryPrice, r.pair)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConfidenceBadge value={r.confidence} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OutcomeBadge outcome={r.outcomes['4h']} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OutcomeBadge outcome={r.outcomes['24h']} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                      {r.outcomes['24h'] ? (
                        <span className={r.outcomes['24h'].pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {r.outcomes['24h'].pnlPct >= 0 ? '+' : ''}{r.outcomes['24h'].pnlPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.isSimulated ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">Example</span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live tracked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-zinc-600 whitespace-nowrap">
                      {r.lastVerified ? formatTime(r.lastVerified) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/50">
            <span className="text-xs text-zinc-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transparency note */}
      <div className="glass-card rounded-xl p-4 border-l-2 border-emerald-500/50">
        <h3 className="text-sm font-medium text-zinc-300 mb-1 flex items-center gap-1.5"><Search className="h-4 w-4 text-emerald-400" /> Full Transparency</h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Every signal is recorded at generation time with its entry price and confidence score.
          Outcomes are evaluated at 4-hour and 24-hour windows against actual price movement.
          No cherry-picking, no hindsight edits. Self-hosted users can verify all data in{' '}
          <code className="text-emerald-500/80 bg-emerald-500/5 px-1 rounded">data/signal-history.json</code>.
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ label, value, color = 'text-zinc-100' }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <div className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'text-emerald-400' : value >= 65 ? 'text-amber-400' : 'text-zinc-500';
  return (
    <span className={`font-mono tabular-nums text-xs ${color}`}>
      {value.toFixed(0)}%
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: { price: number; pnlPct: number; hit: boolean } | null }) {
  if (!outcome) return <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">PENDING</span>;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
      outcome.hit
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'bg-rose-500/15 text-rose-400'
    }`}>
      {outcome.hit ? <><Check className="inline h-3 w-3" /> WIN</> : <><X className="inline h-3 w-3" /> LOSS</>}
    </span>
  );
}
