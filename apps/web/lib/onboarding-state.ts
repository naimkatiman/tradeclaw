// apps/web/lib/onboarding-state.ts
import { trackEvent } from './analytics';

const STORAGE_KEY = 'tc-onboarding-v1';

export type OnboardingStep = 'saw-signal' | 'opened-detail' | 'set-alert';

export type OnboardingState = Record<OnboardingStep, boolean>;

const ALL_STEPS: OnboardingStep[] = ['saw-signal', 'opened-detail', 'set-alert'];

function defaultState(): OnboardingState {
  return { 'saw-signal': false, 'opened-detail': false, 'set-alert': false };
}

export function getOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function markStepDone(step: OnboardingStep): void {
  const state = getOnboardingState();
  const wasDone = state[step];
  state[step] = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — silent
  }

  // Activation = the first time a user opens a real signal's detail (engaged
  // with the core value). Fire once, on the false→true transition, so the hero
  // A/B experiment can measure activation rate by variant (the hero_variant
  // super property rides along on this event).
  if (step === 'opened-detail' && !wasDone) {
    trackEvent('activated', { step });
  }
}

export function isOnboardingComplete(): boolean {
  const state = getOnboardingState();
  return ALL_STEPS.every((s) => state[s]);
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
