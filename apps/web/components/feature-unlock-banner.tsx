'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const FIRST_VISIT_KEY = 'tc-first-visit';
const DISMISS_PREFIX = 'tc-unlock-dismissed-';

interface UnlockItem {
  day: number;
  message: string;
  linkText: string;
  href: string;
}

const UNLOCKS: UnlockItem[] = [
  { day: 3, message: 'New: Filter signals by RSI range', linkText: 'Try Screener', href: '/screener' },
  { day: 5, message: 'Ready to test these signals? Paper trade risk-free', linkText: 'Try Paper Trading', href: '/paper-trading' },
  { day: 7, message: 'This pattern backtests at 67% win rate', linkText: 'Try Backtest', href: '/backtest' },
  { day: 10, message: 'Build your own strategy from indicator combos', linkText: 'Strategy Builder', href: '/strategy-builder' },
  { day: 14, message: 'Power user detected — unlock custom integrations', linkText: 'Plugins', href: '/plugins' },
];

function getDaysSinceFirst(): number {
  try {
    const first = localStorage.getItem(FIRST_VISIT_KEY);
    if (!first) return 0;
    const firstDate = new Date(first + 'T00:00:00').getTime();
    const now = Date.now();
    return Math.floor((now - firstDate) / 86400000);
  } catch {
    return 0;
  }
}

function isDismissed(day: number): boolean {
  try {
    return localStorage.getItem(DISMISS_PREFIX + day) === '1';
  } catch {
    return true;
  }
}

function dismiss(day: number): void {
  try {
    localStorage.setItem(DISMISS_PREFIX + day, '1');
  } catch { /* ignore */ }
}

export function FeatureUnlockBanner() {
  const [active, setActive] = useState<UnlockItem | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ensure first visit is recorded
    try {
      if (!localStorage.getItem(FIRST_VISIT_KEY)) {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        localStorage.setItem(FIRST_VISIT_KEY, today);
      }
    } catch { /* ignore */ }

    const days = getDaysSinceFirst();

    // Find the highest-day unlock that qualifies and hasn't been dismissed
    for (let i = UNLOCKS.length - 1; i >= 0; i--) {
      const u = UNLOCKS[i]!;
      if (days >= u.day && !isDismissed(u.day)) {
        setActive(u);
        // Slide in after a brief delay
        requestAnimationFrame(() => setVisible(true));
        break;
      }
    }
  }, []);

  // Auto-dismiss after 10s
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);
    return () => clearTimeout(timer);
  }, [active]);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => {
      if (active) dismiss(active.day);
      setActive(null);
    }, 300);
  }

  if (!active) return null;

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="rounded-xl border border-emerald-500/20 bg-[var(--background)]/95 backdrop-blur-lg p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0" aria-hidden="true">&#x2728;</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--foreground)]">{active.message}</p>
            <Link
              href={active.href}
              className="inline-block mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {active.linkText} &rarr;
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
