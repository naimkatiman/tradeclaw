// apps/web/lib/__tests__/onboarding-state.test.ts
jest.mock('../analytics', () => ({ trackEvent: jest.fn() }));

import {
  getOnboardingState,
  markStepDone,
  isOnboardingComplete,
  resetOnboarding,
  type OnboardingState,
} from '../onboarding-state';
import { trackEvent } from '../analytics';

const mockedTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

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
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  mockedTrackEvent.mockClear();
});

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

  it('fires the activation event once when opened-detail transitions to done', () => {
    markStepDone('opened-detail');
    expect(mockedTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockedTrackEvent).toHaveBeenCalledWith('activated', { step: 'opened-detail' });
  });

  it('does not re-fire activation when opened-detail is marked again', () => {
    markStepDone('opened-detail');
    markStepDone('opened-detail');
    expect(mockedTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire activation for other onboarding steps', () => {
    markStepDone('saw-signal');
    markStepDone('set-alert');
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });
});
