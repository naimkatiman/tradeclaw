import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Brain, Wrench, Plug, TrendingUp, ArrowRight,
  AlertTriangle, Info, CheckCircle,
} from 'lucide-react';
import { requireAdmin } from '../../../lib/admin-gate';
import { getConnectorStatuses, type ConnectorStatus } from '../../../lib/connector-health';
import { getAccuracyTrends, getRecommendations, type Recommendation } from '../../../lib/signal-metrics';
import { MemorySnapshot } from './memory-snapshot';

export const metadata: Metadata = {
  title: 'Operator | TradeClaw Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface NavCardProps {
  href: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

function NavCard({ href, title, body, icon: Icon }: NavCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-emerald-500/30 hover:bg-white/[0.04]"
    >
      <div className="rounded-lg bg-emerald-500/10 p-2.5">
        <Icon size={20} className="text-emerald-400" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-zinc-400">{body}</p>
      </div>
      <ArrowRight
        size={16}
        className="mt-1 text-zinc-600 transition-colors group-hover:text-emerald-400"
      />
    </Link>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function ConnectorBadge({ connector }: { connector: ConnectorStatus }) {
  const dotColor =
    connector.status === 'healthy'
      ? 'bg-emerald-400'
      : connector.status === 'degraded'
        ? 'bg-amber-400'
        : 'bg-red-400';

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-sm text-zinc-300">{connector.name}</span>
      <span className="text-xs text-zinc-600">{connector.latencyMs}ms</span>
    </div>
  );
}

function recBadgeColor(type: Recommendation['type']): string {
  switch (type) {
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'info':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    case 'success':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  }
}

function RecIcon({ type }: { type: Recommendation['type'] }) {
  switch (type) {
    case 'warning':
      return <AlertTriangle size={14} />;
    case 'info':
      return <Info size={14} />;
    case 'success':
      return <CheckCircle size={14} />;
  }
}

export default async function OperatorIndexPage() {
  await requireAdmin();

  const [connectors, trends, recommendations] = await Promise.all([
    getConnectorStatuses(),
    getAccuracyTrends(7),
    getRecommendations(),
  ]);

  // Compute 7-day summary stats
  const totalSignals7d = trends.reduce((s, t) => s + t.totalSignals, 0);
  const avgWin4h =
    trends.length > 0
      ? Math.round(trends.reduce((s, t) => s + t.winRate4h, 0) / trends.length)
      : 0;
  const avgWin24h =
    trends.length > 0
      ? Math.round(trends.reduce((s, t) => s + t.winRate24h, 0) / trends.length)
      : 0;
  const avgConfidence =
    trends.length > 0
      ? Math.round(trends.reduce((s, t) => s + t.avgConfidence, 0) / trends.length)
      : 0;

  const topRecs = recommendations.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-white">AI Operator</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Command center for operator memory, tools, connectors, and signal insights.
        </p>

        {/* Connector status strip */}
        <div className="mt-6 flex flex-wrap gap-2">
          {connectors.map((c) => (
            <ConnectorBadge key={c.id} connector={c} />
          ))}
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Signals (7d)" value={String(totalSignals7d)} />
          <StatCard label="Win Rate 4h" value={`${avgWin4h}%`} sub="7-day avg" />
          <StatCard label="Win Rate 24h" value={`${avgWin24h}%`} sub="7-day avg" />
          <StatCard label="Avg Confidence" value={`${avgConfidence}%`} sub="7-day avg" />
        </div>

        {/* Navigation grid */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <NavCard
            href="/admin/operator/memory"
            title="Memory"
            body="Key-value store for operator state and preferences."
            icon={Brain}
          />
          <NavCard
            href="/admin/operator/tools"
            title="Tools Registry"
            body="Indicators, signal engines, and connectors."
            icon={Wrench}
          />
          <NavCard
            href="/admin/operator/connectors"
            title="Connectors"
            body="Live health checks for Market Data Hub and database."
            icon={Plug}
          />
          <NavCard
            href="/admin/operator/insights"
            title="Signal Insights"
            body="Accuracy trends and improvement recommendations."
            icon={TrendingUp}
          />
        </div>

        {/* Memory snapshot */}
        <div className="mt-8">
          <MemorySnapshot />
        </div>

        {/* Recommendations feed */}
        {topRecs.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Recommendations
            </h2>
            <div className="flex flex-col gap-2">
              {topRecs.map((rec, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${recBadgeColor(rec.type)}`}
                >
                  <RecIcon type={rec.type} />
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
