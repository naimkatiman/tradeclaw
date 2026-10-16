import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/navbar';
import { SignalLedger } from '../../components/signal-ledger';

export const metadata: Metadata = {
  title: 'Prospective Observation Ledger — TradeClaw',
  description:
    'Candidate observations recorded before their outcomes are known, with provider-OHLCV resolution and no execution claims.',
  alternates: { canonical: 'https://tradeclaw.win/track-record/alpha' },
  openGraph: {
    title: 'Prospective Observation Ledger — TradeClaw',
    description: 'Research observations written before their outcomes are known and resolved later from provider OHLCV.',
    url: 'https://tradeclaw.win/track-record/alpha',
    images: ['/api/og'],
  },
};

export default function ProspectiveLedgerPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[100dvh] bg-[var(--background)] pt-28 text-[var(--foreground)]">
        <div className="mx-auto max-w-5xl px-4 pb-20">
          <header className="grid gap-8 border-b border-[var(--border)] pb-12 lg:grid-cols-[1fr_19rem]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Evidence / Prospective ledger
              </p>
              <h1 className="font-display mt-4 text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.9] tracking-tight">
                Written first.
                <br />
                Resolved later.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Each row is stored when the rule engine emits a candidate, before its 24-hour outcome is
                known. Resolution uses provider OHLCV. This is an observation ledger—not broker fills,
                customer returns, or proof of a deployable strategy.
              </p>
            </div>
            <aside className="border-l-2 border-[var(--color-down)] pl-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-down)]">
                Evidence gate: failed
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                The published cost-adjusted record remains negative. Broadcast and broker execution stay
                blocked by default.
              </p>
              <Link className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4" href="/track-record">
                See the aggregate record →
              </Link>
            </aside>
          </header>

          <div className="mt-10">
            <SignalLedger />
          </div>

          <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Ledger resources">
            <Link href="/methodology" data-evidence-event="methodology_viewed" className="underline underline-offset-4">
              Resolution methodology
            </Link>
            <Link href="/open-data" className="underline underline-offset-4">
              Raw data and schemas
            </Link>
            <Link href="/track-record/study" className="underline underline-offset-4">
              All studies
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}
