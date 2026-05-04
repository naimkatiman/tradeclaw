# Free vs Pro Audit — 2026-05-05

**Auditor:** Claude (subagent-driven via Zaky)
**Branch:** 534e3b4d68d346f3f9f596b769a8bb058d94e6ab (branch: main)
**Status:** in-progress

```
 M DAILY_INTEL_LOG.md
?? docs/superpowers/plans/2026-05-05-free-vs-pro-audit.md
```

## Executive Summary
TBD after all sections complete.

## Section 1 — Source of Truth

### Advertised Free Features

Source: `apps/web/lib/stripe-tiers.ts` lines 38-43, `TIER_DEFINITIONS[0].features`

```
- 6 symbols across crypto, forex, commodities, indices
- 15-minute delayed signals
- TP1 target only
- Last 7 days signal history
```

### Advertised Pro Features

Source: `apps/web/lib/stripe-tiers.ts` lines 54-63, `TIER_DEFINITIONS[1].features`

```
- All traded symbols
- Real-time signal delivery
- Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)
- TP1, TP2, TP3 + Stop Loss
- Private Pro Telegram group
- Full signal history + CSV export
- Every signal in a public Postgres archive — audit win rate yourself
- 7-day free trial
```

### Canonical Constants

Command run: `rg -n "^export const (FREE_SYMBOLS|FREE_HISTORY_DAYS|TIER_SYMBOLS|TIER_HISTORY_DAYS|TIER_DELAY_MS|PRO_PREMIUM_MIN_CONFIDENCE|PAST_DUE_GRACE_DAYS|TIER_LEVEL)" apps/web/lib/`

```
apps/web/lib/tier-client.ts:7:export const FREE_SYMBOLS = [
apps/web/lib/tier-client.ts:27:export const FREE_HISTORY_DAYS = 7;
apps/web/lib/tier-client.ts:35:export const PAST_DUE_GRACE_DAYS = 7;
apps/web/lib/stripe-tiers.ts:9:export const TIER_LEVEL: Record<Tier, number> = {
apps/web/lib/tier.ts:39:export const TIER_SYMBOLS: Record<Tier, string[]> = {
apps/web/lib/tier.ts:47:export const TIER_HISTORY_DAYS: Record<Tier, number | null> = {
apps/web/lib/tier.ts:55:export const TIER_DELAY_MS: Record<Tier, number> = {
apps/web/lib/tier.ts:106:export const PRO_PREMIUM_MIN_CONFIDENCE = 85;
```

Constant-to-copy mapping:

| Constant | Value | Advertised Copy | Match? |
|---|---|---|---|
| `FREE_SYMBOLS` (tier-client.ts:7) | 6 entries: BTCUSD, ETHUSD, XAUUSD, EURUSD, SPYUSD, QQQUSD | "6 symbols across crypto, forex, commodities, indices" | OK |
| `FREE_HISTORY_DAYS` (tier-client.ts:27) | 7 | "Last 7 days signal history" | OK |
| `TIER_DELAY_MS.free` (tier.ts:55) | 15 * 60 * 1000 = 900000 ms = 15 min | "15-minute delayed signals" | OK |
| `TIER_HISTORY_DAYS.free` (tier.ts:47) | derives from FREE_HISTORY_DAYS → 7 | "Last 7 days signal history" | OK |
| `PAST_DUE_GRACE_DAYS` (tier-client.ts:35) | 7 | no advertised copy — internal grace logic only | OK (not a marketing claim) |
| `PRO_PREMIUM_MIN_CONFIDENCE` (tier.ts:106) | 85 | no advertised copy — internal confidence gate; free users see signals in 70-84 band | COPY MISMATCH candidate — deferred to Section 5 |

Note: "TP1 target only" for free is enforced in code at `tier.ts:282-285` (`filterSignalByTier` masks `takeProfit2`/`takeProfit3` to `null`). No constant represents it — pure logic gate. Consistent with copy.

### Strategy List Cross-Check

Command run: `rg -n "PRO_STRATEGIES|ALLOWED_PREMIUM_STRATEGIES" apps/web/lib/`

```
apps/web/lib/tier.ts:111: * Mirrors `ALLOWED_PREMIUM_STRATEGIES` from `./licenses` plus the always-free
apps/web/lib/tier.ts:119:const PRO_STRATEGIES: ReadonlySet<string> = new Set([
apps/web/lib/tier.ts:139: * Today: free → `classic` only; pro/elite/custom → all `PRO_STRATEGIES`.
apps/web/lib/tier.ts:149:      return new Set(PRO_STRATEGIES);
```

`PRO_STRATEGIES` at tier.ts:119-131 contains 8 entries: `classic`, `regime-aware`, `hmm-top3`, `vwap-ema-bb`, `full-risk`, `tv-zaky-classic`, `tv-hafiz-synergy`, `tv-impulse-hunter`.

**licenses.ts status:** MISSING — `apps/web/lib/licenses.ts` does not exist.

The JSDoc at tier.ts:111-117 says "Mirrors `ALLOWED_PREMIUM_STRATEGIES` from `./licenses`" and "If this list drifts from `licenses.ts`, the cross-check test in `tier.test.ts` will fail." Both claims are now false:

1. `licenses.ts` is gone → the mirror relationship is void → comment is **DEAD CODE** (stale reference, tier.ts:111-117).
2. `tier.test.ts` (`apps/web/lib/__tests__/tier.test.ts`) contains **zero** references to `PRO_STRATEGIES` or `ALLOWED_PREMIUM_STRATEGIES` → the cross-check test **does not exist**.

Classification:
- tier.ts:111-117 JSDoc referencing `licenses.ts` → **DEAD CODE** (file deleted, comment never updated)
- Cross-check test for `PRO_STRATEGIES` → **LEAK** (silent drift risk: strategies can be added/removed from `PRO_STRATEGIES` with no test catching it)

## Section 2 — Server-Side Gates
## Section 3 — Stripe Lifecycle & Pro Grants
## Section 4 — UI Affordances
## Section 5 — Marketing Copy Alignment
## Section 6 — Runtime Probes
## Section 7 — Findings Register
## Section 8 — Follow-up Backlog
