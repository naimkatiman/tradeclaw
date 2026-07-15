'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Thermometer, ChevronDown, Activity, ShoppingBag, Briefcase, FlaskConical, BarChart2, BarChart3, Server, Star, Rocket, Mail, Heart, HandHeart, Cloud, MessageSquare, User, Database, BookOpen, Trophy } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { TradeClawLogo } from '../../components/tradeclaw-logo';
import { UserMenu } from '../../components/UserMenu';
import { useLocale } from './locale-provider';
import { SUPPORTED_LOCALES, type Locale } from '../../lib/translations';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

const PRIMARY_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/screener', label: 'Screener' },
  { href: '/track-record', label: 'Track Record' },
  { href: '/research', label: 'Research' },
];

interface DropdownGroup {
  label: string;
  links: NavLink[];
}

const MORE_GROUPS: DropdownGroup[] = [
  {
    label: 'Trading',
    links: [
      { href: '/heatmap', label: 'Heatmap', icon: Thermometer },
      { href: '/paper-trading', label: 'Paper Trading' },
      { href: '/alerts', label: 'Alerts' },
      { href: '/multi-timeframe', label: 'Multi-TF' },
      { href: '/replay', label: 'Replay', icon: Play },
      { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
    ],
  },
  {
    label: 'Tools',
    links: [
      { href: '/strategy-builder', label: 'Strategy Builder' },
      { href: '/indicators/builder', label: 'Indicators', icon: FlaskConical },
      { href: '/api-keys', label: 'API Keys' },
      { href: '/api-usage', label: 'API Usage', icon: BarChart2 },
      { href: '/strategies/comparison', label: 'Strategy Comparison', icon: BarChart3 },
      { href: '/strategies/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { href: '/strategies/leaderboard', label: 'Strategy Leaderboard', icon: Trophy },
      { href: '/plugins', label: 'Plugins' },
      { href: '/chrome-extension', label: 'Chrome Extension', icon: Rocket },
      { href: '/status', label: 'Status', icon: Activity },
      { href: '/benchmark', label: 'Cost Benchmark', icon: Server },
      { href: '/live', label: 'Live Feed', icon: Activity },
      { href: '/profile-widget', label: 'Profile Widget', icon: User },
      { href: '/replit', label: 'Run on Replit' },
      { href: '/fly', label: 'Fly.io Deploy', icon: Cloud },
      { href: '/supabase', label: 'Supabase Setup', icon: Database },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/blog', label: 'Blog', icon: BookOpen },
      { href: '/report', label: 'Weekly Report', icon: BarChart2 },
      { href: '/star-history', label: 'Star History', icon: Star },
      { href: '/share', label: 'Share' },
      { href: '/contribute', label: 'Contribute' },
      { href: '/contributors', label: 'Contributors' },
      { href: '/discord/server', label: 'Discord' },
      { href: '/producthunt', label: 'Product Hunt', icon: Rocket },
      { href: '/subscribe', label: 'Weekly Digest', icon: Mail },
      { href: '/start', label: 'Setup Guide', icon: Rocket },
      { href: '/sponsors', label: 'Sponsors', icon: Heart },
      { href: '/pledge', label: 'Pledge Wall', icon: HandHeart },
      { href: '/sms', label: 'SMS Alerts', icon: MessageSquare },
    ],
  },
];

// Flat list of all links for the mobile hamburger overlay
const ALL_NAV_LINKS: NavLink[] = [
  ...PRIMARY_LINKS,
  ...MORE_GROUPS.flatMap((g) => g.links),
  { href: '/how-it-works', label: 'How it works' },
];

interface NavbarProps {
  /**
   * 'full' (default) — product navbar: primary links, More dropdown, hamburger.
   * 'minimal' — layer-1 marketing surface (DESIGN.md Layering): logo, locale,
   * theme, and a single "Open the app" action. No link rows or account/social
   * controls competing with the hero action.
   */
  variant?: 'full' | 'minimal';
}

export function Navbar({ variant = 'full' }: NavbarProps = {}) {
  const minimal = variant === 'minimal';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useLocale();

  // Primary-nav labels resolved from the active locale (issue #16, Phase 1).
  const navLabel: Record<string, string> = {
    '/dashboard': t.nav.dashboard,
    '/screener': t.nav.signals,
    '/track-record': t.nav.trackRecord,
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [moreOpen]);

  useEffect(() => {
    if (!menuOpen && !moreOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab' && menuOpen) {
        const focusable = Array.from(
          mobileMenuRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        const first = focusable[0];
        const last = focusable.at(-1);

        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || !mobileMenuRef.current?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !mobileMenuRef.current?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }

      if (event.key === 'Escape') {
        setMenuOpen(false);
        setMoreOpen(false);
        requestAnimationFrame(() => {
          if (menuOpen) menuButtonRef.current?.focus();
          else moreRef.current?.querySelector('button')?.focus();
        });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="premium-dark-chrome fixed inset-x-0 top-0 z-50 border-b border-[var(--border-strong)] bg-[#050608]/[0.95] text-white backdrop-blur-xl"
        aria-label="Main navigation"
      >
        <div
          className={`mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 transition-shadow duration-300 sm:px-6 lg:px-8 ${
            scrolled ? 'shadow-[0_12px_32px_rgba(0,0,0,0.28)]' : ''
          }`}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
          >
            <TradeClawLogo className="h-7 w-7 shrink-0" id="nav" />
            <span className="text-[15px] font-bold tracking-[-0.02em] text-white">
              Trade<span className="text-[var(--brand)]">Claw</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {!minimal && (
          <div className="hidden h-full items-center gap-0.5 text-[13px] font-medium text-white/[0.65] lg:flex">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex h-full items-center border-b-2 border-transparent px-3 transition-colors duration-200 hover:border-white/[0.20] hover:text-white"
              >
                {navLabel[link.href] ?? link.label}
              </Link>
            ))}

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                aria-controls="main-more-menu"
                className="flex h-16 items-center gap-1 border-b-2 border-transparent px-3 transition-colors duration-200 hover:border-white/[0.20] hover:text-white"
              >
                More
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div
                  id="main-more-menu"
                  className="absolute left-1/2 top-full mt-px grid max-h-[calc(100vh-5rem)] w-[640px] max-w-[calc(100vw-2rem)] -translate-x-1/2 grid-cols-3 items-start gap-5 overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[#090b0e]/[0.98] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
                >
                  {MORE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <span className="mb-2 block border-b border-white/[0.10] pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.50]">
                        {group.label}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {group.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMoreOpen(false)}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-white/[0.60] transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
                          >
                            {link.icon && <link.icon className="h-3.5 w-3.5 text-[var(--brand)] opacity-80" />}
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* CTA */}
          <div className="flex shrink-0 items-center gap-2">
            <select
              aria-label={t.nav.language}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="hidden cursor-pointer rounded-sm border border-white/[0.10] bg-transparent px-2 py-1.5 text-[11px] text-white/[0.55] outline-none transition-colors hover:border-white/[0.20] hover:text-white focus:ring-1 focus:ring-[var(--brand)] sm:block"
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#090b0e] text-white">
                  {l.label}
                </option>
              ))}
            </select>
            {!minimal && <UserMenu size="compact" />}
            {minimal ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-sm bg-white px-4 py-2 text-xs font-semibold text-black transition-colors duration-200 hover:bg-[#dffbff]"
              >
                Open the app
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 px-2 py-2 text-xs font-semibold text-[var(--brand)] transition-colors duration-200 hover:text-white sm:flex"
              >
                <span className="h-1.5 w-1.5 bg-[var(--brand)] shadow-[0_0_10px_var(--brand)]" aria-hidden="true" />
                Live signals
              </Link>
            )}
            {!minimal && <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-sm bg-white px-4 py-2 text-xs font-semibold text-black transition-colors duration-200 hover:bg-[#dffbff] active:bg-white sm:flex"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star
            </a>}

            <ThemeToggle className="text-white/[0.55] hover:bg-white/[0.06] hover:text-white" />

            {/* Mobile hamburger */}
            {!minimal && (
            <button
              ref={menuButtonRef}
              className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-sm border border-white/[0.10] text-white lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <span
                className={`block h-px w-4 bg-white transition-all duration-300 origin-center ${
                  menuOpen ? 'rotate-45 translate-y-[5px]' : ''
                }`}
              />
              <span
                className={`block h-px w-4 bg-white transition-all duration-300 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-px w-4 bg-white transition-all duration-300 origin-center ${
                  menuOpen ? '-rotate-45 -translate-y-[5px]' : ''
                }`}
              />
            </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {!minimal && menuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="premium-dark-chrome fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#050608] text-white"
        >
          <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border-strong)] bg-[#050608]/[0.95] px-5 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <TradeClawLogo className="h-7 w-7 shrink-0" id="mobile-nav" />
              <span className="text-[15px] font-bold tracking-[-0.02em]">
                Trade<span className="text-[var(--brand)]">Claw</span>
              </span>
            </Link>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setMenuOpen(false);
                requestAnimationFrame(() => menuButtonRef.current?.focus());
              }}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/[0.10] text-white/[0.70] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-2 px-5 py-6 sm:grid-cols-2">
            {ALL_NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 shrink-0 items-center gap-3 rounded-sm border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm font-medium text-white/[0.70] opacity-0 transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white animate-fade-up"
                style={{ animationDelay: `${i * 24}ms`, animationFillMode: 'forwards' }}
                onClick={() => setMenuOpen(false)}
              >
                {link.icon && <link.icon className="h-4 w-4 text-[var(--brand)]" />}
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
