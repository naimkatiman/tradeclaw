// apps/web/lib/onboarding-state.ts
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
  state[step] = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — silent
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
