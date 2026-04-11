'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Storage keys                                                       */
/* ------------------------------------------------------------------ */

const TOUR_DONE_KEY = 'tc_tour_done';
const TOUR_AUTO_KEY = 'tc_tour_auto_shown';
const TOUR_STEP_KEY = 'tc_tour_step';
const TOUR_NEVER_KEY = 'tc_tour_never';

/* ------------------------------------------------------------------ */
/*  Tour steps — targeting REAL dashboard elements                     */
/* ------------------------------------------------------------------ */

interface TourStep {
  targetId: string | null;
  title: string;
  description: string;
  position?: 'bottom' | 'top' | 'auto';
}

const STEPS: TourStep[] = [
  {
    targetId: 'dashboard-stats',
    title: 'Your market snapshot',
    description:
      'See active signals, buy/sell ratio, average confidence, and market bias at a glance. Use this to gauge overall sentiment before diving in.',
  },
  {
    targetId: 'signal-grid',
    title: 'Reading a signal card',
    description:
      'Each card shows: Confidence (how many indicators agree), Entry (price now), SL (auto-calculated stop using ATR volatility), and TP1–TP3 (profit targets at 1.5×, 2.5×, 3.5× risk). Tap the "?" icons for one-line explanations of each metric.',
  },
  {
    targetId: 'dashboard-filters',
    title: 'Filter by what matters',
    description:
      'Narrow signals by timeframe, direction (BUY/SELL), or asset class. Focus on your preferred market in one click.',
  },
  {
    targetId: 'auto-refresh-toggle',
    title: 'Stay in sync',
    description:
      'Toggle auto-refresh to get signals updated every 30 seconds. Pause it when you want to study a signal without it changing.',
  },
  {
    targetId: 'accuracy-stats',
    title: 'Track signal accuracy',
    description:
      'Check historical accuracy rates. No cherry-picking — every signal outcome is logged with full transparency.',
  },
  {
    targetId: null,
    title: 'Ready to go deeper?',
    description:
      'Try the Backtest page to test strategies on historical data, or set up Telegram alerts to never miss a signal. Tap the export button on any signal to copy it for Telegram, Discord, or TradingView. Happy trading!',
  },
];

/* ------------------------------------------------------------------ */
/*  Spotlight geometry                                                  */
/* ------------------------------------------------------------------ */

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type TooltipPlacement = 'bottom' | 'top' | 'center';

/* ------------------------------------------------------------------ */
/*  Component props                                                    */
/* ------------------------------------------------------------------ */

