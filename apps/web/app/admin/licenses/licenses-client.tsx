'use client';

import { useState } from 'react';
import IssueModal from './issue-modal';

const STRATEGY_OPTIONS = [
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
] as const;

interface SerializedLicense {
  id: string;
  keyPrefix: string;
  issuedTo: string | null;
  status: 'active' | 'revoked';
  expiresAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  notes: string | null;
  strategies: string[];
}

interface Props {
  initialLicenses: SerializedLicense[];
}

export default function LicensesClient({ initialLicenses }: Props) {
  const [licenses, setLicenses] = useState(initialLicenses);
  const [issuedTo, setIssuedTo] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [strategies, setStrategies] = useState<string[]>([]);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch('/api/admin/licenses');
    const json = (await res.json()) as { licenses: SerializedLicense[] };
    setLicenses(json.licenses);
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (strategies.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          issuedTo: issuedTo || undefined,
          strategies,
          expiresAt: expiresAt || null,
          notes: notes || undefined,
        }),
      });
      const json = (await res.json()) as { plaintextKey?: string; error?: string };
      if (!res.ok || !json.plaintextKey) {
        alert(json.error ?? 'Failed to issue key');
        return;
      }
      setPlaintextKey(json.plaintextKey);
      setIssuedTo('');
      setExpiresAt('');
      setNotes('');
      setStrategies([]);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? This cannot be undone.')) return;
    await fetch(`/api/admin/licenses/${id}/revoke`, { method: 'POST' });
    await refresh();
  }

  async function handleAddStrategy(id: string) {
    const s = prompt(`Add strategy (one of: ${STRATEGY_OPTIONS.join(', ')})`);
    if (!s || !STRATEGY_OPTIONS.includes(s as typeof STRATEGY_OPTIONS[number])) return;
    await fetch(`/api/admin/licenses/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addStrategies: [s] }),
    });
    await refresh();
  }

  const active = licenses.filter((l) => l.status === 'active').length;
  const revoked = licenses.filter((l) => l.status === 'revoked').length;

  return (
    <div className="space-y-8">
      <div className="flex gap-4 text-sm text-neutral-300">
        <div>Active: <strong className="text-emerald-400">{active}</strong></div>
        <div>Revoked: <strong className="text-red-400">{revoked}</strong></div>
        <div>Total: <strong>{licenses.length}</strong></div>
      </div>

      <form onSubmit={handleIssue} className="space-y-3 rounded border border-neutral-700 p-4">
        <h2 className="font-semibold">Issue new key</h2>
        <input
          type="text"
          placeholder="Issued to (optional label)"
          value={issuedTo}
          onChange={(e) => setIssuedTo(e.target.value)}
          className="w-full rounded bg-neutral-900 p-2 text-sm"
        />
        <div className="flex flex-wrap gap-3">
          {STRATEGY_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={strategies.includes(s)}
                onChange={(e) =>
                  setStrategies((prev) =>
                    e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                  )
                }
              />
              {s}
            </label>
          ))}
        </div>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full rounded bg-neutral-900 p-2 text-sm"
          placeholder="Expires at (empty = lifetime)"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded bg-neutral-900 p-2 text-sm"
          rows={2}
        />
        <button
          type="submit"
          disabled={busy || strategies.length === 0}
          className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Issuing…' : 'Issue key'}
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-neutral-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="p-2">Key</th>
              <th className="p-2">Issued to</th>
              <th className="p-2">Strategies</th>
              <th className="p-2">Status</th>
              <th className="p-2">Expires</th>
              <th className="p-2">Last seen</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => (
              <tr key={l.id} className="border-t border-neutral-800">
                <td className="p-2 font-mono">{l.keyPrefix}…</td>
                <td className="p-2">{l.issuedTo ?? '—'}</td>
                <td className="p-2">{l.strategies.join(', ') || '—'}</td>
                <td className="p-2">
                  {l.status === 'active' ? (
                    <span className="text-emerald-400">active</span>
                  ) : (
                    <span className="text-red-400">revoked</span>
                  )}
                </td>
                <td className="p-2">
                  {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : 'lifetime'}
                </td>
                <td className="p-2">
                  {l.lastSeenAt ? new Date(l.lastSeenAt).toLocaleString() : '—'}
                </td>
                <td className="p-2 space-x-2">
                  {l.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAddStrategy(l.id)}
                        className="text-xs text-emerald-400 underline"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(l.id)}
                        className="text-xs text-red-400 underline"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plaintextKey && (
        <IssueModal plaintextKey={plaintextKey} onClose={() => setPlaintextKey(null)} />
      )}
    </div>
  );
}
