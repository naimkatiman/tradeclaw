'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredKey,
  setStoredKey,
  clearStoredKey,
  verifyKey,
  fetchWithLicense,
  type VerifyResponse,
} from '@/lib/license-client';

interface TelegramChannel {
  strategyId: string;
  label: string | null;
  inviteUrl: string;
}

interface Props {
  initialKey: string;
}

export default function UnlockClient({ initialKey }: Props) {
  const router = useRouter();
  const [key, setKey] = useState(initialKey);
  const [state, setState] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    'idle',
  );
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [stored, setStored] = useState<string | null>(null);
  const [channels, setChannels] = useState<TelegramChannel[]>([]);

  useEffect(() => {
    setStored(getStoredKey());
  }, []);

  useEffect(() => {
    if (initialKey) {
      void handleVerify(initialKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  async function handleVerify(rawKey: string) {
    setState('verifying');
    const res = await verifyKey(rawKey);
    setResult(res);
    if (res.valid) {
      setStoredKey(rawKey);
      setStored(rawKey);
      setState('success');
      void loadChannels();
      setTimeout(() => router.push('/dashboard'), 4000);
    } else {
      setState('error');
    }
  }

  async function loadChannels() {
    try {
      const r = await fetchWithLicense('/api/licenses/telegram-invites');
      if (!r.ok) return;
      const data = (await r.json()) as { channels: TelegramChannel[] };
      setChannels(data.channels);
    } catch {
      // ignore — channels are a nice-to-have
    }
  }

  function handleRemove() {
    clearStoredKey();
    setStored(null);
    setResult(null);
    setState('idle');
  }

  return (
    <div className="space-y-6">
      {stored && (
        <div className="rounded border border-emerald-700 bg-emerald-950/40 p-4">
          <p className="text-sm text-emerald-300">
            A key is stored on this device:{' '}
            <code className="font-mono">{stored.slice(0, 12)}…</code>
          </p>
          <button
            type="button"
            onClick={handleRemove}
            className="mt-2 text-xs text-emerald-400 underline"
          >
            Remove stored key
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify(key);
        }}
        className="space-y-3"
      >
        <input
          type="text"
          autoComplete="off"
          placeholder="tck_live_..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-3 font-mono text-sm text-neutral-100"
        />
        <button
          type="submit"
          disabled={state === 'verifying' || key.length === 0}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {state === 'verifying' ? 'Verifying…' : 'Unlock'}
        </button>
      </form>

      {state === 'success' && result?.valid && (
        <div className="rounded border border-emerald-700 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          <p>Key accepted. Redirecting to dashboard in a few seconds…</p>
          <p className="mt-2">
            Unlocked: {result.unlockedStrategies?.join(', ') || 'none'}
          </p>
          {result.expiresAt && (
            <p className="mt-1 text-xs text-emerald-400">
              Expires: {new Date(result.expiresAt).toLocaleString()}
            </p>
          )}
          {channels.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Join your Telegram channels
              </p>
              <ul className="space-y-2">
                {channels.map((c) => (
                  <li key={c.strategyId}>
                    <a
                      href={c.inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded bg-emerald-700/40 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-700/60"
                    >
                      {c.label ?? c.strategyId} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          Key not accepted ({result?.reason ?? 'unknown'}). Check the key or
          contact support.
        </div>
      )}
    </div>
  );
}
