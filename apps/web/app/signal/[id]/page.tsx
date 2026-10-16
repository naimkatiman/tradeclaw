import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageNavBar } from '../../../components/PageNavBar';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { getRecordByIdAsync } from '../../../lib/signal-history';
import { isPendingHistoricalOutcome } from '../../../lib/signal-history-status';
import { trackEvent } from '../../../lib/analytics';

type Params = { id: string };

interface ResolvedId {
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
}

function parseIdStructure(id: string): ResolvedId | null {
  const parts = id.toUpperCase().split('-');
  if (parts.length < 3) return null;

  if (parts.length >= 5 && parts[0] === 'SIG') {
    const direction = parts[parts.length - 2];
    if (direction === 'BUY' || direction === 'SELL') {
      return {
        symbol: parts.slice(1, parts.length - 3).join('-'),
        timeframe: parts[parts.length - 3],
        direction,
      };
    }
  }

  const last = parts.at(-1);
  if (last === 'BUY' || last === 'SELL') {
    return {
      symbol: parts.slice(0, parts.length - 2).join('-'),
      timeframe: parts[parts.length - 2],
      direction: last,
    };
  }

  return null;
}

async function resolveId(id: string): Promise<ResolvedId | null> {
  const record = await getRecordByIdAsync(id);
  if (record) {
    return {
      symbol: record.pair,
      timeframe: record.timeframe,
      direction: record.direction,
    };
  }
  return parseIdStructure(id);
}

function directionCase(direction: 'BUY' | 'SELL'): string {
  return direction === 'BUY' ? 'Up case' : 'Down case';
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveId(id);
  const symbol = resolved?.symbol ?? id.toUpperCase();
  const timeframe = resolved?.timeframe ?? 'unknown window';
  const bias = resolved ? directionCase(resolved.direction) : 'Research observation';

  return {
    title: `${symbol} ${bias} — TradeClaw observation`,
    description: `${symbol} ${timeframe} rule-engine observation with provenance and provider-OHLCV outcome status. Not a trading instruction or broker fill.`,
    robots: { index: false, follow: true },
    openGraph: {
      title: `${symbol} ${bias} — TradeClaw observation`,
      description: 'A read-only research observation. Inspect the aggregate cost-adjusted record before interpreting any row.',
    },
    twitter: {
      card: 'summary',
      title: `${symbol} ${bias} — TradeClaw observation`,
      description: 'Read-only research provenance; not a trading instruction.',
    },
  };
}

