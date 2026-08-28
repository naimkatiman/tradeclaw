import type { Metadata } from 'next';
import Link from 'next/link';
import { PageNavBar } from '@/components/PageNavBar';
import { BackgroundDecor } from '@/components/background/BackgroundDecor';
import { ProductHeroBackdrop } from '@/components/product-hero-backdrop';
import {
  readD1AlphaReport,
  unavailableD1AlphaReport,
  type D1AlphaLedgerSnapshot,
  type D1AlphaReport,
} from '@/lib/d1-alpha-ledger';
import { EvidenceSurfaceNav } from '../evidence-controls';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Prospective D1 Alpha Ledger | TradeClaw',
  description:
    'Append-only prospective evidence for the frozen BTCUSD and ETHUSD D1 slow-gate candidate, shown against a same-cost benchmark before any promotion decision.',
  alternates: { canonical: 'https://tradeclaw.win/track-record/alpha' },
  openGraph: {
    title: 'Prospective D1 Alpha Ledger | TradeClaw',
    description:
      'A frozen-rule, append-only modeled-cost evidence ledger. Collecting evidence; not a current strategy or broker account.',
    url: 'https://tradeclaw.win/track-record/alpha',
    siteName: 'TradeClaw',
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'TradeClaw prospective evidence ledger' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prospective D1 Alpha Ledger | TradeClaw',
    description: 'Collecting evidence under a predeclared 365-day / 365-snapshot / 12-trade gate.',
    images: ['/api/og'],
  },
};

const EMPTY = '\u2014';

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(value);
}

function formatUnsignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function statusTone(report: D1AlphaReport): string {
  if (report.status === 'eligible-for-review') {
    return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300';
  }
  if (report.status === 'failed-gate') {
    return 'border-red-500/35 bg-red-500/10 text-red-300';
  }
  return 'border-amber-500/35 bg-amber-500/10 text-amber-200';
}

