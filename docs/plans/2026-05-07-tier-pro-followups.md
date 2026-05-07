# Tier/Pro Follow-Ups — Plan

**Date:** 2026-05-07
**Branch:** `fix/tier-pro-followups`
**Worktree:** `../tradeclaw-tier-pro-followups`
**Source:** Audit dated 2026-05-07 against the master Pro launch + tier-segregation-delta + pro-leak-closure specs.

---

## Why this plan exists

The 2026-05-07 audit surfaced five follow-ups labelled "Top 5 fixes to ship first":

| ID | Audit finding | Status after re-verification |
|---|---|---|
| H1 | Stripe `apiVersion: '2026-03-25.dahlia'` is bogus | **False positive — dropped.** The installed `stripe@21.0.1` SDK ships `'2026-03-25.dahlia'` as its canonical `ApiVersion` in `node_modules/stripe/types/apiVersion.d.ts`. The pin matches the SDK. |
| H4 | `apps/ws-server` does no tier filtering | Confirmed — every WS client can subscribe to every symbol. |
| M1 | `PAST_DUE_GRACE_DAYS = 7` is shorter than Stripe Smart Retries (~21d) | Confirmed. |
| H2 | `TierBadge` component built but never mounted | Confirmed — zero call sites in `apps/web`. |
| H3 | `DelayCountdown` built but never mounted as dashboard banner | Confirmed — only the inline `LockedSignalCard` exists. |
| M4 | `/api/commentary` is unrate-limited LLM endpoint | **False positive — dropped.** `lib/market-commentary.ts` is template-based ("zero LLM cost"). No model call to throttle. |

Net deliverables this branch: **M1, H2, H3, H4** in four commits.

## Commit sequence

Each commit is independently revertable.

### C1 — `fix(tier): bump PAST_DUE_GRACE_DAYS to 21 to match Stripe retries`

- **File:** `apps/web/lib/tier-client.ts:35`
- **Change:** `7 → 21`
- **Verify:** `apps/web/lib/__tests__/tier.test.ts` already covers past_due grace — re-run; if any test pins the constant, update the assertion alongside the constant.
- **Rollback:** revert one line.

### C2 — `feat(navbar): mount TierBadge for signed-in users`

- **File:** `apps/web/app/components/navbar.tsx`
- **Change:** import `TierBadge`, render between `UserMenu` and the `Star` link in the desktop CTA cluster (line ~184). Hidden on mobile (`hidden sm:inline-flex` wrapper) since the mobile hamburger overlay can stay clean.
- **Component is server-safe?** No — `TierBadge` is `'use client'` and uses `useUserTier`. `Navbar` is already `'use client'`. Compatible.
- **Verify:** type-check `apps/web`. Manual smoke: anon → no badge; free signed-in → grey "free" pill; pro signed-in → emerald "pro" pill linking to `/dashboard/billing`.
- **Rollback:** revert one file.

### C3 — `feat(dashboard): mount DelayCountdown banner above locked signals for free tier`

- **File:** `apps/web/app/dashboard/DashboardClient.tsx`
- **Change:** for the next-to-unlock signal in `lockedSignals`, render `DelayCountdown` once above the "Unlocking soon" header (line ~1355). Sort `lockedSignals` by ascending `availableAt` and pass the first one. Trigger `fetchSignals()` on `onUnlock`.
- **Avoid double-mount:** keep the inline countdown in `LockedSignalCard` (per-card). The new banner is the spec's single dashboard-level surface.
- **Tier check:** banner only renders when there is at least one locked stub, which by design only appears for free tier.
- **Verify:** type-check `apps/web`. Existing E2E `tests/e2e/tier/tier-journey.spec.ts` exercises the locked-signal flow.
- **Rollback:** revert one file.

### C4 — `feat(ws-server): tier-aware subscriptions, default-free symbol gate`

Largest commit. Splits the work this way for review clarity but lands as one commit so the gate is atomic.

- **New file:** `apps/ws-server/src/tier.ts`
  - Exports `Tier`, `FREE_SYMBOLS`, `TIER_SYMBOLS`, `isAllowedForTier(symbol, tier)`.
  - Hardcoded duplication of `apps/web/lib/tier-client.ts FREE_SYMBOLS`. Documented as "second source of truth — pin via test"; webhook is fine because the set changes <quarterly.
- **Edit:** `apps/ws-server/src/middleware/auth.ts`
  - Extend `TokenPayload` with optional `tier?: Tier` claim.
  - On verify, set `request.tier` (default `'free'`).
  - Anonymous (dev fallback when `IS_DEV && !AUTH_SECRET`) → tier defaults to `'free'`.
- **Edit:** `apps/ws-server/src/websocket/relay.ts`
  - In the subscribe branch, partition `validRequested` into `allowedByTier` and `blockedByTier` via `isAllowedForTier`. Subscribe only the allowed set. If anything was blocked, send a `{ type: 'error', message: 'Symbol(s) require Pro: ...', code: 'tier_required' }` after the `subscribed` ack so the client can surface it.
  - Emit `403`-equivalent in the WS error frame (we cannot use HTTP status here — close codes 4001-4099 are app-specific; we keep the connection open and signal via error message so the legitimate free symbols still stream).
- **New test:** `apps/ws-server/src/__tests__/tier.test.ts`
  - Pins `FREE_SYMBOLS` to the canonical 6-symbol set.
  - `isAllowedForTier` returns true for free symbols on free tier, false for Pro symbols on free tier, true for everything on Pro/Elite/Custom.
- **New test:** `apps/ws-server/src/__tests__/relay-tier.test.ts` — TDD-first.
  - Free tier subscribes to `[BTCUSD, NVDAUSD]` → server acks `[BTCUSD]`, sends a `tier_required` error frame mentioning `NVDAUSD`.
  - Pro tier subscribes to `[NVDAUSD]` → server acks `[NVDAUSD]` with no error frame.
  - Anonymous (dev mode, no token) → free behavior.
- **Verify:**
  - `npm run test --workspace=apps/ws-server`
  - `npm run build --workspace=apps/ws-server`
  - Pin test in `apps/web/lib/__tests__/tier.test.ts` covers the web side; we add the matching pin on ws-server.
- **Out of scope (followups):** plumbing `tier` into the JWT minter on `apps/web`. The minter does not exist yet (no caller in `apps/web` mints WS tokens today; the `useWebSocketPrices` hook connects without a token). Adding a `tier` claim is a no-op until the minter is written. The gate still works because it defaults to `'free'`.

## Verification matrix

| Commit | Type-check | Unit | E2E |
|---|---|---|---|
| C1 | apps/web | tier.test.ts | n/a |
| C2 | apps/web | n/a | tier-journey.spec.ts (smoke) |
| C3 | apps/web | n/a | tier-journey.spec.ts (smoke) |
| C4 | apps/ws-server | new tier + relay-tier tests | n/a (no e2e harness for ws) |

## What I will NOT do in this branch

- Pin the Stripe API version differently (it already matches the SDK).
- Rate-limit `/api/commentary` (no LLM cost to control).
- Mint WS tokens with a tier claim (no minter exists yet; defaulting to free is correct fail-closed posture).
- Touch the alert-rules PATCH cap-flip (separate ticket — tracked in audit M7).
- Touch the mobile app (separate ticket — tracked in audit M8).
- Refactor billing page to read `TIER_DEFINITIONS` (separate ticket — tracked in audit L4).

## Rollback

Each commit is file-scoped and revertable independently. C4 introduces a new file (`apps/ws-server/src/tier.ts`); reverting the commit deletes it cleanly.
