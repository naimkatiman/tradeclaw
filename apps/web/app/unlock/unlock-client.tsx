'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredKey,
  setStoredKey,
  clearStoredKey,
  verifyKey,
  type VerifyResponse,
} from '@/lib/license-client';

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
      setTimeout(() => router.push('/dashboard'), 1200);
    } else {
      setState('error');
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
          <p>Key accepted. Redirecting to dashboard…</p>
          <p className="mt-2">
            Unlocked: {result.unlockedStrategies?.join(', ') || 'none'}
          </p>
          {result.expiresAt && (
            <p className="mt-1 text-xs text-emerald-400">
              Expires: {new Date(result.expiresAt).toLocaleString()}
            </p>
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
