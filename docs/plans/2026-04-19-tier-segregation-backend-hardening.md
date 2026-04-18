# Spec 1/3 — Tier Segregation: Backend Hardening

**Date:** 2026-04-19
**Scope:** Server-side enforcement of free vs paid tier symbol access.
**Sibling specs:** `ui-gates`, `telegram-routing` (execute in order).

## Goal

One server-owned canonical truth for which symbols a free-tier caller may see. All server entry points consult it. Fail-closed (default: free) on any resolution error.

## Canon

- **Free symbols:** `BTCUSD`, `ETHUSD`, `XAUUSD`.
- Anything else requires `pro | elite | custom`.
- Change from current: drop `EURUSD`, add `ETHUSD`.

## Changes

### 1. `apps/web/lib/tier.ts`

- Export `FREE_SYMBOLS = ['BTCUSD', 'ETHUSD', 'XAUUSD'] as const` at top of file.
- Derive `TIER_SYMBOLS.free` from `FREE_SYMBOLS` (spread, not duplicate literal).
- Export `isFreeSymbol(symbol: string): boolean` helper for non-TS call sites (cron, telegram).
- `getUserTier` already fail-closed on DB error — keep; confirm `past_due` → `free` path.

### 2. Call-site audit (no code change expected, just verify)

- `apps/web/app/api/signals/route.ts` — already gates via `filterSignalByTier` + `TIER_DELAY_MS`. ✓
- `apps/web/app/api/signals/history/route.ts` — gates via `TIER_SYMBOLS[tier]` + `meetsMinimumTier('pro')`. ✓

### 3. Defensive filter at pre-record

- In `apps/web/lib/tracked-signals.ts`, the public/free-telegram feed path is downstream. Do NOT gate at `recordSignalsAsync` — recording all symbols is correct, gating happens at read.
- Add `isFreeSymbol` usage in the telegram cron (see Spec 3), not here.

## Non-goals

- No schema change. Tier lives in existing `subscriptions` table.
- No new env vars.
- Do not touch strategy-license system (orthogonal to symbol tiering).

## Verification

- `npm run -w apps/web typecheck` clean.
- Manual: `curl /api/signals` as anonymous → only returns signals whose `symbol ∈ FREE_SYMBOLS`, each ≥15 min old.
- Manual: `curl /api/signals/history?symbol=EURUSD` as anonymous → 403 or empty.

## Rollback

Single-file revert of `apps/web/lib/tier.ts`. No migration to undo.
