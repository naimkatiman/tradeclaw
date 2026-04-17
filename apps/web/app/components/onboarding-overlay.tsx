'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getOnboardingState,
  markStepDone,
  isOnboardingComplete,
  type OnboardingStep,
} from '@/lib/onboarding-state';

const STEPS: { id: OnboardingStep; label: string; hint: string }[] = [
  {
    id: 'saw-signal',
    label: 'See your first signal',
    hint: 'Live signals load below — auto-completing…',
  },
  {
    id: 'opened-detail',
    label: 'Open a signal for details',
    hint: 'Click any signal card to see entry, SL, and TP levels.',
  },
  {
    id: 'set-alert',
    label: 'Set up an alert (optional)',
    hint: 'Go to Alerts to get notified when new signals fire.',
  },
];

interface OnboardingOverlayProps {
  /** Called when step 'saw-signal' should auto-complete (signals are visible) */
  signalsLoaded: boolean;
}

export function OnboardingOverlay({ signalsLoaded }: OnboardingOverlayProps) {
  const [state, setState] = useState(() => getOnboardingState());
  const [dismissed, setDismissed] = useState(false);

  // Auto-complete step 1 once signals are visible
  useEffect(() => {
    if (signalsLoaded && !state['saw-signal']) {
      markStepDone('saw-signal');
      setState(getOnboardingState());
    }
  }, [signalsLoaded, state]);

  if (dismissed || isOnboardingComplete()) return null;

  const completedCount = STEPS.filter((s) => state[s.id]).length;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono font-semibold text-white">
          Quick Start ({completedCount}/{STEPS.length})
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="space-y-2.5">
        {STEPS.map((step) => {
          const done = state[step.id];
          return (
            <div key={step.id} className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  done
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-zinc-600'
                }`}
              >
                {done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-xs font-medium ${done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {step.label}
                </p>
                {!done && (
                  <p className="text-[10px] text-zinc-600 mt-0.5">{step.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!state['set-alert'] && (
        <Link
          href="/alerts"
          onClick={() => { markStepDone('set-alert'); setState(getOnboardingState()); }}
          className="mt-3 block text-center text-[11px] font-mono text-zinc-400 hover:text-white border border-white/10 rounded-lg py-1.5 transition-colors hover:bg-white/5"
        >
          Set up alerts →
        </Link>
      )}
    </div>
  );
}
