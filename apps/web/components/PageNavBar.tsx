'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  BarChart2,
  Megaphone,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { TradeClawLogo } from './tradeclaw-logo';
import { UserMenu } from './UserMenu';
import { ProductLocaleSwitcher } from '../app/components/product-locale-switcher';
import { useLocale } from '../app/components/locale-provider';
import {
  getAppShellTranslations,
  type AppShellGroupKey,
  type AppShellLinkKey,
} from '../lib/product-i18n/app-shell';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  href: string;
  labelKey: AppShellLinkKey;
  icon: LucideIcon;
}

interface DropdownGroup {
  labelKey: AppShellGroupKey;
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

interface PrimaryLink { href: string; labelKey: AppShellLinkKey }

const MEMBER_PRIMARY: PrimaryLink[] = [
  { href: '/track-record', labelKey: 'evidence' },
  { href: '/dashboard', labelKey: 'lab' },
  { href: '/start', labelKey: 'build' },
];

const MEMBER_MORE: DropdownGroup[] = [];

const ADMIN_PRIMARY: PrimaryLink[] = [
  { href: '/admin', labelKey: 'overview' },
  { href: '/admin/social-queue', labelKey: 'socialQueue' },
  { href: '/admin/executions', labelKey: 'executions' },
  { href: '/dashboard', labelKey: 'backToApp' },
];

const ADMIN_MORE: DropdownGroup[] = [
  {
    labelKey: 'operations',
    links: [
      { href: '/admin/social-queue', labelKey: 'socialQueue', icon: Megaphone },
      { href: '/admin/executions', labelKey: 'executions', icon: Activity },
    ],
  },
  {
    labelKey: 'surfaces',
    links: [
      { href: '/track-record', labelKey: 'publicTrackRecord', icon: ShieldCheck },
      { href: '/dashboard', labelKey: 'userDashboard', icon: BarChart2 },
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
  const { locale, ready } = useLocale();
  const t = getAppShellTranslations(locale);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!moreOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        requestAnimationFrame(() => moreButtonRef.current?.focus());
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moreOpen]);

  // Close dropdown on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync dropdown state with route
    setMoreOpen(false);
  }, [pathname]);

  const linkClasses = (active: boolean) =>
    `flex h-16 items-center border-b-2 px-1.5 text-[10px] font-medium transition-colors duration-200 lg:px-2 lg:text-[11px] xl:px-2.5 xl:text-[12px] ${
      active
        ? variant === 'admin'
          ? 'border-amber-400 text-white'
          : 'border-[var(--brand)] text-white'
        : 'border-transparent text-white/[0.55] hover:border-white/[0.15] hover:text-white'
    }`;

  return (
    <nav
      className={`premium-dark-chrome sticky top-0 z-50 border-b bg-[#050608]/[0.95] text-white backdrop-blur-xl ${ready ? '' : 'invisible'} ${
        variant === 'admin'
          ? 'border-amber-500/30'
          : 'border-[var(--border-strong)]'
      }`}
      aria-hidden={!ready}
      aria-label={variant === 'admin' ? t.aria.adminNavigation : t.aria.memberNavigation}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <TradeClawLogo className="h-6 w-6 shrink-0" id="pagenav" />
          <span className="text-[15px] font-bold tracking-[-0.02em] text-white">
            Trade<span className="text-[var(--brand)]">Claw</span>
          </span>
          {variant === 'admin' && (
            <span className="ms-1 rounded-sm border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
              {t.adminBadge}
            </span>
          )}
        </Link>

        {/* Desktop: Primary links + More dropdown */}
        <div className="ms-auto me-2 hidden h-full items-center gap-0.5 md:flex">
          {PRIMARY_LINKS.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={isActive(page.href) ? 'page' : undefined}
              className={linkClasses(isActive(page.href))}
            >
              {t.links[page.labelKey]}
            </Link>
          ))}

          {/* Admin-only operational navigation. Public product navigation stays at three sections. */}
          {MORE_GROUPS.length > 0 && <div ref={moreRef} className="relative">
            <button
              ref={moreButtonRef}
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-controls="page-more-menu"
              className={`relative inline-flex h-16 items-center gap-1 border-b-2 px-1.5 text-[10px] font-medium transition-colors duration-200 lg:px-2 lg:text-[11px] xl:px-2.5 xl:text-[12px] ${
                moreHasActive
                  ? variant === 'admin'
                    ? 'border-amber-400 text-white'
                    : 'border-[var(--brand)] text-white'
                  : 'border-transparent text-white/[0.55] hover:border-white/[0.15] hover:text-white'
              }`}
            >
              {t.more}
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
              />
              {/* Active indicator dot when a "More" page is current */}
              {moreHasActive && !moreOpen && (
                <span className="absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 bg-[var(--brand)]" />
              )}
            </button>

            {/* Dropdown panel */}
            {moreOpen && (
              <div
                id="page-more-menu"
                className="fixed inset-x-4 top-16 mt-px grid max-h-[calc(100vh-5rem)] grid-cols-3 origin-top items-start gap-5 overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[#090b0e]/[0.98] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] xl:absolute xl:inset-x-auto xl:end-0 xl:top-full xl:w-[680px]"
              >
                {MORE_GROUPS.map((group) => (
                  <div key={group.labelKey}>
                    <span className="mb-2 block border-b border-white/[0.10] pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.50]">
                      {t.groups[group.labelKey]}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={isActive(link.href) ? 'page' : undefined}
                          className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors duration-150 ${
                            isActive(link.href)
                              ? variant === 'admin'
                                ? 'bg-amber-500/10 text-amber-300'
                                : 'bg-[var(--brand-soft)] text-[var(--brand)]'
                              : 'text-white/[0.60] hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <link.icon className="h-3.5 w-3.5 shrink-0" />
                          {t.links[link.labelKey]}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}
        </div>

        {/* Identity affordance — visible on all breakpoints. */}
        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <ProductLocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
