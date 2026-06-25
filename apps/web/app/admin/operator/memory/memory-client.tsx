'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, RefreshCw, Save, Pencil, X } from 'lucide-react';

interface MemoryEntry {
  userId: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export function MemoryClient() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  function startEdit(entry: MemoryEntry) {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setEditingKey(entry.key);
    setEditValue(
      typeof entry.value === 'string' ? (entry.value as string) : JSON.stringify(entry.value, null, 2) ?? '',
    );
    setError(null);
  }

  function cancelEdit(restoreFocus = true) {
    setEditingKey(null);
    setEditValue('');
    setError(null);
    if (restoreFocus) {
      window.requestAnimationFrame(() => lastFocusedRef.current?.focus());
    }
  }

  async function handleEditSave(key: string) {
    setEditSaving(true);
    setError(null);
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }
      const res = await fetch('/api/operator/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: parsedValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json().catch(() => ({}));
      const updatedEntry = (data as { entry?: MemoryEntry }).entry;
      if (updatedEntry) {
        setEntries((prev) => prev.map((entry) => (entry.key === key ? updatedEntry : entry)));
      } else {
        await load();
      }
      cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operator/memory');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        parsedValue = newValue;
      }
      const res = await fetch('/api/operator/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), value: parsedValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setNewKey('');
      setNewValue('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(key: string) {
    setError(null);
    try {
      const res = await fetch(`/api/operator/memory?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Plus size={14} className="text-emerald-400" />
          New Entry
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40"
          />
          <textarea
            placeholder="Value (JSON or plain text)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            rows={2}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newKey.trim()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
        >
          <Save size={12} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Entries ({entries.length})
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading && entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">No entries yet.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">Value</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isEditing = editingKey === entry.key;
                return (
                  <tr key={entry.key} className="border-t border-white/[0.04]">
                    <td className="px-4 py-2.5 align-top font-mono text-xs text-emerald-400">
                      {entry.key}
                    </td>
                    <td
                      className={`px-4 py-2.5 align-top font-mono text-xs text-zinc-300 ${
                        isEditing ? '' : 'max-w-xs'
                      }`}
                    >
                      {isEditing ? (
                        <textarea
                          value={editValue}
                          autoFocus
                          aria-label={`Edit value for ${entry.key}`}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEdit();
                            }
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              void handleEditSave(entry.key);
                            }
                          }}
                          rows={3}
                          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/40"
                        />
                      ) : (
                        <div className="truncate">
                          {typeof entry.value === 'string'
                            ? entry.value
                            : JSON.stringify(entry.value)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-top text-xs text-zinc-500">
                      {new Date(entry.updatedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditSave(entry.key)}
                            disabled={editSaving}
                            aria-label={`Save ${entry.key}`}
                            className="rounded p-1 text-zinc-500 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-40"
                            title="Save"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit()}
                            disabled={editSaving}
                            aria-label={`Cancel editing ${entry.key}`}
                            className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            disabled={editSaving || isEditing || editingKey !== null}
                            aria-label={`Edit ${entry.key}`}
                            className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.key)}
                            disabled={editSaving || editingKey !== null}
                            aria-label={`Delete ${entry.key}`}
                            className="rounded p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
