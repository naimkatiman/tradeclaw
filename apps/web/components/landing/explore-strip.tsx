import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface Destination {
  href: string;
  eyebrow: string;
  title: string;
  desc: string;
}

const DESTINATIONS: Destination[] = [
  {
    href: '/track-record',
    eyebrow: '01 · Finding',
    title: 'See the record',
    desc: 'Start with the cost-adjusted result, including the result that failed.',
  },
  {
    href: '/why-long-term',
    eyebrow: '02 · Costs',
    title: 'Understand the drag',
    desc: 'See how fees, slippage, and turnover change the apparent edge.',
  },
  {
    href: '/track-record/study',
    eyebrow: '03 · Evidence',
    title: 'Inspect the studies',
    desc: 'Compare observed records with separately labeled modeled research.',
  },
  {
    href: '/backtest',
    eyebrow: '04 · Test',
    title: 'Test an idea',
    desc: 'Change the market, range, and method before reading the metrics.',
  },
  {
    href: '/start',
    eyebrow: '05 · Reproduce',
    title: 'Self-host the lab',
    desc: 'Run the same code, database, and evidence trail on your own machine.',
  },
];

export function ExploreStrip() {
  return (
    <section
      className="reveal mx-auto mb-12 mt-12 max-w-[1280px] px-4 sm:mt-20 sm:px-6 lg:px-10"
      aria-label="Go deeper"
    >
      <div className="mb-6 flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
            Follow the evidence
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            From finding to reproduction.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Start with what happened, understand the cost assumptions, test a variation,
          then reproduce the work yourself.
        </p>
      </div>

      <ul className="grid overflow-hidden rounded-[1.125rem] border border-[var(--border-strong)] bg-[var(--bg-card)] md:grid-cols-2 xl:grid-cols-5">
        {DESTINATIONS.map((destination) => (
          <li
            key={destination.href}
            className="border-b border-[var(--border)] last:border-b-0 md:border-r md:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0"
          >
            <Link
              href={destination.href}
              prefetch={false}
              className="group flex h-full min-h-44 flex-col p-5 transition-colors duration-200 hover:bg-[var(--brand-soft)] sm:p-6"
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {destination.eyebrow}
              </span>
              <span className="mt-8 flex items-center justify-between gap-3 text-base font-semibold">
                {destination.title}
                <ArrowUpRight
                  className="h-4 w-4 text-[var(--text-secondary)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--brand)]"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                {destination.desc}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
