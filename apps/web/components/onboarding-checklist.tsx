"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  Star,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LS_KEY = "tc-onboarding";

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
  { id: 0, label: "View live signals", path: "/dashboard", href: "/dashboard" },
  { id: 1, label: "Run a backtest", path: "/backtest", href: "/backtest" },
  { id: 2, label: "Set a price alert", path: "/alerts", href: "/alerts" },
  {
    id: 3,
    label: "Configure Telegram bot",
    path: "/telegram",
    href: "/telegram",
  },
  {
    id: 4,
    label: "Star the repo on GitHub",
    path: null,
    href: "https://github.com/naimkatiman/tradeclaw",
    external: true,
  },
];

const DEFAULT_STATE: OnboardingState = { completed: [], dismissed: false };

/* ------------------------------------------------------------------ */
/*  External-store helpers (SSR-safe)                                  */
/* ------------------------------------------------------------------ */

function getSnapshot(): OnboardingState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch {
    /* empty */
  }
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OnboardingChecklist() {
  const pathname = usePathname();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const s = getSnapshot();
    return !s.dismissed;
  });
  const [mounted, setMounted] = useState(false);

  /* Track hydration */
  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-time hydration gate
  }, []);

  /* Auto-mark steps based on current pathname */
  useEffect(() => {
    const match = ITEMS.find(
      (item) => item.path && pathname.startsWith(item.path)
    );
    if (!match) return;
    const current = getSnapshot();
    if (current.completed.includes(match.id)) return;

    updateState({
      ...current,
      completed: [...current.completed, match.id],
    });
  }, [pathname]);

  const markComplete = useCallback((id: number) => {
    const current = getSnapshot();
    if (current.completed.includes(id)) return;
    updateState({
      ...current,
      completed: [...current.completed, id],
    });
  }, []);

  const dismiss = useCallback(() => {
    const current = getSnapshot();
    updateState({ ...current, dismissed: true });
    setOpen(false);
  }, []);

  const resetTour = useCallback(() => {
    updateState({ completed: [], dismissed: false });
    setOpen(true);
  }, []);

  const completedCount = state.completed.length;
  const total = ITEMS.length;
  const allDone = completedCount === total;
  const pct = Math.round((completedCount / total) * 100);

  if (!mounted) return null;

  return (
    <>
      {/* Floating "?" help button — hidden when panel is open */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/95 shadow-lg backdrop-blur transition-all duration-300 hover:border-emerald-400/50 hover:shadow-emerald-400/10 md:bottom-6 ${
          open
            ? "pointer-events-none translate-y-4 scale-0 opacity-0"
            : "translate-y-0 scale-100 opacity-100"
        }`}
        aria-label="Open onboarding checklist"
      >
        <HelpCircle className="h-5 w-5 text-emerald-400" />
      </button>

      {/* Checklist panel — slide-up animation */}
      <div
        className={`fixed bottom-20 right-4 z-50 w-80 rounded-2xl border border-zinc-700 bg-zinc-900/95 shadow-2xl shadow-black/40 backdrop-blur transition-all duration-300 md:bottom-6 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-8 scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h3 className="text-sm font-bold text-white">
            {allDone ? "You&apos;re all set! 🎉" : "Getting Started"}
          </h3>
          <button
            onClick={dismiss}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Dismiss onboarding checklist"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {completedCount}/{total} steps completed
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Celebration when all done */}
        {allDone ? (
          <div className="px-4 py-5 text-center">
            <p className="mb-3 text-lg">🎉</p>
            <p className="mb-1 text-sm font-semibold text-emerald-400">
              You&apos;re all set!
            </p>
            <p className="mb-4 text-xs text-zinc-400">
              You&apos;ve completed the onboarding. Happy trading!
            </p>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-400/20"
            >
              <Star className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        ) : (
          /* Checklist items */
          <ul className="space-y-0.5 px-4 py-3">
            {ITEMS.map((item) => {
              const done = state.completed.includes(item.id);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-800/60"
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-zinc-600" />
                  )}

                  <span
                    className={`flex-1 text-sm ${
                      done
                        ? "text-zinc-500 line-through"
                        : "text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </span>

                  {!done &&
                    (item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markComplete(item.id)}
                        className="shrink-0 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                      >
                        Go →
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="shrink-0 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                      >
                        Go →
                      </Link>
                    ))}
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer — Reset tour */}
        <div className="flex items-center justify-between border-t border-zinc-700 px-4 py-2">
          <button
            onClick={resetTour}
            className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <RotateCcw className="h-3 w-3" />
            Reset tour
          </button>
          <button
            onClick={dismiss}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}
