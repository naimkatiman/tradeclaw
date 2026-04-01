'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen, Plus, X, Star, TrendingUp, TrendingDown,
  Download, Trash2, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import {
  getEntries, addEntry, updateEntry, deleteEntry,
  getWeeklySummary, calculatePnl,
  type JournalEntry, type TradeDirection, type WeeklySummary,
} from '../../lib/trade-journal';

const PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD', 'USDCHF',
];

type FilterTab = 'all' | 'open' | 'closed' | 'BUY' | 'SELL';

function pnlColor(pnl?: number) {
  if (pnl === undefined) return 'text-zinc-400';
  if (pnl > 0) return 'text-emerald-400';
  if (pnl < 0) return 'text-rose-400';
  return 'text-zinc-400';
}

function outcomeBadge(outcome: JournalEntry['outcome']) {
  if (outcome === 'WIN')
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400">WIN</span>;
  if (outcome === 'LOSS')
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400">LOSS</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-700/60 text-zinc-400">OPEN</span>;
}

function directionBadge(dir: TradeDirection) {
  return dir === 'BUY'
    ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">BUY</span>
    : <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400">SELL</span>;
}

function signalMatchBadge(entry: JournalEntry) {
  if (!entry.signalContext) return <span className="text-zinc-600 text-xs">—</span>;
  const match = entry.signalContext.direction === entry.direction;
  return match
    ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Match</span>
    : <span className="flex items-center gap-1 text-rose-400 text-xs"><XCircle className="w-3.5 h-3.5" /> Against</span>;
}

interface AddModalProps {
  onClose: () => void;
  onAdd: (entry: JournalEntry) => void;
}

