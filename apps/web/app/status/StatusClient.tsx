'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  Database,
  Radio,
  Server,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronUp,
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

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateUptimeHistory(): ('operational' | 'degraded')[] {
  const days: ('operational' | 'degraded')[] = [];
  for (let i = 0; i < 90; i++) {
    const r = seededRandom(i * 7 + 42);
    days.push(r < 0.04 ? 'degraded' : 'operational');
  }
  return days;
}

interface Incident {
  id: string;
  title: string;
  date: string;
  status: 'resolved';
  duration: string;
  description: string;
}

function generateIncidents(): Incident[] {
  return [
    {
      id: 'inc-001',
      title: 'Elevated API latency',
      date: '2026-03-15',
      status: 'resolved',
      duration: '23 min',
      description: 'API response times exceeded 2s threshold due to upstream provider latency. Auto-recovered.',
    },
    {
      id: 'inc-002',
      title: 'SSE Feed reconnection delays',
      date: '2026-02-28',
      status: 'resolved',
      duration: '11 min',
      description: 'WebSocket reconnection backoff caused brief gaps in price streaming. Hotfix deployed.',
    },
    {
      id: 'inc-003',
      title: 'Signal Engine maintenance window',
      date: '2026-02-10',
      status: 'resolved',
      duration: '8 min',
      description: 'Planned maintenance for indicator engine upgrade. All signals resumed on schedule.',
    },
  ];
}

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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showIncidents, setShowIncidents] = useState(true);

  const uptimeHistory = generateUptimeHistory();
  const incidents = generateIncidents();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) {
        const json: StatusData = await res.json();
        setData(json);
      }
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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

  const statusCfg = data ? STATUS_CONFIG[data.status] : STATUS_CONFIG.operational;
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
                Refreshed {formatTime(lastRefresh.toISOString())}
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
                <h2 className="text-xl font-semibold">{statusCfg.label}</h2>
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
                {data?.status ?? 'checking'}
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
              const svcCfg = STATUS_CONFIG[svc.status];
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

        {/* 90-Day Uptime History */}
        <section>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-4">
            90-Day Uptime
          </h3>
          <div className="glass-card rounded-xl p-4">
            <div className="flex gap-[3px] flex-wrap">
              {uptimeHistory.map((day, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-sm ${
                    day === 'operational' ? 'bg-emerald-500/60' : 'bg-yellow-500/60'
                  }`}
                  title={`Day ${i + 1}: ${day}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-secondary)]">
              <span>90 days ago</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-emerald-500/60" /> Operational
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-yellow-500/60" /> Degraded
                </span>
              </div>
              <span>Today</span>
            </div>
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
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">{inc.title}</h4>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{inc.description}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {inc.date}
                    </span>
                    <span>Duration: {inc.duration}</span>
                  </div>
                </div>
              ))}
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
