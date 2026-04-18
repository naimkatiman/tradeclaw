# Tier Segregation — Delta Design

**Date:** 2026-04-19
**Status:** Draft
**Parent:** `docs/superpowers/specs/2026-04-16-tradeclaw-pro-launch-design.md` (authoritative for Free/Pro tier contract)
**Goal:** Close the remaining gaps between the master Pro-launch design and reality, plus add the UI-layer work not covered by the master doc.

---

## 1. Why this spec exists

The master Pro-launch design covers backend gating (Phase 1 B1–B6) and is 90% shipped. But:

- There is zero automated test coverage on the tier-gating code path. A silent regression would go undetected.
- The UI has no user-facing tier treatment. A signed-in free user currently sees masked fields with no explanation, no countdown on delayed signals, no upgrade CTA at the point-of-lock, and no tier badge.
- The dashboard billing page has stale copy (`$19/mo`, `elite` tier references) that contradicts the master plan's killed Elite tier and $29/mo price.
- The free-tier symbol list in `TIER_SYMBOLS.free` is `[XAUUSD, BTCUSD, EURUSD]`. Product intent (restated in the most recent user spec) is `[XAUUSD, BTCUSD, ETHUSD]`.

This spec covers only the delta. Phase 5 Telegram routing (G1/G2 in the master doc) stays deferred and is explicitly out of scope.

## 2. What's already shipped (audited 2026-04-19)

| Master doc ID | Status | Evidence |
|---|---|---|
| A1 Remove Elite + Custom from `TIER_DEFINITIONS` | ✅ | `apps/web/lib/stripe.ts:39` — array has 2 entries (Free + Pro) |
| A2 Pricing page 2 cards | ✅ | `apps/web/app/pricing/page.tsx` maps `TIER_DEFINITIONS` |
| A4 Features table Free vs Pro | ✅ | `apps/web/app/pricing/page.tsx:12-22` |
| B1 15-min delay on Free | ✅ | `apps/web/app/api/signals/route.ts:89-92, 130-133` |
| B2 Symbol whitelist | ✅ | `apps/web/lib/tier.ts:25-30` + `filterSignalByTier` in routes |
| B3 TP2/TP3 mask | ✅ | `apps/web/lib/tier.ts:87-90` |
| B4 24h history window | ✅ | `apps/web/app/api/signals/history/route.ts:27-33` |
| B6 Session-based tier lookup | ✅ | `getUserTier(userId)` + `readSessionFromRequest` |
| B5 Premium confidence band | ⚠️ partial | `premium_signals` table + route exist; MTF confluence gating needs verification |

## 3. Gaps this spec closes

### 3.1 Backend

| ID | Gap | File |
|---|---|---|
| D1 | No tests for `filterSignalByTier`, `TIER_DELAY_MS`, `meetsMinimumTier`, `getUserTier` | `apps/web/lib/__tests__/tier.test.ts` (new) |
| D2 | `TIER_SYMBOLS.free` has `EURUSD`; product intent is `ETHUSD` | `apps/web/lib/tier.ts:26` |
| D3 | `TIER_DEFINITIONS[0].features[0]` says `XAUUSD, BTCUSD, EURUSD`; should say `XAUUSD, BTCUSD, ETHUSD` | `apps/web/lib/stripe.ts:49` |

### 3.2 UI

| ID | Gap | File |
|---|---|---|
| U1 | No tier badge anywhere in navbar or account menu | `apps/web/components/TierBadge.tsx` (new) + navbar wiring |
| U2 | `<LockedTP />` not rendered on free accounts — TP2/TP3 just vanish | `apps/web/components/LockedTP.tsx` (new) + signal card |
| U3 | No countdown on delayed signals — free users can't tell why newest signals are missing | `apps/web/components/DelayCountdown.tsx` (new) |
| U4 | History page has no "showing last 24h" banner for free | `apps/web/app/track-record/TrackRecordClient.tsx` |
| U5 | Dashboard billing page has `$19/mo` + `elite` tier references | `apps/web/app/dashboard/billing/page.tsx` |

### 3.3 Copy

| ID | Gap | File |
|---|---|---|
| C1 | Pricing page bullet copy says `EURUSD` where it should say `ETHUSD` | `apps/web/lib/stripe.ts:49` |
| C2 | FAQ references `@tradeclawwin` public channel — matches master plan, no change needed | — |

## 4. Design decisions

### 4.1 Tier resolution on the client

Two options considered:

**A. Read from `/api/auth/session` on every mount.** Simple, no caching layer.
**B. Use a React context populated from the server component tree.**

**Pick: A.** The session endpoint is already cached (`Cache-Control: no-store` is not set — browser will coalesce requests). Adding a context for one piece of data is premature abstraction. Swap to a context if we end up with three+ consumers.

### 4.2 `<TierBadge />` contract

