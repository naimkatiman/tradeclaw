import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/navbar';

export const metadata: Metadata = {
  title: 'Evidence Studies — TradeClaw',
  description:
    'A focused index of TradeClaw studies, registered experiments, methodology, and downloadable research artifacts.',
  alternates: { canonical: 'https://tradeclaw.win/track-record/study' },
  openGraph: {
    title: 'Evidence Studies — TradeClaw',
    description: 'Registered tests, failed gates, and machine-readable artifacts before any trading claim.',
    url: 'https://tradeclaw.win/track-record/study',
    images: ['/api/og'],
  },
};

const studies = [
  {
    status: 'FAILED GATE',
    title: 'Cost-adjusted signal record',
    description:
      'Recorded engine observations resolved against provider OHLCV, then recalculated under published fee and slippage assumptions.',
    href: '/track-record',
    action: 'Inspect the record',
  },
  {
    status: '5 FAMILIES REJECTED',
    title: 'Registered strategy experiments',
    description:
      'Pre-specified trend, mean-reversion, carry, regime, and cross-sectional tests with linked machine-readable artifacts.',
    href: '/research',
    action: 'Review the studies',
  },
  {
    status: 'REFERENCE BASELINE',
    title: 'Why the comparison is long-term',
    description:
      'The external evidence behind the project baseline and the conditions under which short-term timing must prove its value.',
    href: '/why-long-term',
    action: 'Read the baseline',
  },
] as const;

export default function StudiesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[100dvh] bg-[var(--background)] pt-28 text-[var(--foreground)]">
        <div className="mx-auto max-w-5xl px-4 pb-20">
          <header className="max-w-3xl border-b border-[var(--border)] pb-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Evidence / Studies
            </p>
            <h1 className="font-display mt-4 text-[clamp(2.5rem,7vw,5.5rem)] font-bold uppercase leading-[0.9] tracking-tight">
              Results before{' '}
              <br />
              recommendations.
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
              TradeClaw has not demonstrated a deployable short-term edge after modeled costs. These
              studies show the result, the assumptions, the excluded rows, and the artifacts needed to
              challenge it. A failed test remains useful when it prevents an unjustified trade.
            </p>
          </header>

          <div className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
            {studies.map((study, index) => (
              <article key={study.href} className="grid gap-5 py-9 md:grid-cols-[7rem_1fr_auto] md:items-start">
                <p className="font-mono text-[11px] text-[var(--text-secondary)]">0{index + 1}</p>
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-down)]">
                    {study.status}
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-bold uppercase tracking-tight">
                    {study.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    {study.description}
                  </p>
                </div>
                <Link
                  href={study.href}
                  data-evidence-event="methodology_viewed"
                  data-evidence-target={study.title}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm border border-[var(--border-strong)] px-4 text-sm font-semibold transition-colors hover:border-[var(--foreground)]"
                >
                  {study.action} →
                </Link>
              </article>
            ))}
          </div>

          <nav className="mt-10 flex flex-wrap gap-3" aria-label="Study resources">
            <Link className="rounded-sm bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--background)]" href="/methodology" data-evidence-event="methodology_viewed">
              Read methodology
            </Link>
            <Link className="rounded-sm border border-[var(--border-strong)] px-4 py-3 text-sm font-semibold" href="/open-data">
              Download open data
            </Link>
            <Link className="rounded-sm border border-[var(--border-strong)] px-4 py-3 text-sm font-semibold" href="/track-record/alpha">
              Open prospective ledger
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}
