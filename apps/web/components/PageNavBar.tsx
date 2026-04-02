'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Bell, BookOpen, BadgeCheck, NotebookPen, BarChart2 } from 'lucide-react';
import { TradeClawLogo } from './tradeclaw-logo';

const NAV_PAGES = [
  { href: '/dashboard', label: 'Signals', tourId: undefined },
  { href: '/screener', label: 'Screener', tourId: undefined },
  { href: '/leaderboard', label: 'Leaderboard', tourId: 'nav-leaderboard' as const },
  { href: '/backtest', label: 'Backtest', tourId: undefined },
  { href: '/strategy-builder', label: 'Strategy', tourId: 'nav-strategy-builder' as const },
  { href: '/multi-timeframe', label: 'Multi-TF', tourId: 'nav-multi-timeframe' as const },
  { href: '/paper-trading', label: 'Paper Trade', tourId: 'nav-paper-trading' as const },
];

export function PageNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <TradeClawLogo className="h-4 w-4 shrink-0" id="pagenav" />
          <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
        </Link>

        {/* Page nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_PAGES.map(page => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={isActive(page.href) ? 'page' : undefined}
              {...(page.tourId ? { 'data-tour-id': page.tourId } : {})}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive(page.href)
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
              }`}
            >
              {page.label}
            </Link>
          ))}
        </div>

        {/* Community */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          <Link
            href="/vote"
            aria-current={isActive('/vote') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/vote')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            Vote
          </Link>
          <Link
            href="/subscribe"
            aria-current={isActive('/subscribe') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/subscribe')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <Mail className="w-3 h-3" />
            Digest
          </Link>
          <Link
            href="/commentary"
            aria-current={isActive('/commentary') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/commentary')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Commentary
          </Link>
          <Link
            href="/badges/readme"
            aria-current={isActive('/badges/readme') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/badges/readme')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <BadgeCheck className="w-3 h-3" />
            Badges
          </Link>
          <Link
            href="/notifications"
            aria-current={isActive('/notifications') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/notifications')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <Bell className="w-3 h-3" />
            Alerts
          </Link>
          <Link
            href="/journal"
            aria-current={isActive('/journal') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/journal')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <NotebookPen className="w-3 h-3" />
            Journal
          </Link>
          <Link
            href="/glossary"
            aria-current={isActive('/glossary') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive('/glossary')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Glossary
          </Link>
        </div>
      </div>
    </nav>
  );
}
