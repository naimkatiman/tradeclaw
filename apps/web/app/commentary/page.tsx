import type { Metadata } from 'next';
import Link from 'next/link';
import { PageNavBar } from '../../components/PageNavBar';

export const metadata: Metadata = {
  title: 'Market Commentary Unavailable | TradeClaw',
  description:
    'TradeClaw does not publish market commentary until it can be derived from traceable market and signal evidence.',
  robots: { index: false, follow: false },
};

export default function CommentaryPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <section className="mx-auto max-w-2xl px-6 py-24">
        <p className="text-xs font-semibold uppercase text-amber-400">Unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold">Market commentary is not published.</h1>
        <p className="mt-4 leading-7 text-[var(--text-secondary)]">
          The previous daily commentary was a deterministic template, not measured market
          analysis. This surface now stays unavailable until every statement can cite traceable
          market data and recorded signal evidence.
        </p>
        <Link className="mt-7 inline-block text-emerald-400 hover:underline" href="/methodology">
          Review the measured methodology
        </Link>
      </section>
    </main>
  );
}
