'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, ArrowRight } from 'lucide-react';

interface MemoryEntry {
  userId: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

function previewValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function MemorySnapshot() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/operator/memory');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { entries?: MemoryEntry[] };
        if (cancelled) return;
        const sorted = (data.entries ?? [])
          .slice()
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 3);
        setEntries(sorted);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/10 p-1.5">
            <Brain size={14} className="text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-white">Memory Snapshot</p>
        </div>
        <Link
          href="/admin/operator/memory"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-emerald-400"
        >
          View all
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-3">
        {loading ? (
          <p className="py-4 text-center text-xs text-zinc-500">Loading...</p>
        ) : error ? (
          <p className="py-4 text-center text-xs text-red-400">{error}</p>
        ) : entries.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-500">No memory entries yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {entries.map((entry) => (
              <li key={entry.key} className="flex items-center gap-3 py-2.5">
                <span className="shrink-0 font-mono text-xs text-emerald-400">{entry.key}</span>
                <span className="flex-1 truncate font-mono text-xs text-zinc-300">
                  {previewValue(entry.value)}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatUpdated(entry.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