function AddModal({ onClose, onAdd }: AddModalProps) {
  const [pair, setPair] = useState('BTCUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [entryPrice, setEntryPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(entryPrice);
    if (!price || price <= 0) { setError('Enter a valid entry price'); return; }
    setLoading(true);
    setError('');

    let signalContext = undefined;
    try {
      const res = await fetch(`/api/signals?pair=${pair}&limit=1`);
      if (res.ok) {
        const data = await res.json() as { signals?: Array<{
          direction: string; confidence: number;
          indicators?: { rsi?: number; macd?: { histogram?: number }; ema20?: number; ema50?: number };
        }> };
        const sig = data.signals?.[0];
        if (sig) {
          signalContext = {
            direction: (sig.direction === 'BUY' ? 'BUY' : 'SELL') as TradeDirection,
            confidence: sig.confidence,
            rsi: sig.indicators?.rsi ?? 50,
            macd: sig.indicators?.macd?.histogram ?? 0,
            ema20: sig.indicators?.ema20 ?? price,
            ema50: sig.indicators?.ema50 ?? price,
            fetchedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Signal context is optional — continue without it
    }

    const newEntry = addEntry({
      pair,
      direction,
      entryPrice: price,
      entryTime: new Date().toISOString(),
      notes: notes.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      signalContext,
      outcome: 'OPEN',
    });

    setLoading(false);
    onAdd(newEntry);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1421] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" /> Log New Trade
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pair */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Asset Pair</label>
            <select
              value={pair}
              onChange={e => setPair(e.target.value)}
              className="w-full bg-[#0a0f1a] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('BUY')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  direction === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                ▲ BUY
              </button>
              <button
                type="button"
                onClick={() => setDirection('SELL')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  direction === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                ▼ SELL
              </button>
            </div>
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Entry Price</label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="e.g. 67500"
              className="w-full bg-[#0a0f1a] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What&apos;s your thesis? Key levels? Risk management..."
              rows={3}
              className="w-full bg-[#0a0f1a] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Tags <span className="text-zinc-600">(comma-separated)</span></label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="breakout, trend-following, news"
              className="w-full bg-[#0a0f1a] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
            />
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs text-zinc-500 flex-1">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Auto-fetches live signal context for {pair}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Log Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CloseModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onClosed: (updated: JournalEntry) => void;
}

function CloseModal({ entry, onClose, onClosed }: CloseModalProps) {
  const [exitPrice, setExitPrice] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(exitPrice);
    if (!price || price <= 0) { setError('Enter a valid exit price'); return; }

    const pnlPct = calculatePnl(entry.entryPrice, price, entry.direction);
    const outcome = pnlPct >= 0 ? 'WIN' : 'LOSS';

    const updated = updateEntry(entry.id, {
      exitPrice: price,
      exitTime: new Date().toISOString(),
      pnlPct,
      outcome,
    });

    if (updated) onClosed(updated);
    onClose();
  }

  const previewPnl = exitPrice
    ? calculatePnl(entry.entryPrice, parseFloat(exitPrice) || 0, entry.direction)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1421] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Close Trade</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-zinc-800/40 rounded-lg p-3 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">{entry.pair}</span>
            {directionBadge(entry.direction)}
          </div>
          <div className="text-zinc-300 mt-1">Entry: <span className="text-white font-mono">{entry.entryPrice.toLocaleString()}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Exit Price</label>
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={e => setExitPrice(e.target.value)}
              placeholder="Enter exit price"
              className="w-full bg-[#0a0f1a] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
              required
              autoFocus
            />
          </div>

          {previewPnl !== null && !isNaN(previewPnl) && (
            <div className={`text-center text-2xl font-bold ${pnlColor(previewPnl)}`}>
              {previewPnl >= 0 ? '+' : ''}{previewPnl}%
            </div>
          )}

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
            >
              Close Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  summary: WeeklySummary;
  onExport: () => void;
}

function SummaryCard({ summary, onExport }: SummaryCardProps) {
  const closedCount = summary.wins + summary.losses;

  return (
    <div className="bg-[#0d1421] border border-zinc-800 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Weekly Summary</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{summary.weekLabel}</p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-emerald-500/30"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0a0f1a] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{summary.totalTrades}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Trades</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${summary.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.totalPnlPct >= 0 ? '+' : ''}{summary.totalPnlPct}%
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Total P&amp;L</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{closedCount > 0 ? `${summary.winRate}%` : '—'}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Win Rate</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-emerald-400 font-bold text-lg">{summary.wins}W</span>
            <span className="text-zinc-600">/</span>
            <span className="text-rose-400 font-bold text-lg">{summary.losses}L</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Record</div>
        </div>
      </div>

      {/* Win/Loss bar */}
      {closedCount > 0 && (
        <div className="mt-4">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-emerald-500 rounded-full transition-all"
              style={{ width: `${summary.winRate}%` }}
            />
            <div
              className="bg-rose-500 rounded-full transition-all flex-1"
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>{summary.wins} wins</span>
            <span>{summary.losses} losses</span>
          </div>
        </div>
      )}

      {summary.bestTrade && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Best Trade
            </div>
            <div className="text-sm font-semibold text-white">{summary.bestTrade.pair}</div>
            <div className="text-emerald-400 font-bold">+{summary.bestTrade.pnlPct}%</div>
          </div>
          {summary.worstTrade && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> Worst Trade
              </div>
              <div className="text-sm font-semibold text-white">{summary.worstTrade.pair}</div>
              <div className="text-rose-400 font-bold">{summary.worstTrade.pnlPct}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface EntryRowProps {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  onClose: (entry: JournalEntry) => void;
}

function EntryRow({ entry, onDelete, onClose }: EntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.entryTime);

  return (
    <>
      <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
        <td className="py-3 px-4 text-xs text-zinc-500">
          <div>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <div className="text-zinc-600">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </td>
        <td className="py-3 px-4 text-sm font-medium text-white">{entry.pair}</td>
        <td className="py-3 px-4">{directionBadge(entry.direction)}</td>
        <td className="py-3 px-4 text-sm text-zinc-300 font-mono">{entry.entryPrice.toLocaleString()}</td>
        <td className="py-3 px-4 text-sm text-zinc-300 font-mono">
          {entry.exitPrice ? entry.exitPrice.toLocaleString() : <span className="text-zinc-600">—</span>}
        </td>
        <td className={`py-3 px-4 text-sm font-semibold font-mono ${pnlColor(entry.pnlPct)}`}>
          {entry.pnlPct !== undefined
            ? `${entry.pnlPct >= 0 ? '+' : ''}${entry.pnlPct}%`
            : <span className="text-zinc-600">—</span>}
        </td>
        <td className="py-3 px-4">{outcomeBadge(entry.outcome)}</td>
        <td className="py-3 px-4">{signalMatchBadge(entry)}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1">
            {entry.outcome === 'OPEN' && (
              <button
                onClick={() => onClose(entry)}
                className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
              >
                Close
              </button>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Expand"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-800/40 bg-zinc-900/30">
          <td colSpan={9} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {entry.notes && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Notes</div>
                  <p className="text-zinc-300">{entry.notes}</p>
                </div>
              )}
              {entry.tags.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {entry.signalContext && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Signal Context at Entry</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-zinc-500">Direction</span>
                    <span className={entry.signalContext.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                      {entry.signalContext.direction}
                    </span>
                    <span className="text-zinc-500">Confidence</span>
                    <span className="text-zinc-300">{entry.signalContext.confidence}%</span>
                    <span className="text-zinc-500">RSI</span>
                    <span className="text-zinc-300">{entry.signalContext.rsi.toFixed(1)}</span>
                    <span className="text-zinc-500">MACD Hist</span>
                    <span className="text-zinc-300">{entry.signalContext.macd.toFixed(4)}</span>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface JournalState {
  entries: JournalEntry[];
  summary: WeeklySummary | null;
}

function loadState(): JournalState {
  return { entries: getEntries(), summary: getWeeklySummary() };
}

export default function JournalClient() {
  const [state, setState] = useState<JournalState>(() => loadState());
  const [showAddModal, setShowAddModal] = useState(false);
  const [closeTarget, setCloseTarget] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const entries = state.entries;
  const summary = state.summary;

  const refresh = useCallback(() => {
    setState(loadState());
  }, []);

  const filtered = entries.filter(e => {
    if (filter === 'open') return e.outcome === 'OPEN';
    if (filter === 'closed') return e.outcome !== 'OPEN';
    if (filter === 'BUY') return e.direction === 'BUY';
    if (filter === 'SELL') return e.direction === 'SELL';
    return true;
  });

  function handleDelete(id: string) {
    deleteEntry(id);
    refresh();
  }

  function handleAdd(entry: JournalEntry) {
    setState(prev => ({ entries: [entry, ...prev.entries], summary: getWeeklySummary() }));
  }

  function handleClosed(updated: JournalEntry) {
    setState(prev => ({ entries: prev.entries.map(e => e.id === updated.id ? updated : e), summary: getWeeklySummary() }));
  }

  function handleExport() {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeclaw-journal-${summary.weekStart.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'closed', label: 'Closed' },
    { id: 'BUY', label: 'BUY' },
    { id: 'SELL', label: 'SELL' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero */}
      <div className="border-b border-zinc-800/60 bg-[#0d1421]/60">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
              </div>
              <p className="text-zinc-400 text-sm max-w-xl">
                Log your trades with live TradeClaw signal context. Track your edge, identify patterns, and export weekly reports.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Log Trade
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Weekly Summary */}
        {summary && entries.length > 0 && (
          <SummaryCard summary={summary} onExport={handleExport} />
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {tab.id === 'open' && entries.filter(e => e.outcome === 'OPEN').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-zinc-700 rounded-full text-xs">
                  {entries.filter(e => e.outcome === 'OPEN').length}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-600">{filtered.length} trades</span>
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">No trades logged yet</h3>
            <p className="text-zinc-600 text-sm mb-6 max-w-xs">
              Start logging your trades to track your performance and discover your edge over time.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Log your first trade
            </button>
            <p className="text-xs text-zinc-700 mt-4">
              All data is stored locally in your browser — never sent to any server.
            </p>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="bg-[#0d1421] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40">
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Pair</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Direction</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Entry</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Exit</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">P&amp;L%</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Outcome</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Signal</th>
                    <th className="text-left py-3 px-4 text-xs text-zinc-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDelete}
                      onClose={e => setCloseTarget(e)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-xs text-zinc-600 mb-3">All journal data is stored locally in your browser</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              View live signals
            </Link>
            <Link
              href="/paper-trading"
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Paper trading
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <Star className="w-3.5 h-3.5" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
      {closeTarget && (
        <CloseModal
          entry={closeTarget}
          onClose={() => setCloseTarget(null)}
          onClosed={handleClosed}
        />
      )}
    </div>
  );
}
