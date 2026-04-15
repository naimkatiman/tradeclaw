'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import type { ReactNode } from 'react';

const MAIN_NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/screener',
    label: 'Signals',
    icon: (
      // Radio-tower broadcast: distinct from charts, reads as "live signal"
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.9 16.1A10 10 0 0 1 2 9" />
        <path d="M7.8 13.3A6 6 0 0 1 6 9" />
        <path d="M16.2 13.3A6 6 0 0 0 18 9" />
        <path d="M19.1 16.1A10 10 0 0 0 22 9" />
        <circle cx="12" cy="9" r="1.5" />
        <path d="M11 13.5 9 22" />
        <path d="M13 13.5 15 22" />
        <path d="M9 18h6" />
      </svg>
    ),
  },
  {
    href: '/track-record',
    label: 'Track Record',
    icon: (
      // Trophy/award: verified live performance
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
];

interface MenuItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    label: 'Trading',
    items: [
      {
        href: '/heatmap',
        label: 'Heatmap',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        href: '/alerts',
        label: 'Alerts',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        ),
      },
      {
        href: '/multi-timeframe',
        label: 'Multi-TF',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        href: '/paper-trading',
        label: 'Paper Trade',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      },
      {
        href: '/replay',
        label: 'Replay',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        ),
      },
      {
        href: '/portfolio',
        label: 'Portfolio',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        href: '/strategy-builder',
        label: 'Strategy',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        ),
      },
      {
        href: '/indicators/builder',
        label: 'Indicators',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
          </svg>
        ),
      },
      {
        href: '/api-usage',
        label: 'API Usage',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        href: '/api-keys',
        label: 'API Keys',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        ),
      },
      {
        href: '/strategies/marketplace',
        label: 'Marketplace',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        ),
      },
      {
        href: '/plugins',
        label: 'Plugins',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
          </svg>
        ),
      },
      {
        href: '/status',
        label: 'Status',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
      {
        href: '/patterns',
        label: 'Patterns',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
        ),
      },
      {
        href: '/benchmark',
        label: 'Benchmark',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
        ),
      },
      {
        href: '/live',
        label: 'Live Feed',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
      {
        href: '/start',
        label: 'Setup Guide',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        ),
      },
      {
        href: '/pledge',
        label: 'Pledge Wall',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M12 5 9.04 7.96a2.17 2.17 0 000 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 013.79 0l2.96 2.66" />
          </svg>
        ),
      },
      {
        href: '/sms',
        label: 'SMS Alerts',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        ),
      },
    ],
  },
];

// Flat list of all menu items for active-state detection
const ALL_MENU_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isMenuActive = ALL_MENU_ITEMS.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[var(--border)] backdrop-blur-xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'color-mix(in srgb, var(--background) 80%, transparent)',
        }}
      >
        <div className="grid grid-cols-4 h-16">
          {MAIN_NAV.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] select-none transition-all duration-200 active:scale-[0.92] ${
                  isActive ? 'text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {/* Active top indicator */}
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-emerald-400 transition-all duration-300 ${
                    isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                  }`}
                />
                {/* Icon with active glow pill */}
                <span
                  className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  {item.icon}
                </span>
                <span className={`text-[10px] font-medium tracking-wide whitespace-nowrap ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] select-none transition-all duration-200 active:scale-[0.92] ${
              isMenuActive ? 'text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-emerald-400 transition-all duration-300 ${
                isMenuActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
              }`}
            />
            <span
              className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors duration-200 ${
                isMenuActive ? 'bg-emerald-500/10' : ''
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5" cy="12" r="1.25" />
                <circle cx="12" cy="12" r="1.25" />
                <circle cx="19" cy="12" r="1.25" />
              </svg>
            </span>
            <span className={`text-[10px] font-medium tracking-wide ${isMenuActive ? 'font-semibold' : ''}`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Slide-up menu sheet */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="fixed bottom-0 left-0 right-0 z-[70] md:hidden rounded-t-3xl border-t border-[var(--border)] max-h-[88vh] overflow-y-auto shadow-2xl shadow-black/50 animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)', background: 'var(--bg-card)' }}
          >
            {/* Drag handle */}
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="w-full flex justify-center pt-3 pb-2 active:opacity-60 transition-opacity"
            >
              <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <span className="text-sm font-semibold">More</span>
              <div className="flex items-center gap-1">
                <ThemeToggle className="text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]" />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)]"
                >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                </button>
              </div>
            </div>

            {/* Grouped menu items */}
            <div className="p-4 space-y-5">
              {MENU_SECTIONS.map((section) => (
                <div key={section.label}>
                  <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold px-1 mb-2 block">
                    {section.label}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(item => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl min-h-[52px] transition-all duration-150 active:scale-[0.97] ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--foreground)] active:bg-[var(--accent-muted)]'
                          }`}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span className="text-sm font-medium truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
