'use client';

<<<<<<< HEAD
import { useEffect, useState } from 'react';
=======
import { useEffect, useState, useCallback } from 'react';
>>>>>>> origin/main
import { Send } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BotStatus {
  connected: boolean;
  configured: boolean;
  error?: string;
  bot?: { id: number; username: string; name: string };
  webhook?: {
    url: string | null;
    pendingUpdates: number;
    lastError: string | null;
    lastErrorDate: string | null;
  } | null;
  subscribers: number;
  timestamp?: string;
}

<<<<<<< HEAD
=======
interface BroadcastStatus {
  configured: boolean;
  channelId: string | null;
  lastBroadcastTime: string | null;
  lastMessageId: number | null;
  lastError: string | null;
  broadcastCount: number;
  nextBroadcast: string | null;
}

>>>>>>> origin/main
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TelegramSettingsPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testChatId, setTestChatId] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSetting, setWebhookSetting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; message: string } | null>(null);

<<<<<<< HEAD
=======
  // Broadcast state
  const [broadcast, setBroadcast] = useState<BroadcastStatus | null>(null);
  const [broadcastChannelId, setBroadcastChannelId] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchBroadcastStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/broadcast');
      const data = (await res.json()) as BroadcastStatus;
      setBroadcast(data);
    } catch {
      // ignore
    }
  }, []);

>>>>>>> origin/main
  useEffect(() => {
    const appUrl =
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : '';
    setWebhookUrl(`${appUrl}/api/telegram/webhook`);
    fetchStatus();
<<<<<<< HEAD
  }, []);
=======
    fetchBroadcastStatus();
  }, [fetchBroadcastStatus]);
>>>>>>> origin/main

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/status');
      const data = (await res.json()) as BotStatus;
      setStatus(data);
    } catch {
      setStatus({ connected: false, configured: false, subscribers: 0, error: 'Failed to fetch status' });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSend() {
    if (!testChatId.trim()) return;
    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, chatId: testChatId.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      setTestResult({
        ok: data.ok,
        message: data.ok ? 'Test message sent successfully!' : (data.error ?? 'Send failed'),
      });
    } catch {
      setTestResult({ ok: false, message: 'Network error' });
    } finally {
      setTestSending(false);
    }
  }

  async function handleSetWebhook() {
    if (!webhookUrl.trim()) return;
    setWebhookSetting(true);
    setWebhookResult(null);

    try {
<<<<<<< HEAD
      const res = await fetch(
=======
      await fetch(
>>>>>>> origin/main
        `/api/telegram/status`,
        // We call the Telegram API directly via the browser using the status endpoint pattern
        // Instead, POST to a small inline handler — we'll use the existing route.ts endpoint
      );
      // Fallback: instruct user to use BotFather / Telegram API directly
      setWebhookResult({
        ok: true,
        message: `Set webhook via Telegram API:\nPOST https://api.telegram.org/bot<TOKEN>/setWebhook\n{"url":"${webhookUrl}"}`,
      });
    } catch {
      setWebhookResult({ ok: false, message: 'Failed' });
    } finally {
      setWebhookSetting(false);
    }
  }

<<<<<<< HEAD
=======
  async function handleBroadcastNow() {
    setBroadcasting(true);
    setBroadcastResult(null);

    try {
      const body: Record<string, string> = {};
      if (broadcastChannelId.trim()) body.channelId = broadcastChannelId.trim();

      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; messageId?: number };
      setBroadcastResult({
        ok: data.ok,
        message: data.ok
          ? `Broadcast sent (message #${data.messageId})`
          : (data.error ?? 'Broadcast failed'),
      });
      if (data.ok) fetchBroadcastStatus();
    } catch {
      setBroadcastResult({ ok: false, message: 'Network error' });
    } finally {
      setBroadcasting(false);
    }
  }

