'use client';

import { useState, useEffect, useCallback } from 'react';

const TOUR_DONE_KEY = 'tc_tour_done';
const TOUR_AUTO_KEY = 'tc_tour_auto_shown';

interface TourStep {
  targetId: string | null;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    targetId: 'dashboard-stats',
    title: 'Real-time signal overview',
    description: 'Signals generated live by 5 technical indicators — RSI, MACD, EMA, Stochastic, and Bollinger Bands. Refreshes every 10 seconds.',
  },
  {
    targetId: 'signal-grid',
    title: 'Signal cards',
    description: 'Each card shows direction, confidence score, and precise entry/exit levels. Click any card to expand full indicator detail.',
  },
  {
    targetId: 'nav-leaderboard',
    title: 'Signal accuracy tracker',
    description: 'Track every signal\'s outcome with full transparency. No cherry-picked results — every trade is logged with proof.',
  },
  {
    targetId: 'nav-multi-timeframe',
    title: 'Multi-timeframe confluence',
    description: 'See alignment across H1, H4, and D1 timeframes. The strongest signals agree across all timeframes.',
  },
  {
    targetId: 'nav-strategy-builder',
    title: 'Strategy builder',
    description: 'Build custom strategies with visual drag-and-drop. Chain indicators, set filters, and automate alerts without code.',
  },
  {
    targetId: 'nav-paper-trading',
    title: 'Paper trading',
    description: 'Practice with a $10K virtual portfolio. Test strategies risk-free before going live with real capital.',
  },
  {
    targetId: null,
    title: 'Ready to deploy?',
    description: 'One command: docker compose up — and you\'re running your own AI trading platform. 100% open source, no vendor lock-in.',
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuidedTourProps {
  open?: boolean;
  onClose?: () => void;
}

export function GuidedTour({ open: externalOpen, onClose }: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_DONE_KEY);
    const autoShown = localStorage.getItem(TOUR_AUTO_KEY);
    if (!done && !autoShown) {
      localStorage.setItem(TOUR_AUTO_KEY, '1');
      const timer = setTimeout(() => setActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (externalOpen) {
      setTimeout(() => {
        setStep(0);
        setActive(true);
      }, 0);
    }
  }, [externalOpen]);

  const computePosition = useCallback((rect: SpotlightRect | null) => {
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipW = Math.min(320, vw - 32);

    if (!rect) {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tooltipW,
        zIndex: 9999,
      });
      return;
    }

    const spaceBelow = vh - (rect.top + rect.height + pad);
    const centeredLeft = Math.min(
      Math.max(rect.left, 16),
      vw - tooltipW - 16,
    );

    if (spaceBelow >= 180) {
      setTooltipStyle({
        position: 'fixed',
        top: rect.top + rect.height + pad + 12,
        left: centeredLeft,
        width: tooltipW,
        zIndex: 9999,
      });
    } else {
      setTooltipStyle({
        position: 'fixed',
        bottom: vh - rect.top + 12,
        left: centeredLeft,
        width: tooltipW,
        zIndex: 9999,
      });
    }
  }, []);

  const updateSpotlight = useCallback((currentStep: number) => {
    const targetId = STEPS[currentStep]?.targetId;
    if (!targetId) {
      setSpotlightRect(null);
      computePosition(null);
      return;
    }
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (!el) {
      setSpotlightRect(null);
      computePosition(null);
      return;
    }
    const domRect = el.getBoundingClientRect();
    if (domRect.width === 0 && domRect.height === 0) {
      setSpotlightRect(null);
      computePosition(null);
      return;
    }
    const rect: SpotlightRect = {
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
    };
    setSpotlightRect(rect);
    computePosition(rect);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [computePosition]);

  useEffect(() => {
    if (active) {
      // Small delay after step change so any scroll/layout has settled
      const timer = setTimeout(() => updateSpotlight(step), 80);
      return () => clearTimeout(timer);
    }
  }, [active, step, updateSpotlight]);

<<<<<<< HEAD
  const close = useCallback(() => {
    setActive(false);
    if (dontShowAgain) localStorage.setItem(TOUR_DONE_KEY, '1');
    onClose?.();
  }, [dontShowAgain, onClose]);

=======
>>>>>>> origin/main
  const skip = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    setActive(false);
    onClose?.();
  }, [onClose]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      if (dontShowAgain) localStorage.setItem(TOUR_DONE_KEY, '1');
      setActive(false);
      onClose?.();
    }
  };

  if (!active) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const pad = 8;

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 9997 }}
        onClick={spotlightRect ? undefined : skip}
      />

      {/* Spotlight cutout */}
      {spotlightRect && (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-300"
          style={{
            zIndex: 9998,
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            border: '1.5px solid rgba(16, 185, 129, 0.45)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-zinc-900 border border-emerald-500/30 rounded-xl shadow-2xl p-5 transition-all duration-300"
        style={tooltipStyle}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {step + 1} of {STEPS.length}
          </span>
          <button
            onClick={skip}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Skip tour"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full rounded-full bg-white/5 mb-4">
          <div
            className="h-0.5 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
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
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={skip}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={next}
            className="text-xs px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-medium"
          >
            {isLast ? 'Get started' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Final step CTA */}
      {isLast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-400 font-mono"
          style={{ zIndex: 9999 }}
        >
          <span className="text-emerald-400">$</span>
          <span>docker compose up</span>
        </div>
      )}
    </>
  );
}

/** Button that triggers the guided tour. Dispatches a custom event. */
export function TakeTourButton({ className = '' }: { className?: string }) {
  const [, setTick] = useState(0);

  const handleClick = () => {
    // Reset auto-shown flag so the tour can re-trigger
    localStorage.removeItem(TOUR_AUTO_KEY);
    // We use a tick to force GuidedTour to pick up the externalOpen change
    setTick(t => t + 1);
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

/** Wrapper that listens for the custom event and opens the tour. */
export function GuidedTourListener() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('tc:start-tour', handler);
    return () => window.removeEventListener('tc:start-tour', handler);
  }, []);

  return <GuidedTour open={open} onClose={() => setOpen(false)} />;
}
