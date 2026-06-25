'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen, Plus, X, Trash2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, ArrowLeft, Filter, Brain,
} from 'lucide-react';

interface TradeEntry {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: number | null;
  exitPrice: number | null;
  positionSize: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  setupType: string | null;
  notes: string | null;
  tags: string[];
  tradeDate: string;
  createdAt: string;
}

interface TradeStats {
  totalTrades: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

const SETUP_TYPES = ['breakout', 'pullback', 'reversal', 'trend_follow'];

export default function JournalClientDB() {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSymbol, setFilterSymbol] = useState('');

  // Form state
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [pnl, setPnl] = useState('');
  const [pnlPercent, setPnlPercent] = useState('');
  const [setupType, setSetupType] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterSymbol) params.set('symbol', filterSymbol);
      const res = await fetch(`/api/journal?${params.toString()}`);
      const data = await res.json();
      setTrades(data.trades ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filterSymbol]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/journal?stats=1');
      const data = await res.json();
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTrades(); fetchStats(); }, [fetchTrades, fetchStats]);

  function resetForm() {
    setSymbol(''); setDirection('LONG'); setEntryPrice(''); setExitPrice('');
    setPositionSize(''); setPnl(''); setPnlPercent(''); setSetupType('');
    setNotes(''); setTags(''); setTradeDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol) return;
    setSaving(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          direction,
          entryPrice: entryPrice ? Number(entryPrice) : undefined,
          exitPrice: exitPrice ? Number(exitPrice) : undefined,
          positionSize: positionSize ? Number(positionSize) : undefined,
          pnl: pnl ? Number(pnl) : undefined,
          pnlPercent: pnlPercent ? Number(pnlPercent) : undefined,
          setupType: setupType || undefined,
          notes: notes || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
          tradeDate,
        }),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchTrades();
        fetchStats();
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
      setTrades(trades.filter(t => t.id !== id));
      fetchStats();
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white pb-20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Trade Journal
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Trade
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && stats.totalTrades > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Total', value: stats.totalTrades, color: 'text-white' },
              { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400' },
              { label: 'Avg P&L', value: `$${stats.avgPnl}`, color: stats.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400' },
              { label: 'Profit Factor', value: stats.profitFactor === Infinity ? 'Inf' : stats.profitFactor, color: 'text-white/80' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                <div className={`text-sm font-bold font-mono tabular-nums ${color}`}>{value}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add trade form */}
        {showForm && (
          <div className="mb-6 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Log Trade
              </h2>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Symbol *</label>
                  <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="BTCUSD" required className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Direction *</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setDirection('LONG')} className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'text-white/40 border-white/[0.06]'}`}>LONG</button>
                    <button type="button" onClick={() => setDirection('SHORT')} className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${direction === 'SHORT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'text-white/40 border-white/[0.06]'}`}>SHORT</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Date</label>
                  <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Entry Price</label>
                  <input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Exit Price</label>
                  <input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="0.00" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">P&L ($)</label>
                  <input type="number" step="any" value={pnl} onChange={e => setPnl(e.target.value)} placeholder="0.00" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">P&L (%)</label>
                  <input type="number" step="any" value={pnlPercent} onChange={e => setPnlPercent(e.target.value)} placeholder="0.0" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Position Size</label>
                  <input type="number" step="any" value={positionSize} onChange={e => setPositionSize(e.target.value)} placeholder="0.00" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Setup Type</label>
                  <select value={setupType} onChange={e => setSetupType(e.target.value)} className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/30">
                    <option value="">None</option>
                    {SETUP_TYPES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Tags (comma-sep)</label>
                  <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="momentum, scalp" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Trade rationale, lessons learned..." className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 resize-none" />
              </div>
              <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Trade'}
              </button>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={filterSymbol}
            onChange={e => setFilterSymbol(e.target.value.toUpperCase())}
            placeholder="Filter by symbol..."
            className="bg-transparent border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 w-40"
          />
        </div>

        {/* Trade log */}
        {loading ? (
          <div className="text-center py-16 text-white/40 text-sm">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-xl">
            <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">No trades logged yet</p>
            <p className="text-xs text-white/30">Start journaling to track your performance</p>
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/40 font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/40 font-medium uppercase tracking-wider">Symbol</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/40 font-medium uppercase tracking-wider">Dir</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-white/40 font-medium uppercase tracking-wider">P&L</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-white/40 font-medium uppercase tracking-wider">Setup</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    expanded={expandedId === trade.id}
                    onToggle={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                    onDelete={() => handleDelete(trade.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({
  trade, expanded, onToggle, onDelete,
}: {
  trade: TradeEntry; expanded: boolean;
  onToggle: () => void; onDelete: () => void;
}) {
  const isProfit = trade.pnl !== null && trade.pnl > 0;
  const isLoss = trade.pnl !== null && trade.pnl < 0;

  return (
    <>
      <tr className="border-b border-white/[0.04] hover:bg-white/[0.01] cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 font-mono text-xs text-white/60">{trade.tradeDate}</td>
        <td className="px-4 py-3 font-mono font-medium text-white">{trade.symbol}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trade.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trade.direction === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trade.direction}
          </span>
        </td>
        <td className={`px-4 py-3 text-right font-mono text-xs tabular-nums ${isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-white/40'}`}>
          {trade.pnl !== null ? `$${trade.pnl.toFixed(2)}` : '—'}
        </td>
        <td className="px-4 py-3 text-right text-xs text-white/40">{trade.setupType?.replace('_', ' ') ?? '—'}</td>
        <td className="px-2 py-3">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/[0.04] bg-white/[0.01]">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-xs">
              <div><span className="text-white/40">Entry: </span><span className="font-mono text-white/70">{trade.entryPrice ?? '—'}</span></div>
              <div><span className="text-white/40">Exit: </span><span className="font-mono text-white/70">{trade.exitPrice ?? '—'}</span></div>
              <div><span className="text-white/40">Size: </span><span className="font-mono text-white/70">{trade.positionSize ?? '—'}</span></div>
              <div><span className="text-white/40">P&L %: </span><span className="font-mono text-white/70">{trade.pnlPercent !== null ? `${trade.pnlPercent}%` : '—'}</span></div>
            </div>
            {trade.notes && <p className="text-xs text-white/50 mb-2">{trade.notes}</p>}
            {trade.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {trade.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-white/[0.05] border border-white/[0.06] rounded text-white/50">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4">
              <Link
                href={`/journal/autopsy?tradeId=${trade.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
              >
                <Brain className="w-3 h-3" />
                Open Autopsy
              </Link>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center gap-1 text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
