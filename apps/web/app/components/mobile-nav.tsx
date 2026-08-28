'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { ProductLocaleSwitcher } from './product-locale-switcher';
import { useLocale } from './locale-provider';
import {
  getAppShellTranslations,
  type AppShellLinkKey,
} from '../../lib/product-i18n/app-shell';

interface NavItem {
  href: string;
  labelKey?: AppShellLinkKey;
  label?: string;
  icon: ReactNode;
}

interface NavSection {
  labelKey: 'evidence' | 'lab' | 'build';
  items: NavItem[];
}

const icons = {
  evidence: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" />
    </svg>
  ),
  lab: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" /><path d="M10 3v6l-5.5 9.2A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.8L14 9V3" /><path d="M7.5 16h9" />
    </svg>
  ),
  build: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14.7 6.3 3-3a6 6 0 0 1-7.2 7.2l-6.2 6.2a2.1 2.1 0 0 0 3 3l6.2-6.2a6 6 0 0 1 7.2-7.2l-3 3-3-3Z" />
    </svg>
  ),
  record: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></svg>
  ),
  document: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5" /><path d="M9 12h7M9 16h7" /></svg>
  ),
  tool: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h5l2-7 4 14 2-7h5" /></svg>
  ),
  code: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></svg>
  ),
};

const MAIN_NAV: NavItem[] = [
  { href: '/track-record', labelKey: 'evidence', icon: icons.evidence },
  { href: '/dashboard', labelKey: 'lab', icon: icons.lab },
  { href: '/start', labelKey: 'build', icon: icons.build },
];

const MENU_SECTIONS: NavSection[] = [
  {
    labelKey: 'evidence',
    items: [
      { href: '/track-record', labelKey: 'trackRecord', icon: icons.record },
      { href: '/track-record/study', label: 'Studies', icon: icons.record },
      { href: '/track-record/alpha', label: 'Prospective Ledger', icon: icons.record },
      { href: '/research', labelKey: 'research', icon: icons.document },
      { href: '/methodology', labelKey: 'methodology', icon: icons.document },
      { href: '/open-data', labelKey: 'openData', icon: icons.code },
    ],
  },
  {
    labelKey: 'lab',
    items: [
      { href: '/dashboard', labelKey: 'dashboard', icon: icons.tool },
      { href: '/screener', labelKey: 'screener', icon: icons.tool },
      { href: '/backtest', labelKey: 'backtest', icon: icons.tool },
    ],
  },
  {
    labelKey: 'build',
    items: [
      { href: '/start', labelKey: 'setupGuide', icon: icons.build },
      { href: '/docs', label: 'Documentation', icon: icons.document },
      { href: '/api-docs', label: 'API', icon: icons.code },
      { href: 'https://github.com/naimkatiman/tradeclaw', label: 'GitHub', icon: icons.code },
    ],
  },
];

const ALL_MENU_ITEMS = MENU_SECTIONS.flatMap(section => section.items);

function itemIsActive(pathname: string, href: string): boolean {
  if (href.startsWith('http')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const { locale, ready } = useLocale();
  const t = getAppShellTranslations(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isMenuActive = ALL_MENU_ITEMS.some(item => itemIsActive(pathname, item.href));

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && (document.activeElement === first || !sheetRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sheetRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  return (
    <>
      <nav
        aria-label={t.aria.primaryNavigation}
        aria-hidden={!ready}
        className={`premium-dark-chrome fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border-strong)] bg-[#050608]/[0.95] text-white backdrop-blur-xl md:hidden ${ready ? '' : 'invisible'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid h-14 grid-cols-4">
          {MAIN_NAV.map(item => {
            const active = itemIsActive(pathname, item.href);
            const label = item.labelKey ? t.links[item.labelKey] : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-[var(--brand)]' : 'text-white/[0.52] hover:text-white'}`}
              >
                <span className={`absolute left-1/2 top-0 h-0.5 -translate-x-1/2 bg-[var(--brand)] transition-all ${active ? 'w-7 opacity-100' : 'w-0 opacity-0'}`} />
                <span className={`flex h-7 w-9 items-center justify-center rounded-sm border ${active ? 'border-[var(--brand)]/20 bg-[var(--brand-soft)]' : 'border-transparent'}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </Link>
            );
          })}

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.aria.openMenu}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-controls="more-navigation-sheet"
            className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 transition-colors ${isMenuActive ? 'text-[var(--brand)]' : 'text-white/[0.52] hover:text-white'}`}
          >
            <span className={`absolute left-1/2 top-0 h-0.5 -translate-x-1/2 bg-[var(--brand)] transition-all ${isMenuActive ? 'w-7 opacity-100' : 'w-0 opacity-0'}`} />
            <span className={`flex h-7 w-9 items-center justify-center rounded-sm border ${isMenuActive ? 'border-[var(--brand)]/20 bg-[var(--brand-soft)]' : 'border-transparent'}`}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="5" cy="12" r="1.25" /><circle cx="12" cy="12" r="1.25" /><circle cx="19" cy="12" r="1.25" /></svg>
            </span>
            <span className="text-[10px] font-medium tracking-wide">{t.more}</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden" onClick={closeMenu} aria-hidden="true" />
          <div
            ref={sheetRef}
            id="more-navigation-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.aria.moreNavigation}
            className="premium-dark-chrome fixed inset-x-0 bottom-0 z-[70] max-h-[88vh] overflow-y-auto rounded-t-xl border-t border-[var(--border-strong)] bg-[#090b0e] text-white shadow-[0_-24px_70px_rgba(0,0,0,0.55)] md:hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <button type="button" onClick={closeMenu} aria-label={t.aria.closeMenu} className="flex w-full justify-center pb-2 pt-3">
              <span className="h-1 w-10 rounded-full bg-white/[0.20]" />
            </button>
            <div className="flex items-center justify-between border-b border-white/[0.10] px-5 py-3">
              <div>
                <span className="block text-sm font-semibold">{t.more}</span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-white/[0.50]">{t.links.evidence} · {t.links.lab} · {t.links.build}</span>
              </div>
              <div className="flex items-center gap-1">
                <ProductLocaleSwitcher />
                <ThemeToggle className="text-white/[0.55] hover:bg-white/[0.06] hover:text-white" />
                <button type="button" autoFocus onClick={closeMenu} aria-label={t.aria.closeMenu} className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/[0.10] bg-white/[0.035] text-white/[0.60] hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>

            <div className="space-y-5 p-4">
              {MENU_SECTIONS.map(section => (
                <section key={section.labelKey}>
                  <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.50]">{t.links[section.labelKey]}</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(item => {
                      const active = itemIsActive(pathname, item.href);
                      const external = item.href.startsWith('http');
                      const label = item.labelKey ? t.links[item.labelKey] : item.label;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noopener noreferrer' : undefined}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex min-h-[52px] items-center gap-3 rounded-sm border px-3 py-3 transition-colors ${active ? 'border-[var(--brand)]/30 bg-[var(--brand-soft)] text-[var(--brand)]' : 'border-white/[0.07] bg-white/[0.025] text-white/[0.62] hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white'}`}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span className="truncate text-sm font-medium">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
