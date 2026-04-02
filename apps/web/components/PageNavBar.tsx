'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Mail,
  Bell,
  BookOpen,
  BadgeCheck,
  NotebookPen,
  BarChart2,
  Send,
  Wrench,
  Lightbulb,
  BellRing,
  Users,
  Layers,
  FileText,
  Crosshair,
} from 'lucide-react';
import { TradeClawLogo } from './tradeclaw-logo';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DropdownGroup {
  label: string;
  links: NavLink[];
}

const PRIMARY_LINKS: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Signals' },
  { href: '/screener', label: 'Screener' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

const MORE_GROUPS: DropdownGroup[] = [
  {
    label: 'Trading Tools',
    links: [
      { href: '/strategy-builder', label: 'Strategy Builder', icon: Wrench },
      { href: '/multi-timeframe', label: 'Multi-TF', icon: Layers },
      { href: '/paper-trading', label: 'Paper Trading', icon: Crosshair },
    ],
  },
  {
    label: 'Insights',
    links: [
      { href: '/commentary', label: 'Commentary', icon: BookOpen },
      { href: '/journal', label: 'Journal', icon: NotebookPen },
      { href: '/glossary', label: 'Glossary', icon: FileText },
    ],
  },
  {
    label: 'Notifications',
    links: [
      { href: '/notifications', label: 'Alerts', icon: Bell },
      { href: '/subscribe', label: 'Digest', icon: Mail },
      { href: '/digest/preview', label: 'Daily TG', icon: Send },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/vote', label: 'Vote', icon: BarChart2 },
      { href: '/badges/readme', label: 'Badges', icon: BadgeCheck },
    ],
  },
];

const ALL_MORE_HREFS = MORE_GROUPS.flatMap((g) => g.links.map((l) => l.href));

export function PageNavBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const moreHasActive = ALL_MORE_HREFS.some(isActive);

  // Close dropdown on click outside
  useEffect(() => {
    if (!moreOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const linkClasses = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
      active
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <TradeClawLogo className="h-4 w-4 shrink-0" id="pagenav" />
          <span className="text-sm font-semibold">
            Trade<span className="text-emerald-400">Claw</span>
          </span>
        </Link>

        {/* Desktop: Primary links + More dropdown */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          {PRIMARY_LINKS.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={isActive(page.href) ? 'page' : undefined}
              className={linkClasses(isActive(page.href))}
            >
              {page.label}
            </Link>
          ))}

          {/* More dropdown */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1 ${
                moreHasActive
                  ? 'text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
              }`}
            >
              More
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
              />
              {/* Active indicator dot when a "More" page is current */}
              {moreHasActive && !moreOpen && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* Dropdown panel */}
            <div
              className={`absolute top-full right-0 mt-2 w-[320px] rounded-xl border border-[var(--border)] backdrop-blur-2xl bg-[var(--bg-card)]/95 shadow-2xl shadow-black/40 p-4 grid grid-cols-2 gap-4 transition-all duration-200 origin-top-right ${
                moreOpen
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              {MORE_GROUPS.map((group) => (
                <div key={group.label}>
                  <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-1.5 block">
                    {group.label}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={isActive(link.href) ? 'page' : undefined}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors duration-200 ${
                          isActive(link.href)
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
                        }`}
                      >
                        <link.icon className="w-3 h-3 shrink-0" />
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: just the logo is shown — mobile-nav.tsx handles bottom navigation */}
      </div>
    </nav>
  );
}
