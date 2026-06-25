'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CircleCheck, CircleAlert, CircleX } from 'lucide-react';

interface ConnectorStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheck: string;
  error?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Healthy' },
  degraded: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Degraded' },
  down: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Down' },
};

const STATUS_ICONS: Record<string, typeof CircleCheck> = {
  healthy: CircleCheck,
  degraded: CircleAlert,
  down: CircleX,
};

export function ConnectorsClient() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operator/connectors');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConnectors(data.connectors ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const healthyCount = connectors.filter((c) => c.status === 'healthy').length;
  const degradedCount = connectors.filter((c) => c.status === 'degraded').length;
  const downCount = connectors.filter((c) => c.status === 'down').length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
            {healthyCount} healthy
          </span>
          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-yellow-300">
            {degradedCount} degraded
          </span>
          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-red-300">
            {downCount} down
          </span>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Re-check now
        </button>
      </div>

      {loading && connectors.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">Checking connectors...</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {connectors.map((c) => {
            const style = STATUS_STYLES[c.status] ?? STATUS_STYLES.down;
            const Icon = STATUS_ICONS[c.status] ?? CircleX;
            return (
              <div
                key={c.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{c.name}</p>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}
                  >
                    <Icon size={12} />
                    {style.label}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-zinc-500">
                  <p>
                    Latency:{' '}
                    <span className="font-mono text-zinc-300">{c.latencyMs}ms</span>
                  </p>
                  <p>
                    Last check:{' '}
                    <span className="text-zinc-400">
                      {new Date(c.lastCheck).toISOString().slice(0, 19).replace('T', ' ')}
                    </span>
                  </p>
                  {c.error && (
                    <details className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-red-300">
                      <summary className="cursor-pointer select-none text-xs font-medium text-red-300">
                        Error log
                      </summary>
                      <p className="mt-2 font-mono text-[11px] leading-5 text-red-200">{c.error}</p>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
