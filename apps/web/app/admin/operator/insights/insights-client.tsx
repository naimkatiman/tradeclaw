'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

interface AccuracyTrend {
  date: string;
  winRate4h: number;
  winRate24h: number;
  totalSignals: number;
  avgConfidence: number;
}

interface SymbolBreakdownRow {
  symbol: string;
  totalSignals: number;
  wins4h: number;
  losses4h: number;
  winRate4h: number;
  wins24h: number;
  losses24h: number;
  winRate24h: number;
  avgConfidence: number;
}

interface Recommendation {
  type: 'warning' | 'info' | 'success';
  message: string;
  symbol?: string;
}

interface InsightsData {
  trends: AccuracyTrend[];
  symbolBreakdown: SymbolBreakdownRow[];
  recommendations: Recommendation[];
}

const PERIODS = [7, 14, 30] as const;
const DISMISSED_STORAGE_PREFIX = 'tc_operator_insights_dismissed_';

function badgeColor(type: Recommendation['type']): string {
  switch (type) {
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'info':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    case 'success':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  }
}

function BadgeIcon({ type }: { type: Recommendation['type'] }) {
  switch (type) {
    case 'warning':
      return <AlertTriangle size={16} />;
    case 'info':
      return <Info size={16} />;
    case 'success':
      return <CheckCircle size={16} />;
  }
}

function recommendationKey(rec: Recommendation): string {
  return `${rec.type}||${rec.symbol ?? ''}||${rec.message}`;
}

function dismissedStorageKey(period: number): string {
  return `${DISMISSED_STORAGE_PREFIX}${period}`;
}

function winRateTone(value: number): string {
  if (value >= 60) return 'text-emerald-400';
  if (value < 40) return 'text-red-400';
  return 'text-white';
}

