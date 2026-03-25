'use client';

import { useState, useEffect, useRef } from 'react';

type Indicator = 'RSI' | 'MACD' | 'PRICE' | 'EMA';
type Operator = 'above' | 'below' | 'crosses_above' | 'crosses_below';
type Logic = 'AND' | 'OR';

interface AlertCondition {
  id: string;
  indicator: Indicator;
  operator: Operator;
  value: number;
}

interface AlertRule {
  id: string;
  name: string;
  symbol: string;
  conditions: AlertCondition[];
  logic: Logic;
  enabled: boolean;
  lastTriggered?: number;
  triggerCount: number;
}

const STORAGE_KEY = 'tc-alert-rules';
const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];
const INDICATOR_LABELS: Record<Indicator, string> = {
  RSI: 'RSI (14)',
  MACD: 'MACD Histogram',
  PRICE: 'Price',
  EMA: 'Price vs EMA 50',
};
const OPERATOR_LABELS: Record<Operator, string> = {
  above: 'is above',
  below: 'is below',
  crosses_above: 'crosses above',
  crosses_below: 'crosses below',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultCondition(): AlertCondition {
  return { id: uid(), indicator: 'RSI', operator: 'below', value: 30 };
}

function defaultRule(): AlertRule {
  return {
    id: uid(),
    name: 'New Alert',
    symbol: 'XAUUSD',
    conditions: [defaultCondition()],
    logic: 'AND',
    enabled: true,
    triggerCount: 0,
  };
}

function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function fireNotification(rule: AlertRule) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification(`TradeClaw Alert: ${rule.name}`, {
    body: `${rule.symbol} — conditions met`,
    icon: '/icon-192.png',
  });
}

