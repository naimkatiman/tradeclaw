// apps/web/lib/__tests__/onboarding-state.test.ts
import {
  getOnboardingState,
  markStepDone,
  isOnboardingComplete,
  resetOnboarding,
  type OnboardingState,
} from '../onboarding-state';

const STEPS = ['saw-signal', 'opened-detail', 'set-alert'] as const;

// localStorage mock
const store: Record<string, string> = {};
beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  });
});
beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

describe('onboarding state', () => {
  it('returns all steps incomplete on first call', () => {
    const state = getOnboardingState();
    expect(state['saw-signal']).toBe(false);
    expect(state['opened-detail']).toBe(false);
    expect(state['set-alert']).toBe(false);
  });

  it('marks a step done and persists', () => {
    markStepDone('saw-signal');
    const state = getOnboardingState();
    expect(state['saw-signal']).toBe(true);
    expect(state['opened-detail']).toBe(false);
  });

  it('reports incomplete when not all steps done', () => {
    markStepDone('saw-signal');
    expect(isOnboardingComplete()).toBe(false);
  });

  it('reports complete when all steps done', () => {
    STEPS.forEach(s => markStepDone(s));
    expect(isOnboardingComplete()).toBe(true);
  });

  it('resets state', () => {
    markStepDone('saw-signal');
    resetOnboarding();
    expect(getOnboardingState()['saw-signal']).toBe(false);
  });
});