function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  const toneClass = tone === 'positive'
    ? 'text-emerald-400'
    : tone === 'negative'
      ? 'text-red-400'
      : 'text-[var(--foreground)]';
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${toneClass}`}>
        <bdi dir="ltr">{value}</bdi>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function GateCard({
  label,
  current,
  minimum,
  passed,
}: {
  label: string;
  current: string;
  minimum: string;
  passed: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>
        <span className={`font-mono text-[9px] font-semibold ${passed ? 'text-emerald-400' : 'text-amber-300'}`}>
          {passed ? 'PASS' : 'OPEN'}
        </span>
      </div>
      <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-[var(--foreground)]">
        {current} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {minimum}</span>
      </div>
    </div>
  );
}

function transitionLabel(snapshot: D1AlphaLedgerSnapshot, symbol: 'btc' | 'eth'): string {
  return snapshot.payload[symbol].transition?.action ?? EMPTY;
}

async function getReport(): Promise<D1AlphaReport> {
  try {
    return await readD1AlphaReport();
  } catch {
    console.error('[track-record/alpha page] ledger unavailable; page failed closed');
    return unavailableD1AlphaReport();
  }
}

export default async function D1AlphaTrackRecordPage() {
  const report = await getReport();
  const metrics = report.metrics;
  const latest = report.recentSnapshots[0] ?? null;
  const strategyReturn = metrics?.strategyNetReturn ?? null;
  const activeReturn = metrics?.activeReturn ?? null;

  return (
    <div className="premium-product-shell relative isolate min-h-[100dvh] overflow-hidden text-[var(--foreground)]">
      <BackgroundDecor variant="track-record" />
      <PageNavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 pb-20 md:pb-8">
        <EvidenceSurfaceNav active="alpha" />

        <section className="relative isolate mb-7">
          <ProductHeroBackdrop
            src="/brand/hero/tradeclaw-replay-evidence-chamber-v1.webp"
            testId="d1-alpha-hero-art"
            className="product-hero-backdrop--quiet"
          />
          <div className="relative z-10">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Prospective modeled-cost evidence / frozen D1 rule
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Prospective D1 Alpha Ledger
              </h1>
              <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusTone(report)}`}>
                {report.label}
              </span>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[var(--text-secondary)]">
              This append-only ledger measures the frozen BTCUSD + ETHUSD D1 slow-gate candidate
              only from its first post-deployment snapshot. It starts flat, never backfills a
              historical position, and compares liquidation-adjusted modeled NAV with a same-cost
              50/50 buy-and-hold benchmark.
            </p>
            <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-100/80">
              <strong className="text-amber-200">Not the current strategy.</strong>{' '}
              The rule is frozen and cannot be optimized after prospective outcomes arrive. Even a
              cleared gate produces only “eligible for review”; promotion requires a separate owner
              decision and cannot delete or relabel the losing historical archive.
            </p>
          </div>
        </section>

        <section aria-labelledby="observation-gate" className="glass-card mb-6 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Predeclared minimum / return-independent
              </p>
              <h2 id="observation-gate" className="mt-1 text-xl font-semibold">Observation gate</h2>
            </div>
            <span className="font-mono text-[10px] text-[var(--text-secondary)]">
              PROMOTION: {report.promotion.toUpperCase()}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <GateCard
              label="Calendar days"
              current={formatInteger(metrics?.calendarDays ?? 0)}
              minimum={formatInteger(report.gate.minimums.calendarDays)}
              passed={report.gate.observationChecks.calendarDays}
            />
            <GateCard
              label="Consecutive snapshots"
              current={formatInteger(metrics?.snapshots ?? 0)}
              minimum={formatInteger(report.gate.minimums.snapshots)}
              passed={report.gate.observationChecks.snapshots}
            />
            <GateCard
              label="Closed sleeve trades"
              current={formatInteger(metrics?.closedTrades ?? 0)}
              minimum={formatInteger(report.gate.minimums.closedTrades)}
              passed={report.gate.observationChecks.closedTrades}
            />
            <GateCard
              label="Unresolved cadence gaps"
              current={formatInteger(report.integrity.unresolvedCadenceGaps)}
              minimum="0"
              passed={report.gate.observationChecks.cadence}
            />
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            All four observation checks plus fingerprint and hash-chain integrity must pass before
            returns are judged. The later performance gate requires positive strategy return,
            positive active return, no worse drawdown, and Calmar at least equal to the benchmark.
          </p>
        </section>

        <section aria-labelledby="prospective-metrics" className="mb-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Preliminary / not a promotion claim
              </p>
              <h2 id="prospective-metrics" className="mt-1 text-xl font-semibold">Prospective evidence</h2>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">
              Empty evidence is shown as {EMPTY}, never +0%.
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Strategy net return"
              value={formatPercent(strategyReturn)}
              detail="Liquidation-adjusted modeled NAV from the prospective epoch."
              tone={strategyReturn !== null && strategyReturn > 0 ? 'positive' : strategyReturn !== null && strategyReturn < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label="Benchmark net return"
              value={formatPercent(metrics?.benchmarkNetReturn)}
              detail="50/50 BTC/ETH, same entry, exit, and funding assumptions."
            />
            <MetricCard
              label="Active return"
              value={formatPercent(activeReturn)}
              detail="Strategy return minus benchmark return."
              tone={activeReturn !== null && activeReturn > 0 ? 'positive' : activeReturn !== null && activeReturn < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label="Strategy max drawdown"
              value={formatUnsignedPercent(metrics?.strategyMaxDrawdown)}
              detail="Peak-to-trough prospective modeled drawdown."
              tone={metrics && metrics.strategyMaxDrawdown > 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label="Benchmark max drawdown"
              value={formatUnsignedPercent(metrics?.benchmarkMaxDrawdown)}
              detail="Same-window benchmark peak-to-trough drawdown."
            />
            <MetricCard
              label="Calmar / benchmark"
              value={metrics ? `${formatNumber(metrics.strategyCalmar, 2)} / ${formatNumber(metrics.benchmarkCalmar, 2)}` : EMPTY}
              detail="Annualized return divided by maximum drawdown."
            />
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold">Current prospective state</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                <dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">BTCUSD</dt>
                <dd className="mt-1 font-mono font-semibold">{report.positions.BTCUSD ?? EMPTY}</dd>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                <dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">ETHUSD</dt>
                <dd className="mt-1 font-mono font-semibold">{report.positions.ETHUSD ?? EMPTY}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Strategy NAV</dt>
                <dd className="mt-1 font-mono">{latest ? formatNumber(latest.payload.strategyLiquidationNav) : EMPTY}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Benchmark NAV</dt>
                <dd className="mt-1 font-mono">{latest ? formatNumber(latest.payload.benchmarkLiquidationNav) : EMPTY}</dd>
              </div>
            </dl>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Ledger integrity</h2>
              <span className={`font-mono text-[10px] font-semibold uppercase ${report.integrity.status === 'pass' ? 'text-emerald-400' : report.integrity.status === 'not-started' ? 'text-amber-300' : 'text-red-400'}`}>
                {report.integrity.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Verified rows</dt>
                <dd className="mt-1 font-mono">{formatInteger(report.integrity.verifiedRows)}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Latest commit</dt>
                <dd className="mt-1 font-mono text-[10px]">{report.observation.latestCommittedAt ?? EMPTY}</dd>
              </div>
            </dl>
            {report.integrity.errors.length > 0 && (
              <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/[0.05] p-3 text-[10px] text-red-200/80">
                Evidence is fail-closed: {report.integrity.errors[0]}
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="recent-alpha-rows" className="glass-card mb-6 overflow-hidden rounded-2xl">
          <div className="border-b border-white/[0.08] p-5">
            <h2 id="recent-alpha-rows" className="text-sm font-semibold">Recent append-only snapshots</h2>
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              Newest first. Each row commits both symbols as one hash-chained portfolio observation.
            </p>
          </div>
          {report.recentSnapshots.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
              {EMPTY} No post-deployment snapshot has been committed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[10px]">
                <thead className="bg-black/20 uppercase tracking-wider text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">UTC bar</th>
                    <th className="px-4 py-3 font-medium">BTC / ETH close</th>
                    <th className="px-4 py-3 font-medium">Transitions</th>
                    <th className="px-4 py-3 font-medium">Positions</th>
                    <th className="px-4 py-3 font-medium">Strategy / benchmark NAV</th>
                    <th className="px-4 py-3 font-medium">Row hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {report.recentSnapshots.map((snapshot) => (
                    <tr key={snapshot.rowHash}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {new Date(snapshot.payload.barTimestamp).toISOString().slice(0, 10)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {formatNumber(snapshot.payload.btc.close, 2)} / {formatNumber(snapshot.payload.eth.close, 2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {transitionLabel(snapshot, 'btc')} / {transitionLabel(snapshot, 'eth')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {snapshot.payload.btc.prospectivePosition} / {snapshot.payload.eth.prospectivePosition}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {formatNumber(snapshot.payload.strategyLiquidationNav)} / {formatNumber(snapshot.payload.benchmarkLiquidationNav)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-secondary)]" title={snapshot.rowHash}>
                        {snapshot.rowHash.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass-card rounded-2xl border-s-2 border-emerald-500/50 p-5">
          <h2 className="text-sm font-semibold">Frozen protocol and evidence boundaries</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
            <div><dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Version</dt><dd className="mt-1 font-mono text-[10px]">{report.strategyVersion}</dd></div>
            <div><dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Rule</dt><dd className="mt-1">{report.protocol.rule}</dd></div>
            <div><dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">OHLCV source</dt><dd className="mt-1 font-mono text-[10px]">{report.protocol.dataSource}</dd></div>
            <div><dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Rule SHA-256</dt><dd className="mt-1 break-all font-mono text-[9px]">{report.fingerprints.ruleSha256}</dd></div>
            <div><dt className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Artifact SHA-256</dt><dd className="mt-1 break-all font-mono text-[9px]">{report.fingerprints.artifactSha256}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/track-record" className="rounded-lg bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">
              Losing observed archive
            </Link>
            <Link href="/track-record/study" className="rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium hover:bg-white/[0.1]">
              Retrospective studies
            </Link>
            <a href="/api/track-record/alpha" className="rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium hover:bg-white/[0.1]">
              Raw ledger JSON
            </a>
            <a
              href="https://github.com/naimkatiman/tradeclaw/blob/main/docs/plans/2026-08-10-d1-alpha-ledger.md"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--foreground)]"
            >
              Predeclared protocol
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
