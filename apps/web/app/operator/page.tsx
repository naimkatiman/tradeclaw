import type { Metadata } from 'next';

import { readSessionFromCookies } from '../../lib/user-session';
import { getUserTier, type Tier } from '../../lib/tier';
import { listOperatorMemory } from '../../lib/operator-memory';
import { listTools } from '../../lib/tools-registry';
import { getConnectorStatuses } from '../../lib/connector-health';
import { getAccuracyTrends, getRecommendations } from '../../lib/signal-metrics';

export const metadata: Metadata = {
  title: 'Operator | TradeClaw Pro',
  description: 'Unified operator dashboard for memory, tools, connectors, and signal insights.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function isProTier(tier: Tier) {
  return tier === 'pro' || tier === 'elite' || tier === 'custom';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function summarizeValue(value: unknown) {
  if (typeof value === 'string') {
    return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  }
  try {
    const json = JSON.stringify(value);
    if (!json) return '—';
    return json.length > 120 ? `${json.slice(0, 117)}…` : json;
  } catch {
    return '—';
  }
}

function statusColor(status: 'healthy' | 'degraded' | 'down') {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20';
    case 'degraded':
      return 'bg-amber-500/10 text-amber-300 border-amber-400/20';
    case 'down':
      return 'bg-rose-500/10 text-rose-300 border-rose-400/20';
  }
}

function recommendationColor(type: 'warning' | 'info' | 'success') {
  switch (type) {
    case 'warning':
      return 'border-amber-400/20 bg-amber-500/10 text-amber-200';
    case 'success':
      return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200';
    case 'info':
    default:
      return 'border-sky-400/20 bg-sky-500/10 text-sky-200';
  }
}