interface GuidedTourProps {
  open?: boolean;
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Main GuidedTour                                                    */
/* ------------------------------------------------------------------ */

export function GuidedTour({ open: externalOpen, onClose }: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>('bottom');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  /* ---- Helpers ---- */

  const saveTourProgress = useCallback((stepIndex: number) => {
    try {
      localStorage.setItem(TOUR_STEP_KEY, String(stepIndex));
    } catch { /* ignore */ }
  }, []);

  const clearTourProgress = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_STEP_KEY);
    } catch { /* ignore */ }
  }, []);

  const getSavedStep = useCallback((): number => {
    try {
      const saved = localStorage.getItem(TOUR_STEP_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 0 && parsed < STEPS.length) return parsed;
      }
    } catch { /* ignore */ }
    return 0;
  }, []);

  const markTourDone = useCallback(() => {
    try {
      localStorage.setItem(TOUR_DONE_KEY, '1');
      clearTourProgress();
    } catch { /* ignore */ }
  }, [clearTourProgress]);

  const markNeverShow = useCallback(() => {
    try {
      localStorage.setItem(TOUR_NEVER_KEY, '1');
      markTourDone();
    } catch { /* ignore */ }
  }, [markTourDone]);

  /* ---- Dispatch onboarding event when tour completes ---- */
  const dispatchTourComplete = useCallback(() => {
    window.dispatchEvent(new CustomEvent('tc:tour-complete'));
  }, []);

  /* ---- Auto-show on first visit (2s delay, dashboard only) ---- */
  useEffect(() => {
    try {
      const never = localStorage.getItem(TOUR_NEVER_KEY);
      const done = localStorage.getItem(TOUR_DONE_KEY);
      const autoShown = localStorage.getItem(TOUR_AUTO_KEY);
      if (never || done || autoShown) return;

      // Only auto-show on dashboard
      if (!window.location.pathname.startsWith('/dashboard')) return;

      localStorage.setItem(TOUR_AUTO_KEY, '1');
      const timer = setTimeout(() => {
        setStep(0);
        setActive(true);
      }, 2000);
      return () => clearTimeout(timer);
    } catch { /* ignore */ }
  }, []);

  /* ---- External open (from TakeTourButton) ---- */
  useEffect(() => {
    if (externalOpen) {
      const savedStep = getSavedStep();
      const tourDone = localStorage.getItem(TOUR_DONE_KEY);
      // If tour was completed, restart. If mid-tour, resume.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync with external open prop
      setStep(tourDone ? 0 : savedStep);
      setActive(true);
    }
  }, [externalOpen, getSavedStep]);

  /* ---- Compute spotlight + tooltip placement ---- */
  const updateSpotlight = useCallback((currentStep: number) => {
    const targetId = STEPS[currentStep]?.targetId;
    if (!targetId) {
      setSpotlightRect(null);
      setPlacement('center');
      return;
    }
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (!el) {
      setSpotlightRect(null);
      setPlacement('center');
      return;
    }
    const domRect = el.getBoundingClientRect();
    if (domRect.width === 0 && domRect.height === 0) {
      setSpotlightRect(null);
      setPlacement('center');
      return;
    }

    const rect: SpotlightRect = {
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
    };
    setSpotlightRect(rect);

    // Decide placement
    const vh = window.innerHeight;
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const tooltipHeight = 220; // estimated

    if (spaceBelow >= tooltipHeight + 24) {
      setPlacement('bottom');
    } else if (spaceAbove >= tooltipHeight + 24) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  /* ---- Recalculate on step change ---- */
  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: transition state for step animation
    setTransitioning(true);
    const timer = setTimeout(() => {
      updateSpotlight(step);
      saveTourProgress(step);
      setTransitioning(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [active, step, updateSpotlight, saveTourProgress]);

  /* ---- Recalculate on resize ---- */
  useEffect(() => {
    if (!active) return;
    const handler = () => updateSpotlight(step);
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [active, step, updateSpotlight]);

  /* ---- Actions ---- */
  const close = useCallback(() => {
    // Save progress so user can resume
    saveTourProgress(step);
    setActive(false);
    onClose?.();
  }, [step, saveTourProgress, onClose]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Tour complete
      if (dontShowAgain) {
        markNeverShow();
      } else {
        markTourDone();
      }
      clearTourProgress();
      dispatchTourComplete();
      setActive(false);
      onClose?.();
    }
  }, [step, dontShowAgain, markNeverShow, markTourDone, clearTourProgress, dispatchTourComplete, onClose]);

  const skip = useCallback(() => {
    // Save progress for resume
    saveTourProgress(step);
    setActive(false);
    onClose?.();
  }, [step, saveTourProgress, onClose]);

  /* ---- Keyboard navigation ---- */
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (step > 0) setStep(s => s - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!active) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const pad = 10;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  /* ---- Tooltip style computation ---- */
  const getTooltipStyle = (): React.CSSProperties => {
    const tooltipW = Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 400) - 32);

    // Mobile: bottom sheet
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '100%',
        zIndex: 9999,
        borderRadius: '20px 20px 0 0',
      };
    }

    // Centered (no target)
    if (!spotlightRect || placement === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tooltipW,
        zIndex: 9999,
      };
    }

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;

    // Horizontal: center tooltip under/above the target, clamped to viewport
    let leftPos = spotlightRect.left + spotlightRect.width / 2 - tooltipW / 2;
    leftPos = Math.max(16, Math.min(leftPos, vw - tooltipW - 16));

    if (placement === 'top') {
      return {
        position: 'fixed',
        bottom: (typeof window !== 'undefined' ? window.innerHeight : 800) - spotlightRect.top + pad + 8,
        left: leftPos,
        width: tooltipW,
        zIndex: 9999,
      };
    }

    // bottom
    return {
      position: 'fixed',
      top: spotlightRect.top + spotlightRect.height + pad + 8,
      left: leftPos,
      width: tooltipW,
      zIndex: 9999,
    };
  };

  /* ---- Arrow style ---- */
  const getArrowStyle = (): React.CSSProperties | null => {
    if (isMobile || !spotlightRect || placement === 'center') return null;

    const tooltipW = Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 400) - 32);
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    let leftPos = spotlightRect.left + spotlightRect.width / 2 - tooltipW / 2;
    leftPos = Math.max(16, Math.min(leftPos, vw - tooltipW - 16));
    const arrowLeft = spotlightRect.left + spotlightRect.width / 2 - leftPos;
    const clampedArrowLeft = Math.max(20, Math.min(arrowLeft, tooltipW - 20));

    if (placement === 'top') {
      return {
        position: 'absolute',
        bottom: -8,
        left: clampedArrowLeft,
        transform: 'translateX(-50%) rotate(45deg)',
        width: 16,
        height: 16,
        background: 'rgb(24 24 27)',
        borderRight: '2px solid rgba(16, 185, 129, 0.5)',
        borderBottom: '2px solid rgba(16, 185, 129, 0.5)',
        boxShadow: '3px 3px 8px rgba(16, 185, 129, 0.15)',
      };
    }

    return {
      position: 'absolute',
      top: -8,
      left: clampedArrowLeft,
      transform: 'translateX(-50%) rotate(45deg)',
      width: 16,
      height: 16,
      background: 'rgb(24 24 27)',
      borderLeft: '2px solid rgba(16, 185, 129, 0.5)',
      borderTop: '2px solid rgba(16, 185, 129, 0.5)',
      boxShadow: '-3px -3px 8px rgba(16, 185, 129, 0.15)',
    };
  };

  const arrowStyle = getArrowStyle();

  return (
    <>
      {/* Overlay — transparent when spotlight is visible (box-shadow does the dimming) */}
      <div
        className={`fixed inset-0 transition-opacity duration-300 ${
          spotlightRect ? '' : 'bg-black/60 backdrop-blur-sm'
        }`}
        style={{ zIndex: 9997, opacity: transitioning ? 0.4 : 1 }}
        onClick={skip}
        aria-hidden="true"
      />

      {/* Spotlight cutout with pulse animation */}
      {spotlightRect && (
        <div
          className="fixed rounded-xl pointer-events-none"
          style={{
            zIndex: 9998,
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            border: '1.5px solid rgba(16, 185, 129, 0.5)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'tc-spotlight-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={`Tour step ${step + 1} of ${STEPS.length}`}
        aria-modal="true"
        className={`bg-zinc-900 border border-emerald-500/30 shadow-2xl shadow-black/40 transition-all duration-400 ${
          isMobile ? 'p-6 pt-4' : 'rounded-xl p-5'
        } ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={getTooltipStyle()}
      >
        {/* Arrow */}
        {arrowStyle && <div style={arrowStyle} />}

        {/* Connector line from arrow to spotlight */}
        {spotlightRect && placement !== 'center' && !isMobile && arrowStyle && (
          <div
            style={{
              position: 'absolute',
              left: arrowStyle.left as number,
              transform: 'translateX(-50%)',
              width: 0,
              pointerEvents: 'none' as const,
              ...(placement === 'bottom'
                ? { top: -(pad + 8), height: pad + 8, borderLeft: '1.5px dashed rgba(16, 185, 129, 0.4)' }
                : { bottom: -(pad + 8), height: pad + 8, borderLeft: '1.5px dashed rgba(16, 185, 129, 0.4)' }
              ),
            }}
          />
        )}

        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center mb-3">
            <div className="w-8 h-1 rounded-full bg-zinc-700" />
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            onClick={skip}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 -mr-1 rounded-lg hover:bg-white/5"
            aria-label="Close tour"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-emerald-500'
                  : i < step
                    ? 'w-2 bg-emerald-500/40'
                    : 'w-2 bg-zinc-700'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-white mb-1.5">{currentStep.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">{currentStep.description}</p>

        {isLast && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-500 rounded"
            />
            <span className="text-xs text-zinc-500">Don&apos;t show again</span>
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={skip}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Skip tour
            </button>
          )}
          <button
            onClick={next}
            className="text-xs px-5 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-all duration-200 font-medium"
          >
            {isLast ? 'Finish tour' : 'Next →'}
          </button>
        </div>

        {/* Keyboard hint (desktop only) */}
        {!isMobile && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-700">
              ← → to navigate · Esc to close
            </span>
          </div>
        )}
      </div>

      {/* Spotlight pulse keyframes */}
      <style>{`
        @keyframes tc-spotlight-pulse {
          0%, 100% { border-color: rgba(16, 185, 129, 0.5); box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 0 0 rgba(16, 185, 129, 0); }
          50% { border-color: rgba(16, 185, 129, 0.8); box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 20px 4px rgba(16, 185, 129, 0.15); }
        }
      `}</style>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TakeTourButton                                                     */
/* ------------------------------------------------------------------ */

export function TakeTourButton({ className = '' }: { className?: string }) {
  const handleClick = () => {
    // Reset auto-shown flag so the tour can re-trigger
    try { localStorage.removeItem(TOUR_AUTO_KEY); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('tc:start-tour'));
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15 transition-all duration-200 ${className}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      Tour
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  GuidedTourListener                                                 */
/* ------------------------------------------------------------------ */

export function GuidedTourListener() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('tc:start-tour', handler);
    return () => window.removeEventListener('tc:start-tour', handler);
  }, []);

  return <GuidedTour open={open} onClose={() => setOpen(false)} />;
}
