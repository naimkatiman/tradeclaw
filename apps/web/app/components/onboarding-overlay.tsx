'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getOnboardingState,
  markStepDone,
  isOnboardingComplete,
  type OnboardingStep,
} from '@/lib/onboarding-state';
import { useUserSession } from '../../lib/hooks/use-user-tier';

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
  const { status, session } = useUserSession();
  const isFree = status === 'authenticated' && (session?.tier === 'free' || !session?.tier);
  const [state, setState] = useState(() => getOnboardingState());
  const [dismissed, setDismissed] = useState(false);

  // Auto-complete step 1 once signals are visible
  useEffect(() => {
    if (signalsLoaded && !state['saw-signal']) {
      markStepDone('saw-signal');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(getOnboardingState());
    }
  }, [signalsLoaded, state]);

  if (dismissed || isOnboardingComplete()) return null;

  const completedCount = STEPS.filter((s) => state[s.id]).length;

  return (
    <div className="fixed top-24 left-1/2 z-50 w-[min(100vw-1rem,48rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111]/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-white">
            Quick Start
          </span>
          <p className="mt-1 text-[11px] text-zinc-500">
            {completedCount}/{STEPS.length} steps complete · the first step auto-fills when signals load
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-600 transition-colors text-lg leading-none hover:text-zinc-300"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => {
          const done = state[step.id];
          return (
            <div
              key={step.id}
              className={`rounded-xl border p-3 ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                    done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
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
                  {!done && <p className="mt-0.5 text-[10px] text-zinc-600">{step.hint}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!state['set-alert'] ? (
          <Link
            href="/alerts"
            onClick={() => { markStepDone('set-alert'); setState(getOnboardingState()); }}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-[11px] font-mono text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            Set up alerts →
          </Link>
        ) : (
          <span className="text-[11px] text-zinc-600">Alerts step complete.</span>
        )}

        {isFree && (
          <div className="sm:text-right">
            <p className="text-[10px] text-zinc-600">Free plan: 6 symbols, 15-min delay, TP1 only</p>
            <Link
              href="/pricing?from=onboarding"
              className="mt-1 inline-flex items-center justify-center text-[10px] font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Unlock all symbols + instant delivery →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
