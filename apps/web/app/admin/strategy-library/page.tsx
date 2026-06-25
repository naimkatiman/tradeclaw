import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronLeft,
  Library,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  Layers,
  ClipboardCheck,
} from 'lucide-react';
import { requireAdmin } from '../../../lib/admin-gate';
import {
  getStrategyLibrary,
  getSatelliteAllocations,
  decaySeverity,
  type DecaySeverity,
  type MeasuredStrategy,
  type CandidateStrategy,
  type AllocationProfile,
} from '../../../lib/strategy-library';

export const metadata: Metadata = {
  title: 'Strategy Library | Admin | TradeClaw',
  description: 'Versioned strategy library, edge-decay tracking, and Satellite Strike allocation.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const SEVERITY_STYLE: Record<DecaySeverity, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  watch: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  decayed: 'bg-red-500/15 text-red-300 border-red-500/30',
  candidate: 'bg-zinc-700/40 text-zinc-300 border-white/10',
};

function DecayBadge({ status }: { status: string }) {
  const sev = decaySeverity(status);
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLE[sev]}`}
    >
      {status}
    </span>
  );
}

function SleeveBadge({ aggressiveness }: { aggressiveness: 'core' | 'satellite' }) {
  const isCore = aggressiveness === 'core';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isCore
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
      }`}
    >
      {isCore ? <ShieldCheck size={11} /> : <Layers size={11} />}
      {aggressiveness}
    </span>
  );
}

function MeasuredRow({ s }: { s: MeasuredStrategy }) {
  return (
    <tr className="border-t border-white/[0.04] align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-white">{s.display_name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{s.id}</p>
        <p className="mt-1 max-w-md text-[11px] leading-relaxed text-zinc-500">{s.source_citation}</p>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">{s.regime_fit}</td>
      <td className="px-4 py-3">
        <SleeveBadge aggressiveness={s.aggressiveness} />
      </td>
      <td className="px-4 py-3 text-xs text-zinc-300">{s.historical_edge}</td>
      <td className="px-4 py-3 text-xs text-zinc-300">{s.rolling_30d}</td>
      <td className="px-4 py-3 text-xs text-zinc-300">{s.rolling_90d}</td>
      <td className="px-4 py-3">
        <DecayBadge status={s.decay_status} />
        {s.auto_demote && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-red-300">
            <AlertTriangle size={11} /> auto-demoted
          </p>
        )}
        <p className="mt-1 text-[10px] text-zinc-500">Review: {s.kill_date_review.split(' — ')[0]}</p>
      </td>
    </tr>
  );
}

function CandidateRow({ s }: { s: CandidateStrategy }) {
  return (
    <tr className="border-t border-white/[0.04] align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-white">{s.display_name}</p>
        <p className="mt-1 max-w-md text-[11px] leading-relaxed text-zinc-500">{s.source_citation}</p>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">{s.regime_fit}</td>
      <td className="px-4 py-3">
        <SleeveBadge aggressiveness={s.aggressiveness} />
      </td>
      <td className="px-4 py-3" colSpan={3}>
        <span className="text-xs italic text-zinc-500">pending real data — cited setup, not yet run on TradeClaw signals</span>
      </td>
      <td className="px-4 py-3">
        <DecayBadge status={s.decay_status} />
      </td>
    </tr>
  );
}

function SplitBar({ core, satellite }: { core: number; satellite: number }) {
  return (
    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full bg-emerald-500/70" style={{ width: `${core}%` }} aria-label={`Core ${core}%`} />
      <div className="h-full bg-sky-500/70" style={{ width: `${satellite}%` }} aria-label={`Satellite ${satellite}%`} />
    </div>
  );
}

