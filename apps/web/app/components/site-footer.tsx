import Link from 'next/link';

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/screener', label: 'Signals' },
      { href: '/backtest', label: 'Backtest' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/demo', label: 'Live demo' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/docs', label: 'Docs' },
      { href: '/api-docs', label: 'API reference' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/glossary', label: 'Glossary' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { href: '/discord/server', label: 'Discord' },
      { href: '/subscribe', label: 'Weekly digest' },
      { href: '/contribute', label: 'Contribute' },
      { href: '/contributors', label: 'Contributors' },
      { href: '/sponsors', label: 'Sponsors' },
    ],
  },
  {
    heading: 'Open source',
    links: [
      { href: 'https://github.com/naimkatiman/tradeclaw', label: 'GitHub repo', external: true },
      { href: '/star', label: 'Star history' },
      { href: '/start', label: 'Self-host guide' },
      { href: '/security', label: 'Security' },
      { href: '/roadmap', label: 'Roadmap' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--bg-card)]/40 py-10 text-sm">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-3">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-[11px] text-[var(--text-secondary)] sm:flex-row sm:items-center">
          <p>&copy; {year} TradeClaw. MIT licensed.</p>
          <p className="max-w-md sm:text-right">
            Trading involves risk. Signals are informational only and are not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
