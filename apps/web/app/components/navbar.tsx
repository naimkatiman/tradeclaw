'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { TradeClawLogo } from '../../components/tradeclaw-logo';
import { UserMenu } from '../../components/UserMenu';
import { useLocale } from './locale-provider';
import { SUPPORTED_LOCALES, type Locale } from '../../lib/translations';
import {
  getMarketingNavTranslations,
  type MarketingNavLinkKey,
} from '../../lib/product-i18n/marketing-nav';

interface NavLink {
  href: string;
  labelKey: MarketingNavLinkKey;
}

const PRIMARY_LINKS: NavLink[] = [
  { href: '/track-record', labelKey: 'evidence' },
  { href: '/dashboard', labelKey: 'lab' },
  { href: '/start', labelKey: 'build' },
];

const ALL_NAV_LINKS: NavLink[] = PRIMARY_LINKS;

interface NavbarProps {
  /**
   * 'full' (default) — product navbar: Evidence, Lab, Build, and hamburger.
   * 'minimal' — layer-1 marketing surface (DESIGN.md Layering): logo, locale,
   * theme, and a single "Open the app" action. No link rows or account/social
   * controls competing with the hero action.
   */
  variant?: 'full' | 'minimal';
}

export function Navbar({ variant = 'full' }: NavbarProps = {}) {
  const minimal = variant === 'minimal';
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, ready } = useLocale();
  const copy = getMarketingNavTranslations(locale);
  const isActiveHref = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

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
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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
        className={`premium-dark-chrome fixed inset-x-0 top-0 z-50 border-b border-[var(--border-strong)] bg-[#050608]/[0.95] text-white backdrop-blur-xl ${ready ? '' : 'invisible'}`}
        aria-hidden={!ready}
        aria-label={copy.aria.mainNavigation}
      >
        <div
          className={`mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 transition-shadow duration-300 sm:px-6 lg:px-8 ${
            scrolled ? 'shadow-[0_12px_32px_rgba(0,0,0,0.28)]' : ''
          }`}
        >
          {/* Logo */}
          <Link
            href="/"
            dir="ltr"
            aria-current={isActiveHref('/') ? 'page' : undefined}
            className="flex shrink-0 items-center gap-2"
          >
            <TradeClawLogo className="h-7 w-7 shrink-0" id="nav" />
            <span className="text-[15px] font-bold tracking-[-0.02em] text-white">
              Trade<span className="text-[var(--brand)]">Claw</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden h-full items-center gap-0.5 text-[13px] font-medium text-white/[0.65] lg:flex">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveHref(link.href) ? 'page' : undefined}
                className="flex h-full items-center border-b-2 border-transparent px-3 transition-colors duration-200 hover:border-white/[0.20] hover:text-white"
              >
                {copy.links[link.labelKey]}
              </Link>
            ))}

          </div>

          {/* CTA */}
          <div className="flex shrink-0 items-center gap-2">
            <select
              aria-label={copy.language}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              disabled={!ready}
              dir="ltr"
              className={`${minimal ? 'block' : 'hidden sm:block'} cursor-pointer rounded-sm border border-white/[0.10] bg-transparent px-2 py-1.5 text-[11px] text-white/[0.55] outline-none transition-colors hover:border-white/[0.20] hover:text-white focus:ring-1 focus:ring-[var(--brand)] disabled:cursor-wait disabled:opacity-50`}
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
                href="/track-record"
                prefetch={false}
                aria-label={copy.links.evidence}
                className="flex shrink-0 items-center gap-1.5 rounded-sm bg-white px-2.5 py-2 text-xs font-semibold text-black transition-colors duration-200 hover:bg-[#dcfce7] sm:gap-2 sm:px-4"
              >
                <span>{copy.links.evidence}</span>
                <span aria-hidden="true">{locale === 'ar' ? '←' : '→'}</span>
              </Link>
            ) : null}

            <ThemeToggle className="text-white/[0.55] hover:bg-white/[0.06] hover:text-white" />

            {/* Mobile hamburger */}
            {!minimal && (
            <button
              ref={menuButtonRef}
              className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-sm border border-white/[0.10] text-white lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? copy.aria.closeMenu : copy.aria.openMenu}
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
          aria-label={copy.aria.mobileNavigation}
          className="premium-dark-chrome fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#050608] text-white"
        >
          <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--border-strong)] bg-[#050608]/[0.95] px-5 backdrop-blur-xl">
            <Link href="/" dir="ltr" aria-current={isActiveHref('/') ? 'page' : undefined} className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <TradeClawLogo className="h-7 w-7 shrink-0" id="mobile-nav" />
              <span className="text-[15px] font-bold tracking-[-0.02em]">
                Trade<span className="text-[var(--brand)]">Claw</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <select
                aria-label={copy.language}
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                disabled={!ready}
                dir="ltr"
                className="cursor-pointer rounded-sm border border-white/[0.10] bg-[#090b0e] px-2 py-1.5 text-[11px] text-white/[0.70] outline-none focus:ring-1 focus:ring-[var(--brand)] disabled:cursor-wait disabled:opacity-50 sm:hidden"
              >
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#090b0e] text-white">
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setMenuOpen(false);
                  requestAnimationFrame(() => menuButtonRef.current?.focus());
                }}
                aria-label={copy.aria.closeMenu}
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/[0.10] text-white/[0.70] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-2 px-5 py-6 sm:grid-cols-2">
            {ALL_NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveHref(link.href) ? 'page' : undefined}
                className="flex min-h-12 shrink-0 items-center gap-3 rounded-sm border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm font-medium text-white/[0.70] opacity-0 transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white animate-fade-up"
                style={{ animationDelay: `${i * 24}ms`, animationFillMode: 'forwards' }}
                onClick={() => setMenuOpen(false)}
              >
                <span>{copy.links[link.labelKey]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
