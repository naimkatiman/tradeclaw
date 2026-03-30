'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  Radio,
  Server,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronUp,
  Inbox,
  BarChart3,
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  responseMs: number;
  lastChecked: string;
}

interface StatusData {
  status: 'operational' | 'degraded' | 'outage';
  uptimeSeconds: number;
  uptimePct: number;
  version: string;
  services: ServiceStatus[];
  lastSignal: { pair: string; timestamp: string } | null;
  timestamp: string;
}

interface UptimeDayEntry {
  date: string;
  uptime: number;
  incidents: number;
}

interface UptimeServiceEntry {
  name: string;
  uptime30d: number;
  status: 'operational' | 'degraded' | 'outage';
}

interface UptimeData {
  overallUptime: number;
  uptimeHistory: UptimeDayEntry[];
  services: UptimeServiceEntry[];
  lastCheck: string;
}

const STATUS_CONFIG = {
  operational: { label: 'All Systems Operational', color: 'emerald', Icon: CheckCircle2 },
  degraded: { label: 'Degraded Performance', color: 'yellow', Icon: AlertTriangle },
  outage: { label: 'Service Outage', color: 'rose', Icon: XCircle },
} as const;

const SERVICE_ICONS: Record<string, typeof Activity> = {
  'Signal Engine': Zap,
  API: Server,
  Database: Database,
  'SSE Feed': Radio,
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function StatusClient() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showIncidents, setShowIncidents] = useState(true);
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const monitoringStarted = useRef<string>('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) {
        const json: StatusData = await res.json();
        setData(json);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    monitoringStarted.current = new Date().toISOString();
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    fetch('/api/uptime')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: UptimeData | null) => {
        if (json) setUptimeData(json);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('tradeclaw-status-email');
    if (saved) setSubscribed(true);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    localStorage.setItem('tradeclaw-status-email', email.trim());
    setSubscribed(true);
    setEmail('');
  };

  const statusCfg = data
    ? STATUS_CONFIG[data.status]
    : error
      ? STATUS_CONFIG.outage
      : STATUS_CONFIG.operational;
  const StatusIcon = statusCfg.Icon;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
              <span className="text-[var(--text-secondary)]">/</span>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                <h1 className="text-lg font-semibold">System Status</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span>
                Refreshed {lastRefresh ? formatTime(lastRefresh.toISOString()) : '...'}
              </span>
              <button
                onClick={fetchStatus}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Refresh now"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
        {/* Overall Status Banner */}
        <div
          className={`glass-card rounded-2xl p-6 border-${statusCfg.color}-500/20`}
          style={{
            borderColor:
              statusCfg.color === 'emerald'
                ? 'rgba(16,185,129,0.2)'
                : statusCfg.color === 'yellow'
                  ? 'rgba(234,179,8,0.2)'
                  : 'rgba(244,63,94,0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon
                className={`h-6 w-6 ${
                  statusCfg.color === 'emerald'
                    ? 'text-emerald-400'
                    : statusCfg.color === 'yellow'
                      ? 'text-yellow-400'
                      : 'text-rose-400'
                }`}
              />
              <div>
                <h2 className="text-xl font-semibold">
                  {error && !data ? 'Unable to reach status endpoint' : statusCfg.label}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  Uptime: {data ? `${data.uptimePct}%` : '—'} · Process: {data ? formatUptime(data.uptimeSeconds) : '—'}
                  {data?.version && ` · v${data.version}`}
                </p>
              </div>
            </div>
            <div className="hidden sm:block">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  statusCfg.color === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : statusCfg.color === 'yellow'
                      ? 'bg-yellow-500/15 text-yellow-400'
                      : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    statusCfg.color === 'emerald'
                      ? 'bg-emerald-400'
                      : statusCfg.color === 'yellow'
                        ? 'bg-yellow-400'
                        : 'bg-rose-400'
                  }`}
                />
                {data?.status ?? (error ? 'unreachable' : 'checking')}
              </span>
            </div>
          </div>
        </div>

        {/* Service Cards */}
        <section>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-4">
            Services
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.services ?? []).map((svc) => {
              const SvcIcon = SERVICE_ICONS[svc.name] ?? Server;
              return (
                <div key={svc.name} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <SvcIcon className="h-4 w-4 text-[var(--text-secondary)]" />
                      <span className="font-medium text-sm">{svc.name}</span>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        svc.status === 'operational'
                          ? 'bg-emerald-400'
                          : svc.status === 'degraded'
                            ? 'bg-yellow-400'
                            : 'bg-rose-400'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>{svc.responseMs}ms</span>
                    <span>{formatTime(svc.lastChecked)}</span>
                  </div>
                </div>
              );
            })}
            {!data && loading && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-4 w-24 bg-white/5 rounded mb-3" />
                    <div className="h-3 w-16 bg-white/5 rounded" />
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Last Signal */}
        {data?.lastSignal && (
          <section className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">Last Signal</span>
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="font-mono text-emerald-400">{data.lastSignal.pair}</span>
              {' · '}
              {formatTime(data.lastSignal.timestamp)}
            </div>
          </section>
        )}

        {/* Uptime Monitoring — 30-Day History */}
        <section>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-4">
            30-Day Uptime
          </h3>
          <div className="glass-card rounded-xl p-4 space-y-4">
            {/* Overall uptime */}
            {uptimeData && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">
                    Overall: {uptimeData.overallUptime}% uptime
                  </span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  Last check: {uptimeData.lastCheck ? formatTime(uptimeData.lastCheck) : '—'}
                </span>
              </div>
            )}

            {/* 30-day bar */}
            <div>
              <div className="grid grid-cols-30 gap-[2px]" style={{ gridTemplateColumns: 'repeat(30, 1fr)' }}>
                {uptimeData ? (
                  uptimeData.uptimeHistory.map((day) => {
                    const color =
                      day.uptime >= 99
                        ? 'bg-emerald-500/70 hover:bg-emerald-500'
                        : day.uptime >= 95
                          ? 'bg-yellow-500/70 hover:bg-yellow-500'
                          : 'bg-rose-500/70 hover:bg-rose-500';
                    return (
                      <div
                        key={day.date}
                        className={`h-8 rounded-sm ${color} transition-colors cursor-default`}
                        title={`${day.date}: ${day.uptime}% uptime${day.incidents > 0 ? `, ${day.incidents} incident${day.incidents > 1 ? 's' : ''}` : ''}`}
                      />
                    );
                  })
                ) : (
                  Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="h-8 rounded-sm bg-white/5 animate-pulse" />
                  ))
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-secondary)]">
                <span>30 days ago</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500/70" /> &ge;99%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-yellow-500/70" /> &ge;95%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-rose-500/70" /> &lt;95%
                  </span>
                </div>
                <span>Today</span>
              </div>
            </div>

            {/* Per-service 30-day uptime */}
            {uptimeData && (
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                {uptimeData.services.map((svc) => {
                  const SvcIcon = SERVICE_ICONS[svc.name] ?? Server;
                  const barColor =
                    svc.uptime30d >= 99
                      ? 'bg-emerald-500'
                      : svc.uptime30d >= 95
                        ? 'bg-yellow-500'
                        : 'bg-rose-500';
                  return (
                    <div key={svc.name} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-32 shrink-0">
                        <SvcIcon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        <span className="text-xs font-medium truncate">{svc.name}</span>
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${Math.min(svc.uptime30d, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-[var(--text-secondary)] w-16 text-right">
                        {svc.uptime30d}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Incident History */}
        <section>
          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-4 hover:text-[var(--foreground)] transition-colors"
          >
            Incident History
            {showIncidents ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showIncidents && (
            <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Inbox className="h-8 w-8 text-[var(--text-secondary)] mb-3 opacity-40" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">No recorded incidents</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-70">
                Incidents will appear here when service disruptions are detected.
              </p>
            </div>
          )}
        </section>

        {/* Subscribe */}
        <section className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-[var(--text-secondary)]" />
            <h3 className="text-sm font-medium">Subscribe to Updates</h3>
          </div>
          {subscribed ? (
            <p className="text-sm text-emerald-400">Subscribed — you&apos;ll receive status update notifications.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/40"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                Subscribe
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-[var(--text-secondary)] pb-8">
          Auto-refreshes every 30 seconds · Powered by{' '}
          <Link href="/" className="text-emerald-400 hover:underline">
            TradeClaw
          </Link>
        </div>
      </main>
    </div>
  );
}
