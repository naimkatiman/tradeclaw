# Plan — Fix-Now Findings F-001..F-005 (Free vs Pro)

**Date:** 2026-05-05
**Owner:** engineering
**Source audit:** `docs/audits/2026-05-05-free-vs-pro.md` §8 (fix-now specs)
**Coverage audit:** `docs/audits/2026-05-05-plans-free-vs-pro-coverage.md` Recommendation 1

## Status

**SHIPPED 2026-05-05 in commit `bb98cadf`** —
`fix(tier): implement signal visibility controls and fix free/pro data leaks`.

This plan documents the scope of that commit so the audit recommendation has an
owning plan trail. The five findings each have a verification command below.

## Tasks (one per finding)

### F-001 — Dashboard SSR leak (no tier filter, no delay split)
- **File:** `apps/web/app/dashboard/page.tsx`
- **Change:** SSR resolves access context, then `applyTierSignalVisibility` masks
  unowned symbols and free-band confidence, and `splitDelayed` keeps only signals
  past `TIER_DELAY_MS[tier]`. Initial-payload now matches the `/api/signals`
  contract.
- **Verify:**
  ```bash
  grep -n "applyTierSignalVisibility\|splitDelayed" apps/web/app/dashboard/page.tsx
  ```

### F-002 — `/api/prices/stream` SSE no auth + premium-band leak
- **File:** `apps/web/app/api/prices/stream/route.ts`
- **Change:** Resolves caller tier from cookies, gates each frame by symbol
  allowlist + delay cutoff + premium-band hide for free.
- **Verify:**
  ```bash
  grep -n "resolveAccessContextFromCookies\|applyTierSignalVisibility" \
    apps/web/app/api/prices/stream/route.ts
  ```

### F-003 — `/api/demo/telegram` no auth + full TP/SL leak
- **File:** `apps/web/app/api/demo/telegram/route.ts`,
  `apps/web/app/demo/telegram/TelegramDemoClient.tsx`
- **Change:** Sends a public-safe preview only — entry/TP/SL omitted from both
  the Telegram message body and the JSON response. No tier elevation possible.
- **Verify:**
  ```bash
  grep -nE "entry|takeProfit|stopLoss" \
    apps/web/app/api/demo/telegram/route.ts
  ```
  Should return zero matches in the message-format path.

### F-004 — `stopLoss` not masked for free
- **File:** `apps/web/lib/tier.ts`
- **Change:** `filterSignalByTier` for free now sets `stopLoss = null`. Chart
  helpers (`signal-outcome.ts`, `SignalChart.tsx`) handle the null case without
  plotting a fake SL or marking SELL previews stopped.
- **Verify:**
  ```bash
  grep -n "stopLoss" apps/web/lib/tier.ts
  ```
  Should show the `Object.assign(filtered, { stopLoss: null })` assignment.

### F-005 — CSV export advertised, not implemented
- **File:** `apps/web/app/api/signals/history/route.ts`
- **Change:** New `?format=csv` branch — Pro/Elite/Custom only, returns
  `text/csv` with `Content-Disposition: attachment`. Free callers get a 402.
- **Verify:**
  ```bash
  grep -n "Content-Disposition" apps/web/app/api/signals/history/route.ts
  ```

## Verification commands (single batch)

```bash
# All five fix-now sites should now pass:
grep -n "applyTierSignalVisibility\|splitDelayed" apps/web/app/dashboard/page.tsx
grep -n "resolveAccessContextFromCookies" apps/web/app/api/prices/stream/route.ts
grep -nE "entry|takeProfit|stopLoss" apps/web/app/api/demo/telegram/route.ts
grep -n "stopLoss" apps/web/lib/tier.ts
grep -n "Content-Disposition" apps/web/app/api/signals/history/route.ts
```

## Out of scope (covered by sibling plans)

- F-006..F-013, F-016 → `docs/plans/2026-05-05-tier-cleanup.md` and the
  `?from=` attribution one-liner (Rec 7).
- F-014, F-015 (migration application), F-017 →
  `docs/plans/2026-05-05-tier-cleanup.md`.
- TIER_DEFINITIONS feature audit →
  `docs/plans/2026-05-05-pro-feature-copy-vs-delivery.md`.
