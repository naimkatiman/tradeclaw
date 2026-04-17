"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  Star,
  Rocket,
  ChevronUp,
  ChevronDown,
  BarChart3,
  FlaskConical,
  Bell,
  Send,
  GitFork,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants & Types                                                  */
/* ------------------------------------------------------------------ */

const LS_ONBOARDED = "tc-onboarded";
const LS_VISITED = "tc-visited-routes";
const LS_MANUAL_CHECKS = "tc-onboarding-manual";

interface Step {
  id: number;
  label: string;
  description: string;
  route: string | null; // null = manual only
  href: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    id: 1,
    label: "View your first signal",
    description: "Check out live AI trading signals",
    route: "/dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    id: 2,
    label: "Run a backtest",
    description: "Test a strategy on historical data",
    route: "/backtest",
    href: "/backtest",
    icon: FlaskConical,
  },
  {
    id: 3,
    label: "Set a price alert",
    description: "Get notified when prices move",
    route: "/alerts",
    href: "/alerts",
    icon: Bell,
  },
  {
    id: 4,
    label: "Set up Telegram notifications",
    description: "Connect your Telegram bot",
    route: "/telegram",
    href: "/telegram",
    icon: Send,
  },
  {
    id: 5,
    label: "Star TradeClaw on GitHub",
    description: "Support the open-source project",
    route: null,
    href: "https://github.com/naimkatiman/tradeclaw",
    external: true,
    icon: GitFork,
  },
];

/* ------------------------------------------------------------------ */
/*  External store for localStorage state (SSR-safe)                   */
/* ------------------------------------------------------------------ */

interface OnboardingStore {
  visitedRoutes: string[];
  manualChecks: number[];
  onboarded: boolean;
  minimized: boolean;
}

const DEFAULT_STORE: OnboardingStore = {
  visitedRoutes: [],
  manualChecks: [],
  onboarded: false,
  minimized: false,
};

let storeListeners: Array<() => void> = [];
let cachedStoreSnapshot: OnboardingStore = DEFAULT_STORE;
let cachedStoreRaw: string = "";

function subscribeStore(listener: () => void) {
  storeListeners = [...storeListeners, listener];
  return () => {
    storeListeners = storeListeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  // Invalidate cache so the next getStoreSnapshot returns fresh data
  cachedStoreRaw = "";
  storeListeners.forEach((l) => l());
}

function getStoreSnapshot(): OnboardingStore {
  try {
    const visitedRaw = localStorage.getItem(LS_VISITED) ?? "";
    const manualRaw = localStorage.getItem(LS_MANUAL_CHECKS) ?? "";
    const onboardedRaw = localStorage.getItem(LS_ONBOARDED) ?? "";
    const minimizedRaw = localStorage.getItem("tc-onboarding-minimized") ?? "";
    const raw = `${visitedRaw}|${manualRaw}|${onboardedRaw}|${minimizedRaw}`;

    if (raw !== cachedStoreRaw) {
      cachedStoreRaw = raw;
      cachedStoreSnapshot = {
        visitedRoutes: visitedRaw ? (JSON.parse(visitedRaw) as string[]) : [],
        manualChecks: manualRaw ? (JSON.parse(manualRaw) as number[]) : [],
        onboarded: onboardedRaw === "true",
        minimized: minimizedRaw === "true",
      };
    }
  } catch {
    return DEFAULT_STORE;
  }
  return cachedStoreSnapshot;
}

function getServerStoreSnapshot(): OnboardingStore {
  return DEFAULT_STORE;
}

function addVisitedRoute(route: string) {
  const snap = getStoreSnapshot();
  if (snap.visitedRoutes.includes(route)) return;
  const next = [...snap.visitedRoutes, route];
  localStorage.setItem(LS_VISITED, JSON.stringify(next));
  emitChange();
}

function addManualCheck(id: number) {
  const snap = getStoreSnapshot();
  if (snap.manualChecks.includes(id)) return;
  const next = [...snap.manualChecks, id];
  localStorage.setItem(LS_MANUAL_CHECKS, JSON.stringify(next));
  emitChange();
}

function setOnboarded() {
  localStorage.setItem(LS_ONBOARDED, "true");
  emitChange();
}

function setMinimizedStore(v: boolean) {
  localStorage.setItem("tc-onboarding-minimized", v ? "true" : "false");
  emitChange();
}

/* ------------------------------------------------------------------ */
/*  Confetti CSS keyframe (injected once)                              */
/* ------------------------------------------------------------------ */

const CONFETTI_STYLE_ID = "tc-confetti-keyframes";

function ensureConfettiStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CONFETTI_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = CONFETTI_STYLE_ID;
  style.textContent = `
    @keyframes tc-confetti-fall {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(120px) rotate(720deg) scale(0); opacity: 0; }
    }
    .tc-confetti-piece {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      animation: tc-confetti-fall 1.5s ease-out forwards;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Confetti burst component                                           */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = [
  "#10b981", "#34d399", "#6ee7b7", "#d4d4d8", "#a1a1aa",
  "#a78bfa", "#818cf8", "#f472b6", "#fb7185", "#38bdf8",
];

/* Simple seeded PRNG — generates deterministic "random" values at module level */
function seededValues(count: number, seed: number): number[] {
  const vals: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807 + 0) % 2147483647;
    vals.push(s / 2147483647);
  }
  return vals;
}

const SEED_VALS = seededValues(240, 42);

const CONFETTI_PIECES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${SEED_VALS[i * 6] * 100}%`,
  top: `${SEED_VALS[i * 6 + 1] * 40}%`,
  delay: `${SEED_VALS[i * 6 + 2] * 0.5}s`,
  duration: `${1 + SEED_VALS[i * 6 + 3]}s`,
  size: `${6 + SEED_VALS[i * 6 + 4] * 6}px`,
  rotation: `${SEED_VALS[i * 6 + 5] * 360}deg`,
}));

