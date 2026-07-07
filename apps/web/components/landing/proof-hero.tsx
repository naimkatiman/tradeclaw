/**
 * ProofHero — the honest, cost-adjusted result, up front.
 *
 * Reframed 2026-06-28: the section no longer headlines gross "Cumulative P&L"
 * as a win (that figure is pre-cost and misleading). Instead it pulls the REAL
 * cost-adjusted numbers from the same source of truth the track-record page
 * uses — /api/signals/equity?summaryOnly=1 — so net expectancy after cost,
 * total return after cost, and the real round-trip cost are shown live and can
 * never drift from the equity curve. We do not duplicate or hardcode the cost
 * math. See docs/plans/2026-06-27-reposition-off-raw-pnl.md.
 */

const GITHUB_URL = 'https://github.com/naimkatiman/tradeclaw';

interface EquitySummary {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalSignals: number;
  sizedTrades?: number;
  expectancyR: number | null;
  netExpectancyR?: number | null;
  breakEvenWinRate: number | null;
  roundTripCostPct?: number;
  avgCostR?: number | null;
}

async function fetchEquitySummary(): Promise<EquitySummary | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/signals/equity?summaryOnly=1&scope=pro`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.summary ?? null) as EquitySummary | null;
  } catch {
    return null;
  }
}

function StatTile({
  label,
  value,
  tone,
  small = false,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
  small?: boolean;
}) {
  const color =
    tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-red-400'
        : 'text-[var(--foreground)]';
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
        {label}
      </p>
      <p className={`mt-2 font-bold ${color} ${small ? 'text-sm' : 'text-2xl'}`}>
        {value}
      </p>
    </div>
  );
}

export async function ProofHero() {
  const eq = await fetchEquitySummary();

  return (
    <section data-testid="proof-hero" className="mx-auto mt-10 max-w-5xl px-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          We charge every sized trade its modeled execution cost. Here&apos;s what&apos;s left.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          The headline isn&apos;t a win. After modeled per-symbol round-trip costs, the
          engine&apos;s net expectancy is negative — single-asset timing doesn&apos;t beat
          what it costs to trade. These numbers update live and match the full{' '}
          <a href="/track-record" className="underline hover:text-white">
            cost-adjusted track record
          </a>
          .
        </p>
      </div>

      {eq ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile
            label="Net expectancy / trade (after cost)"
            value={eq.netExpectancyR != null ? `${eq.netExpectancyR >= 0 ? '+' : ''}${eq.netExpectancyR}R` : '—'}
            tone={eq.netExpectancyR != null && eq.netExpectancyR < 0 ? 'negative' : 'neutral'}
          />
          <StatTile
            label="Total return (after cost)"
            value={`${eq.totalReturn >= 0 ? '+' : ''}${eq.totalReturn}%`}
            tone={eq.totalReturn < 0 ? 'negative' : 'positive'}
          />
          <StatTile
            label="Modeled round-trip cost"
            value={eq.avgCostR != null ? `${eq.roundTripCostPct ?? '—'}% ≈ ${eq.avgCostR}R` : '—'}
            tone="neutral"
            small
          />
          <StatTile
            label="Trades resolved"
            value={String(eq.sizedTrades ?? eq.totalSignals)}
            tone="neutral"
          />
          <StatTile
            label="Win rate vs break-even"
            value={eq.breakEvenWinRate != null ? `${eq.winRate}% / ${eq.breakEvenWinRate}%` : `${eq.winRate}%`}
            tone="neutral"
            small
          />
        </div>
      ) : (
        <p className="text-center text-sm text-[var(--text-secondary)]">
          The cost-adjusted result loads on the{' '}
          <a href="/track-record" className="underline hover:text-white">track record</a>.
        </p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href="/track-record"
          className="group flex items-center gap-2.5 rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          See the full track record
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-7 py-3 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          View the source on GitHub
        </a>
      </div>
    </section>
  );
}
