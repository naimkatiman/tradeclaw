'use client';

import { useState, useEffect, useCallback } from 'react';

interface SignalRecord {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  confidence: number;
  timestamp: number;
  outcome?: 'WIN' | 'LOSS' | 'PENDING';
  pnlPct?: number;
}

interface LeaderEntry {
  symbol: string;
  totalSignals: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  avgConfidence: number;
  totalPnl: number;
}

type Period = 'weekly' | 'monthly' | 'alltime';

const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];

const STORAGE_KEY = 'tc-signal-history';

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateSeedHistory(): SignalRecord[] {
  const records: SignalRecord[] = [];
  const now = Date.now();

  for (let i = 0; i < 500; i++) {
    const r1 = seededRandom(i * 13);
    const r2 = seededRandom(i * 13 + 1);
    const r3 = seededRandom(i * 13 + 2);
    const r4 = seededRandom(i * 13 + 3);
    const r5 = seededRandom(i * 13 + 4);

    const symbol = SYMBOLS[Math.floor(r1 * SYMBOLS.length)];
    const direction: 'BUY' | 'SELL' = r2 > 0.5 ? 'BUY' : 'SELL';
    const daysAgo = Math.floor(r3 * 90); // last 90 days
    const timestamp = now - daysAgo * 86400000 - Math.floor(r4 * 86400000);
    const confidence = Math.round(55 + r5 * 40);

    // Simulate outcome (most are resolved if > 2 hours old)
    const age = now - timestamp;
    let outcome: 'WIN' | 'LOSS' | 'PENDING' = 'PENDING';
    let pnlPct: number | undefined;

    if (age > 7200000) {
      // ~58% win rate
      outcome = seededRandom(i * 13 + 5) > 0.42 ? 'WIN' : 'LOSS';
      pnlPct = outcome === 'WIN'
        ? +(0.5 + seededRandom(i * 13 + 6) * 2.5).toFixed(2)
        : -(0.3 + seededRandom(i * 13 + 6) * 1.2).toFixed(2);
    }

    records.push({ id: `sig-${i}`, symbol, direction, entry: 0, confidence, timestamp, outcome, pnlPct });
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

function computeLeaderboard(records: SignalRecord[]): LeaderEntry[] {
  const map = new Map<string, LeaderEntry>();

  for (const r of records) {
    if (!map.has(r.symbol)) {
      map.set(r.symbol, {
        symbol: r.symbol,
        totalSignals: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        avgConfidence: 0,
        totalPnl: 0,
      });
    }
    const e = map.get(r.symbol)!;
    e.totalSignals++;
    e.avgConfidence += r.confidence;
    if (r.outcome === 'WIN') { e.wins++; e.totalPnl += r.pnlPct || 0; }
    else if (r.outcome === 'LOSS') { e.losses++; e.totalPnl += r.pnlPct || 0; }
    else e.pending++;
  }

  const entries = Array.from(map.values()).map(e => ({
    ...e,
    avgConfidence: Math.round(e.avgConfidence / e.totalSignals),
    winRate: e.wins + e.losses > 0 ? +((e.wins / (e.wins + e.losses)) * 100).toFixed(1) : 0,
    totalPnl: +e.totalPnl.toFixed(2),
  }));

  return entries.sort((a, b) => b.winRate - a.winRate);
}

function periodFilter(records: SignalRecord[], period: Period): SignalRecord[] {
  const now = Date.now();
  const cutoffs: Record<Period, number> = {
    weekly: now - 7 * 86400000,
    monthly: now - 30 * 86400000,
    alltime: 0,
  };
  return records.filter(r => r.timestamp >= cutoffs[period]);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-xs">1st</span>;
  if (rank === 2) return <span className="text-zinc-300 font-bold text-xs">2nd</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-xs">3rd</span>;
  return <span className="text-zinc-600 text-xs font-mono">{rank}</span>;
}

function WinRateBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-1 rounded-full bg-white/5">
        <div
          className="absolute h-1 rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-semibold tabular-nums w-12 text-right ${value >= 55 ? 'text-emerald-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
        {value}%
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [records, setRecords] = useState<SignalRecord[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');
  const [historyPage, setHistoryPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    // Load or generate signal history
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecords(JSON.parse(stored));
      } else {
        const generated = generateSeedHistory();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(generated));
        setRecords(generated);
      }
    } catch {
      setRecords(generateSeedHistory());
    }
  }, []);

  const filtered = periodFilter(records, period);
  const leaderboard = computeLeaderboard(filtered);

  const historySlice = records.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(records.length / PAGE_SIZE);

  const totalWins = filtered.filter(r => r.outcome === 'WIN').length;
  const totalResolved = filtered.filter(r => r.outcome !== 'PENDING').length;
  const overallWinRate = totalResolved > 0 ? ((totalWins / totalResolved) * 100).toFixed(1) : '—';

  const resetHistory = useCallback(() => {
    const fresh = generateSeedHistory();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setRecords(fresh);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="8" width="2" height="6" rx="0.5" fill="#10B981"/>
                <rect x="7" y="5" width="2" height="9" rx="0.5" fill="#10B981" opacity="0.7"/>
                <rect x="11" y="2" width="2" height="12" rx="0.5" fill="#10B981" opacity="0.4"/>
              </svg>
              <h1 className="text-sm font-semibold text-white tracking-tight">Signal Leaderboard</h1>
            </div>
            <p className="text-[11px] text-zinc-600">Win rates, accuracy, and signal history across {SYMBOLS.length} pairs</p>
          </div>
          <button
            onClick={resetHistory}
            className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Reset history
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total signals', value: filtered.length.toString() },
            { label: 'Resolved', value: totalResolved.toString() },
            { label: 'Overall win rate', value: `${overallWinRate}%`, color: 'text-emerald-400' },
            { label: 'Period', value: period.charAt(0).toUpperCase() + period.slice(1) },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-xl p-3">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{stat.label}</div>
              <div className={`text-sm font-bold font-mono tabular-nums ${stat.color || 'text-white'}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Period selector + tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/5">
            {(['weekly', 'monthly', 'alltime'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 ${
                  period === p
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {p === 'alltime' ? 'All time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/5">
            {(['leaderboard', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 ${
                  activeTab === tab
                    ? 'bg-white/8 text-white border border-white/10'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard table */}
        {activeTab === 'leaderboard' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium w-10">Rank</th>
                  <th className="px-4 py-3 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Symbol</th>
                  <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Signals</th>
                  <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">W / L</th>
                  <th className="px-4 py-3 text-[10px] text-zinc-600 uppercase tracking-wider font-medium w-40">Win Rate</th>
                  <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Avg Conf</th>
                  <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.symbol} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 w-10">
                      <RankBadge rank={idx + 1} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold text-white">{entry.symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400">{entry.totalSignals}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <span className="text-emerald-400">{entry.wins}</span>
                      <span className="text-zinc-700 mx-1">/</span>
                      <span className="text-red-400">{entry.losses}</span>
                    </td>
                    <td className="px-4 py-3 w-40">
                      <WinRateBar value={entry.winRate} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400">{entry.avgConfidence}%</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${entry.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.totalPnl >= 0 ? '+' : ''}{entry.totalPnl}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signal history table */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Dir</th>
                    <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Confidence</th>
                    <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Time</th>
                    <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Outcome</th>
                    <th className="px-4 py-3 text-right text-[10px] text-zinc-600 uppercase tracking-wider font-medium">P&L %</th>
                  </tr>
                </thead>
                <tbody>
                  {historySlice.map(record => {
                    const age = Date.now() - record.timestamp;
                    const ageStr = age < 3600000
                      ? `${Math.floor(age / 60000)}m ago`
                      : age < 86400000
                      ? `${Math.floor(age / 3600000)}h ago`
                      : `${Math.floor(age / 86400000)}d ago`;

                    return (
                      <tr key={record.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-white">{record.symbol}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-bold ${record.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {record.direction}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-400">{record.confidence}%</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[10px] text-zinc-600">{ageStr}</td>
                        <td className="px-4 py-2.5 text-right">
                          {record.outcome === 'WIN' && <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">WIN</span>}
                          {record.outcome === 'LOSS' && <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded">LOSS</span>}
                          {record.outcome === 'PENDING' && <span className="text-[10px] text-zinc-600 font-semibold bg-white/5 px-1.5 py-0.5 rounded">OPEN</span>}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${record.pnlPct !== undefined ? (record.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-700'}`}>
                          {record.pnlPct !== undefined ? `${record.pnlPct >= 0 ? '+' : ''}${record.pnlPct}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-zinc-700 font-mono">
                {historyPage * PAGE_SIZE + 1}–{Math.min((historyPage + 1) * PAGE_SIZE, records.length)} of {records.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                  disabled={historyPage === 0}
                  className="px-3 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-300 disabled:opacity-30 bg-white/5 rounded-lg border border-white/5 transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setHistoryPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={historyPage >= totalPages - 1}
                  className="px-3 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-300 disabled:opacity-30 bg-white/5 rounded-lg border border-white/5 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
