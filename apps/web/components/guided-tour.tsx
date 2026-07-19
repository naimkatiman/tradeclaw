'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from '../app/components/locale-provider';
import {
  getDashboardLiveTranslations,
  type DashboardLiveTranslations,
} from '../lib/product-i18n/dashboard-live';
import { formatMessage } from '../lib/product-i18n/format';
import { getHtmlLanguage } from '../lib/translations';

/* ------------------------------------------------------------------ */
/*  Storage keys                                                       */
/* ------------------------------------------------------------------ */

const TOUR_DONE_KEY = 'tc_tour_done';
const TOUR_AUTO_KEY = 'tc_tour_auto_shown';
const TOUR_STEP_KEY = 'tc_tour_step';
const TOUR_NEVER_KEY = 'tc_tour_never';
const TOUR_VISITS_KEY = 'tc_tour_visits';

/* ------------------------------------------------------------------ */
/*  Tour steps — targeting REAL dashboard elements                     */
/* ------------------------------------------------------------------ */

type TourStepCopyKey = keyof DashboardLiveTranslations['tour']['steps'];

interface TourStepConfig {
  copyKey: TourStepCopyKey;
  targetId: string | null;
  position?: 'bottom' | 'top' | 'auto';
  // Phase 1 = core interaction loop (always shown). Phase 2 = advanced steps,
  // revealed only after the user has demonstrated intent (see isPhase2Unlocked).
  phase: 1 | 2;
}

interface TourStep extends TourStepConfig {
  title: string;
  description: string;
}

const STEP_CONFIGS: TourStepConfig[] = [
  {
    copyKey: 'marketSnapshot',
    targetId: 'dashboard-stats',
    phase: 1,
  },
  {
    copyKey: 'signalCard',
    targetId: 'signal-grid',
    phase: 1,
  },
  {
    copyKey: 'filters',
    targetId: 'dashboard-filters',
    phase: 1,
  },
  {
    copyKey: 'refresh',
    targetId: 'auto-refresh-toggle',
    phase: 2,
  },
  {
    copyKey: 'accuracy',
    targetId: 'accuracy-stats',
    phase: 2,
  },
  {
    copyKey: 'deeper',
    targetId: null,
    phase: 2,
  },
];

/* ------------------------------------------------------------------ */
/*  Progressive disclosure (issue #43)                                  */
/*  Phase 1 (core loop) always shows. Phase 2 (advanced) unlocks after  */
/*  the 3rd dashboard visit OR once the tour has been completed once.   */
/* ------------------------------------------------------------------ */

function readVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(TOUR_VISITS_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function isPhase2Unlocked(): boolean {
  try {
    if (localStorage.getItem(TOUR_DONE_KEY)) return true;
  } catch { /* ignore */ }
  return readVisitCount() >= 3;
}

function getTourSteps(t: DashboardLiveTranslations): TourStep[] {
  return STEP_CONFIGS.map((step) => ({
    ...step,
    ...t.tour.steps[step.copyKey],
  }));
}

function getUnlockedSteps(t: DashboardLiveTranslations): TourStep[] {
  const steps = getTourSteps(t);
  return isPhase2Unlocked() ? steps : steps.filter((step) => step.phase === 1);
}

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
  const { locale } = useLocale();
  const t = getDashboardLiveTranslations(locale);
  const isRtl = locale === 'ar';
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>('bottom');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
        if (parsed >= 0 && parsed < getUnlockedSteps(t).length) return parsed;
      }
    } catch { /* ignore */ }
    return 0;
  }, [t]);

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

  /* ---- Count dashboard visits (drives phase-2 progressive disclosure) ---- */
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!window.location.pathname.startsWith('/dashboard')) return;
      localStorage.setItem(TOUR_VISITS_KEY, String(readVisitCount() + 1));
    } catch { /* ignore */ }
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
      setStep(tourDone ? 0 : savedStep);
      setActive(true);
    }
  }, [externalOpen, getSavedStep]);

  /* ---- Compute spotlight + tooltip placement ---- */
  const updateSpotlight = useCallback((currentStep: number) => {
    const targetId = getUnlockedSteps(t)[currentStep]?.targetId;
    if (!targetId) {
      setSpotlightRect(null);
      setPlacement('center');
      return;
    }

    const applyRect = (el: Element) => {
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

      const vh = window.innerHeight;
      const spaceBelow = vh - (rect.top + rect.height);
      const spaceAbove = rect.top;
      const tooltipHeight = 220;

      if (spaceBelow >= tooltipHeight + 24) {
        setPlacement('bottom');
      } else if (spaceAbove >= tooltipHeight + 24) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    };

    // Retry a few frames if the target isn't mounted yet (auto-show on first load
    // can race with lazy dashboard sections).
    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector(`[data-tour-id="${targetId}"]`);
      if (!el) {
        if (attempts++ < 20) {
          requestAnimationFrame(tryFind);
          return;
        }
        setSpotlightRect(null);
        setPlacement('center');
        return;
      }

      // Scroll first (instant, centered), then measure on the next frame so the
      // spotlight never flashes at the pre-scroll position. Using 'instant' avoids
      // the smooth-scroll race that caused the spotlight to land around the wrong
      // element ("cracked box").
      el.scrollIntoView({ behavior: 'auto', block: 'center' });
      requestAnimationFrame(() => applyRect(el));
    };
    tryFind();
  }, [t]);

  /* ---- Recalculate on step change ---- */
  useEffect(() => {
    if (!active) return;
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
    if (step < getUnlockedSteps(t).length - 1) {
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
  }, [step, t, dontShowAgain, markNeverShow, markTourDone, clearTourProgress, dispatchTourComplete, onClose]);

  const skip = useCallback(() => {
    // Save progress for resume
    saveTourProgress(step);
    setActive(false);
    onClose?.();
  }, [step, saveTourProgress, onClose]);

  /* ---- Move focus into the modal and restore it when the tour closes ---- */
  useEffect(() => {
    if (!active) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = requestAnimationFrame(() => tooltipRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [active]);

  /* ---- Keyboard navigation ---- */
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const isInteractive = Boolean(target?.closest('button, input, select, textarea, a[href]'));
      if (e.key === 'Tab') {
        const dialog = tooltipRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        )).filter((element) => !element.hasAttribute('hidden'));
        if (focusable.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape') {
        close();
      } else if ((e.key === 'Enter' && !isInteractive) || e.key === (isRtl ? 'ArrowLeft' : 'ArrowRight')) {
        e.preventDefault();
        next();
      } else if (e.key === (isRtl ? 'ArrowRight' : 'ArrowLeft')) {
        e.preventDefault();
        if (step > 0) setStep(s => s - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, close, isRtl, next, step]);

  if (!active) return null;

  const unlockedSteps = getUnlockedSteps(t);
  const currentStep = unlockedSteps[step];
  const isLast = step === unlockedSteps.length - 1;
  const pad = 10;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const numberFormatter = new Intl.NumberFormat(getHtmlLanguage(locale));
  const currentStepNumber = numberFormatter.format(step + 1);
  const totalStepCount = numberFormatter.format(unlockedSteps.length);

  /* ---- Tooltip style computation ---- */
  const getTooltipStyle = (): React.CSSProperties => {
    const tooltipW = Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 400) - 32);

    // Mobile: bottom sheet
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
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
        aria-label={formatMessage(t.tour.dialogAria, {
          current: currentStepNumber,
          total: totalStepCount,
        })}
        aria-modal="true"
        tabIndex={-1}
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`max-h-[85dvh] overflow-y-auto overscroll-contain bg-zinc-900 border border-emerald-500/30 shadow-2xl shadow-black/40 transition-all duration-400 ${
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
            <bdi dir="auto">
              {formatMessage(t.tour.stepCount, {
                current: currentStepNumber,
                total: totalStepCount,
              })}
            </bdi>
          </span>
          <button
            onClick={skip}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 -me-1 rounded-lg hover:bg-white/5"
            aria-label={t.tour.close}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {unlockedSteps.map((_, i) => (
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
              aria-label={formatMessage(t.tour.goToStep, { step: numberFormatter.format(i + 1) })}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-white mb-1.5">{currentStep.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          <bdi dir="auto">{currentStep.description}</bdi>
        </p>

        {isLast && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-500 rounded"
            />
            <span className="text-xs text-zinc-500">{t.tour.dontShowAgain}</span>
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              {t.tour.back}
            </button>
          ) : (
            <button
              onClick={skip}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              {t.tour.skip}
            </button>
          )}
          <button
            onClick={next}
            className="text-xs px-5 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-all duration-200 font-medium"
          >
            {isLast ? t.tour.finish : t.tour.next}
          </button>
        </div>

        {/* Keyboard hint (desktop only) */}
        {!isMobile && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-700">
              {t.tour.keyboardHint}
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
  const { locale } = useLocale();
  const t = getDashboardLiveTranslations(locale);

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
      {t.tour.button}
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

  // Shift+? restarts the tour from anywhere (issue #43). Mirrors TakeTourButton:
  // clear the auto-shown flag, then dispatch the same event the button uses.
  // '/' is included because Shift+/ is how '?' is typed on US layouts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || (e.key !== '?' && e.key !== '/')) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      e.preventDefault();
      try { localStorage.removeItem(TOUR_AUTO_KEY); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('tc:start-tour'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <GuidedTour open={open} onClose={() => setOpen(false)} />;
}