export function InsightsClient() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(7);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [hydratedPeriod, setHydratedPeriod] = useState<number | null>(null);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/operator/insights?period=${p}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setData(await res.json());
      setLastRefreshedAt(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(dismissedStorageKey(period));
      if (!stored) {
        setDismissed(new Set());
      } else {
        const parsed = JSON.parse(stored);
        setDismissed(
          new Set(
            Array.isArray(parsed)
              ? parsed.filter((value): value is string => typeof value === 'string')
              : [],
          ),
        );
      }
    } catch {
      setDismissed(new Set());
    } finally {
      setHydratedPeriod(period);
    }
  }, [period]);

  useEffect(() => {
    if (hydratedPeriod !== period) return;
    try {
      localStorage.setItem(dismissedStorageKey(period), JSON.stringify([...dismissed]));
    } catch {
      // Ignore storage errors — the page still functions without persistence.
    }
  }, [dismissed, period, hydratedPeriod]);

  const summary = useMemo(() => {
    if (!data || data.trends.length === 0) {
      return { totalSignals: 0, winRate4h: 0, winRate24h: 0, avgConfidence: 0 };
    }
    const totalSignals = data.trends.reduce((s, t) => s + t.totalSignals, 0);
    const weighted = (key: 'winRate4h' | 'winRate24h' | 'avgConfidence'): number => {
      if (totalSignals === 0) return 0;
      return Math.round(
        data.trends.reduce((s, t) => s + t[key] * t.totalSignals, 0) / totalSignals,
      );
    };
    return {
      totalSignals,
      winRate4h: weighted('winRate4h'),
      winRate24h: weighted('winRate24h'),
      avgConfidence: weighted('avgConfidence'),
    };
  }, [data]);

  const visibleRecs = data
    ? data.recommendations.filter((r) => !dismissed.has(recommendationKey(r)))
    : [];
  const hiddenCount = data ? data.recommendations.length - visibleRecs.length : 0;

  return (
    <div className="mt-8 space-y-8">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.02] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            {p}d
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-zinc-500">Loading...</p>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertTriangle size={16} />
          <span>Failed to load insights ({error}).</span>
          <button
            type="button"
            onClick={() => fetchData(period)}
            className="ml-auto underline decoration-red-400/40 underline-offset-2 transition-colors hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary strip */}
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex-1 min-w-[140px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total Signals</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.totalSignals}</p>
            </div>
            <div className="flex-1 min-w-[140px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Avg Win Rate 4h</p>
              <p className={`mt-1 text-2xl font-semibold ${winRateTone(summary.winRate4h)}`}>
                {summary.winRate4h}%
              </p>
            </div>
            <div className="flex-1 min-w-[140px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Avg Win Rate 24h</p>
              <p className={`mt-1 text-2xl font-semibold ${winRateTone(summary.winRate24h)}`}>
                {summary.winRate24h}%
              </p>
            </div>
            <div className="flex-1 min-w-[140px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Avg Confidence</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.avgConfidence}%</p>
            </div>
            <div className="flex-1 min-w-[160px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Last refreshed</p>
              <p className="mt-1 text-sm text-zinc-300">
                {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>

          {/* Accuracy trends table */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Accuracy Trends</h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-zinc-400">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Signals</th>
                    <th className="px-4 py-3 font-medium">Win Rate 4h</th>
                    <th className="px-4 py-3 font-medium">Win Rate 24h</th>
                    <th className="px-4 py-3 font-medium">Avg Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trends.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                        No data for this period
                      </td>
                    </tr>
                  )}
                  {data.trends.map((t) => (
                    <tr
                      key={t.date}
                      className="border-b border-white/[0.04] text-zinc-300"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{t.date}</td>
                      <td className="px-4 py-3">{t.totalSignals}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            t.winRate4h >= 60
                              ? 'text-emerald-400'
                              : t.winRate4h < 40
                                ? 'text-red-400'
                                : 'text-zinc-300'
                          }
                        >
                          {t.winRate4h}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            t.winRate24h >= 60
                              ? 'text-emerald-400'
                              : t.winRate24h < 40
                                ? 'text-red-400'
                                : 'text-zinc-300'
                          }
                        >
                          {t.winRate24h}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{t.avgConfidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Symbol breakdown table */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Symbol Breakdown</h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-zinc-400">
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Signals</th>
                    <th className="px-4 py-3 font-medium">Win Rate 4h</th>
                    <th className="px-4 py-3 font-medium">Win Rate 24h</th>
                    <th className="px-4 py-3 font-medium">Avg Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.symbolBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                        No data for this period
                      </td>
                    </tr>
                  )}
                  {data.symbolBreakdown.map((s) => (
                    <tr
                      key={s.symbol}
                      className="border-b border-white/[0.04] text-zinc-300"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {s.symbol}
                      </td>
                      <td className="px-4 py-3">{s.totalSignals}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            s.winRate4h >= 60
                              ? 'text-emerald-400'
                              : s.winRate4h < 40
                                ? 'text-red-400'
                                : 'text-zinc-300'
                          }
                        >
                          {s.winRate4h}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            s.winRate24h >= 60
                              ? 'text-emerald-400'
                              : s.winRate24h < 40
                                ? 'text-red-400'
                                : 'text-zinc-300'
                          }
                        >
                          {s.winRate24h}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.avgConfidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recommendations */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Recommendations</h2>
            <div className="flex flex-col gap-3">
              {visibleRecs.length === 0 ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-zinc-400"
                >
                  {data.recommendations.length === 0 ? (
                    <Info size={16} className="text-zinc-500" />
                  ) : (
                    <CheckCircle size={16} className="text-zinc-500" />
                  )}
                  <span>
                    {data.recommendations.length === 0
                      ? 'No recommendations for this period.'
                      : 'All recommendations dismissed for this period.'}
                  </span>
                </div>
              ) : (
                visibleRecs.map((rec) => (
                  <div
                    key={recommendationKey(rec)}
                    className={`flex items-start gap-3 rounded-xl border p-4 ${badgeColor(rec.type)}`}
                  >
                    <BadgeIcon type={rec.type} />
                    <div className="flex-1">
                      <p className="text-sm">{rec.message}</p>
                      {rec.symbol && (
                        <p className="mt-1 text-xs opacity-60">{rec.symbol}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDismissed((prev) => {
                          const next = new Set(prev);
                          next.add(recommendationKey(rec));
                          return next;
                        });
                      }}
                      aria-label={`Dismiss recommendation: ${rec.message}`}
                      className="rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDismissed(new Set())}
                  className="self-start text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-300"
                >
                  Restore {hiddenCount} hidden
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
