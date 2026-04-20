interface SampleTelegramCardProps {
  tier: 'free' | 'pro';
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp1: number | null;
  tp2?: number | null;
  tp3?: number | null;
  sl?: number | null;
  timestampLabel: string;
  delayLabel?: string;
}

export function SampleTelegramCard(props: SampleTelegramCardProps) {
  const { tier, symbol, direction, entry, tp1, tp2, tp3, sl, timestampLabel, delayLabel } = props;
  const isPro = tier === 'pro';

  return (
    <div
      className={`rounded-2xl border p-4 font-mono text-sm ${
        isPro
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-[var(--border)] bg-[var(--glass-bg)]'
      }`}
    >
      <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest">
        <span className={isPro ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
          {isPro ? 'Pro · Real-time' : 'Free · 15-min delay'}
        </span>
        <span className="text-[var(--text-secondary)]">{timestampLabel}</span>
      </header>

      {delayLabel && !isPro && (
        <p className="mb-2 rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
          {delayLabel}
        </p>
      )}

      <p className="text-base font-semibold text-[var(--foreground)]">
        {symbol} —{' '}
        <span className={direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>
          {direction}
        </span>
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-[var(--text-secondary)]">Entry</dt>
        <dd className="text-right text-[var(--foreground)]">{entry}</dd>
        {tp1 != null && (
          <>
            <dt className="text-[var(--text-secondary)]">TP1</dt>
            <dd className="text-right text-[var(--foreground)]">{tp1}</dd>
          </>
        )}
        {isPro && tp2 != null && (
          <>
            <dt className="text-[var(--text-secondary)]">TP2</dt>
            <dd className="text-right text-[var(--foreground)]">{tp2}</dd>
          </>
        )}
        {isPro && tp3 != null && (
          <>
            <dt className="text-[var(--text-secondary)]">TP3</dt>
            <dd className="text-right text-[var(--foreground)]">{tp3}</dd>
          </>
        )}
        {isPro && sl != null && (
          <>
            <dt className="text-red-400">SL</dt>
            <dd className="text-right text-red-400">{sl}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
