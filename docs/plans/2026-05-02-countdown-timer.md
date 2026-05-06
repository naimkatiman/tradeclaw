# Per-Signal Countdown Timer for Free Tier

**Date:** 2026-05-02
**Owner:** Zaky / Claude Code session
**Goal:** Replace the silent 15-minute drop-and-hide for free-tier signals with a countdown UX that shows pair, direction, confidence, and unlock-in time. Turns the delay wall into a conversion surface.

> **Layered with:** [`2026-05-02-tradeclaw-eight-improvements.md`](./2026-05-02-tradeclaw-eight-improvements.md) Phase 6 (`DelayCountdown` global ticker). This plan ships per-card stubs; that plan ships the global ticker. Both are live and complementary.

## Problem

Free-tier callers currently lose visibility into recently-published signals entirely. `apps/web/app/api/signals/route.ts` filters out any signal with `timestamp > now - TIER_DELAY_MS.free` at two points (lines 89-91 and 130-132). The dashboard never sees them, so the user has no idea anything was missed.

This costs us conversion: a free user who can _see_ "BUY XAUUSD, 84% confidence — unlocks in 12:34" is in a much stronger Pro CTA moment than one who sees an empty card list.

## Scope

- Free-tier dashboard only (`/api/signals` consumed by `DashboardClient.tsx`).
- **Out of scope:** `/api/v1/signals` (public, CORS, versioned external API — its contract stays "delayed signals dropped"). Changing that is a separate breaking-change concern.
- **Out of scope:** Premium-band signals (`confidence >= PRO_PREMIUM_MIN_CONFIDENCE = 85`). Those are permanently Pro-only, not delayed — they should remain dropped, not stubbed, so we don't tease content the user can never unlock without upgrading even after 15 min.

## Design

The server emits a `lockedSignals` array alongside `signals` in the `/api/signals` response. Each locked stub carries only the fields safe to expose:

```ts
{ id, symbol, direction, timeframe, confidence, availableAt, locked: true }
```

No entry/sl/tp/indicators are sent. Network inspection cannot reveal the trade levels.

The client renders a compact "locked" card variant: pair, direction badge, confidence, a live countdown to `availableAt`, and an inline "Upgrade for instant access" CTA. Existing 30-second poll cadence (`DashboardClient.tsx:845`) means stubs auto-promote to real signals within ~30s of the countdown reaching zero, so no client-side re-fetch trigger is needed.

## Files Changed (5)

| File | Change |
|---|---|
| `apps/web/lib/tier.ts` | Add `LockedSignalStub` type + `toLockedStub(signal, delayMs)` helper |
| `apps/web/app/api/signals/route.ts` | At both filter sites, separate delayed signals into `lockedSignals` instead of dropping. Premium-band still drops. |
| `apps/web/app/dashboard/DashboardClient.tsx` | Render `lockedSignals` above `signals` with countdown UI + CTA |
| `apps/web/app/components/tier-banner.tsx` | Update copy from "Delayed 15 min, 6 symbols, last 7 days" → "Locked 15 min after publish, 6 symbols, last 7 days" |
| `apps/web/lib/__tests__/tier.test.ts` | Tests for `toLockedStub` shape and field omission |

Total: 5 files. Within CLAUDE.md's 15-file commit budget.

## Assumptions

- Dashboard polls `/api/signals` at 15-30s, so server-truth handles unlock transitions; client only needs to render countdown text.
- `confidence` is already exposed on free tier in the existing path (`filterSignalByTier` doesn't mask it), so showing it on a locked stub is not a new disclosure.
- `availableAt = signal.timestamp + TIER_DELAY_MS[tier]`. Wall-clock skew between server and browser is small enough that countdown drift is invisible.

## Verification

1. `cd apps/web && npm run build` — type-check + production build green.
2. `npm test -- tier.test.ts` — new `toLockedStub` tests pass; existing free-tier tests unchanged.
3. Manual check (log `tier='free'` server-side, hit `/api/signals?minConfidence=50`):
   - Response includes both `signals` (older than 15 min) and `lockedSignals` (newer than 15 min, below premium band).
   - No locked stub carries `entry`, `stopLoss`, or `takeProfit*`.
4. Dashboard render: locked cards visible, countdown ticks down, transitions to real card after poll cycle.

## Non-Goals

- Animating the unlock transition.
- Persisting "I saw this locked signal" telemetry.
- Server-sent-events for sub-poll-cycle unlock.
- Modifying `/api/v1/signals` external API.

## Rollback

Single-commit feature. Revert the commit; behavior is identical to current state — `lockedSignals` array is a pure addition to the response shape, ignored by any client that doesn't read it.
