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
  BarChart3,
  Send,
  Wrench,
  Layers,
  Crosshair,
  KeyRound,
  Megaphone,
  Activity,
  ShieldCheck,
  Trophy,
  GitBranch,
} from 'lucide-react';
import { TradeClawLogo } from './tradeclaw-logo';
import { UserMenu } from './UserMenu';
import { useUserSession } from '../lib/hooks/use-user-tier';
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

// ---------------------------------------------------------------------------
// Link sets — picked at render time by `selectNav(pathname)`.
//
// MEMBER  → in-app links (default; covers /dashboard and every signed-in surface).
// ADMIN   → /admin/* operator surface. Trading links are hidden so admins
//           don't context-switch into the trader UI by accident; "Back to App"
//           takes them to /dashboard.
// ---------------------------------------------------------------------------

interface PrimaryLink { href: string; label: string }

const MEMBER_PRIMARY: PrimaryLink[] = [
  { href: '/dashboard', label: 'Signals' },
  { href: '/copilot', label: 'Copilot' },
  { href: '/screener', label: 'Screener' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/track-record', label: 'Track Record' },
];

const MEMBER_MORE: DropdownGroup[] = [
  {
    label: 'Trading Tools',
    links: [
      { href: '/strategy-builder', label: 'Strategy Builder', icon: Wrench },
      { href: '/strategy-rules', label: 'Strategy Rules', icon: GitBranch },
      { href: '/strategies/leaderboard', label: 'Strategy Leaderboard', icon: Trophy },
      { href: '/multi-timeframe', label: 'Multi-TF', icon: Layers },
      { href: '/paper-trading', label: 'Paper Trading', icon: Crosshair },
    ],
  },
  {
    label: 'Insights',
    links: [
      { href: '/commentary', label: 'Commentary', icon: BookOpen },
      { href: '/journal', label: 'Journal', icon: NotebookPen },
      { href: '/glossary', label: 'Glossary', icon: BookOpen },
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
      { href: '/tradingview-export', label: 'TradingView Export', icon: BarChart3 },
    ],
  },
];

const ADMIN_PRIMARY: PrimaryLink[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/pro-grants', label: 'Pro Grants' },
  { href: '/admin/social-queue', label: 'Social Queue' },
  { href: '/admin/executions', label: 'Executions' },
  { href: '/dashboard', label: '↩ App' },
];

const ADMIN_MORE: DropdownGroup[] = [
  {
    label: 'Operations',
    links: [
      { href: '/admin/pro-grants', label: 'Pro Grants', icon: KeyRound },
      { href: '/admin/social-queue', label: 'Social Queue', icon: Megaphone },
      { href: '/admin/executions', label: 'Executions', icon: Activity },
    ],
  },
  {
    label: 'Surfaces',
    links: [
      { href: '/track-record', label: 'Public Track Record', icon: ShieldCheck },
      { href: '/dashboard', label: 'User Dashboard', icon: BarChart2 },
    ],
  },
];

interface NavSet {
  primary: PrimaryLink[];
  more: DropdownGroup[];
  /** Discriminator used in component logic (e.g. accent colors for admin). */
  variant: 'member' | 'admin';
}

function selectNav(pathname: string): NavSet {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { primary: ADMIN_PRIMARY, more: ADMIN_MORE, variant: 'admin' };
  }
  return { primary: MEMBER_PRIMARY, more: MEMBER_MORE, variant: 'member' };
}

export function PageNavBar() {
  const pathname = usePathname();
  const { status, session } = useUserSession();
  const isFree = status === 'authenticated' && (session?.tier === 'free' || !session?.tier);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const navSet = selectNav(pathname ?? '/');
  const { primary: PRIMARY_LINKS, more: MORE_GROUPS, variant } = navSet;
  const allMoreHrefs = MORE_GROUPS.flatMap((g) => g.links.map((l) => l.href));

  // /admin/x must NOT highlight /admin overview just because pathname starts
  // with '/admin'. Use exact-match for the overview entry.
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
  const moreHasActive = allMoreHrefs.some(isActive);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync dropdown state with route
    setMoreOpen(false);
  }, [pathname]);

  const linkClasses = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
      active
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
    }`;

  return (
    <nav
      className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        variant === 'admin'
          ? 'border-amber-500/20 bg-amber-950/20'
          : 'border-[var(--border)] bg-[var(--background)]/90'
      }`}
      aria-label={variant === 'admin' ? 'Admin navigation' : 'Member navigation'}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <TradeClawLogo className="h-4 w-4 shrink-0" id="pagenav" />
          <span className="text-sm font-semibold">
            Trade<span className="text-emerald-400">Claw</span>
          </span>
          {variant === 'admin' && (
            <span className="ml-1 text-[9px] uppercase tracking-widest font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              Admin
            </span>
          )}
        </Link>

        {/* Desktop: Primary links + More dropdown */}
        <div className="hidden md:flex items-center gap-1 ml-auto mr-2">
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

        {/* Identity affordance — visible on all breakpoints. */}
        <div className="ml-auto md:ml-0 flex items-center gap-2">
          {isFree && variant === 'member' && (
            <Link
              href="/pricing?from=navbar"
              className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Upgrade
            </Link>
          )}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