function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI_PIECES.map((p) => (
        <div
          key={p.id}
          className="tc-confetti-piece"
          style={{
            backgroundColor: p.color,
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function OnboardingChecklist() {
  const pathname = usePathname();
  const store = useSyncExternalStore(subscribeStore, getStoreSnapshot, getServerStoreSnapshot);

  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionFired, setCompletionFired] = useState(false);

  /* One-time hydration gate */
  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    ensureConfettiStyles();
  }, []);

  /* Track route visits — mutates external store, not React state */
  useEffect(() => {
    if (!mounted || store.onboarded) return;
    const matchingStep = STEPS.find(
      (s) => s.route && pathname.startsWith(s.route)
    );
    if (matchingStep?.route) {
      addVisitedRoute(matchingStep.route);
    }
  }, [pathname, mounted, store.onboarded]);

  /* Listen for guided tour completion → mark "View your first signal" as visited */
  useEffect(() => {
    if (!mounted || store.onboarded) return;
    const handler = () => {
      addVisitedRoute("/dashboard");
    };
    window.addEventListener("tc:tour-complete", handler);
    return () => window.removeEventListener("tc:tour-complete", handler);
  }, [mounted, store.onboarded]);

  /* Compute completion */
  const isStepComplete = useCallback(
    (step: Step): boolean => {
      if (step.route) {
        return store.visitedRoutes.includes(step.route);
      }
      return store.manualChecks.includes(step.id);
    },
    [store.visitedRoutes, store.manualChecks]
  );

  const completedCount = STEPS.filter(isStepComplete).length;
  const total = STEPS.length;
  const allDone = completedCount === total;
  const pct = Math.round((completedCount / total) * 100);

  /* Fire confetti when all done */
  useEffect(() => {
    if (allDone && mounted && !store.onboarded && !completionFired) {
      setCompletionFired(true); // eslint-disable-line react-hooks/set-state-in-effect
      setShowConfetti(true);
      setMinimizedStore(false);
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [allDone, mounted, store.onboarded, completionFired]);

  const handleManualCheck = useCallback((id: number) => {
    addManualCheck(id);
  }, []);

  const handleDismiss = useCallback(() => {
    setOnboarded();
  }, []);

  const handleMinimize = useCallback(() => {
    setMinimizedStore(true);
  }, []);

  const handleExpand = useCallback(() => {
    setMinimizedStore(false);
  }, []);

  /* Don&apos;t render until mounted or if permanently dismissed */
  if (!mounted || store.onboarded) return null;

  /* ---- Minimized pill ---- */
  if (store.minimized) {
    return (
      <button
        onClick={handleExpand}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/95 px-4 py-2.5 shadow-lg shadow-black/30 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10 md:bottom-6"
        aria-label="Expand onboarding checklist"
      >
        <Rocket className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-zinc-200">
          {completedCount}/{total} steps
        </span>
        <div className="ml-1 h-1.5 w-12 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
      </button>
    );
  }

  /* ---- Full panel ---- */
  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl md:bottom-6">
      {/* Confetti overlay */}
      {showConfetti && <ConfettiBurst />}

      {/* Glow accent */}
      <div className="pointer-events-none absolute -top-20 right-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">
            {allDone ? "All done! 🎉" : "Getting Started"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Minimize onboarding checklist"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close onboarding checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            {completedCount} of {total} complete
          </span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* All-done celebration */}
      {allDone ? (
        <div className="relative px-4 py-6 text-center">
          <p className="mb-1 text-sm font-semibold text-emerald-400">
            You&apos;re all set!
          </p>
          <p className="mb-4 text-xs text-zinc-500">
            You&apos;ve explored everything. Happy trading!
          </p>
          <button
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <Star className="h-4 w-4" />
            Dismiss forever
          </button>
        </div>
      ) : (
        /* Step list */
        <ul className="space-y-0.5 px-3 py-3">
          {STEPS.map((step) => {
            const done = isStepComplete(step);
            const IconComponent = step.icon;

            return (
              <li
                key={step.id}
                className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all ${
                  done
                    ? "opacity-60"
                    : "hover:bg-zinc-800/60"
                }`}
              >
                {/* Checkbox */}
                <div className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-600 group-hover:text-zinc-500" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <IconComponent
                      className={`h-3.5 w-3.5 shrink-0 ${
                        done ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        done
                          ? "text-zinc-500 line-through"
                          : "text-zinc-200"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!done && (
                    <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Action */}
                {!done && (
                  <div className="mt-0.5 shrink-0">
                    {step.external ? (
                      <a
                        href={step.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleManualCheck(step.id)}
                        className="text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                      >
                        Go&nbsp;→
                      </a>
                    ) : (
                      <Link
                        href={step.href}
                        className="text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                      >
                        Go&nbsp;→
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-2">
        <button
          onClick={handleDismiss}
          className="w-full text-center text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
        >
          Skip onboarding
        </button>
      </div>
    </div>
  );
}
