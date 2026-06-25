'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  MessageCircle,
  Mail,
  Webhook as WebhookIcon,
  Sparkles,
  CircleAlert,
  TrendingUp,
} from 'lucide-react';
import { useUserTier } from '../../../lib/hooks/use-user-tier';
import { useUpgradeModal } from '../../../components/UpgradeModal';
import AlertChannelConfigPanel from './AlertChannelConfig';

const FREE_ACTIVE_RULE_CAP = 3;

interface UpgradeRequiredBody {
  error: 'upgrade_required';
  reason: string;
  limit?: { kind: 'rate' | 'count'; used: number; max: number; windowHours?: number };
  upgradeUrl: string;
}

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

interface ChannelMeta {
  id: Channel;
  label: string;
  Icon: typeof Send;
}

const CHANNELS: ChannelMeta[] = [
  { id: 'telegram', label: 'Telegram', Icon: Send },
  { id: 'discord', label: 'Discord', Icon: MessageCircle },
  { id: 'email', label: 'Email', Icon: Mail },
  { id: 'webhook', label: 'Webhook', Icon: WebhookIcon },
];

const CHANNEL_BY_ID: Record<Channel, ChannelMeta> = CHANNELS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {} as Record<Channel, ChannelMeta>);

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
  const tier = useUserTier();
  const isFree = tier === null || tier === 'free';
  const { showUpgrade, modal: upgradeModal } = useUpgradeModal();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [draft, setDraft] = useState(defaultRule());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atCap, setAtCap] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeCount = rules.filter((r) => r.enabled).length;
  const remainingFree = Math.max(0, FREE_ACTIVE_RULE_CAP - activeCount);

  useEffect(() => {
    fetch('/api/alert-rules')
      .then(async (r) => {
        if (r.status === 401) throw new Error('Sign in to manage alert rules.');
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(typeof d.error === 'string' ? d.error : 'Failed to load alert rules');
        }
        return d;
      })
      .then((d) => setRules(d.rules ?? []))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load alert rules'));
  }, []);

  async function handleCreate() {
    // Pre-check: if free user is at cap, show modal instead of hitting API
    if (isFree && draft.enabled && activeCount >= FREE_ACTIVE_RULE_CAP) {
      showUpgrade(
        'Alert rule limit reached',
        `Free accounts can have ${FREE_ACTIVE_RULE_CAP} active alert rules. Upgrade to Pro for unlimited rules across all symbols and channels.`,
        'alert-rules-cap',
      );
      return;
    }
    setSaving(true);
    setError(null);
    setAtCap(false);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (res.status === 402) {
        const d = (await res.json()) as UpgradeRequiredBody;
        setError(d.reason);
        setAtCap(true);
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(typeof d.error === 'string' ? d.error : JSON.stringify(d.error));
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

  const sectionLabel = 'text-[11px] text-zinc-500 font-mono uppercase tracking-wider';
  const fieldClass =
    'mt-1 w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-colors';

  return (
    <div
      className="min-h-screen bg-[#050505] text-white"
      style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}
    >
      {upgradeModal}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Settings
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <Bell className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-semibold tracking-tight">Alert Rules</h1>
          </div>
          <p className="text-sm text-zinc-500">
            One rule, multiple channels — get pinged on Telegram, Discord, and Email when a signal matches.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 pb-20 md:pb-8 space-y-6">
        {loadError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <CircleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {isFree && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-mono">
                Free tier: {activeCount} / {FREE_ACTIVE_RULE_CAP} active rules used
                {remainingFree === 0 ? ' (at cap)' : ''}
              </span>
            </div>
            <Link
              href="/pricing?from=alert-rules"
              className="inline-flex items-center gap-1 shrink-0 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-black transition-colors hover:bg-emerald-400"
            >
              Unlimited on Pro
              <ArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          </div>
        )}

        {/* Create Form */}
        <section className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">New Rule</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={sectionLabel}>Name</label>
              <input
                className={fieldClass}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={sectionLabel}>Symbol</label>
              <select
                className={fieldClass}
                value={draft.symbol ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value || null }))}
              >
                {SYMBOLS.map((s) => <option key={s} value={s}>{s || 'All symbols'}</option>)}
              </select>
            </div>
            <div>
              <label className={sectionLabel}>Timeframe</label>
              <select
                className={fieldClass}
                value={draft.timeframe ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, timeframe: e.target.value || null }))}
              >
                {TIMEFRAMES.map((t) => <option key={t} value={t}>{t || 'All timeframes'}</option>)}
              </select>
            </div>
            <div>
              <label className={sectionLabel}>Direction</label>
              <select
                className={fieldClass}
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
            <div className="flex items-center justify-between mb-1">
              <label className={sectionLabel}>Min Confidence</label>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">{draft.min_confidence}%</span>
            </div>
            <input
              type="range" min={50} max={95} step={5}
              className="w-full accent-emerald-500"
              value={draft.min_confidence}
              onChange={(e) => setDraft((d) => ({ ...d, min_confidence: Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className={`${sectionLabel} mb-2 block`}>Notify via</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => {
                const active = draft.channels.includes(ch.id);
                const Icon = ch.Icon;
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-[#0d0d0d] border-[#1f1f1f] text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-300 flex items-center gap-1.5">
                <CircleAlert className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </p>
              {atCap && (
                <Link
                  href="/pricing?from=alert-rules"
                  className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400 transition-colors"
                >
                  Upgrade
                </Link>
              )}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving || draft.channels.length === 0}
            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving…' : 'Create Rule'}
          </button>
        </section>

        {/* Per-channel platform configuration */}
        <AlertChannelConfigPanel />

        {/* Existing Rules */}
        {rules.length > 0 ? (
          <section>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Active Rules ({rules.length})
            </h2>
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-emerald-500/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{rule.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-zinc-500">
                      <span>{rule.symbol ?? 'all symbols'}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{rule.timeframe ?? 'all TFs'}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{rule.direction ?? 'both'}</span>
                      <span className="text-zinc-700">·</span>
                      <span>≥{rule.min_confidence}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {rule.channels.map((c) => {
                        const meta = CHANNEL_BY_ID[c as Channel];
                        if (!meta) return null;
                        const Icon = meta.Icon;
                        return (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(rule.id, !rule.enabled)}
                      className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded border transition-colors ${
                        rule.enabled
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
                          : 'text-zinc-600 border-[#2a2a2a]'
                      }`}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          !loadError && (
            <div className="bg-[#0a0a0a] border border-dashed border-[#1a1a1a] rounded-xl px-6 py-10 text-center">
              <Bell className="h-7 w-7 mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-400">No alert rules yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                Create one above — it&apos;ll fire across every channel you&apos;ve configured.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
