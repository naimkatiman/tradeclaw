'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Gamepad2, Hash, Link, Webhook, Check, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  hasSecret: boolean;
  enabled: boolean;
  createdAt: string;
  deliveryLog: DeliveryEntry[];
}

interface DeliveryEntry {
  timestamp: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function urlLabel(url: string): string {
  if (url.includes('discord.com/api/webhooks')) return 'Discord';
  if (url.includes('hooks.slack.com')) return 'Slack';
  return 'Custom';
}

function urlIcon(url: string): React.ReactNode {
  if (url.includes('discord.com/api/webhooks')) return <Gamepad2 className="h-4 w-4 text-zinc-400" />;
  if (url.includes('hooks.slack.com')) return <Hash className="h-4 w-4 text-zinc-400" />;
  return <Link className="h-4 w-4 text-zinc-400" />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'success' | 'error' | 'warn' | 'neutral';
}) {
  const cls = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
  );
}

function DeliveryLog({ log }: { log: DeliveryEntry[] }) {
  if (log.length === 0) {
    return <p className="text-xs text-zinc-600 italic">No deliveries yet.</p>;
  }

  return (
    <div className="space-y-1">
      {log.map((entry, i) => (
        <div key={i} className="flex items-center gap-3 text-xs font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.success ? 'bg-emerald-400' : 'bg-red-400'}`}
          />
          <span className="text-zinc-600 w-24 flex-shrink-0">{relativeTime(entry.timestamp)}</span>
          <span
            className={`w-14 flex-shrink-0 ${entry.success ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {entry.statusCode !== null ? `HTTP ${entry.statusCode}` : 'ERR'}
          </span>
          {entry.attempt > 1 && (
            <span className="text-amber-500">attempt {entry.attempt}</span>
          )}
          {entry.error && !entry.success && (
            <span className="text-zinc-500 truncate">{entry.error}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Webhook card
// ---------------------------------------------------------------------------

function WebhookCard({
  wh,
  onToggle,
  onDelete,
  onTest,
  testingId,
}: {
  wh: WebhookEntry;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  testingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isTesting = testingId === wh.id;
  const type = urlLabel(wh.url);
  const icon = urlIcon(wh.url);
  const lastDelivery = wh.deliveryLog[0];

  return (
    <Card className="hover:border-[#2a2a2a]">
      <div className="flex items-start justify-between gap-4">
        {/* Left: name + url */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {icon}
            <span className="font-medium text-sm">
              {wh.name || type}
            </span>
            <Badge variant={wh.enabled ? 'success' : 'neutral'}>
              {wh.enabled ? 'Active' : 'Disabled'}
            </Badge>
            <Badge variant="neutral">{type}</Badge>
            {wh.hasSecret && <Badge variant="warn">HMAC</Badge>}
            {lastDelivery && (
              <Badge variant={lastDelivery.success ? 'success' : 'error'}>
                Last: {lastDelivery.success ? <Check className="inline h-3 w-3" /> : <X className="inline h-3 w-3" />}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-mono truncate">{wh.url}</p>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onTest(wh.id)}
            disabled={isTesting || !wh.enabled}
            className="px-3 py-1.5 text-xs bg-[#141414] border border-[#2a2a2a] text-zinc-300 rounded-lg hover:border-emerald-500/30 hover:text-emerald-400 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {isTesting ? <Spinner /> : null}
            {isTesting ? 'Testing…' : 'Test'}
          </button>

          {/* Enable/disable toggle */}
          <button
            onClick={() => onToggle(wh.id, !wh.enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              wh.enabled ? 'bg-emerald-500/30 border border-emerald-500/40' : 'bg-zinc-800 border border-zinc-700'
            }`}
            title={wh.enabled ? 'Disable webhook' : 'Enable webhook'}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                wh.enabled ? 'translate-x-4 bg-emerald-400' : 'translate-x-0.5 bg-zinc-500'
              }`}
            />
          </button>

          {/* Expand logs */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Show delivery log"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(wh.id)}
            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete webhook"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Delivery log (expandable) */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Delivery Log (last 10)
          </p>
          <DeliveryLog log={wh.deliveryLog} />
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add webhook form
// ---------------------------------------------------------------------------

function AddWebhookForm({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), name: name.trim(), secret: secret.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to add webhook');
        return;
      }
      setUrl('');
      setName('');
      setSecret('');
      onAdded();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="font-medium mb-4 text-sm">Add Webhook</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Webhook URL *</Label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/… or https://hooks.slack.com/…"
            required
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          <p className="text-xs text-zinc-600 mt-1">
            Discord and Slack webhooks are auto-detected and formatted natively.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Name / Label (optional)</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Discord Server"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div>
            <Label>Secret (optional — for HMAC-SHA256 signature)</Label>
            <div className="flex gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="your-secret-key"
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="px-3 py-2 bg-[#141414] border border-[#2a2a2a] text-zinc-500 rounded-lg hover:text-zinc-300 transition-colors text-xs"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              If set, deliveries include <code className="text-zinc-500">X-TradeClaw-Signature</code> header.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className="px-5 py-2.5 bg-emerald-500 text-black text-sm font-semibold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {submitting && <Spinner />}
            {submitting ? 'Adding…' : 'Add Webhook'}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Payload reference
// ---------------------------------------------------------------------------

const SAMPLE_PAYLOAD = JSON.stringify(
  {
    event: 'signal.new',
    timestamp: '2024-03-27T12:00:00.000Z',
    signal: {
      id: 'XAUUSD-H1-BUY-1711500000',
      symbol: 'XAUUSD',
      timeframe: 'H1',
      direction: 'BUY',
      confidence: 78,
      entry: 2180.5,
      stopLoss: 2175.0,
      takeProfit: [2190.0, 2195.0],
      indicators: { rsi: 32, macd: 'bullish', ema: 'golden_cross' },
    },
  },
  null,
  2
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      const data = (await res.json()) as { webhooks: WebhookEntry[] };
      setWebhooks(data.webhooks ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  async function handleToggle(id: string, enabled: boolean) {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled } : w))
    );
    try {
      await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
    } catch {
      // Re-fetch on error
      fetchWebhooks();
    }
  }

  async function handleDelete(id: string) {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    try {
      await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      fetchWebhooks();
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { ok: boolean; statusCode?: number; error?: string };
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          ok: data.ok,
          message: data.ok
            ? `Delivered (HTTP ${data.statusCode})`
            : `Failed: ${data.error ?? 'Unknown error'}`,
        },
      }));
      // Refresh to pick up the new delivery log entry
      fetchWebhooks();
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, message: 'Network error' },
      }));
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white" style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
      {/* Header */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Webhook className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-semibold tracking-tight">Webhook Alerts</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Push signal notifications to any HTTP endpoint — Discord, Slack, or custom services.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 pb-20 md:pb-8 space-y-6">

        {/* Add webhook */}
        <AddWebhookForm onAdded={fetchWebhooks} />

        {/* Webhook list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Configured Webhooks
            </h2>
            <button
              onClick={fetchWebhooks}
              disabled={loading}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : webhooks.length === 0 ? (
            <Card className="text-center py-12">
              <div className="flex justify-center mb-3"><Webhook className="h-8 w-8 text-zinc-600" /></div>
              <p className="text-zinc-400 text-sm">No webhooks configured yet.</p>
              <p className="text-zinc-600 text-xs mt-1">
                Add a webhook above to start receiving signal alerts.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div key={wh.id}>
                  <WebhookCard
                    wh={wh}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onTest={handleTest}
                    testingId={testingId}
                  />
                  {testResults[wh.id] && (
                    <div
                      className={`mt-1 px-4 py-2.5 rounded-lg text-xs border ${
                        testResults[wh.id].ok
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/5 border-red-500/20 text-red-400'
                      }`}
                    >
                      {testResults[wh.id].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payload reference */}
        <Card>
          <h2 className="font-medium mb-1 text-sm">Payload Format</h2>
          <p className="text-xs text-zinc-500 mb-4">
            Each signal delivery sends this JSON to your endpoint. Discord and Slack URLs are
            automatically formatted as native embeds/blocks.
          </p>
          <pre className="text-xs text-zinc-400 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 overflow-x-auto">
            {SAMPLE_PAYLOAD}
          </pre>
        </Card>

        {/* Security reference */}
        <Card>
          <h2 className="font-medium mb-4 text-sm">Security & API Reference</h2>
          <div className="space-y-4">
            <div>
              <Label>HMAC Signature</Label>
              <p className="text-xs text-zinc-500 mb-2">
                When a webhook has a secret, every delivery includes a signature header so you can
                verify the request came from TradeClaw:
              </p>
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
                <code className="text-xs text-zinc-400">
                  X-TradeClaw-Signature: sha256=&lt;HMAC-SHA256 of body using your secret&gt;
                </code>
              </div>
            </div>

            <div>
              <Label>Retry Policy</Label>
              <p className="text-xs text-zinc-500">
                3 attempts with exponential backoff — 1s, 4s, 16s between retries. Each attempt is
                logged to the delivery log.
              </p>
            </div>

            <div>
              <Label>Internal API Endpoints</Label>
              <div className="space-y-2">
                {[
                  { method: 'GET', path: '/api/webhooks', desc: 'List all webhooks' },
                  { method: 'POST', path: '/api/webhooks', desc: 'Create a webhook' },
                  { method: 'PATCH', path: '/api/webhooks', desc: 'Update webhook (toggle, rename, etc.)' },
                  { method: 'DELETE', path: '/api/webhooks', desc: 'Delete a webhook' },
                  { method: 'POST', path: '/api/webhooks/test', desc: 'Send test payload to a webhook' },
                  {
                    method: 'POST',
                    path: '/api/webhooks/dispatch',
                    desc: 'Dispatch a signal to all active webhooks',
                  },
                ].map(({ method, path, desc }) => (
                  <div key={path} className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                        method === 'GET'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : method === 'DELETE'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {method}
                    </span>
                    <div>
                      <code className="text-xs text-zinc-300 font-mono">{path}</code>
                      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
