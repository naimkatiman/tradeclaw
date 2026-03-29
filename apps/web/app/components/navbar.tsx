'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Handshake, Rocket, Star, Sparkles, Circle, Radio, Play, Thermometer, ChevronDown, Mail, Activity, Hash, Heart, Users, Clock, HelpCircle, LayoutDashboard, MonitorSmartphone, MessageCircle, Gift, Plug, Zap, Trophy, Database, Globe } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

const PRIMARY_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/screener', label: 'Signals' },
  { href: '/demo', label: 'Live Demo' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/api-docs', label: 'API Docs' },
  { href: '/compare', label: 'Compare' },
];

interface DropdownGroup {
  label: string;
  links: NavLink[];
}

const MORE_GROUPS: DropdownGroup[] = [
  {
    label: 'Trading',
    links: [
      { href: '/how-it-works', label: 'How It Works' },
      { href: '/heatmap', label: 'Heatmap', icon: Thermometer },
      { href: '/multi-timeframe', label: 'Multi-Timeframe' },
      { href: '/paper-trading', label: 'Paper Trading' },
      { href: '/replay', label: 'Replay', icon: Play },
      { href: '/correlation', label: 'Correlation' },
      { href: '/alerts', label: 'Alerts' },
      { href: '/accuracy', label: 'Accuracy' },
      { href: '/calibration', label: 'Calibration' },
      { href: '/results', label: 'Results', icon: Trophy },
      { href: '/broker-sim', label: 'Broker Sim', icon: Plug },
      { href: '/exchanges', label: 'Exchanges', icon: Globe },
      { href: '/today', label: 'Signal of the Day', icon: Zap },
    ],
  },
  {
    label: 'Tools',
    links: [
      { href: '/strategy-builder', label: 'Strategy Builder' },
      { href: '/plugins', label: 'Plugins' },
      { href: '/badge', label: 'Badges Gallery' },
      { href: '/widgets', label: 'Widgets', icon: LayoutDashboard },
      { href: '/marketplace', label: 'Marketplace' },
      { href: '/api-keys', label: 'API Keys' },
      { href: '/status', label: 'Status', icon: Activity },
      { href: '/digest', label: 'Digest', icon: Clock },
      { href: '/wrapped', label: 'Wrapped', icon: Gift },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/widget', label: 'Widget', icon: MonitorSmartphone },
      { href: '/showcase', label: 'Showcase', icon: Users },
      { href: '/contribute', label: 'Contribute', icon: Handshake },
      { href: '/sponsor', label: 'Sponsor', icon: Heart },
      { href: '/awesome', label: 'Awesome Lists' },
      { href: '/card', label: 'Signal Card' },
      { href: '/playground', label: 'Playground' },
      { href: '/email-digest', label: 'Email Digest', icon: Mail },
      { href: '/slack', label: 'Slack', icon: Hash },
      { href: '/threads', label: 'Tweet Threads' },
      { href: '/share', label: 'Share', icon: Star },
      { href: '/star', label: 'Star Us', icon: Star },
      { href: '/stars', label: 'Stars', icon: Sparkles },
      { href: '/hn', label: 'HN', icon: Circle },
      { href: '/rss', label: 'RSS', icon: Radio },
      { href: '/waitlist', label: 'Waitlist', icon: Clock },
      { href: '/launch', label: 'Launch', icon: Rocket },
      { href: '/vs-tradingview', label: 'vs TradingView' },
      { href: '/discord', label: 'Discord Bot', icon: MessageCircle },
      { href: '/notion', label: 'Notion Sync', icon: Database },
      { href: '/zapier', label: 'Zapier', icon: Zap },
      { href: '/quiz', label: 'Trader Quiz', icon: HelpCircle },
      { href: '/contributors', label: 'Contributors', icon: Trophy },
    ],
  },
];

// Flat list of all links for the mobile hamburger overlay
const ALL_NAV_LINKS: NavLink[] = [
  ...PRIMARY_LINKS,
  ...MORE_GROUPS.flatMap((g) => g.links),
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

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
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[var(--foreground)] transition-colors duration-300 flex items-center gap-1.5"
              >
                {link.label === 'Live Demo' && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                )}
                {link.label}
              </Link>
            ))}

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors duration-300"
              >
                More
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute top-full right-0 mt-3 w-[480px] rounded-2xl border border-[var(--border)] backdrop-blur-2xl bg-[var(--bg-card)]/95 shadow-2xl shadow-black/40 p-5 grid grid-cols-3 gap-6">
                  {MORE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-2 block">
                        {group.label}
                      </span>
                      <div className="flex flex-col gap-1">
                        {group.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMoreOpen(false)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--glass-bg)] transition-colors duration-200"
                          >
                            {link.icon && <link.icon className="w-3 h-3" />}
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
          className="fixed inset-0 z-[60] backdrop-blur-2xl bg-black/85 flex flex-col items-center justify-center gap-8"
          onClick={() => setMenuOpen(false)}
        >
          {ALL_NAV_LINKS.map((link, i) => (
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
