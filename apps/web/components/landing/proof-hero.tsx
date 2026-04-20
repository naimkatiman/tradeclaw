import { DelayDemo } from './delay-demo';
import { SampleTelegramCard } from './sample-telegram-card';
import { getLandingStats } from '../../lib/landing-stats';

const MIN_CLOSED_SIGNALS_FOR_PF = 10;

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
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

  const hasEnoughClosed =
    stats != null && stats.closedSignals30d >= MIN_CLOSED_SIGNALS_FOR_PF;

  return (
    <section data-testid="proof-hero" className="mx-auto mt-10 max-w-5xl px-4">
      <div className="mb-6 text-center">
        <p className="text-lg text-[var(--text-secondary)]">
          Real-time signals, backed by the last 30 days of live performance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {hasEnoughClosed && stats && (
          <StatTile
            label="Cumulative P&L (30d)"
            value={formatPct(stats.cumulativePnlPct)}
            tone={stats.cumulativePnlPct >= 0 ? 'positive' : 'negative'}
          />
        )}
        {hasEnoughClosed && stats && stats.profitFactor !== null && (
          <StatTile
            label="Profit factor"
            value={stats.profitFactor.toFixed(2)}
            tone={stats.profitFactor >= 1.3 ? 'positive' : 'neutral'}
          />
        )}
        <StatTile
          label="Signals today"
          value={String(stats?.signalsToday ?? 0)}
          tone="neutral"
        />
        <StatTile
          label="Delivery lag"
          value="Pro: <1s · Free: 15min"
          tone="neutral"
          small
        />
      </div>

      {stats?.samples && (
        <div className="mt-10">
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Real-time vs 15-min delay
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
              delayLabel="Delivered 15 minutes after Pro"
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