```
interface TierBadgeProps {
  tier: 'free' | 'pro' | null;  // null = not signed in, render nothing
  size?: 'sm' | 'md';            // sm for navbar, md for account pages
}
```

- Free → gray pill, no link.
- Pro → emerald pill with subtle glow (matches pricing page accent), links to `/dashboard/billing`.
- Not signed in → returns `null`, renders nothing.

### 4.3 `<LockedTP />` contract

```
interface LockedTPProps {
  level: 2 | 3;     // TP level that's locked
  from?: string;    // optional source for upgrade CTA analytics: 'signal-card', 'history', etc.
}
```

Renders inline as a row in signal cards:

```
TP2  🔒 Pro only  →  Unlock
```

Clicking → `/pricing?from=tp${level}${from ? `-${from}` : ''}`.

### 4.4 `<DelayCountdown />` contract

```
interface DelayCountdownProps {
  signalTimestamp: number;  // ms epoch
  delayMs: number;          // typically TIER_DELAY_MS.free = 900000
  onUnlock?: () => void;    // fires when countdown hits 0; parent can trigger refetch
}
```

- Computes `unlockAt = signalTimestamp + delayMs`.
- If `Date.now() >= unlockAt`, renders nothing (signal is already visible, component should not have been mounted).
- Otherwise renders `Unlocks in mm:ss` with a `setInterval(1s)` tick.
- On unlock, calls `onUnlock` and unmounts.

Rendered in two places:
1. In a banner at the top of the dashboard when the free user would otherwise be waiting for the next signal to unlock.
2. Inline inside the signal card list as a stub row for signals the API response explicitly tells us are pending-unlock (future enhancement — v1 only shows the banner; the inline stub requires API shape changes that are out of scope).

**v1 scope: banner only.** Inline stub deferred.

### 4.5 History page banner

Simple `<div>` inserted above the records table when `tier === 'free'`:

```
Showing last 24h of signal history. [See full archive →]
```

Link → `/pricing?from=history`.

### 4.6 Billing page fix

Minimum edit: change the hardcoded `PLANS` dict to `$29/mo` and remove the `elite` tier entry. Future-proofing (reading from `TIER_DEFINITIONS`) is a separate refactor, not in scope.

## 5. Testing

### 5.1 Backend (tier.test.ts)

Unit tests for:
- `filterSignalByTier(freeSignal, 'free')` → drops EURUSD/GBPUSD/etc, masks TP2/TP3, masks `macd`/`bollingerBands`/`stochastic`
- `filterSignalByTier(freeSignal, 'pro')` → passthrough on all symbols, keeps all TPs
- `meetsMinimumTier('free', 'pro')` → false; `meetsMinimumTier('pro', 'pro')` → true; `meetsMinimumTier('elite', 'pro')` → true
- `TIER_DELAY_MS` → free = 900_000; pro = 0
- `TIER_SYMBOLS.free` includes exactly XAUUSD, BTCUSD, ETHUSD (after D2 fix)
- `TIER_HISTORY_DAYS.free` = 1; pro = null

### 5.2 UI (component-level)

Playwright flows:
- Not signed in → `/` → navbar shows no tier badge; history page shows "last 24h" banner
- Signed in as free → `/dashboard` → TierBadge shows "Free"; locked TP rows visible; upgrade CTA clickable → lands on `/pricing`
- Signed in as Pro (mocked) → TierBadge shows "Pro"; no locked TPs; no 24h banner

## 6. Rollback

Every change in this spec is file-scoped and reversible:
- Backend edits: revert `apps/web/lib/tier.ts` + `apps/web/lib/stripe.ts`.
- Tests: delete the test file.
- UI components: delete the component files + revert their import sites.
- Billing copy fix: revert `apps/web/app/dashboard/billing/page.tsx`.

No schema changes. No Stripe changes. No destructive ops.

## 7. Out of scope

- Phase 5 Telegram routing (G1, G2 in master doc) — deferred per master plan
- Symbol per-page routes (no `/symbol/[pair]/page.tsx` exists; creating one is a separate product decision)
- Pro customization dashboard
- API access tier
- Inline per-signal unlock stubs inside the signal list
- Refactor of billing page to read from `TIER_DEFINITIONS` (cleanup ticket)

## 8. Implementation sequence

Single build order, mapped to commits under the CLAUDE.md "one concern per commit" rule:

1. **Commit 1 (backend alignment + tests):** D1, D2, C1 (C1 is a one-line change that belongs with D2/D3 since it's the same symbol mismatch)
2. **Commit 2 (billing copy fix):** U5
3. **Commit 3 (tier UI components):** U1, U2, U3 — three new files in `components/`
4. **Commit 4 (page wiring):** navbar uses TierBadge, signal cards use LockedTP, dashboard banner uses DelayCountdown, track-record uses the banner (U4)
5. **Commit 5 (E2E):** Playwright spec for the three flows above

Each commit ships independently. If the UI work stalls, commits 1–2 still deliver correctness + fix the billing bug.
