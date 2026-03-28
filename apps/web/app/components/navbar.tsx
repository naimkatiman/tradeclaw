'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Handshake, Rocket, Star, Sparkles, Circle, Radio, Play, Thermometer } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import type { LucideIcon } from 'lucide-react';

const NAV_LINKS: Array<{ href: string; label: string; icon?: LucideIcon }> = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '/compare', label: 'Compare' },
  { href: '/awesome', label: 'Awesome' },
  { href: '/contribute', label: 'Contribute', icon: Handshake },
  { href: '/launch', label: 'Launch', icon: Rocket },
  { href: '/star', label: 'Star Us', icon: Star },
  { href: '/share', label: 'Share', icon: Star },
  { href: '/stars', label: 'Stars', icon: Sparkles },
  { href: '/hn', label: 'HN', icon: Circle },
  { href: '/rss', label: 'RSS', icon: Radio },
  { href: '/demo', label: 'Demo', icon: Circle },
  { href: '/replay', label: 'Replay', icon: Play },
  { href: '/badge', label: 'Badges' },
  { href: '/badges', label: 'Badges Gallery' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/api-keys', label: 'API Keys' },
  { href: '/heatmap', label: 'Heatmap', icon: Thermometer },
  { href: '/vs-tradingview', label: 'vs TradingView' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
        aria-label="Main navigation"
      >
        <div
          className={`glass-nav rounded-full px-5 py-2.5 flex items-center justify-between gap-6 w-full max-w-4xl transition-all duration-700 ${
            scrolled ? 'shadow-[0_0_40px_rgba(16,185,129,0.06)]' : ''
          }`}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1.5 shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">
              Trade<span className="text-emerald-400">Claw</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-[var(--text-secondary)]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors duration-300"
              >
                {link.icon && <link.icon className="w-3 h-3" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors duration-300"
            >
              Live signals
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-black hover:bg-white transition-all duration-300 active:scale-[0.98]"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star
            </a>

            <ThemeToggle className="text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]" />

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1 p-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
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
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-2xl bg-black/85 flex flex-col items-center justify-center gap-8"
          onClick={() => setMenuOpen(false)}
        >
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 text-2xl font-semibold text-white opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
              onClick={() => setMenuOpen(false)}
            >
              {link.icon && <link.icon className="w-5 h-5" />}
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
