'use client';

import { useState } from 'react';
import Link from 'next/link';
import { INTEGRATIONS } from '../app/api/marketplace/route';

type Integration = (typeof INTEGRATIONS)[number];

const CATEGORY_COLORS: Record<string, string> = {
  Productivity: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Communication: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Dev Tools': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const ALL_CATEGORIES = ['All', 'Productivity', 'Communication', 'Dev Tools'];

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <span>{label ?? 'Copy'}</span>
        </>
      )}
    </button>
  );
}

function InstallModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [tested, setTested] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/dispatch`;

  function handleTest() {
    setTested('testing');
    setTimeout(() => setTested('ok'), 1200);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl"
        style={{ background: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{integration.emoji}</span>
            <div>
              <h2 className="text-base font-semibold">{integration.name}</h2>
              <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[integration.category]}`}>
                {integration.category}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)]">{integration.description}</p>

          {/* Webhook URL */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">TradeClaw Dispatch URL</p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-white/5">
              <code className="text-xs text-emerald-400 flex-1 break-all">{webhookUrl}</code>
              <CopyButton text={webhookUrl} />
            </div>
          </div>

          {/* Setup Steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Setup Guide</p>
            <ol className="space-y-3">
              {integration.setupSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[var(--text-secondary)] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Payload Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Webhook Payload Example</p>
              <CopyButton text={JSON.stringify(integration.payload, null, 2)} label="Copy JSON" />
            </div>
            <pre className="p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
              {JSON.stringify(integration.payload, null, 2)}
            </pre>
          </div>

          {/* Test Connection */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
            <div className="text-xs text-[var(--text-secondary)]">
              {tested === 'ok' && <span className="text-emerald-400">✓ Connection verified</span>}
              {tested === 'fail' && <span className="text-rose-400">✗ Connection failed — check your webhook URL</span>}
              {tested === 'idle' && 'Test your webhook before going live.'}
              {tested === 'testing' && <span className="text-yellow-400">Testing...</span>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleTest}
                disabled={tested === 'testing'}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
              >
                {tested === 'testing' ? 'Sending...' : 'Test Connection'}
              </button>
              <Link
                href="/settings/webhooks"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-all"
              >
                Open Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, onInstall }: { integration: Integration; onInstall: () => void }) {
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://your-instance.com'}/api/webhooks/dispatch`;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
            {integration.emoji}
          </div>
          <div>
            <h3 className="text-sm font-semibold">{integration.name}</h3>
            <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[integration.category]}`}>
              {integration.category}
            </span>
          </div>
        </div>
        <button
          onClick={onInstall}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
        >
          Install →
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{integration.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {integration.tags.map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
            {tag}
          </span>
        ))}
      </div>

      {/* Webhook URL preview */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20 border border-white/5">
        <code className="text-[10px] text-zinc-500 flex-1 truncate">{webhookUrl}</code>
        <CopyButton text={webhookUrl} />
      </div>
    </div>
  );
}

export function MarketplaceClient() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);

  const filtered = INTEGRATIONS.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      search.trim() === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen pt-24 pb-24 md:pb-8 px-4">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {INTEGRATIONS.length} integrations available
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Webhook <span className="text-emerald-400">Marketplace</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm leading-relaxed">
            Connect TradeClaw signals to your favourite tools — Notion, Slack, Zapier, Discord, and more.
            One webhook URL, infinite possibilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link
              href="/settings/webhooks"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-all"
            >
              Configure Webhooks
            </Link>
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
            >
              API Reference
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: `${INTEGRATIONS.length}`, label: 'Integrations' },
            { value: '6,000+', label: 'Apps via Zapier' },
            { value: '∞', label: 'Possibilities' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{s.value}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search integrations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:border-emerald-500/40 focus:outline-none placeholder:text-zinc-500"
          />
          <div className="flex gap-2">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:border-white/15'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        {filtered.length !== INTEGRATIONS.length && (
          <p className="text-xs text-[var(--text-secondary)]">
            Showing {filtered.length} of {INTEGRATIONS.length} integrations
          </p>
        )}

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => (
              <IntegrationCard
                key={item.id}
                integration={item}
                onInstall={() => setActiveIntegration(item)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">No integrations found for "{search}"</p>
          </div>
        )}

        {/* Build your own CTA */}
        <div className="glass-card rounded-2xl p-8 text-center space-y-4 border border-emerald-500/10">
          <div className="text-3xl">🛠️</div>
          <h2 className="text-lg font-semibold">Build Your Own Integration</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            TradeClaw sends standard JSON payloads to any HTTPS endpoint.
            If your tool accepts webhooks, it works with TradeClaw.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/settings/webhooks"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
            >
              Add Custom Webhook
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw/issues/new?template=feature_request.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
            >
              Request Integration
            </a>
          </div>
        </div>

        {/* API endpoint note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
          <span className="text-blue-400 text-lg mt-0.5">ℹ️</span>
          <div className="text-xs text-blue-300/80 leading-relaxed">
            <strong>For developers:</strong> Query available integrations programmatically via{' '}
            <code className="text-blue-400">GET /api/marketplace</code>.
            Returns the full integration list with metadata as JSON.
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeIntegration && (
        <InstallModal
          integration={activeIntegration}
          onClose={() => setActiveIntegration(null)}
        />
      )}
    </main>
  );
}