export function AlertRuleBuilder() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AlertRule | null>(null);
  const cooldownRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRules(JSON.parse(stored));
    } catch { /* ignore */ }
    requestNotificationPermission();
  }, []);

  const persist = (updated: AlertRule[]) => {
    setRules(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const openNew = () => {
    const r = defaultRule();
    setDraft(r);
    setEditingId(r.id);
  };

  const openEdit = (rule: AlertRule) => {
    setDraft({ ...rule, conditions: rule.conditions.map(c => ({ ...c })) });
    setEditingId(rule.id);
  };

  const saveRule = () => {
    if (!draft) return;
    const exists = rules.find(r => r.id === draft.id);
    const updated = exists
      ? rules.map(r => r.id === draft.id ? draft : r)
      : [...rules, draft];
    persist(updated);
    setEditingId(null);
    setDraft(null);
  };

  const deleteRule = (id: string) => {
    persist(rules.filter(r => r.id !== id));
    if (editingId === id) { setEditingId(null); setDraft(null); }
  };

  const toggleRule = (id: string) => {
    persist(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  // Simulate alert checking (every 30s, random trigger for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRules(prev => {
        const updated = prev.map(rule => {
          if (!rule.enabled) return rule;
          const lastCooldown = cooldownRef.current.get(rule.id) || 0;
          if (now - lastCooldown < 300000) return rule; // 5min cooldown

          // Simulate: ~5% chance per check
          if (Math.random() > 0.05) return rule;

          cooldownRef.current.set(rule.id, now);
          fireNotification(rule);
          return { ...rule, lastTriggered: now, triggerCount: rule.triggerCount + 1 };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateDraft = (updates: Partial<AlertRule>) => {
    setDraft(d => d ? { ...d, ...updates } : null);
  };

  const updateCondition = (condId: string, updates: Partial<AlertCondition>) => {
    setDraft(d => d ? {
      ...d,
      conditions: d.conditions.map(c => c.id === condId ? { ...c, ...updates } : c),
    } : null);
  };

  const addCondition = () => {
    setDraft(d => d ? { ...d, conditions: [...d.conditions, defaultCondition()] } : null);
  };

  const removeCondition = (condId: string) => {
    setDraft(d => d ? { ...d, conditions: d.conditions.filter(c => c.id !== condId) } : null);
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-white tracking-tight">Custom Alerts</div>
          <div className="text-[11px] text-zinc-600 mt-0.5">RSI, MACD, price — browser push notifications</div>
        </div>
        <button
          onClick={openNew}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/20 transition-all"
        >
          + New rule
        </button>
      </div>

      {/* Rules list */}
      {rules.length === 0 && !editingId && (
        <div className="text-center py-6 text-xs text-zinc-700">No alert rules yet</div>
      )}

      <div className="space-y-2">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`rounded-xl border p-3 transition-all duration-200 ${
              rule.enabled ? 'bg-white/[0.02] border-white/8' : 'bg-transparent border-white/5 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-7 h-3.5 rounded-full transition-all duration-200 relative flex-shrink-0 ${rule.enabled ? 'bg-emerald-500/40' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all duration-200 ${rule.enabled ? 'left-[14px] bg-emerald-400' : 'left-0.5 bg-zinc-600'}`} />
                </button>
                <div>
                  <div className="text-xs font-semibold text-white">{rule.name}</div>
                  <div className="text-[10px] text-zinc-600 font-mono">{rule.symbol} · {rule.conditions.length} condition{rule.conditions.length > 1 ? 's' : ''} ({rule.logic})</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rule.triggerCount > 0 && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">{rule.triggerCount}x</span>
                )}
                <button onClick={() => openEdit(rule)} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5 py-1 rounded hover:bg-white/5 transition-colors">Edit</button>
                <button onClick={() => deleteRule(rule.id)} className="text-[10px] text-zinc-700 hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-500/5 transition-colors">Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      {editingId && draft && (
        <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{rules.find(r => r.id === draft.id) ? 'Edit rule' : 'New rule'}</div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => updateDraft({ name: e.target.value })}
                className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Symbol</label>
              <select
                value={draft.symbol}
                onChange={e => updateDraft({ symbol: e.target.value })}
                className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
              >
                {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            {draft.conditions.map((cond, idx) => (
              <div key={cond.id} className="flex items-center gap-2">
                {idx > 0 && (
                  <button
                    onClick={() => updateDraft({ logic: draft.logic === 'AND' ? 'OR' : 'AND' })}
                    className="text-[9px] font-bold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 hover:text-zinc-300 w-8 text-center flex-shrink-0"
                  >
                    {draft.logic}
                  </button>
                )}
                {idx === 0 && <div className="w-8 flex-shrink-0" />}
                <select
                  value={cond.indicator}
                  onChange={e => updateCondition(cond.id, { indicator: e.target.value as Indicator })}
                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/30"
                >
                  {(Object.keys(INDICATOR_LABELS) as Indicator[]).map(k => (
                    <option key={k} value={k}>{INDICATOR_LABELS[k]}</option>
                  ))}
                </select>
                <select
                  value={cond.operator}
                  onChange={e => updateCondition(cond.id, { operator: e.target.value as Operator })}
                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/30"
                >
                  {(Object.keys(OPERATOR_LABELS) as Operator[]).map(k => (
                    <option key={k} value={k}>{OPERATOR_LABELS[k]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={cond.value}
                  onChange={e => updateCondition(cond.id, { value: Number(e.target.value) })}
                  className="w-20 bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
                />
                {draft.conditions.length > 1 && (
                  <button onClick={() => removeCondition(cond.id)} className="text-zinc-700 hover:text-red-400 text-xs flex-shrink-0">×</button>
                )}
              </div>
            ))}
          </div>

          {draft.conditions.length < 4 && (
            <button
              onClick={addCondition}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
            >
              <span>+</span> Add condition
            </button>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveRule}
              className="flex-1 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
            >
              Save rule
            </button>
            <button
              onClick={() => { setEditingId(null); setDraft(null); }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-zinc-500 text-xs hover:text-zinc-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
