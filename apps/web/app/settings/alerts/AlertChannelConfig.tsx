'use client';

import { useEffect, useState } from 'react';

type Channel = 'telegram' | 'discord' | 'email' | 'webhook';

interface ChannelConfig {
  id: string;
  user_id: string;
  channel: Channel;
  config: Record<string, string>;
  enabled: boolean;
}

const CHANNEL_LABEL: Record<Channel, string> = {
  telegram: 'Telegram (personal DM)',
  discord: 'Discord (channel webhook)',
  email: 'Email',
  webhook: 'Webhook (generic JSON POST)',
};

interface FieldSpec {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password';
  required: boolean;
  hint?: string;
}

const FIELDS_BY_CHANNEL: Record<Channel, FieldSpec[]> = {
  telegram: [
    {
      key: 'chatId',
      label: 'Chat ID',
      placeholder: 'e.g. 123456789',
      required: true,
      hint: 'DM @userinfobot to find yours.',
    },
    {
      key: 'botToken',
      label: 'Bot token (optional)',
      placeholder: 'leave empty to use TradeClaw’s bot',
      type: 'password',
      required: false,
      hint: 'Only needed if you stand up your own bot. Otherwise we send via the TradeClaw bot — start a chat with it first so it can DM you.',
    },
  ],
  discord: [
    {
      key: 'webhookUrl',
      label: 'Webhook URL',
      placeholder: 'https://discord.com/api/webhooks/...',
      required: true,
      hint: 'Server settings → Integrations → Webhooks → Copy URL.',
    },
  ],
  email: [
    {
      key: 'to',
      label: 'Email address',
      placeholder: 'you@example.com',
      required: true,
    },
  ],
  webhook: [
    {
      key: 'url',
      label: 'POST URL',
      placeholder: 'https://api.yourapp.com/tradeclaw',
      required: true,
    },
    {
      key: 'secret',
      label: 'Shared secret (optional)',
      placeholder: 'sent in X-TradeClaw-Secret header',
      type: 'password',
      required: false,
    },
  ],
};

interface ChannelRowProps {
  channel: Channel;
  existing: ChannelConfig | null;
  telegramBotLinked: boolean;
  onSaved: (cfg: ChannelConfig) => void;
  onRemoved: () => void;
}

function ChannelRow({ channel, existing, telegramBotLinked, onSaved, onRemoved }: ChannelRowProps) {
  const [config, setConfig] = useState<Record<string, string>>(existing?.config ?? {});
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fields = FIELDS_BY_CHANNEL[channel];
  const isConfigured = !!existing;
  const requiredOk = fields.every((f) => !f.required || (config[f.key] ?? '').trim().length > 0);
  // Telegram is "testable" if either the per-channel config exists and is enabled,
  // or the user has linked the platform bot via the welcome/dashboard deep link.
  const botFallbackTest = channel === 'telegram' && telegramBotLinked && (!isConfigured || enabled);
  const canTest = (isConfigured && enabled) || botFallbackTest;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/alert-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, config, enabled }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d.error === 'string' ? d.error : 'Save failed');
      }
      const d = (await res.json()) as { config: ChannelConfig };
      onSaved(d.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestStatus('idle');
    setError(null);
    try {
      const res = await fetch(`/api/alert-channels/${channel}/test`, { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof d.error === 'string' ? d.error : 'Test failed');
      }
      setTestStatus(d.delivered ? 'sent' : 'failed');
    } catch (e) {
      setTestStatus('failed');
      setError(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/alert-channels/${channel}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setConfig({});
      setEnabled(true);
      onRemoved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{CHANNEL_LABEL[channel]}</p>
          {isConfigured && (
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-emerald-400">
              {enabled ? 'Configured' : 'Disabled'}
            </p>
          )}
          {!isConfigured && channel === 'telegram' && telegramBotLinked && (
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-emerald-400">
              Bot linked — DM ready
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-transparent"
          />
          Enabled
        </label>
      </div>

      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
              {field.label}
            </label>
            <input
              type={field.type ?? 'text'}
              value={config[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/40"
            />
            {field.hint && (
              <p className="mt-1 text-[11px] text-zinc-500">{field.hint}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !requiredOk}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : isConfigured ? 'Update' : 'Save'}
        </button>
        {canTest && (
          <button
            onClick={sendTest}
            disabled={saving || testing}
            className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 transition-all hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? 'Sending…' : 'Send test'}
          </button>
        )}
        {isConfigured && (
          <button
            onClick={remove}
            disabled={saving}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-all hover:bg-white/5 disabled:opacity-60"
          >
            Remove
          </button>
        )}
        {testStatus === 'sent' && (
          <span className="text-[11px] text-emerald-400">Sent — check your {CHANNEL_LABEL[channel].split(' ')[0].toLowerCase()}</span>
        )}
        {testStatus === 'failed' && !error && (
          <span className="text-[11px] text-red-400">Delivery failed</span>
        )}
      </div>
    </div>
  );
}

export default function AlertChannelConfigPanel() {
  const [configs, setConfigs] = useState<ChannelConfig[]>([]);
  const [telegramBotLinked, setTelegramBotLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/alert-channels')
      .then(async (r) => {
        if (r.status === 401) throw new Error('Sign in to manage alert channels.');
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => {
        setConfigs(d.configs ?? []);
        setTelegramBotLinked(!!d.telegramBotLinked);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, []);

  function existingFor(channel: Channel): ChannelConfig | null {
    return configs.find((c) => c.channel === channel) ?? null;
  }

  function handleSaved(saved: ChannelConfig) {
    setConfigs((prev) => {
      const without = prev.filter((c) => c.channel !== saved.channel);
      return [...without, saved];
    });
  }

  function handleRemoved(channel: Channel) {
    setConfigs((prev) => prev.filter((c) => c.channel !== channel));
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-zinc-500">
        Loading channels…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {loadError}
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <header>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Where signals get delivered
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Configure each platform once. Alert rules above pick which of these to fire on a match.
          Telegram needs you to DM the TradeClaw bot first so it can reach you.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {(['telegram', 'discord', 'email', 'webhook'] as Channel[]).map((channel) => (
          <ChannelRow
            key={channel}
            channel={channel}
            existing={existingFor(channel)}
            telegramBotLinked={telegramBotLinked}
            onSaved={handleSaved}
            onRemoved={() => handleRemoved(channel)}
          />
        ))}
      </div>
    </section>
  );
}
