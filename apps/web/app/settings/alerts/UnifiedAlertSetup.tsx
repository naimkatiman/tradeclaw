'use client';

import { useState, useEffect } from 'react';

type Channel = 'telegram' | 'discord' | 'email' | 'webhook';

interface AlertRule {
  id: string;
  name: string;
  symbol: string | null;
  timeframe: string | null;
  direction: 'BUY' | 'SELL' | null;
  min_confidence: number;
  channels: Channel[];
  enabled: boolean;
}

const SYMBOLS = ['', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD'];
const TIMEFRAMES = ['', 'M15', 'H1', 'H4', 'D1'];
const CHANNELS: { id: Channel; label: string; placeholder: string }[] = [
  { id: 'telegram', label: 'Telegram', placeholder: 'Bot token & Chat ID' },
  { id: 'discord', label: 'Discord', placeholder: 'Webhook URL' },
  { id: 'email', label: 'Email', placeholder: 'Email address' },
  { id: 'webhook', label: 'Webhook', placeholder: 'HTTPS URL' },
];

function defaultRule(): Omit<AlertRule, 'id'> {
  return {
    name: 'My Alert',
    symbol: null,
    timeframe: null,
    direction: null,
    min_confidence: 70,
    channels: ['telegram'],
    enabled: true,
  };
}

export default function UnifiedAlertSetup() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [draft, setDraft] = useState(defaultRule());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/alert-rules')
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(JSON.stringify(d.error));
        return;
      }
      const d = await res.json();
      setRules((prev) => [d.rule, ...prev]);
      setDraft(defaultRule());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/alert-rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await fetch(`/api/alert-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      const d = await res.json();
      setRules((prev) => prev.map((r) => r.id === id ? d.rule : r));
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white font-mono">Alert Rules</h1>
        <p className="text-sm text-zinc-500 mt-1">
          One rule, multiple channels — get notified on Telegram, Discord, and Email simultaneously.
        </p>
      </div>

      {/* Create Form */}
      <section className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white font-mono">New Rule</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Name</label>
            <input
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Symbol</label>
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.symbol ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value || null }))}
            >
              {SYMBOLS.map((s) => <option key={s} value={s}>{s || 'All symbols'}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Timeframe</label>
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.timeframe ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, timeframe: e.target.value || null }))}
            >
              {TIMEFRAMES.map((t) => <option key={t} value={t}>{t || 'All timeframes'}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Direction</label>
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.direction ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, direction: (e.target.value as 'BUY' | 'SELL') || null }))}
            >
              <option value="">Both</option>
              <option value="BUY">BUY only</option>
              <option value="SELL">SELL only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
            Min Confidence: {draft.min_confidence}%
          </label>
          <input
            type="range" min={50} max={95} step={5}
            className="mt-1 w-full accent-emerald-500"
            value={draft.min_confidence}
            onChange={(e) => setDraft((d) => ({ ...d, min_confidence: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-2 block">
            Notify via
          </label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => {
              const active = draft.channels.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      channels: active
                        ? d.channels.filter((c) => c !== ch.id)
                        : [...d.channels, ch.id],
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={saving || draft.channels.length === 0}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono font-semibold text-sm py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Create Rule'}
        </button>
      </section>

      {/* Existing Rules */}
      {rules.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-400 font-mono">Active Rules</h2>
          {rules.map((rule) => (
            <div key={rule.id} className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-mono font-medium text-white">{rule.name}</p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {[rule.symbol ?? 'all', rule.timeframe ?? 'all TF', rule.direction ?? 'both', `≥${rule.min_confidence}%`].join(' · ')}
                  {' → '}
                  {rule.channels.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(rule.id, !rule.enabled)}
                  className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                    rule.enabled
                      ? 'text-emerald-400 border-emerald-500/30'
                      : 'text-zinc-600 border-white/10'
                  }`}
                >
                  {rule.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
                  aria-label="Delete rule"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
