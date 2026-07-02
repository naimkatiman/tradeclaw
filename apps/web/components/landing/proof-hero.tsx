import { DelayDemo } from './delay-demo';
import { SampleTelegramCard } from './sample-telegram-card';
import { getLandingStats } from '../../lib/landing-stats';

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
  let stats = null as Awaited<ReturnType<typeof getLandingStats>> | null;
  try {
    stats = await getLandingStats();
  } catch {
    stats = null;
  }

  const eq = await fetchEquitySummary();

  return (
    <section data-testid="proof-hero" className="mx-auto mt-10 max-w-5xl px-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          We charge every trade its real execution cost. Here&apos;s what&apos;s left.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          The headline isn&apos;t a win. After real per-symbol round-trip costs, the
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
            label="Real round-trip cost"
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

      {/* Product demo (secondary): what Pro delivery looks like. Not a profit
          claim — just the delivery surface. */}
      {stats?.samples && (
        <div className="mt-12">
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Pro (no delay) vs Free (30-min delay)
          </h2>
          <DelayDemo pro={stats.samples.pro} free={stats.samples.free} />
        </div>
      )}

      {stats?.samples && (
        <div className="mt-10">
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            This is exactly what lands in your Telegram
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <SampleTelegramCard
              tier="free"
              symbol={stats.samples.free.symbol}
              direction={stats.samples.free.direction}
              entry={stats.samples.free.entry}
              tp1={stats.samples.free.tp1}
              timestampLabel={new Date(stats.samples.free.createdAt).toUTCString()}
              delayLabel="Delivered 30 minutes after Pro"
            />
            <SampleTelegramCard
              tier="pro"
              symbol={stats.samples.pro.symbol}
              direction={stats.samples.pro.direction}
              entry={stats.samples.pro.entry}
              tp1={stats.samples.pro.tp1}
              sl={stats.samples.pro.sl}
              timestampLabel={new Date(stats.samples.pro.createdAt).toUTCString()}
            />
          </div>
        </div>
      )}
    </section>
  );
}
