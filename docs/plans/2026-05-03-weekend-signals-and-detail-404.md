# 2026-05-03 — Weekend stock signals + /signal/[id] 404 fix

## Problem

1. Weekend signals on closed markets. `apps/web/app/lib/market-hours.ts:37-43` only knows METALS, 7 forex pairs, and CRYPTO. Every other symbol — TSLAUSD, GOOGLUSD, METAUSD, SPYUSD, QQQUSD, NVDAUSD, AAPLUSD, MSFTUSD, AMZNUSD, WTIUSD, BNOUSD — silently defaults to CRYPTO (24/7), so the engine fired SELL/BUY signals on stocks at 22:53 UTC on a Saturday (May 2, 2026).

2. `/signal/TSLAUSD-M15-1777733611049` returns 404. The `[id]` route requires last segment to be BUY/SELL. Legacy ids written by `apps/web/app/api/signals/record/route.ts:23` use `${symbol}-${timeframe}-${Date.now()}` and trip the strict parser.

3. The legacy id format itself: `/api/signals/record` writes ids that don't roundtrip back to the detail page. Future writes should use canonical `SIG-{symbol}-{tf}-{dir}-{base36}`.

## Files

- `apps/web/app/lib/market-hours.ts` — add EQUITIES (Mon–Fri 13:00–21:00 UTC, covers DST swing) and COMMODITIES (Mon–Fri 08:00–21:00 UTC, conservative oil window). Classify stocks + oil into the new buckets.
- `apps/web/app/lib/__tests__/market-hours.test.ts` — new. Pin Sat/Sun closed for stocks + oil, weekday open during US session, crypto always open, forex weekend rules.
- `apps/web/app/signal/[id]/page.tsx` — when last segment is not BUY/SELL, look up the row in `signal_history` by full id and use stored direction.
- `apps/web/lib/signal-history.ts` — add `getRecordByIdAsync(id)` returning a `SignalHistoryRecord` or undefined.
- `apps/web/app/api/signals/record/route.ts` — use `sig.id` (already canonical from `getSignals`) instead of constructing a legacy id.

## Verification

1. Unit: `vitest run market-hours` — Saturday returns false for SPYUSD/TSLAUSD/WTIUSD; true for BTCUSD; correct forex Sun-open / Sat-close.
2. Build: `npm run build -w apps/web` green.
3. Manual: `/signal/TSLAUSD-M15-1777733611049` resolves (renders signal page) instead of 404.
4. Production smoke: monitor `signal_history` for any new stock rows with `created_at` between Fri 21:00 UTC and Mon 13:00 UTC — should be zero post-deploy.

## Out of scope

- Half-hour granularity for the 14:30 UTC equities open. Using 13:00 UTC covers DST/non-DST transitions and is conservative on the closed-side.
- Backfilling legacy ids in `signal_history`.
