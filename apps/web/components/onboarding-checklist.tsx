'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronUp, ChevronDown, X, Star } from 'lucide-react';

const LS_KEY = 'tc-onboarding-v1';

interface OnboardingState {
  completed: number[];
  dismissed: boolean;
}

interface ChecklistItem {
  id: number;
  label: string;
  path: string | null;
  href: string;
  external?: boolean;
}

const ITEMS: ChecklistItem[] = [
  { id: 0, label: 'View live signals', path: '/dashboard', href: '/dashboard' },
  { id: 1, label: 'Run a backtest', path: '/backtest', href: '/backtest' },
  { id: 2, label: 'Set a price alert', path: '/alerts', href: '/alerts' },
  { id: 3, label: 'Connect Telegram bot', path: '/telegram', href: '/telegram' },
  {
    id: 4,
    label: 'Star TradeClaw on GitHub',
    path: null,
    href: 'https://github.com/naimkatiman/tradeclaw',
    external: true,
  },
];

const DEFAULT_STATE: OnboardingState = { completed: [], dismissed: false };

function getSnapshot(): OnboardingState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch { /* empty */ }
  return DEFAULT_STATE;
}

function getServerSnapshot(): OnboardingState {
  return DEFAULT_STATE;
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function updateState(next: OnboardingState) {
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function OnboardingChecklist() {
  const pathname = usePathname();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const dismiss = useCallback(() => {
    const current = getSnapshot();
    updateState({ ...current, dismissed: true });
  }, []);

  // Auto-dismiss after celebration
  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => {
      setCelebrating(false);
      dismiss();
    }, 3000);
    return () => clearTimeout(t);
  }, [celebrating, dismiss]);

  // Auto-mark items based on pathname
  useEffect(() => {
    const match = ITEMS.find((item) => item.path && pathname.startsWith(item.path));
    if (!match) return;
    const current = getSnapshot();
    if (current.dismissed || current.completed.includes(match.id)) return;

    const next: OnboardingState = {
      ...current,
      completed: [...current.completed, match.id],
    };
    updateState(next);

    if (next.completed.length === ITEMS.length) {
      const t = setTimeout(() => setCelebrating(true), 0);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  const markComplete = useCallback((id: number) => {
    const current = getSnapshot();
    if (current.completed.includes(id)) return;

    const next: OnboardingState = {
      ...current,
      completed: [...current.completed, id],
    };
    updateState(next);

    if (next.completed.length === ITEMS.length) {
      setCelebrating(true);
    }
  }, []);

  const completedCount = state.completed.length;
  const total = ITEMS.length;
  const allDone = completedCount === total;
  const pct = Math.round((completedCount / total) * 100);

  // Hide if dismissed, or all done and not celebrating
  if (state.dismissed || (allDone && !celebrating)) return null;

  return (
    <>
      {celebrating && (
        <style>{`
          @keyframes ob-confetti {
            0%   { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 1; }
            100% { transform: translateY(60vh) rotate(720deg) scale(0.5); opacity: 0; }
          }
          .ob-confetti-bit {
            position: fixed;
            width: 6px;
            height: 6px;
            bottom: 80px;
            right: 24px;
            pointer-events: none;
            z-index: 9999;
            border-radius: 2px;
            animation: ob-confetti linear forwards;
          }
        `}</style>
      )}
      {celebrating &&
        Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="ob-confetti-bit"
            style={{
              right: `${24 + (i % 8) * 40}px`,
              backgroundColor: ['#10b981', '#34d399', '#f59e0b', '#6ee7b7', '#a78bfa', '#f472b6'][i % 6],
              animationDuration: `${1.5 + (i % 4) * 0.3}s`,
              animationDelay: `${(i % 6) * 0.1}s`,
            }}
          />
        ))}

      {/* Collapsed: floating pill */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-emerald-500/20 md:bottom-6 ${expanded ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label={`Onboarding progress: ${completedCount} of ${total} complete`}
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="text-emerald-400">Getting Started</span>
        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">{completedCount}/{total}</span>
        <ChevronUp className="h-3 w-3 text-emerald-400" />
      </button>

      {/* Expanded: checklist card */}
      <div
        className={`fixed bottom-20 right-4 z-50 w-80 rounded-2xl border border-white/10 bg-[var(--bg-card)] shadow-2xl shadow-black/30 transition-all duration-300 origin-bottom-right md:bottom-6 ${expanded ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-bold text-white">
            {allDone ? 'All done!' : 'Getting Started'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="text-[var(--text-secondary)] hover:text-white transition-colors"
              aria-label="Collapse checklist"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={dismiss}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
              aria-label="Dismiss onboarding checklist"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
            <span>{completedCount} of {total} complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <ul className="px-4 py-3 space-y-1">
          {ITEMS.map((item) => {
            const done = state.completed.includes(item.id);
            return (
              <li key={item.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
                {/* Checkbox icon */}
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-white/20" />
                )}

                {/* Label */}
                <span className={`flex-1 text-sm ${done ? 'text-[var(--text-secondary)] line-through' : 'text-white'}`}>
                  {item.label}
                </span>

                {/* Icon for GitHub step */}
                {item.external && !done && (
                  <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                )}

                {/* Go button */}
                {!done && (
                  item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markComplete(item.id)}
                      className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Go &rarr;
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Go &rarr;
                    </Link>
                  )
                )}
              </li>
            );
          })}
        </ul>

        {allDone && (
          <div className="border-t border-white/5 px-4 py-3 text-center">
            <p className="text-sm text-emerald-400 font-semibold">You&apos;re all set! Happy trading.</p>
          </div>
        )}
      </div>
    </>
  );
}
