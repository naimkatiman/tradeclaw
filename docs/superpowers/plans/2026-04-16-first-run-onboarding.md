# First-Run Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get new users from login to their first visible signal in under 3 minutes — with sample data shown immediately if API keys aren't configured yet, and a step-by-step guided overlay that disappears once each step is done.

**Architecture:** A lightweight onboarding state stored in `localStorage` (key: `tc-onboarding-v1`) tracks which steps are complete. A server-side check at the `/dashboard` route detects "new user" (zero `signal_history` rows for this session) and injects an `isNewUser` prop. The `OnboardingOverlay` client component renders a floating checklist with 3 steps: (1) see your first signal (auto-completes on render if signals load), (2) open a signal detail, (3) optionally set up an alert. A separate `useSampleData` hook returns mock signals from `/api/demo/signals` when real signals haven't loaded within 2 seconds — ensuring the dashboard never looks empty on first visit.

**Tech Stack:** React client components, localStorage, existing `/api/demo/signals` mock data route, Next.js server component prop injection.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/web/lib/onboarding-state.ts` | Read/write onboarding step state in localStorage |
| Create | `apps/web/app/components/onboarding-overlay.tsx` | Floating 3-step checklist component |
| Create | `apps/web/app/hooks/use-sample-data.ts` | Returns demo signals as fallback after 2s timeout |
| Modify | `apps/web/app/dashboard/DashboardClient.tsx` | Mount `OnboardingOverlay`, use `useSampleData` fallback |
| Create | `apps/web/lib/__tests__/onboarding-state.test.ts` | Unit tests for state read/write logic |

---

### Task 1: Onboarding State Module

**Files:**
- Create: `apps/web/lib/onboarding-state.ts`
- Test: `apps/web/lib/__tests__/onboarding-state.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/onboarding-state.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../onboarding-state'"

- [ ] **Step 3: Write minimal implementation**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/onboarding-state.test.ts --no-cache`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/onboarding-state.ts apps/web/lib/__tests__/onboarding-state.test.ts
git commit -m "feat(onboarding): add onboarding state module with localStorage persistence"
```

---

### Task 2: useSampleData Hook

**Files:**
- Create: `apps/web/app/hooks/use-sample-data.ts`

- [ ] **Step 1: Write the hook**

```typescript
// apps/web/app/hooks/use-sample-data.ts
'use client';

import { useState, useEffect, useRef } from 'react';

// Minimal shape matching DashboardClient's signal type
interface SampleSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  timeframe: string;
  timestamp: string;
  source: string;
  _isSample: true;
}

/**
 * Returns sample demo signals after `timeoutMs` if `hasRealData` is still false.
 * Once real data arrives, clears the sample data automatically.
 */
export function useSampleData(hasRealData: boolean, timeoutMs = 2000): SampleSignal[] {
  const [samples, setSamples] = useState<SampleSignal[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasRealData) {
      setSamples([]);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/demo/signals');
        if (!res.ok) return;
        const data = await res.json();
        const tagged = (data.signals ?? []).map((s: object) => ({
          ...s,
          _isSample: true as const,
        }));
        setSamples(tagged);
      } catch {
        // silent
      }
    }, timeoutMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasRealData, timeoutMs]);

  return samples;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/hooks/use-sample-data.ts
git commit -m "feat(onboarding): add useSampleData hook with 2s fallback to demo signals"
```

---

### Task 3: OnboardingOverlay Component

**Files:**
- Create: `apps/web/app/components/onboarding-overlay.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/app/components/onboarding-overlay.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/components/onboarding-overlay.tsx
git commit -m "feat(onboarding): add OnboardingOverlay floating checklist component"
```

---

### Task 4: Wire Into Dashboard

**Files:**
- Modify: `apps/web/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Read DashboardClient to find where signals are stored in state**

Look for `useState` holding signals array (likely `const [signals, setSignals] = useState(...)`) and where the signal grid is rendered.

- [ ] **Step 2: Add imports**

```typescript
import { OnboardingOverlay } from '../components/onboarding-overlay';
import { useSampleData } from '../hooks/use-sample-data';
```

- [ ] **Step 3: Add useSampleData and wire OnboardingOverlay**

After the existing signals state, add:

```typescript
const hasRealData = signals.length > 0;
const sampleSignals = useSampleData(hasRealData);
// Use real signals if available, otherwise show sample signals
const displaySignals = hasRealData ? signals : sampleSignals;
```

Replace all references to `signals` in the rendering section with `displaySignals`.

For each sample signal card, add a small badge: if `signal._isSample` is true, show a "Sample Data" label in the card corner.

At the bottom of the JSX return (inside the outermost wrapper), add:

```tsx
<OnboardingOverlay signalsLoaded={hasRealData || sampleSignals.length > 0} />
```

- [ ] **Step 4: Mark step 2 when a signal is expanded**

Find where a signal card is clicked/expanded. After the existing open handler, add:

```typescript
import { markStepDone } from '@/lib/onboarding-state';
// inside the click handler:
markStepDone('opened-detail');
```

- [ ] **Step 5: Verify in browser**

Run `npm run dev -w apps/web`, open `http://localhost:3000/dashboard` in an incognito window.
Expected: Overlay appears bottom-right. Step 1 auto-completes within 2s (sample data loads). Clicking a signal completes step 2. Clicking "Set up alerts →" completes step 3 and overlay disappears.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dashboard/DashboardClient.tsx
git commit -m "feat(onboarding): wire OnboardingOverlay and sample data fallback into dashboard"
```

---

### Task 5: Build & Verify

- [ ] **Step 1: Run full build**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npm run build
```
Expected: Build succeeds with no type errors.

- [ ] **Step 2: Final commit if build fixes needed**

```bash
git add -A && git commit -m "fix(onboarding): resolve build issues"
```
