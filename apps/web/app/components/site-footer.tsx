'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TradeClawLogo } from '../../components/tradeclaw-logo';

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
      { href: '/screener', label: 'Screener' },
      { href: '/backtest', label: 'Backtest' },
      { href: '/track-record', label: 'Track record' },
      { href: '/demo', label: 'Live demo' },
    ],
  },
  {
    heading: 'Transparency',
    links: [
      { href: '/research', label: 'What we tested and killed' },
      { href: '/methodology', label: 'Methodology' },
      { href: '/why-long-term', label: 'Why long-term' },
      { href: '/open-data', label: 'Open data' },
      { href: '/calibration', label: 'Calibration' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/docs', label: 'Docs' },
      { href: '/api-docs', label: 'API reference' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/faq', label: 'FAQ' },
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
      { href: '/data-freshness', label: 'Data freshness' },
      { href: '/roadmap', label: 'Roadmap' },
    ],
  },
];

const APP_SURFACE_PREFIXES = [
  '/dashboard',
  '/screener',
  '/track-record',
  '/leaderboard',
  '/chart',
  '/signal',
  '/alerts',
  '/notifications',
  '/multi-timeframe',
  '/today',
  '/copilot',
  '/backtest',
  '/paper-trading',
  '/strategy-builder',
  '/admin',
] as const;

export function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  const isAppSurface = APP_SURFACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isAppSurface) return null;

  return (
    <footer className="premium-dark-chrome mt-24 border-t border-[var(--border-strong)] bg-[#050608] py-12 text-sm text-white">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-white/[0.10] pb-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_repeat(5,minmax(0,1fr))] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1 lg:pr-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <TradeClawLogo className="h-8 w-8 shrink-0" id="footer" />
              <span className="text-lg font-bold tracking-[-0.025em]">
                Trade<span className="text-[var(--brand)]">Claw</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[260px] text-xs leading-5 text-white/[0.48]">
              Open-source AI market intelligence for traders who prefer evidence over noise.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-white/[0.10] bg-white/[0.035] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.60]">
              <span className="h-1.5 w-1.5 bg-[var(--brand)] shadow-[0_0_10px_var(--brand)]" aria-hidden="true" />
              Self-hosted by default
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.50]">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/[0.58] transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs text-white/[0.58] transition-colors hover:text-white"
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

        <div className="flex flex-col items-start justify-between gap-5 pt-6 text-[11px] text-white/[0.50] lg:flex-row lg:items-center">
          <p className="shrink-0">&copy; {year} TradeClaw. MIT licensed.</p>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end lg:text-right">
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <span className="text-white/[0.15]">|</span>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <span className="text-white/[0.15]">|</span>
            <span className="max-w-xl leading-5">
              Trading involves risk. Signals are informational only and are not financial advice.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
