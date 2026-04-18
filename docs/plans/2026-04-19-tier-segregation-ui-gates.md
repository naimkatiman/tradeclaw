# Spec 2/3 — Tier Segregation: UI Gates

**Date:** 2026-04-19
**Scope:** Client-visible lock state + upgrade CTAs for premium symbols.
**Depends on:** Spec 1 (backend-hardening) — consumes exported `FREE_SYMBOLS`.

## Goal

When a free-tier (or anonymous) user lands on any screen that lists symbols, premium symbols render with a lock badge, masked entry/TP, and an "Upgrade" CTA. Free symbols render fully. No additional round trips — tier is already returned by `/api/signals`.

## Canon

Client reads the canonical free list via a shared client-safe export (`apps/web/lib/tier-client.ts`):

- `FREE_SYMBOLS: readonly string[]`
- `isFreeSymbol(symbol: string): boolean`

No DB access — static list only. Server-only `getUserTier` etc. stay out of the client bundle.

## Changes

### 1. New file: `apps/web/lib/tier-client.ts`

```ts
export const FREE_SYMBOLS = ['BTCUSD', 'ETHUSD', 'XAUUSD'] as const;
export type FreeSymbol = typeof FREE_SYMBOLS[number];
export function isFreeSymbol(symbol: string): boolean {
  return (FREE_SYMBOLS as readonly string[]).includes(symbol);
}
```

`lib/tier.ts` imports from `tier-client` so there is still one source of truth.

### 2. Dashboard signal cards

- Touch: any client component that renders a signal row/card and is reachable anonymously.
- Likely files (to be grep'd at impl time): `apps/web/components/landing/live-hero-signals.tsx`, dashboard signal list.
- Add `const locked = tier === 'free' && !isFreeSymbol(signal.symbol)` — when `locked`: mask entry/TP with `••••`, overlay `<LockIcon />` (lucide `lock`), show "Upgrade to Pro" link pointing to `/pricing`.

### 3. Hero / landing

- `ab-hero.tsx` / `live-hero-signals.tsx` already fetch `/api/signals`. Server already filters — locked symbols will not appear in anonymous payload. Spec 2 does NOT need to duplicate this filtering; just ensure the UI does not crash if a premium symbol does slip through (defensive `isFreeSymbol` guard on render).

### 4. Track record page

- `apps/web/app/track-record/TrackRecordClient.tsx` (currently modified in git status). History gating is already server-side (history route masks). UI should show a "Free tier: 1 day history" banner when tier is free.

## Out of scope

- No change to paid dashboards (pro/elite see everything).
- No paywall modal/flow (handled by existing `/pricing`).
- No A/B on CTA copy.

## Verification

- Anonymous visit to `/`: hero shows only BTC/ETH/XAU signals, no locks visible (server filters).
- Log in as free: any page that tries to render premium symbol hits the `isFreeSymbol` guard → lock state visible.
- Log in as pro: no locks, all TPs visible.
- `npm run -w apps/web build` green.

## Rollback

Delete `lib/tier-client.ts` and revert consuming components. Shared constant pattern makes it a one-import revert.
