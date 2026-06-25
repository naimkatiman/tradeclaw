'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Cog, Plus, X, Trash2, ArrowLeft, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react';

interface RuleCondition {
  indicator: string;
  operator: string;
  value: number;
}

type RuleAction = 'ENTRY_LONG' | 'ENTRY_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';

interface CustomRule {
  id: string;
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: RuleAction;
  enabled: boolean;
  createdAt: string;
}

const INDICATORS = ['Price', 'RSI', 'MACD', 'EMA'];
const OPERATORS = ['>', '<', '>=', '<=', '=='];
const ACTIONS: { value: RuleAction; label: string; color: string }[] = [
  { value: 'ENTRY_LONG', label: 'Entry Long', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'ENTRY_SHORT', label: 'Entry Short', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { value: 'EXIT_LONG', label: 'Exit Long', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'EXIT_SHORT', label: 'Exit Short', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
];

export default function RulesClient() {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { indicator: 'RSI', operator: '<', value: 30 },
  ]);
  const [action, setAction] = useState<RuleAction>('ENTRY_LONG');
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  function addCondition() {
    setConditions([...conditions, { indicator: 'Price', operator: '>', value: 0 }]);
  }

  function removeCondition(idx: number) {
    setConditions(conditions.filter((_, i) => i !== idx));
  }

  function updateCondition(idx: number, field: keyof RuleCondition, value: string | number) {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [field]: value };
    setConditions(updated);
  }

  function resetBuilder() {
    setName(''); setDescription('');
    setConditions([{ indicator: 'RSI', operator: '<', value: 30 }]);
    setAction('ENTRY_LONG');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || conditions.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, conditions, action }),
      });
      if (res.ok) {
        resetBuilder();
        setShowBuilder(false);
        fetchRules();
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      const res = await fetch('/api/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      if (res.ok) {
        setRules(rules.map(r => r.id === id ? { ...r, enabled } : r));
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
      setRules(rules.filter(r => r.id !== id));
    } catch { /* ignore */ }
  }

  const actionMeta = (a: RuleAction) => ACTIONS.find(x => x.value === a);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white pb-20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Custom Rules
          </Link>
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Cog className="w-5 h-5 text-emerald-400" />
            Entry / Exit Rules
          </h1>
          <p className="text-xs text-white/40 mt-1">Define indicator-based conditions for automated trade logic</p>
        </div>

        {/* Rule builder */}
        {showBuilder && (
          <div className="mb-6 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Build Rule
              </h2>
              <button onClick={() => setShowBuilder(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Rule Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="RSI Oversold Entry" required className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Description</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="w-full bg-transparent border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30" />
                </div>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Conditions</label>
                  <button type="button" onClick={addCondition} className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {conditions.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                      <select
                        value={c.indicator}
                        onChange={e => updateCondition(idx, 'indicator', e.target.value)}
                        className="bg-[#050505] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/30"
                      >
                        {INDICATORS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <select
                        value={c.operator}
                        onChange={e => updateCondition(idx, 'operator', e.target.value)}
                        className="bg-[#050505] border border-white/[0.06] rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/30"
                      >
                        {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input
                        type="number"
                        step="any"
                        value={c.value}
                        onChange={e => updateCondition(idx, 'value', Number(e.target.value))}
                        className="w-24 bg-transparent border border-white/[0.06] rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/30"
                      />
                      {conditions.length > 1 && (
                        <button type="button" onClick={() => removeCondition(idx)} className="text-white/20 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Action</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACTIONS.map(a => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAction(a.value)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${action === a.value ? a.color : 'text-white/40 border-white/[0.06] bg-transparent'}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Rule'}
              </button>
            </form>
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="text-center py-16 text-white/40 text-sm">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-xl">
            <Cog className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">No custom rules yet</p>
            <p className="text-xs text-white/30 mb-4">Build indicator-based entry/exit conditions</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const meta = actionMeta(rule.action);
              return (
                <div key={rule.id} className={`p-4 border rounded-xl transition-colors ${rule.enabled ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.04] bg-white/[0.01] opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white">{rule.name}</span>
                        {meta && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${meta.color}`}>
                            {meta.label}
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-white/40 mb-2">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {rule.conditions.map((c, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-white/60">
                            {c.indicator} {c.operator} {c.value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(rule.id, !rule.enabled)}
                        className={`transition-colors ${rule.enabled ? 'text-emerald-400' : 'text-white/20'}`}
                      >
                        {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="text-white/20 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
