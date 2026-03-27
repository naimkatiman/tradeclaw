'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';
import { NAV_SECTIONS } from '../nav-config';

export function DocsSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return NAV_SECTIONS;
    const q = query.toLowerCase();
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      ),
    })).filter(s => s.items.length > 0);
  }, [query]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / title */}
      <div className="px-4 py-5 border-b border-white/5">
        <Link href="/docs" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">TradeClaw</div>
            <div className="text-[10px] text-zinc-500 leading-none mt-0.5">Documentation</div>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Filter pages…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-white/[0.04] border border-white/8 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-600 px-2 py-4 text-center">No results for &quot;{query}&quot;</p>
        ) : (
          filtered.map(section => (
            <div key={section.title}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-emerald-500/12 text-emerald-400 font-medium'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        {isActive && (
                          <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                        )}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      {/* Footer links */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        <a
          href="https://github.com/naimkatiman/tradeclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          App Dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-[#0a0a0a] sticky top-0 h-screen overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile: hamburger button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0a0a0a] border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Open docs navigation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a] border-r border-white/10 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-zinc-300">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
