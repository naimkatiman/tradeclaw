'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Plus, Trash2, Sparkles, Save, History, ArrowLeft,
} from 'lucide-react';

interface WatchlistItem {
  symbol: string;
  bias: string;
  keyLevels: string;
}

interface GamePlan {
  id: string;
  date: string;
  watchlist: WatchlistItem[];
  notes: string | null;
  createdAt: string;
}

export default function GamePlanClient() {
  const [plan, setPlan] = useState<GamePlan | null>(null);
  const [history, setHistory] = useState<GamePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const fetchPlan = useCallback(async (date?: string) => {
    try {
      const url = date ? `/api/game-plan?date=${date}` : '/api/game-plan';
      const res = await fetch(url);
      const data = await res.json();
      setPlan(data.plan ?? null);
      if (data.plan) {
        setWatchlist(data.plan.watchlist);
        setNotes(data.plan.notes ?? '');
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/game-plan?history=1');
      const data = await res.json();
      setHistory(data.plans ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchPlan(); fetchHistory(); }, [fetchPlan, fetchHistory]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/game-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, watchlist, notes }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setEditMode(false);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/game-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setWatchlist(data.plan.watchlist);
        setNotes(data.plan.notes ?? '');
        setEditMode(false);
      }
    } catch { /* ignore */ } finally {
      setGenerating(false);
    }
  }

  function addWatchlistItem() {
    setWatchlist([...watchlist, { symbol: '', bias: 'Neutral', keyLevels: '' }]);
  }

  function removeWatchlistItem(idx: number) {
    setWatchlist(watchlist.filter((_, i) => i !== idx));
  }

  function updateWatchlistItem(idx: number, field: keyof WatchlistItem, value: string) {
    const updated = [...watchlist];
    updated[idx] = { ...updated[idx], [field]: value };
    setWatchlist(updated);
  }

  function viewHistoryPlan(p: GamePlan) {
    setPlan(p);
    setWatchlist(p.watchlist);
    setNotes(p.notes ?? '');
    setShowHistory(false);
    setEditMode(false);
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white pb-20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Game Plan
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/60 border border-white/[0.06] rounded-lg hover:text-white hover:border-white/[0.12] transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              {plan?.date === today ? "Today's Plan" : plan?.date ?? "Today's Plan"}
            </h1>
            <p className="text-xs text-white/40 mt-1">Pre-market watchlist and bias</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Generating...' : 'Auto-generate'}
            </button>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-2 text-xs font-medium text-white/60 border border-white/[0.06] rounded-lg hover:text-white hover:border-white/[0.12] transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="mb-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Recent Plans</h3>
            {history.length === 0 ? (
              <p className="text-xs text-white/40">No previous plans</p>
            ) : (
              <div className="space-y-2">
                {history.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => viewHistoryPlan(p)}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg border border-white/[0.06] hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-colors"
                  >
                    <span className="font-mono text-white/80">{p.date}</span>
                    <span className="text-white/40 ml-2">{p.watchlist.length} symbols</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-white/40 text-sm">Loading...</div>
        ) : editMode ? (
          /* Edit mode */
          <div className="space-y-5">
            {/* Watchlist editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Watchlist</h2>
                <button onClick={addWatchlistItem} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Symbol
                </button>
              </div>
              <div className="space-y-2">
                {watchlist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                    <input
                      type="text"
                      value={item.symbol}
                      onChange={(e) => updateWatchlistItem(idx, 'symbol', e.target.value.toUpperCase())}
                      placeholder="BTCUSD"
                      className="w-24 bg-transparent border border-white/[0.06] rounded px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/30"
                    />
                    <select
                      value={item.bias}
                      onChange={(e) => updateWatchlistItem(idx, 'bias', e.target.value)}
                      className="bg-[#0a0a0a] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/30"
                    >
                      <option value="Bullish">Bullish</option>
                      <option value="Bearish">Bearish</option>
                      <option value="Neutral">Neutral</option>
                    </select>
                    <input
                      type="text"
                      value={item.keyLevels}
                      onChange={(e) => updateWatchlistItem(idx, 'keyLevels', e.target.value)}
                      placeholder="Key levels / notes"
                      className="flex-1 bg-transparent border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/30"
                    />
                    <button onClick={() => removeWatchlistItem(idx)} className="text-white/30 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Market context, news, macro outlook..."
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/30 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2.5 text-sm text-white/60 border border-white/[0.06] rounded-lg hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : plan ? (
          /* View mode */
          <div className="space-y-5">
            {plan.watchlist.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Watchlist</h2>
                <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium uppercase tracking-wider">Symbol</th>
                        <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium uppercase tracking-wider">Bias</th>
                        <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium uppercase tracking-wider">Key Levels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.watchlist.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/[0.04] last:border-0">
                          <td className="px-4 py-3 font-mono font-medium text-white">{item.symbol}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              item.bias === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                              item.bias === 'Bearish' ? 'bg-rose-500/10 text-rose-400' :
                              'bg-white/[0.05] text-white/60'
                            }`}>
                              {item.bias}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/60">{item.keyLevels}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {plan.notes && (
              <div>
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Notes</h2>
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm text-white/70 whitespace-pre-wrap">
                  {plan.notes}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-xl">
            <CalendarDays className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">No game plan for today</p>
            <p className="text-xs text-white/30 mb-4">Create one manually or auto-generate from recent signals</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => { setWatchlist([{ symbol: '', bias: 'Neutral', keyLevels: '' }]); setEditMode(true); }}
                className="px-4 py-2 text-xs font-medium text-white/60 border border-white/[0.06] rounded-lg hover:text-white hover:border-white/[0.12] transition-colors"
              >
                Create Manually
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-generate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