function LockedPreview() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 shadow-2xl shadow-black/30">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Pro operator preview
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                One command center for memory, tools, connectors, and live insights.
              </h1>
              <p className="text-sm leading-6 text-zinc-400 sm:text-base">
                The unified operator dashboard is a Pro-gated workspace. Upgrade to see the live
                memory sidebar, the tool registry summary, connector health, and the latest signal
                recommendations in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/pricing?from=operator"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Upgrade to Pro
              </a>
              <a
                href="/login?from=/operator"
                className="rounded-lg border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
              >
                Sign in
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Memory sidebar', 'Saved notes, watchlists, and operator preferences.'],
            ['Tools summary', 'Indicator registry with enable/disable state.'],
            ['Connector strip', 'Market data hub and database health at a glance.'],
            ['Insights feed', 'Accuracy trends and rule-based recommendations.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="text-sm font-medium text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

export default async function OperatorPage() {
  const session = await readSessionFromCookies();
  const tier = session?.userId ? await getUserTier(session.userId) : 'free';

  if (!isProTier(tier)) {
    return <LockedPreview />;
  }

  const userId = session!.userId;
  const [memoryEntries, tools, connectors, trends, recommendations] = await Promise.all([
    listOperatorMemory(userId),
    listTools(),
    getConnectorStatuses(),
    getAccuracyTrends(7),
    getRecommendations(),
  ]);

  const enabledTools = tools.filter((tool) => tool.enabled);
  const healthyConnectors = connectors.filter((connector) => connector.status === 'healthy').length;
  const trendSummary = trends[0];
  const latestTrend = trendSummary
    ? `${trendSummary.winRate4h}% 4h win rate, ${trendSummary.winRate24h}% 24h win rate`
    : 'No recent trend data yet.';
  const latestRefresh = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const toolsByCategory = tools.reduce<Record<string, { total: number; enabled: number }>>((acc, tool) => {
    const bucket = acc[tool.category] ?? { total: 0, enabled: 0 };
    bucket.total += 1;
    if (tool.enabled) bucket.enabled += 1;
    acc[tool.category] = bucket;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Pro operator dashboard
              </p>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Unified command center for TradeClaw operators.
                </h1>
                <p className="text-sm leading-6 text-zinc-400 sm:text-base">
                  Keep memory, tools, connectors, and signal intelligence in one live surface so
                  you can move from observation to action without jumping between admin screens.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px] lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Tier</div>
                <div className="mt-2 text-lg font-semibold text-white">{tier.toUpperCase()}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Connectors</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {healthyConnectors}/{connectors.length} healthy
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Tools</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {enabledTools.length}/{tools.length} enabled
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Memory sidebar
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Recent operator memory</h2>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                  {formatNumber(memoryEntries.length)} entries
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {memoryEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-4 text-sm text-zinc-400">
                    No saved memory yet. Use the operator memory editor to pin preferences,
                    watchlists, or runbook notes.
                  </div>
                ) : (
                  memoryEntries.slice(0, 5).map((entry) => (
                    <div key={entry.key} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">{entry.key}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          {new Date(entry.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
                        {summarizeValue(entry.value)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Tools summary
              </p>
              <div className="mt-4 space-y-3">
                {Object.keys(toolsByCategory).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-4 text-sm text-zinc-400">
                    No tools are registered yet.
                  </div>
                ) : (
                  Object.entries(toolsByCategory).map(([category, counts]) => (
                    <div key={category} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">{category}</div>
                        <div className="text-sm text-zinc-400">
                          {counts.enabled}/{counts.total}
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/[0.05]">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.round((counts.enabled / counts.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Connector status strip
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Live connector health</h2>
                </div>
                <div className="text-sm text-zinc-500">Last refreshed {latestRefresh}</div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {connectors.map((connector) => (
                  <div
                    key={connector.id}
                    className={`rounded-2xl border p-4 ${statusColor(connector.status)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{connector.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-current/70">
                          {connector.id}
                        </div>
                      </div>
                      <span className="rounded-full border border-current/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-current">
                        {connector.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-current/80">
                      <span>Latency</span>
                      <span>{connector.latencyMs} ms</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-current/80">
                      <span>Checked</span>
                      <span>{new Date(connector.lastCheck).toLocaleTimeString('en-US')}</span>
                    </div>
                    {connector.error ? (
                      <p className="mt-3 rounded-xl border border-black/10 bg-black/10 px-3 py-2 text-sm text-current/90">
                        {connector.error}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                      Insights feed
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">Accuracy trends and recommendations</h2>
                  </div>
                  <div className="text-sm text-zinc-500">{latestTrend}</div>
                </div>

                <div className="mt-4 space-y-3">
                  {recommendations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-4 text-sm text-zinc-400">
                      No recommendations yet. Once signal history accumulates, this feed will surface
                      drift, low-confidence clusters, and strong-performing windows.
                    </div>
                  ) : (
                    recommendations.map((recommendation, index) => (
                      <div
                        key={`${recommendation.type}-${index}-${recommendation.message}`}
                        className={`rounded-2xl border p-4 ${recommendationColor(recommendation.type)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-6 text-current">{recommendation.message}</p>
                          <span className="rounded-full border border-current/10 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-current">
                            {recommendation.type}
                          </span>
                        </div>
                        {recommendation.symbol ? (
                          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-current/70">
                            {recommendation.symbol}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                      Signal summary
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">Last 7 days</h2>
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    {formatNumber(trends.length)} days
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {trends.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-4 text-sm text-zinc-400">
                      No trend rows yet.
                    </div>
                  ) : (
                    trends.slice(0, 4).map((trend) => (
                      <div key={trend.date} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-white">{trend.date}</div>
                          <div className="text-sm text-zinc-400">{trend.totalSignals} signals</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-400">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">4h win rate</div>
                            <div className="mt-1 text-base font-semibold text-white">{trend.winRate4h}%</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">24h win rate</div>
                            <div className="mt-1 text-base font-semibold text-white">{trend.winRate24h}%</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Avg confidence</div>
                            <div className="mt-1 text-base font-semibold text-white">{trend.avgConfidence}%</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Volume</div>
                            <div className="mt-1 text-base font-semibold text-white">
                              {formatNumber(trend.totalSignals)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
