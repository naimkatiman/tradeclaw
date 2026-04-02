'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Key,
  Activity,
  Clock,
  BarChart3,
  Star,
  ArrowLeft,
  Search,
  Zap,
  Shield,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface UsageData {
  keyId: string;
  keyName: string;
  status: string;
  scopes: string[];
  requestsThisHour: number;
  requestsToday: number;
  requestsTotal: number;
  rateLimit: number;
  resetAt: string;
}

interface EndpointBreakdown {
  name: string;
  path: string;
  requests: number;
  limit: number;
  color: string;
}

function GaugeChart({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = Math.min((used / limit) * 100, 100);
  const radius = 54;
  const circumference = Math.PI * radius; // semi-circle
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-48 h-28">
        {/* Background arc */}
        <path
          d="M 6 64 A 54 54 0 0 1 114 64"
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 6 64 A 54 54 0 0 1 114 64"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        {/* Center text */}
        <text x="60" y="50" textAnchor="middle" fill={color} fontSize="20" fontWeight="bold">
          {pct.toFixed(0)}%
        </text>
        <text x="60" y="64" textAnchor="middle" fill="var(--text-secondary)" fontSize="8">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </text>
      </svg>
      <span className="text-xs text-[var(--text-secondary)] -mt-1">{label}</span>
    </div>
  );
}

function QuotaBar({ name, used, limit, color }: { name: string; used: number; limit: number; color: string }) {
  const pct = Math.min((used / limit) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{name}</span>
        <span className="text-[var(--foreground)] font-medium">{used}/{limit}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function CountdownTimer({ resetAt }: { resetAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(resetAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Resetting...');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [resetAt]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
      <Clock className="w-3.5 h-3.5 text-amber-400" />
      <span>Resets in <strong className="text-[var(--foreground)]">{timeLeft}</strong></span>
    </div>
  );
}

export default function APIUsageClient() {
  const [apiKey, setApiKey] = useState('');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchUsage = useCallback(async (key: string) => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    setUsage(null);
    try {
      const res = await fetch(`/api/keys/usage/${encodeURIComponent(key.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'API key not found');
        return;
      }
      const data: UsageData = await res.json();
      setUsage(data);
    } catch {
      setError('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchUsage(apiKey);
  }

  // Mock per-endpoint breakdown
  const endpoints: EndpointBreakdown[] = usage
    ? [
        { name: 'Signals', path: '/api/v1/signals', requests: Math.floor(usage.requestsToday * 0.55), limit: usage.rateLimit, color: '#10b981' },
        { name: 'Leaderboard', path: '/api/v1/leaderboard', requests: Math.floor(usage.requestsToday * 0.25), limit: usage.rateLimit, color: '#8b5cf6' },
        { name: 'Health', path: '/api/v1/health', requests: Math.floor(usage.requestsToday * 0.12), limit: usage.rateLimit, color: '#3b82f6' },
        { name: 'Badge', path: '/api/v1/badge', requests: Math.floor(usage.requestsToday * 0.08), limit: usage.rateLimit, color: '#f59e0b' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[var(--background)] pt-24 pb-20 md:pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/api-keys"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to API Keys
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <BarChart3 className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            API Usage Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-lg mx-auto">
            Monitor your API usage, view rate limits, and track quota consumption per key.
          </p>
        </div>

        {/* Key input */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                ref={inputRef}
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key (tc_...)"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:border-purple-500/50 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Lookup
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">
            Don&apos;t have a key?{' '}
            <Link href="/api-keys" className="text-purple-400 hover:text-purple-300">Generate one free →</Link>
          </p>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-5 py-3 text-sm text-rose-400 mb-8">
            {error}
          </div>
        )}

        {/* Usage results */}
        {usage && (
          <div className="space-y-6">
            {/* Key info bar */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--foreground)]">{usage.keyName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      usage.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {usage.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                    <span>ID: {usage.keyId.slice(0, 8)}…</span>
                    <span>·</span>
                    <span>Scopes: {usage.scopes.join(', ')}</span>
                  </div>
                </div>
                <CountdownTimer resetAt={usage.resetAt} />
              </div>
            </div>

            {/* Usage gauge */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Daily Usage
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <GaugeChart
                  used={usage.requestsToday}
                  limit={usage.rateLimit}
                  label="Today's Requests"
                />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4">
                    <div className="text-xl font-bold text-[var(--foreground)]">{usage.requestsThisHour}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">This hour</div>
                  </div>
                  <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4">
                    <div className="text-xl font-bold text-[var(--foreground)]">{usage.requestsTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">All time</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-endpoint breakdown */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Per-Endpoint Breakdown
              </h3>
              <div className="space-y-3">
                {endpoints.map((ep) => (
                  <QuotaBar key={ep.path} name={`${ep.name} (${ep.path})`} used={ep.requests} limit={ep.limit} color={ep.color} />
                ))}
              </div>
            </div>

            {/* Refresh button */}
            <div className="text-center">
              <button
                onClick={() => fetchUsage(apiKey)}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh stats
              </button>
            </div>
          </div>
        )}

        {/* Rate limit explainer cards */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 text-center">Rate Limits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free tier */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Free Tier</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Default for all keys</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Daily requests</span>
                  <span className="text-[var(--foreground)] font-medium">100 / day</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate limit</span>
                  <span className="text-[var(--foreground)] font-medium">10 req / min</span>
                </div>
                <div className="flex justify-between">
                  <span>Endpoints</span>
                  <span className="text-[var(--foreground)] font-medium">All v1 API</span>
                </div>
                <div className="flex justify-between">
                  <span>Price</span>
                  <span className="text-emerald-400 font-medium">Free forever</span>
                </div>
              </div>
            </div>

            {/* Pro tier */}
            <div className="rounded-2xl border border-purple-500/20 bg-[var(--bg-card)] p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-medium">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Pro Tier</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">For power users</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Daily requests</span>
                  <span className="text-[var(--foreground)] font-medium">1,000 / day</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate limit</span>
                  <span className="text-[var(--foreground)] font-medium">60 req / min</span>
                </div>
                <div className="flex justify-between">
                  <span>Endpoints</span>
                  <span className="text-[var(--foreground)] font-medium">All v1 + v2 API</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority support</span>
                  <span className="text-purple-400 font-medium">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/api-keys"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <Key className="w-4 h-4" />
            Generate API Key
          </Link>

          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white transition-all active:scale-[0.98]"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
          <p className="text-[10px] text-[var(--text-secondary)]">
            Open source · Self-hostable · Free forever
          </p>
        </div>
      </div>
    </div>
  );
}