function OutcomeCell({
  label,
  timestamp,
  outcome,
  now,
}: {
  label: '4h' | '24h';
  timestamp: number;
  outcome: { hit: boolean; pnlPct: number } | null | undefined;
  now: number;
}) {
  const windowMs = label === '4h' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const pending = isPendingHistoricalOutcome(outcome ?? null, timestamp, windowMs, now);
  const tone = pending
    ? 'border-[var(--border)] text-[var(--text-secondary)]'
    : outcome?.hit
      ? 'border-emerald-500/30 text-emerald-500'
      : 'border-red-500/30 text-red-500';
  const result = pending
    ? 'Awaiting resolution'
    : outcome?.hit
      ? 'Positive observation'
      : 'Negative observation';

  return (
    <div className={`rounded-sm border p-4 ${tone}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">{label} provider-OHLCV window</p>
      <p className="mt-2 text-sm font-semibold">{result}</p>
      {!pending && outcome?.pnlPct != null ? (
        <p className="mt-1 font-mono text-xs tabular-nums">
          {outcome.pnlPct > 0 ? '+' : ''}{outcome.pnlPct.toFixed(2)}% modeled row result
        </p>
      ) : null}
    </div>
  );
}

export default async function ObservationPage(
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  const record = await getRecordByIdAsync(id);
  const resolved = record
    ? { symbol: record.pair, timeframe: record.timeframe, direction: record.direction }
    : parseIdStructure(id);
  if (!resolved) notFound();

  const liveResult = record
    ? null
    : await getTrackedSignals({
        symbol: resolved.symbol,
        timeframe: resolved.timeframe,
        direction: resolved.direction,
      });
  const currentCandidate = liveResult?.signals[0] ?? null;
  if (!record && !currentCandidate) notFound();

  const observation = record
    ? {
        id: record.id,
        symbol: record.pair,
        timeframe: record.timeframe,
        direction: record.direction,
        confidence: record.confidence,
        timestamp: record.timestamp,
        outcome4h: record.outcomes['4h'],
        outcome24h: record.outcomes['24h'],
        stored: true,
      }
    : {
        id: currentCandidate!.id,
        symbol: currentCandidate!.symbol,
        timeframe: currentCandidate!.timeframe,
        direction: currentCandidate!.direction,
        confidence: currentCandidate!.confidence,
        timestamp: new Date(currentCandidate!.timestamp).getTime(),
        outcome4h: null,
        outcome24h: null,
        stored: false,
      };

  // One server-render timestamp keeps both horizon labels internally consistent.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();

  trackEvent('record_inspected', { recordId: observation.id, source: 'observation_page' });

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
        <div className="border-l-2 border-[var(--color-down)] pl-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-down)]">
            Evidence gate failed · read-only observation
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            TradeClaw has not demonstrated a deployable edge after modeled costs. This page preserves what
            the rule engine observed; it does not recommend a trade, provide an entry, or authorize execution.
          </p>
        </div>

        <header className="mt-12 border-y border-[var(--border)] py-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                {observation.stored ? 'Prospectively stored row' : 'Current candidate · not yet stored'}
              </p>
              <h1 className="font-display mt-3 text-5xl font-bold uppercase leading-none tracking-tight sm:text-7xl">
                {observation.symbol}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-sm border px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider ${observation.direction === 'BUY' ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500'}`}>
                  {directionCase(observation.direction)}
                </span>
                <span className="font-mono text-xs text-[var(--text-secondary)]">{observation.timeframe}</span>
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  {new Date(observation.timestamp).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="font-mono text-4xl font-bold tabular-nums">{observation.confidence}/100</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">Rule agreement score</p>
            </div>
          </div>
        </header>

        <section className="mt-10" aria-labelledby="outcome-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Observed later</p>
              <h2 id="outcome-heading" className="font-display mt-2 text-2xl font-bold uppercase tracking-tight">Outcome windows</h2>
            </div>
            <Link href="/methodology" data-evidence-event="methodology_viewed" className="text-xs font-semibold underline underline-offset-4">
              How resolution works
            </Link>
          </div>
          {observation.stored ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <OutcomeCell label="4h" timestamp={observation.timestamp} outcome={observation.outcome4h} now={renderedAt} />
              <OutcomeCell label="24h" timestamp={observation.timestamp} outcome={observation.outcome24h} now={renderedAt} />
            </div>
          ) : (
            <div className="mt-5 rounded-sm border border-[var(--border)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              This URL resolves to a current engine candidate, not a prospectively stored row. No outcome is
              shown. Use the prospective ledger for observations that were written before resolution.
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-3" aria-label="Interpretation">
          {[
            ['Directional case', 'An engine classification derived from indicator rules—not an instruction to buy or sell.'],
            ['Rule score', 'Weighted indicator agreement on a 0–100 scale—not a calibrated probability of profit.'],
            ['Outcome', 'Resolved from provider candles. It is not a broker fill, account return, or deployability decision.'],
          ].map(([title, description]) => (
            <div key={title}>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
            </div>
          ))}
        </section>

        <dl className="mt-10 grid gap-2 border-y border-[var(--border)] py-5 font-mono text-[11px] text-[var(--text-secondary)] sm:grid-cols-[8rem_1fr]">
          <dt>Record ID</dt>
          <dd className="break-all text-[var(--foreground)]">{observation.id}</dd>
          <dt>Resolution source</dt>
          <dd className="text-[var(--foreground)]">Provider OHLCV</dd>
          <dt>Execution status</dt>
          <dd className="text-[var(--color-down)]">Blocked by failed evidence gate</dd>
        </dl>

        <nav className="mt-8 flex flex-wrap gap-3" aria-label="Evidence links">
          <Link href="/track-record" className="rounded-sm bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--background)]">
            Inspect aggregate record
          </Link>
          <Link href="/track-record/alpha" className="rounded-sm border border-[var(--border-strong)] px-4 py-3 text-sm font-semibold">
            Prospective ledger
          </Link>
          <Link href="/open-data" className="rounded-sm border border-[var(--border-strong)] px-4 py-3 text-sm font-semibold">
            Open data
          </Link>
        </nav>
      </main>
    </div>
  );
}
