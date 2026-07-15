'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Database, Radio, RefreshCw, Server, Zap } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  responseMs: number;
  lastChecked: string;
}

interface StatusData {
  status: 'operational' | 'degraded' | 'outage';
  uptimeSeconds: number;
  uptimePct: null;
  version: string;
  scope: 'point-in-time-process-probes';
  services: ServiceStatus[];
  lastSignal: { pair: string; timestamp: string } | null;
  timestamp: string;
}

const SERVICE_ICONS: Record<string, typeof Activity> = {
  'Signal API': Zap,
  API: Server,
  Database,
  'SSE Feed': Radio,
};

function formatProcessAge(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function StatusClient() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Status probe returned HTTP ${response.status}`);
      setData(await response.json() as StatusData);
      setError(null);
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : 'Status probe failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const summary = !data
    ? 'Status unavailable'
    : data.status === 'operational'
      ? 'Point-in-time probes passed'
      : data.status === 'degraded'
        ? 'One or more probes are degraded'
        : 'One or more probes failed';

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <Link className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" href="/">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <button
            aria-label="Refresh status probes"
            className="rounded p-2 text-[var(--text-secondary)] hover:bg-white/5"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <section>
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Current probes</p>
              <h1 className="mt-1 text-3xl font-semibold">{summary}</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl leading-7 text-[var(--text-secondary)]">
            These checks report one web process at the displayed timestamp. TradeClaw has no
            durable uptime percentage, incident history, SLA, or incident-subscription service configured.
          </p>
          {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
          {data ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Checked {formatTime(data.timestamp)} | current process age {formatProcessAge(data.uptimeSeconds)} | v{data.version}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {(data?.services ?? []).map((service) => {
            const Icon = SERVICE_ICONS[service.name] ?? Server;
            return (
              <div className="border border-[var(--border)] bg-[var(--card-bg)] p-5" key={service.name}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {service.name === 'Database' ? <Database className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <span className="text-xs uppercase text-[var(--text-secondary)]">{service.status}</span>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Probe {service.responseMs}ms | {formatTime(service.lastChecked)}
                </p>
              </div>
            );
          })}
        </section>

        {data?.lastSignal ? (
          <section className="border border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">
            Most recent signal returned by the signal API: <strong className="text-[var(--foreground)]">{data.lastSignal.pair}</strong> at {formatTime(data.lastSignal.timestamp)}.
          </section>
        ) : null}
      </div>
    </main>
  );
}
