'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Hash,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Code,
  Copy,
  Check,
} from 'lucide-react';

interface SlackIntegrationItem {
  id: string;
  name: string;
  webhookUrl: string;
  channel: string;
  pairs: string[] | 'all';
  minConfidence: number;
  direction: 'ALL' | 'BUY' | 'SELL';
  enabled: boolean;
  createdAt: string;
  lastDelivery?: string;
  deliveryCount: number;
  failCount: number;
}

const EXAMPLE_PAYLOAD = `{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "▲ XAUUSD BUY — 82% confidence"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Entry:* $2185.50" },
        { "type": "mrkdwn", "text": "*Stop Loss:* $2178.00" },
        { "type": "mrkdwn", "text": "*Take Profit:* $2195 / $2205" },
        { "type": "mrkdwn", "text": "*RSI:* 35" },
        { "type": "mrkdwn", "text": "*MACD:* bullish" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "TradeClaw Signal Alert" }
      ]
    }
  ]
}`;

export function SlackClient() {
  const [integrations, setIntegrations] = useState<SlackIntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      if (data.success) setIntegrations(data.data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAdding(true);
    try {
      const res = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', webhookUrl, name, channel }),
      });
      const data = await res.json();
      if (data.success) {
        setAddSuccess('Webhook connected successfully!');
        setWebhookUrl('');
        setName('');
        setChannel('');
        fetchIntegrations();
      } else {
        setAddError(data.error || 'Failed to add webhook');
      }
    } catch {
      setAddError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult((prev) => ({ ...prev, [id]: { success: false, message: '' } }));
    try {
      const res = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', id }),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [id]: {
          success: data.success,
          message: data.success ? 'Test signal sent!' : data.data?.error || data.error || 'Failed',
        },
      }));
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: { success: false, message: 'Network error' } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // Silently fail
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, enabled: !enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s)));
      }
    } catch {
      // Silently fail
    }
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(EXAMPLE_PAYLOAD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20 md:pb-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> Back to home
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <Hash className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Slack <span className="text-amber-400">Integration</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto">
            Get real-time AI trading signal alerts delivered directly to your Slack channels via incoming webhooks.
          </p>
        </div>

        {/* Add to Slack placeholder */}
        <div className="border border-zinc-700/50 rounded-2xl bg-zinc-900/50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E9A820"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add to Slack</h2>
              <p className="text-xs text-zinc-500">One-click workspace install</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            OAuth-based &ldquo;Add to Slack&rdquo; allows one-click installation to any Slack workspace. Coming soon — use manual webhook setup below for now.
          </p>
          <a
            href="https://slack.com/oauth/v2/authorize?client_id=tradeclaw&scope=incoming-webhook"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold border border-zinc-300 opacity-50 cursor-not-allowed pointer-events-none"
            tabIndex={-1}
            aria-disabled="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#000"/>
            </svg>
            Add to Slack
            <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-medium ml-1">Coming Soon</span>
          </a>
        </div>

        {/* Manual webhook form */}
        <div className="border border-zinc-700/50 rounded-2xl bg-zinc-900/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">Manual Webhook Setup</h2>
          <p className="text-xs text-zinc-500 mb-5">
            Create an{' '}
            <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
              Incoming Webhook
            </a>{' '}
            in your Slack workspace, then paste the URL below.
          </p>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Webhook URL *</label>
              <input
                type="url"
                required
                placeholder="https://hooks.slack.com/services/T00.../B00.../xxxx"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. #trading-signals"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Channel label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. #signals"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={adding || !webhookUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Connect Webhook
            </button>

            {addError && (
              <div className="flex items-center gap-2 text-sm text-rose-400">
                <XCircle className="w-4 h-4" /> {addError}
              </div>
            )}
            {addSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {addSuccess}
              </div>
            )}
          </form>
        </div>

        {/* Connected integrations */}
        <div className="border border-zinc-700/50 rounded-2xl bg-zinc-900/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connected Integrations</h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-10">
              <Hash className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No integrations yet. Add a webhook above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((si) => (
                <div
                  key={si.id}
                  className={`border rounded-xl p-4 transition-colors ${
                    si.enabled
                      ? 'border-zinc-700/50 bg-zinc-800/30'
                      : 'border-zinc-800/50 bg-zinc-900/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {si.name || si.channel || 'Unnamed webhook'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            si.enabled
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-zinc-700/50 text-zinc-500'
                          }`}
                        >
                          {si.enabled ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 font-mono truncate">{si.webhookUrl}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-zinc-500">
                        <span>{si.deliveryCount} delivered</span>
                        {si.failCount > 0 && (
                          <span className="text-rose-400">{si.failCount} consecutive failures</span>
                        )}
                        {si.lastDelivery && (
                          <span>Last: {new Date(si.lastDelivery).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Test button */}
                      <button
                        onClick={() => handleTest(si.id)}
                        disabled={testingId === si.id}
                        className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-amber-400 transition-colors disabled:opacity-50"
                        title="Send test signal"
                      >
                        {testingId === si.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(si.id, si.enabled)}
                        className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                        title={si.enabled ? 'Pause' : 'Enable'}
                      >
                        {si.enabled ? (
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(si.id)}
                        disabled={removingId === si.id}
                        className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        {removingId === si.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Test result */}
                  {testResult[si.id]?.message && (
                    <div
                      className={`mt-2 flex items-center gap-1.5 text-xs ${
                        testResult[si.id].success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {testResult[si.id].success ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {testResult[si.id].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Code example */}
        <div className="border border-zinc-700/50 rounded-2xl bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Block Kit Payload</h2>
            </div>
            <button
              onClick={copyPayload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            This is the Block Kit JSON payload TradeClaw sends to your Slack webhook for each signal:
          </p>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-xs text-zinc-300 leading-relaxed">
            <code>{EXAMPLE_PAYLOAD}</code>
          </pre>
          <div className="mt-4 text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium">curl example:</span>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mt-2 overflow-x-auto text-zinc-400">
{`curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \\
  -H "Content-Type: application/json" \\
  -d '${EXAMPLE_PAYLOAD.replace(/\n/g, '').replace(/  +/g, ' ')}'`}
            </pre>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
          >
            Slack Incoming Webhooks documentation <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