>>>>>>> origin/main
  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function StatusBadge({ connected }: { connected: boolean }) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          connected
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
        />
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    );
  }

  function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
      <div className={`bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 ${className}`}>
        {children}
      </div>
    );
  }

  function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{children}</p>;
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#050505] text-white font-[Geist,sans-serif]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Send className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-semibold tracking-tight">Telegram Bot</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Configure signal notifications via Telegram bot
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 pb-20 md:pb-8 space-y-6">
        {/* Bot Status */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Bot Status</h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="text-xs text-zinc-500 hover:text-white transition-colors disabled:opacity-40"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <StatusBadge connected={status.connected} />
                {status.bot && (
                  <span className="text-sm text-zinc-400">
                    @{status.bot.username}
                  </span>
                )}
              </div>

              {status.error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-400">{status.error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Subscribers</Label>
                  <p className="text-2xl font-bold tabular-nums text-emerald-400">
                    {status.subscribers}
                  </p>
                </div>

                {status.webhook && (
                  <>
                    <div>
                      <Label>Pending Updates</Label>
                      <p className="text-2xl font-bold tabular-nums">
                        {status.webhook.pendingUpdates}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label>Webhook URL</Label>
                      <p className="text-sm text-zinc-400 truncate font-mono">
                        {status.webhook.url ?? 'Not set'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {status.webhook?.lastError && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-amber-400 font-medium mb-1">Last Webhook Error</p>
                  <p className="text-sm text-amber-300">{status.webhook.lastError}</p>
                  {status.webhook.lastErrorDate && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(status.webhook.lastErrorDate).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </Card>

        {/* Setup Guide */}
        {status && !status.configured && (
          <Card>
            <h2 className="font-medium mb-4">Setup Guide</h2>
            <ol className="space-y-3 text-sm text-zinc-400">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>
                  Open Telegram and message{' '}
                  <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs">
                    @BotFather
                  </code>{' '}
                  — send <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">/newbot</code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>
                  Copy the bot token and add to your{' '}
                  <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">.env</code> file:
                  <br />
                  <code className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs block mt-1">
                    TELEGRAM_BOT_TOKEN=your-token-here
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Restart the server and refresh this page</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <span>Set the webhook URL below so Telegram can deliver bot commands</span>
              </li>
            </ol>
          </Card>
        )}

        {/* Webhook Configuration */}
        <Card>
          <h2 className="font-medium mb-1">Webhook URL</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Set this URL in Telegram so bot commands (/subscribe, /signals, etc.) are delivered to
            your server.
          </p>

          <div className="space-y-3">
            <div>
              <Label>Your Webhook Endpoint</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  placeholder="https://your-domain.com/api/telegram/webhook"
                />
                <button
                  onClick={handleSetWebhook}
                  disabled={webhookSetting || !webhookUrl.trim()}
                  className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {webhookSetting ? 'Setting…' : 'Instructions'}
                </button>
              </div>
            </div>

            {webhookResult && (
              <div
                className={`rounded-lg px-4 py-3 ${
                  webhookResult.ok
                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                    : 'bg-red-500/5 border border-red-500/20'
                }`}
              >
                <pre className={`text-xs whitespace-pre-wrap ${webhookResult.ok ? 'text-emerald-300' : 'text-red-400'}`}>
                  {webhookResult.message}
                </pre>
              </div>
            )}

            <p className="text-xs text-zinc-600">
              Run this curl command to register the webhook:
            </p>
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
              <code className="text-xs text-zinc-400 break-all">
                {`curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"${webhookUrl}"}'`}
              </code>
            </div>
          </div>
        </Card>

        {/* Test Send */}
        <Card>
          <h2 className="font-medium mb-1">Test Message</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Send a test message to verify your bot is working. Find your chat ID by messaging{' '}
            <code className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded text-xs">@userinfobot</code>{' '}
            on Telegram.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              placeholder="Your Telegram chat ID (e.g. 123456789)"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={handleTestSend}
              disabled={testSending || !testChatId.trim() || !status?.connected}
              className="px-4 py-2 bg-emerald-500 text-black text-sm font-medium rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {testSending ? 'Sending…' : 'Send Test'}
            </button>
          </div>

          {testResult && (
            <div
              className={`mt-3 rounded-lg px-4 py-3 text-sm ${
                testResult.ok
                  ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/5 border border-red-500/20 text-red-400'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {!status?.connected && status?.configured === false && (
            <p className="mt-3 text-xs text-zinc-600">
              Configure your bot token first to enable test sends.
            </p>
          )}
        </Card>

<<<<<<< HEAD
=======
        {/* Auto-Broadcast */}
        <Card>
          <h2 className="font-medium mb-1">Channel Auto-Broadcast</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Automatically post top signals to a Telegram channel every 4 hours. Set
            TELEGRAM_CHANNEL_ID in your .env or override below.
          </p>

          <div className="space-y-4">
            {/* Status row */}
            {broadcast && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Total Broadcasts</Label>
                  <p className="text-2xl font-bold tabular-nums text-emerald-400">
                    {broadcast.broadcastCount}
                  </p>
                </div>
                <div>
                  <Label>Last Broadcast</Label>
                  <p className="text-sm text-zinc-400">
                    {broadcast.lastBroadcastTime
                      ? new Date(broadcast.lastBroadcastTime).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <Label>Next Broadcast</Label>
                  <p className="text-sm text-zinc-400">
                    {broadcast.nextBroadcast
                      ? new Date(broadcast.nextBroadcast).toLocaleString()
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <Label>Channel</Label>
                  <p className="text-sm text-zinc-400 font-mono">
                    {broadcast.channelId ?? 'Not set'}
                  </p>
                </div>
              </div>
            )}

            {broadcast?.lastError && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-sm text-red-400">{broadcast.lastError}</p>
              </div>
            )}

            {/* Channel ID override + Broadcast Now */}
            <div>
              <Label>Channel ID Override</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastChannelId}
                  onChange={(ev) => setBroadcastChannelId(ev.target.value)}
                  placeholder="@channel or -100... (leave empty to use env)"
                  className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleBroadcastNow}
                  disabled={broadcasting}
                  className="px-4 py-2 bg-emerald-500 text-black text-sm font-medium rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {broadcasting ? 'Sending...' : 'Broadcast Now'}
                </button>
              </div>
            </div>

            {broadcastResult && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  broadcastResult.ok
                    ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/5 border border-red-500/20 text-red-400'
                }`}
              >
                {broadcastResult.message}
              </div>
            )}

            {/* Sample message preview */}
            <div>
              <Label>Message Preview</Label>
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 text-sm text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
{`📡 TradeClaw Signal Broadcast
━━━━━━━━━━━━━━━━━━━━

🟢 BUY XAUUSD | 87% confidence
💰 Entry: $2,345.50
🎯 TP: $2,360.00 / $2,374.50 / $2,389.00
🛑 SL: $2,331.00
📊 RSI 32.4 | MACD ✅

🔴 SELL EURUSD | 79% confidence
💰 Entry: $1.1559
🎯 TP: $1.1520 / $1.1490 / $1.1460
🛑 SL: $1.1595
📊 RSI 71.2 | MACD ⚠️

━━━━━━━━━━━━━━━━━━━━
🤖 TradeClaw | github.com/naimkatiman/tradeclaw
⚠️ Not financial advice. DYOR.`}
              </div>
            </div>
          </div>
        </Card>

>>>>>>> origin/main
        {/* Bot Commands Reference */}
        <Card>
          <h2 className="font-medium mb-4">Bot Commands Reference</h2>
          <div className="space-y-2">
            {[
              ['/start', 'Welcome message + auto-subscribe'],
              ['/subscribe', 'Subscribe to signal alerts'],
              ['/unsubscribe', 'Stop receiving alerts'],
              ['/signals', 'Get latest signals on demand'],
              ['/pairs', 'List available trading pairs'],
              ['/settings', 'View subscription settings'],
              ['/help', 'Show all commands'],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex items-baseline gap-3">
                <code className="text-emerald-400 text-sm font-mono w-32 flex-shrink-0">{cmd}</code>
                <span className="text-sm text-zinc-400">{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* API Reference */}
        <Card>
          <h2 className="font-medium mb-4">API Endpoints</h2>
          <div className="space-y-3">
            {[
              {
                method: 'POST',
                path: '/api/telegram/webhook',
                desc: 'Telegram webhook receiver — register this URL with BotFather',
              },
              {
                method: 'POST',
                path: '/api/telegram/send',
                desc: 'Manually trigger a signal send (supports broadcast to all subscribers)',
              },
              {
                method: 'GET',
                path: '/api/telegram/status',
                desc: 'Bot connection status, webhook info, and subscriber count',
              },
<<<<<<< HEAD
=======
              {
                method: 'POST',
                path: '/api/telegram/broadcast',
                desc: 'Trigger a channel broadcast of top 3 signals',
              },
              {
                method: 'GET',
                path: '/api/telegram/broadcast',
                desc: 'Broadcast status — last time, next time, count',
              },
              {
                method: 'GET',
                path: '/api/cron/telegram',
                desc: 'Vercel cron endpoint — auto-broadcasts every 4 hours',
              },
>>>>>>> origin/main
            ].map(({ method, path, desc }) => (
              <div key={path} className="flex items-start gap-3">
                <span
                  className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                    method === 'GET'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {method}
                </span>
                <div>
                  <code className="text-sm text-zinc-300 font-mono">{path}</code>
                  <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