function AllocationCard({ p }: { p: AllocationProfile }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">{p.profile}</p>
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-300">
          satellite cap {p.max_satellite_pct}%
        </span>
      </div>
      <SplitBar core={p.core_pct} satellite={p.satellite_pct} />
      <div className="mt-2 flex justify-between text-[11px] text-zinc-400">
        <span className="text-emerald-300">Core {p.core_pct}%</span>
        <span className="text-sky-300">Satellite {p.satellite_pct}%</span>
      </div>
      {typeof p.per_trade_risk_pct === 'number' && (
        <p className="mt-3 text-xs text-zinc-400">
          Per-trade risk: <span className="font-semibold text-white">{p.per_trade_risk_pct}%</span>
        </p>
      )}
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Drawdown → size-cut</p>
      <ul className="mt-1 flex flex-col gap-1">
        {p.drawdown_rules.map((r) => (
          <li key={r} className="text-[11px] leading-relaxed text-zinc-400">
            {r}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Satellite sleeve may run</p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
        {p.allowed_satellite_strategies.join(', ') || '—'}
      </p>
    </div>
  );
}

export default async function StrategyLibraryPage() {
  await requireAdmin();
  const library = getStrategyLibrary();
  const satellite = getSatelliteAllocations();

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          <ChevronLeft size={14} />
          Back to admin
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <Library size={20} className="text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Strategy Library &amp; Edge-Decay</h1>
        </div>
        {library ? (
          <p className="mt-1 text-sm text-zinc-400">
            v{library.version} · baseline {library._meta.historical_baseline_pct}% · decay floor{' '}
            {library._meta.decay_floor_pct}% (rolling-90d &lt; 0.5× baseline) ·{' '}
            {library._meta.counts.measured} measured + {library._meta.counts.candidate} candidate.{' '}
            Numbers are LOCAL scanner/dev samples, not production-verified.
          </p>
        ) : (
          <p className="mt-1 text-sm text-amber-300">
            strategy_library.json not found in data dir. Run scripts/compute-strategy-decay.py and rebuild.
          </p>
        )}

        {/* Measured strategies */}
        {library && (
          <>
            <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              <TrendingUp size={15} /> Measured strategies (real local-sample edge)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Strategy / citation</th>
                    <th className="px-4 py-2.5 font-medium">Regime</th>
                    <th className="px-4 py-2.5 font-medium">Sleeve</th>
                    <th className="px-4 py-2.5 font-medium">Historical edge</th>
                    <th className="px-4 py-2.5 font-medium">30d</th>
                    <th className="px-4 py-2.5 font-medium">90d</th>
                    <th className="px-4 py-2.5 font-medium">Decay</th>
                  </tr>
                </thead>
                <tbody>
                  {library.measured_strategies.map((s) => (
                    <MeasuredRow key={s.id} s={s} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Candidate strategies */}
            <h2 className="mt-10 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              <FlaskConical size={15} /> Candidate strategies ({library.candidate_strategies.length}) — cited, pending real data
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Strategy / citation</th>
                    <th className="px-4 py-2.5 font-medium">Regime</th>
                    <th className="px-4 py-2.5 font-medium">Sleeve</th>
                    <th className="px-4 py-2.5 font-medium" colSpan={3}>Edge</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {library.candidate_strategies.map((s) => (
                    <CandidateRow key={s.id} s={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Satellite allocation cards */}
        <h2 className="mt-10 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <Layers size={15} /> Satellite allocation cards (Satellite Strike Ch9)
        </h2>
        {satellite ? (
          <>
            <p className="mb-3 text-xs text-zinc-500">{satellite._meta.framework}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {satellite.profiles.map((p) => (
                <AllocationCard key={p.profile} p={p} />
              ))}
            </div>

            <h2 className="mt-10 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              <ClipboardCheck size={15} /> Monthly review checklist (Ch9.4.3)
            </h2>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <ol className="flex flex-col gap-2">
                {satellite.monthly_review_checklist.map((item, i) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-emerald-400">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <p className="text-sm text-amber-300">satellite-allocations.json not found in data dir.</p>
        )}
      </div>
    </main>
  );
}
