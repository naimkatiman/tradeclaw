import Link from 'next/link';

/**
 * ExploreStrip — the doorway from layer 1 to layer 2 (DESIGN.md Layering).
 * Ledger rows, not icon cards; server component, zero client JS. The homepage
 * says one thing; everything deeper is one click from here.
 */

interface Destination {
  href: string;
  title: string;
  desc: string;
}

const DESTINATIONS: Destination[] = [
  { href: '/dashboard', title: 'Live app', desc: 'Signals, screener, charts — the full product, free.' },
  { href: '/how-it-works', title: 'How it works', desc: 'The scoring algorithm, with the real code.' },
  { href: '/research', title: 'Research', desc: 'What we tested and killed, with the artifacts.' },
  { href: '/methodology', title: 'Methodology', desc: 'How every public number is made.' },
  { href: '/open-data', title: 'Open data', desc: 'Every number is an endpoint you can call.' },
];

export function ExploreStrip() {
  return (
    <section className="reveal mx-auto mb-10 mt-20 max-w-6xl px-4" aria-label="Go deeper">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        Go deeper
      </p>
      <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {DESTINATIONS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="group flex flex-col gap-1 py-4 transition-colors duration-200 hover:bg-[var(--glass-bg)] sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className="text-sm font-semibold text-[var(--foreground)]">{d.title}</span>
              <span className="flex min-w-0 items-baseline gap-3 text-sm text-[var(--text-secondary)]">
                <span className="truncate">{d.desc}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
