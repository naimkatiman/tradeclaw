# Free vs Pro Audit — 2026-05-05

**Auditor:** Claude (subagent-driven via Zaky)
**Branch:** 534e3b4d68d346f3f9f596b769a8bb058d94e6ab (branch: main)
**Status:** in-progress

```
 M DAILY_INTEL_LOG.md
?? docs/superpowers/plans/2026-05-05-free-vs-pro-audit.md
```

## Executive Summary

Audit walked the full free/pro surface across server gates, field-level masks, Stripe lifecycle, UI affordances, and marketing copy. Found **1 critical, 4 high, 5 medium, 7 low** findings. Top three risks: (1) dashboard SSR path bypasses `filterSignalByTier` and `splitDelayed`, meaning a preset change or `classic` backfill instantly exposes unmasked TP2/TP3/MACD/BB/Stoch to free users; (2) `/api/prices/stream` SSE emits entry + direction + confidence for all signals including premium-band with no auth, fully bypassing the symbol allow-list and confidence-band gate; (3) `stopLoss` is advertised as a Pro-only field but passes through `filterSignalByTier` unmasked for free callers.

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

### Tier-Aware Routes

Step 1 grep (`getTierFromRequest|getUserTier|resolveAccessContext|resolveAccessContextFromCookies|filterSignalByTier|meetsMinimumTier|TIER_SYMBOLS|TIER_DELAY_MS|TIER_HISTORY_DAYS|PRO_PREMIUM_MIN_CONFIDENCE`) deduped to these API route files:

```
apps/web/app/api/alert-rules/route.ts
apps/web/app/api/keys/route.ts
apps/web/app/api/consensus/route.ts
apps/web/app/api/explain/route.ts
apps/web/app/api/premium-signals/chart/route.ts
apps/web/app/api/premium-signals/route.ts
apps/web/app/api/strategy-breakdown/route.ts
apps/web/app/api/v1/signals/route.ts
apps/web/app/api/signal-of-the-day/route.ts
apps/web/app/api/auth/session/route.ts
apps/web/app/api/signals/equity/route.ts
apps/web/app/api/signals/route.ts
```

(Non-route files excluded: page.tsx components, test files, pricing page.)

### Gate Matrix

| Route | Method | Tier resolution call | What it gates | Default on error / free caller |
|---|---|---|---|---|
| `/api/alert-rules` | GET | none — session only | read own rules (no tier gate) | 401 if no session |
| `/api/alert-rules` | POST | `getTierFromRequest` (line 38) | creating >3 active rules requires Pro | 402 + `upgradeRequiredBody` (canonical) |
| `/api/keys` | GET | none — no auth required | lists masked keys (no tier gate on read) | none — open |
| `/api/keys` | POST | `getTierFromRequest` (line 40) | API key creation is Pro-only | 402 + `upgradeRequiredBody` (canonical) |
| `/api/consensus` | GET | `resolveAccessContext` (line 48) | passes `ctx` into `getTrackedSignals`; tier applies inside tracked-signals (symbol + confidence filters); no hard reject | 500 on resolver failure; free sees tier-filtered signals |
| `/api/explain` | GET | `getTierFromRequest` (line 30) via `enforceExplainQuota` | Pro bypass; free/anon capped at 10 calls/24h | 402 + `upgradeRequiredBody` (canonical) |
| `/api/explain` | POST | same as GET via `enforceExplainQuota` | same quota gate | 402 + `upgradeRequiredBody` (canonical) |
| `/api/premium-signals` | GET | `resolveAccessContext` (line 9) | `unlockedStrategies.size <= 1` → returns `{ signals: [], locked: true }` with **200 OK** | 200 + `{ signals: [], locked: true }` — NO 402/403 |
| `/api/premium-signals/chart` | GET | `resolveAccessContext` (line 18) | filters premium strategies (all except `classic`); 0 premium → 403 | 403 + `{ error: 'locked' }` — uses custom shape, not `upgradeRequiredBody` — **COPY MISMATCH** |
| `/api/strategy-breakdown` | GET | `resolveAccessContext` (line 14) | filters rows to `unlockedStrategies`; free sees only `classic` row | no rejection — returns filtered subset with 200 |
| `/api/v1/signals` | GET | `getTierFromRequest` (line 73) + `resolveAccessContext` (line 137) | symbol allowlist, 15-min delay, confidence band hide (`PRO_PREMIUM_MIN_CONFIDENCE`) | 200 with tier-filtered set; error path returns `{ ok: true, count: 0, signals: [] }` (no 4xx) |
| `/api/signal-of-the-day` | GET | `resolveAccessContext` (line 149) | passes `ctx` to `getTrackedSignals`; tier filters inside | 200 empty payload if no signals; no hard tier reject |
| `/api/auth/session` | GET | `getUserTier` (line 23, import) | returns tier in session payload for client use; does not gate the route itself | 200 + `{ data: null }` if no session |
| `/api/signals/equity` | GET | `PRO_PREMIUM_MIN_CONFIDENCE` (line 37) as band filter only | band param `premium`/`standard` filters confidence locally; no caller-tier check | 200 with all resolved signals — **no caller-tier gate** |
| `/api/signals` | GET | `getUserTier` (line 42) + `filterSignalByTier` (line 110, 149) + `TIER_DELAY_MS` | symbol allowlist, TP2/TP3 masking, delay; `splitDelayed` populates `lockedSignals` | 200 with tier-filtered + locked stubs; no 4xx for free |

### Routes Reading Signals Without Gate (Step 3)

Step 3 grep (`getSignals\(|getTrackedSignals\(|listPremiumSignalsSince\(|recordNewSignals\(|signal_history`) in `apps/web/app/api`:

| File:Line | Function called | Classification |
|---|---|---|
| `apps/web/app/api/cron/signals/route.ts:51` | `getSignals(` inside `recordNewSignals` | OK (cron) — guarded by `CRON_SECRET` bearer auth at line 27-33; fails closed in production |
| `apps/web/app/api/cron/telegram/route.ts:47` | `signal_history` raw SQL | OK (cron) — guarded by `CRON_SECRET` bearer auth at line 14-18 |
| `apps/web/app/api/cron/social/weekly/route.ts:30,37` | `signal_history` raw SQL | OK (cron) — guarded by `CRON_SECRET` at line 8 |
| `apps/web/app/api/cron/social/daily/route.ts:27` | `signal_history` raw SQL | OK (cron) — guarded by `CRON_SECRET` at line 8 |
| `apps/web/app/api/consensus/route.ts:51,52` | `getTrackedSignals(` | OK — tier context passed via `resolveAccessContext` at line 48; signals are tier-filtered inside `getTrackedSignals` |
| `apps/web/app/api/premium-signals/route.ts:19` | `listPremiumSignalsSince(` | OK — guarded by `resolveAccessContext` + strategy-count check at line 10; returns empty + `locked:true` at line 11-13 |
| `apps/web/app/api/v1/signals/route.ts:148` | `getTrackedSignals(` | OK — tier gate applied via `applyTierGate` before and `TIER_SYMBOLS`/`TIER_DELAY_MS`/`PRO_PREMIUM_MIN_CONFIDENCE` filters inline |
| `apps/web/app/api/og/summary/route.tsx:23` | `signal_history` raw SQL | OK (intentionally public) — OG image for social sharing; only aggregated win-rate/PnL stats, no individual signal data |
| `apps/web/app/api/og/track-record/route.tsx:16` | `signal_history` raw SQL | OK (intentionally public) — same as og/summary; aggregated stats only for OG image |
| `apps/web/app/api/prices/stream/route.ts:116` | `getSignals(` inside `fetchRealSignals` | **LEAK** — SSE stream calls `getSignals({})` with no tier context. Emitted payload (lines 325-333) includes `direction`, `entry`, `confidence`, and indicator-derived `reason` (RSI/MACD/EMA/Stoch/BB direction strings via `buildReason`) for ALL signals including premium-band (≥85). `stopLoss` and `takeProfit` are NOT in the SSE payload. No auth required to subscribe. Sufficient to bypass the symbol allow-list and the premium-band hide for entry+direction+confidence. |
| `apps/web/app/api/signal-of-the-day/route.ts:49` | `getTrackedSignals(` | OK — `resolveAccessContext` at line 149 passes `ctx`; tier-filtered |
| `apps/web/app/api/telegram/webhook/route.ts:141` | `getTrackedSignals(` | OK (intentionally public) — Telegram webhook; `handleSignals` passes no `ctx` (no tier arg), so free-tier `classic` strategy only; intentional per code comment "Intentionally no license ctx — Telegram broadcasts are public, so only the free classic strategy is emitted" (line 139-140) |
| `apps/web/app/api/signals/record/route.ts:13` | `getSignals(` | **LEAK** — POST/GET with no auth guard whatsoever (no session check, no CRON_SECRET); any caller can trigger a `recordSignalAsync` write to `signal_history`. Not a data-read leak but a write-gate leak — external actors can pollute `signal_history`. |
| `apps/web/app/api/signals/public/route.ts:16` | `getTrackedSignals(` | OK (intentionally public) — hardcodes `getStrategiesForTier('free')` ctx; uses `toTeaser()` to strip id/entry/stops; marketing landing teaser feed |
| `apps/web/app/api/signals/accuracy-context/route.ts:14` | `signal_history` via `readHistoryAsync` | OK (intentionally public) — returns aggregated accuracy stats per symbol/timeframe; no individual signal row exposed |
| `apps/web/app/api/demo/telegram/route.ts:57` | `getSignals(` | **LEAK** — POST with only rate-limit-by-chatId protection (in-memory, not persistent); no auth, no tier check; sends full signal including `entry`, `takeProfit1`, `stopLoss` to any supplied Telegram chatId. Any caller with a valid-format chatId can pull a complete signal. |
| `apps/web/app/api/risk/gate-state/route.ts:6` | `signal_history` (comment only) | OK (intentionally public) — comment explains reasoning; route calls `fetchGateState()` which derives regime/drawdown/streak from signal_history aggregate stats, not raw rows |

### v1 Public API Cache Header Check (Step 4)

File: `apps/web/app/api/v1/signals/route.ts`

- `X-TradeClaw-Tier` header: SET at line 77 — `"X-TradeClaw-Tier": tier` — confirmed.
- `Vary: Cookie` header: SET at line 79 — `Vary: "Cookie"` — confirmed. CDN will key the cache on the Cookie header, so a free session and a pro session will not share a cache slot.
- `Cache-Control`: `"public, s-maxage=60"` (line 75) — shared across tiers. The `Vary: Cookie` mitigates cross-tier poisoning for browser sessions. However: API key callers send the key as an `Authorization` header or query param, NOT as a Cookie. If two requests arrive with different tiers but no Cookie (API key callers), the CDN may serve the same cached response. `Vary` does not cover `Authorization`. This is a **conditional LEAK** — only affects API key callers hitting an edge CDN cache. Does not apply to Railway's Node server (no CDN layer), but matters if a CDN proxy is added.

Classification: **CONDITIONAL LEAK** (cache-header mismatch for API-key callers at a CDN edge; not currently exploitable on Railway without a CDN).

### Premium-Signals Pro-Only Check (Step 5)

**`/api/premium-signals/route.ts`** (line 9-13):
- Calls `resolveAccessContext(req)`
- Gate: `access.unlockedStrategies.size <= 1` (i.e., only `classic` unlocked = free tier)
- Response for free: `{ signals: [], locked: true }` with HTTP **200** — no 402/403
- Classification: **COPY MISMATCH** — does not use `upgradeRequiredBody`; silently returns empty set instead of an upgrade prompt

**`/api/premium-signals/chart/route.ts`** (line 18-22):
- Calls `resolveAccessContext(req)`
- Gate: filters strategies to those that are NOT `classic`; if none → rejects
- Response for free: `{ error: 'locked' }` with HTTP **403** — does not use `upgradeRequiredBody`
- Classification: **COPY MISMATCH** — custom error shape, no upgrade hint in response body

### Dead-Code Path Check (Step 6)

```bash
rg -n "insertSignals\(" apps/web   # → 0 results
rg -n "live_signals" apps/web      # → only migrations/002_live_signals.sql,
                                   #   migrations/021_drop_live_signals.sql,
                                   #   apps/web/app/api/cron/signals/route.ts:53 (comment only)
```

`insertSignals()` has 0 callers in the entire `apps/web` tree. `live_signals` has no runtime references outside migration files and a single comment in the cron route. Per workspace CLAUDE.md, table is empty (0 rows) — to be verified in Section 6.

Classification: **DEAD CODE** — `apps/web/lib/signal-repo.ts` → `insertSignals()` is uncalled. `live_signals` table + `002_live_signals.sql` are superseded by `021_drop_live_signals.sql`. Add to Section 8 follow-up.

### TradingSignal Surface

Source: `packages/signals/src/types.ts:5-32`

`TradingSignal` has **20 fields** (13 required, 7 optional).

Required fields:
1. `id: string`
2. `symbol: string`
3. `direction: Direction`
4. `confidence: number`
5. `entry: number`
6. `stopLoss: number`
7. `takeProfit1: number`
8. `takeProfit2: number | null`
9. `takeProfit3: number | null`
10. `indicators: IndicatorSummary`
11. `timeframe: Timeframe`
12. `timestamp: string`
13. `status: SignalStatus`

Optional fields:
14. `source?: 'real' | 'fallback'`
15. `dataQuality?: 'real' | 'synthetic'`
16. `atrCalibration?: { multiplier: number; confidence: 'low' | 'medium' | 'high' }`
17. `entryAtr?: number`
18. `atrMultiplier?: number`
19. `skill?: string`
20. `strategyId?: string`

`IndicatorSummary` (source: `packages/signals/src/types.ts:34-45`) has 8 sub-fields — 6 required, 2 optional:
- Required: `rsi`, `macd`, `ema`, `bollingerBands`, `stochastic`, `support`, `resistance`
- Optional: `adx`, `volume`

Note: `support` and `resistance` are arrays; they count as one field each for the coverage table below.

### Field-Level Mask Coverage

`filterSignalByTier` source: `apps/web/lib/tier.ts:266-298`.
Advertising source: `apps/web/lib/stripe-tiers.ts:38-63`.

Free advertised: "TP1 target only" (line 41), "6 symbols" (line 40), "15-minute delayed signals" (line 42).
Pro advertised: "TP1, TP2, TP3 + Stop Loss" (line 58), "Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)" (line 57).

| Field | Pro sees | Free sees | Mask enforced in filterSignalByTier? | Classification |
|---|---|---|---|---|
| `id` | full value | full value | no mask | tier-agnostic — identity field, no trade value |
| `symbol` | full value | full value (already filtered by allowlist at line 271) | symbol-level null return, not field mask | tier-agnostic — allowlist gate is correct mechanism |
| `direction` | full value | full value | no mask | tier-agnostic — direction alone is actionable but disclosed in LockedSignalStub too; deliberate design |
| `confidence` | full value | full value (band capped at <85 by null-return at line 275) | band gate returns null, not field mask | tier-agnostic for values that pass the band gate; gate is correct mechanism |
| `entry` | full value | **full value** | **no mask** | **AMBIGUOUS** — implementer flagged as LEAK but copy never says entry is Pro-only. "TP1 target only" refers to TP levels; entry is the baseline field needed to act on any signal. Mask author's intent (entry not masked) is consistent with this reading. Conservative-policy LEAK at most; not a clear copy-vs-code gap. |
| `stopLoss` | full value | **full value** | **no mask** | **LEAK (high)** — Pro copy says "TP1, TP2, TP3 + Stop Loss"; free copy says "TP1 target only" (no SL mention). The omission is structurally parallel to TP2/TP3 which ARE masked. `stopLoss` passes through to free unmasked. Cleanest copy-vs-code gap in this section. |
| `takeProfit1` | full value | full value | no mask needed | tier-agnostic — advertised explicitly as a free-tier feature |
| `takeProfit2` | full value | `null` | masked at tier.ts:283 | OK — enforced |
| `takeProfit3` | full value | `null` | masked at tier.ts:284 | OK — enforced |
| `indicators.rsi` | full value | **full value** | **no mask** | **AMBIGUOUS** — Pro copy lists "Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)". Differentiator keyword is "Multi-timeframe", not just the indicator names. Mask author explicitly chose to zero MACD/BB/Stoch but leave RSI/EMA — author's intent is RSI/EMA = baseline single-TF indicators free can see. Copy clarity issue, not a clean leak. |
| `indicators.macd` | full value | zeroed (`{ histogram: 0, signal: 'neutral' }`) | masked at tier.ts:291 | OK — zeroed |
| `indicators.ema` | full value | **full value** | **no mask** | **AMBIGUOUS** — same as RSI: "Multi-timeframe" is the differentiator. Mask author left EMA un-zeroed alongside RSI, signalling baseline-indicator intent. Copy clarity issue. |
| `indicators.bollingerBands` | full value | zeroed (`{ position: 'middle', bandwidth: 0 }`) | masked at tier.ts:292 | OK — zeroed |
| `indicators.stochastic` | full value | zeroed (`{ k: 0, d: 0, signal: 'neutral' }`) | masked at tier.ts:293 | OK — zeroed |
| `indicators.support` | full value | **full value** | **no mask** | LEAK candidate — support levels are price data; not mentioned in either tier's copy, but revealing S/R levels to free users exposes TA output not attributed to any free feature. Low severity. |
| `indicators.resistance` | full value | **full value** | **no mask** | LEAK candidate — same as `support`; no copy mention, passes through. Low severity. |
| `indicators.adx` | full value | **full value** | **no mask** | LEAK candidate — optional field, present when emitted by TA engine. Not mentioned in Pro copy. Passes through unmasked. Low severity. |
| `indicators.volume` | full value | **full value** | **no mask** | LEAK candidate — optional volume ratio field. Not mentioned in free copy. Passes through unmasked. Low severity. |
| `timeframe` | full value | full value | no mask | tier-agnostic — timeframe metadata, no trade value |
| `timestamp` | full value | full value (delay applied upstream in `/api/signals` route via `splitDelayed`, not in this function) | no mask here | tier-agnostic within `filterSignalByTier`; delay enforced at route layer |
| `status` | full value | full value | no mask | tier-agnostic — signal lifecycle metadata, no trade value |
| `source` | full value | full value | no mask | tier-agnostic — internal metadata tag |
| `dataQuality` | full value | full value | no mask | tier-agnostic — internal quality tag |
| `atrCalibration` | full value | **full value** | **no mask** | LEAK candidate — exposes calibration multiplier and confidence used for SL sizing. Not advertised as either tier feature. Passes through. Low severity. |
| `entryAtr` | full value | **full value** | **no mask** | LEAK candidate — ATR value at signal time; complements `entry` and `stopLoss` for position sizing. Not advertised as either tier feature. Low severity. |
| `atrMultiplier` | full value | **full value** | **no mask** | LEAK candidate — multiplier applied at signal time. Same classification as `entryAtr`. Low severity. |
| `skill` | full value | full value | no mask | tier-agnostic — internal agent metadata |
| `strategyId` | full value | full value | no mask | tier-agnostic — free callers only see `classic`-strategy signals due to upstream strategy filter; value will always be `classic` for free |

**Summary: 20 TradingSignal top-level fields + 8 IndicatorSummary sub-fields broken out = 28 coverage rows.**

After spec-review reconciliation:

**High-severity LEAK (clean copy-vs-code gap):**
- `stopLoss` — Pro copy lists Stop Loss as a Pro feature; free copy says "TP1 target only" (no SL mention). Structurally parallel to TP2/TP3 which ARE masked. Not masked → leak.

**Ambiguous (flagged for Section 5 copy-clarity discussion, NOT high-severity leaks):**
- `entry` — copy never says entry is Pro-only; baseline field needed to act on a signal. Mask author's intent supports current behavior. Conservative-policy LEAK at most.
- `indicators.rsi`, `indicators.ema` — Pro copy says "Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)". Mask author zeroed MACD/BB/Stoch but explicitly left RSI/EMA. Most plausible reading: "Multi-timeframe" is the differentiator, RSI/EMA are baseline indicators. Recommend tightening the copy in Section 5 instead of the mask.

**Low-severity LEAK candidates (no copy promise, but silent TA data exposure):**
- `indicators.support`, `indicators.resistance`, `indicators.adx`, `indicators.volume`
- `atrCalibration`, `entryAtr`, `atrMultiplier`

### LockedSignalStub Narrowness Check

Source: `apps/web/lib/tier.ts:70-99`

`LockedSignalStub` interface (lines 70-79): 7 fields.
1. `id: string`
2. `symbol: string`
3. `direction: 'BUY' | 'SELL'`
4. `timeframe: string`
5. `confidence: number`
6. `availableAt: string`
7. `locked: true`

`toLockedStub` (lines 86-100) picks exactly `id, symbol, direction, timeframe, confidence, timestamp` from the full signal (timestamp is used only to compute `availableAt`, not emitted), then adds `locked: true`. The emitted object contains exactly the 7 stub fields — no extras.

**Stub narrowness check: PASS.** The interface has exactly 7 keys. No entry price, no SL, no TP, no indicators. The stub function does not widen the interface.

Note: `toLockedStub` accepts a `Pick<TradingSignal, ...>` that includes `timestamp`. `timestamp` is used only to compute `availableAt` and is not present in the returned object. The stub correctly withholds it.

## Section 3 — Stripe Lifecycle & Pro Grants

### Pro-Grant Paths

Every code path that can resolve a user to `tier === 'pro'` in `getUserTier` (`apps/web/lib/tier.ts:220-260`):

| # | Condition | File:Line |
|---|---|---|
| 1 | Stripe subscription with `status === 'active'` | `tier.ts:229` |
| 2 | Stripe subscription with `status === 'trialing'` | `tier.ts:229` |
| 3 | Stripe subscription with `status === 'past_due'` AND `Date.now() <= currentPeriodEnd + PAST_DUE_GRACE_DAYS * 86400 * 1000` | `tier.ts:231-238` |
| 4 | `isAdminEmail(user.email)` — email is in `ADMIN_EMAILS` env or default `['naimkatiman@gmail.com']` | `tier.ts:251`, `admin-emails.ts:34-37` |
| 5 | `isProGrantedEmailDeep(user.email)` — email is in `PRO_EMAILS` env or default `['naimkatiman92@gmail.com']` (bootstrap) | `tier.ts:251`, `admin-emails.ts:44-47` |
| 6 | `isProGrantedEmailDeep(user.email)` — email has an active row in `pro_email_grants` DB table (admin-granted via `/admin/pro-grants`) | `tier.ts:251`, `admin-emails.ts:83-91` |

Note: `elite` tier uses the same code paths (paths 1-3 branch on `sub.tier`, not hardcoded `'pro'`). The email-grant paths (4-6) hard-code `tier = 'pro'` regardless of sub tier — there is no `elite` email-grant path.

Total: **6 Pro-grant paths** (paths 4 and 5 share the same `isProGrantedEmailDeep` call site; split here because their truth sources differ).

### Stripe Webhook Audit

Webhook route: `apps/web/app/api/stripe/webhook/route.ts`

**Signature verification:** `constructEvent(rawBody, sig, webhookSecret)` at line 39, called before any DB mutation. The raw body is read via `request.text()` (line 23) so it is never consumed as JSON before signing. `STRIPE_WEBHOOK_SECRET` absence returns HTTP 500 (line 28-31); missing `stripe-signature` header returns HTTP 400 (line 33-35). Verification is fail-closed. No LEAK.

**Event handler coverage:**

| Event | Handled? | Handler | Notes |
|---|---|---|---|
| `checkout.session.completed` | YES | `handleCheckoutCompleted` (line 56-59) | Upserts subscription, updates user tier, sends Telegram invite |
| `customer.subscription.updated` | YES | `handleSubscriptionUpdated` (line 62-65) | Mirrors tier + period from subscription; syncs `trial_end` |
| `customer.subscription.deleted` | YES | `handleSubscriptionDeleted` (line 68-71) | Sets user to free, cancels DB record, revokes Telegram access |
| `invoice.payment_failed` | YES | `handlePaymentFailed` (line 80-83) | Marks subscription `past_due`; sends one dunning email |
| `invoice.payment_succeeded` | YES | `handlePaymentSucceeded` (line 74-77) — note: event is `invoice.payment_succeeded`, not `invoice.paid` | Flips subscription status back to `active` |
| `invoice.paid` | NO (unhandled — falls to `default:`) | — | `invoice.payment_succeeded` is handled instead; these are different events. Stripe fires `invoice.payment_succeeded` on successful charge and `invoice.paid` after successful charge + invoice marked paid. In practice both fire; missing `invoice.paid` is NOT a gap because `invoice.payment_succeeded` already resets status. No LEAK. |
| `customer.subscription.trial_will_end` | NO | — | Informational only; no tier change needed. Absence means no dunning-style trial-expiry email is sent from this handler. Low severity. |

All five functionally critical events are handled. `invoice.paid` is absent but not a gap given `invoice.payment_succeeded` coverage.

**Idempotency gate:** `tryClaimStripeEvent(event.id, event.type)` at line 50 before any handler runs. On failure inside a handler, `releaseStripeEvent(event.id)` at line 99 allows Stripe to retry. Handlers are idempotent at the DB level (`ON CONFLICT DO UPDATE` on `stripe_subscription_id`). Telegram invite side-effect in `handleCheckoutCompleted` is NOT idempotent — but the claim gate prevents double-sends on Stripe redeliveries. Re-runs after a crash between claim and release could double-send. Low severity.

**Unknown price guard:** Both `handleCheckoutCompleted` (line 141-145) and `handleSubscriptionUpdated` (line 201-207) throw on unknown price IDs rather than silently downgrading a paying user to `free`. Correct posture.

**Overall verdict: PASS — no LEAK in webhook handler layer.**

### past_due Grace Window

Constant: `PAST_DUE_GRACE_DAYS = 7` (`apps/web/lib/tier-client.ts:35`).

Timeline for a subscription with `currentPeriodEnd = T`:
- Day 0 (T): Stripe fires first `invoice.payment_failed` → `updateSubscriptionStatus(id, 'past_due')` → subscription row now `status = past_due`.
- Days 0-7: `getUserTier` computes `Date.now() <= T + 7 * 86400 * 1000` → `true` → user remains `'pro'`.
- Day 8: grace window expires → `getUserTier` returns `'free'` on next request.

Smart Retry edge case: Stripe retries on days ~2, ~4, ~7 (configurable). If retry on day 6 succeeds:
1. Stripe fires `invoice.payment_succeeded` → `handlePaymentSucceeded` → `updateSubscriptionStatus(id, 'active')`.
2. Next call to `getUserTier` reads `status = 'active'` → returns `'pro'`. No downgrade on day 7.

The grace window and the `invoice.payment_succeeded` handler are complementary: the grace window covers days 0-7; recovery flips `active` before day 8 if retries succeed. If Smart Retries exhaust (after ~3 weeks) without success, Stripe fires `customer.subscription.deleted` → `handleSubscriptionDeleted` → user tier set to `'free'`, DB record cancelled. Timeline consistent and correct.

One minor gap: `getUserTier` checks the grace window on every request but the DB row stays `past_due` for the full 7 days even after day 8. There is no webhook or cron that marks the row `canceled` when grace expires — the row remains `past_due` indefinitely if Stripe never fires `subscription.deleted`. In practice, Stripe Smart Retries fire `subscription.deleted` after exhaustion, so this is a theoretical gap only.

### Admin-Granted Backdoor

`apps/web/lib/admin-emails.ts` has two truth sources:

| Function | Truth source |
|---|---|
| `isProGrantedEmail` | `PRO_EMAILS` env only (sync, no DB) |
| `isProGrantedEmailDeep` | `PRO_EMAILS` env OR `pro_email_grants` DB table (async; 60-second process-local TTL cache) |
| `isAdminEmail` | `ADMIN_EMAILS` env only (sync, no DB) |

Both `PRO_EMAILS` and `ADMIN_EMAILS` have hardcoded defaults (`naimkatiman92@gmail.com` and `naimkatiman@gmail.com` respectively) that apply when the env var is absent or empty. These defaults are the bootstrap grant for the repo owner. They are visible in source — low risk for a self-hosted MIT project but worth noting.

**Admin UI for grant/revoke:** EXISTS at `apps/web/app/admin/pro-grants/` — `actions.ts` + `ProGrantsClient.tsx`. Both `grantProAction` and `revokeProAction` call `requireAdmin()` at entry, so only admin-authed sessions can invoke them.

**Audit log:** The `pro_email_grants` table schema (migration `020_pro_email_grants.sql`) stores `granted_by`, `created_at`, `revoked_at`, and `revoked_by`. The DB functions `addProEmailGrant` and `revokeProEmailGrant` in `db.ts` write all four columns. Grant/revoke actions record who acted and when — **audit trail exists**.

`invalidateProGrantsCache()` is called after every grant and revoke action (`actions.ts:46, 68`), so changes propagate within the same process instance immediately. Other Railway instances pick up the change after the 60-second TTL.

**No LEAK in the admin backdoor path.** Classified as intended-design, not a vulnerability.

### Active Pro Users by Source

Deferred to Section 6 runtime probes. `DATABASE_URL` may point at production — DB queries deferred to avoid live data impact.

### Fail-Closed Posture

Both tier-resolution functions catch all errors and return `'free'`:

| Function | Catch clause | Location |
|---|---|---|
| `getUserTier` | `catch { return 'free'; }` | `tier.ts:257-258` |
| `getTierFromRequest` | `catch { return 'free'; }` | `tier.ts:322-323` |

`resolveAccessContext` wraps `getTierFromRequest` at `tier.ts:181-185` — same `catch { return free-tier context }` pattern.

On DB unreachability, `loadProGrantedEmailsFromDb` also falls back to an empty grant set (not an exception propagation) — `admin-emails.ts:71-75`.

**Fail-closed posture: PASS.** No path exists where an error escalates a user above `'free'`.

## Section 4 — UI Affordances

### Tier-Aware Components

Grep: `rg -l "useUserTier|useUserSession|tier.*free|tier.*pro|LockedSignalStub|filterSignalByTier|resolveAccessContext" apps/web --type ts --type tsx -g '!*.next'`

Filtered to genuine gating or display surfaces (excluded pure data layer, API routes, and test files):

| Component | File | Role | Server or Client |
|---|---|---|---|
| `TierBadge` | `apps/web/components/TierBadge.tsx` | Display-only badge; links to `/pricing?from=badge` | Client (`useUserTier`) |
| `DelayCountdown` | `apps/web/components/DelayCountdown.tsx` | Countdown timer for 15-min delay; links to `/pricing?from=delay` | Client (props only, no tier fetch) |
| `LockedTP` | `apps/web/components/LockedTP.tsx` | Masked TP2/TP3 cell; links to `/pricing?from=tp<N>[-source]` | Client (display stub) |
| `TierBanner` | `apps/web/app/components/tier-banner.tsx` | Upgrade banner shown to free/anonymous users | Client (`useUserSession`) |
| `DashboardClient` | `apps/web/app/dashboard/DashboardClient.tsx` | Main dashboard; renders `LockedSignalCard` for delayed signals | Client (`useUserSession`) |
| `LockedSignalCard` | inside `DashboardClient.tsx:348-397` | Renders stub-only row for delayed locked signals | Client (receives `LockedSignalStub` prop) |
| `LiveHeroSignals` | `apps/web/components/landing/live-hero-signals.tsx` | Landing page teaser; uses `toTeaser()` — no tradeable data | Server (no tier context needed) |

7 genuine tier-aware surfaces identified. `LiveHeroSignals` is server-rendered and consumes only the public teaser endpoint — no tier gate required; included for completeness.

### Client-Side Tier Trust Audit

Concern: a client component that derives tier from `document.cookie` or a client-side cookie read would allow spoofing.

**Audit method:** Grep for `document.cookie`, `js-cookie`, `Cookies.get`, `parseCookies` in client components; inspect `useUserTier` and `useUserSession` source.

`apps/web/lib/hooks/use-user-tier.ts`:
- `useUserSession()` fetches `/api/auth/session` inside `useEffect` — server-validated response.
- `useUserTier()` returns `session?.tier ?? null` — no browser cookie read anywhere in the call chain.

No component reads `document.cookie` or any browser-side cookie to derive tier. All tier reads flow through the `/api/auth/session` server endpoint.

**Result: ALL PASS.** No client-side tier trust vulnerability found.

### lockedSignals Renderer Audit

`LockedSignalCard` at `DashboardClient.tsx:348-397` receives `stub: LockedSignalStub`.

`LockedSignalStub` interface (`apps/web/lib/tier.ts`):
```ts
interface LockedSignalStub {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  timeframe: string
  confidence: number
  availableAt: string   // ISO timestamp; computed from signal.timestamp + delayMs
  locked: true
}
```

Fields accessed inside `LockedSignalCard`: `stub.symbol`, `stub.direction`, `stub.timeframe`, `stub.confidence`, `stub.availableAt`. Five of seven stub fields — none are price levels.

`toLockedStub` (`tier.ts`) builds the stub from `Pick<TradingSignal, 'id'|'symbol'|'direction'|'timeframe'|'confidence'|'timestamp'>`. The original `timestamp` is used only to compute `availableAt`; it is not forwarded on the stub.

`lockedSignals` state in `DashboardClient` is typed `LockedSignalStub[]` (line 905) and is populated only from the client refetch path (`setLockedSignals(signalsRes.value.lockedSignals || [])` at line 959). The SSR `initialSignals` prop is typed `TradingSignal[]` and is never widened to feed the locked list — the two arrays are kept separate.

**Result: PASS.** The locked renderer never receives a full `TradingSignal`; all tradeable fields (entry, SL, TP1/2/3, indicators) are structurally absent from the stub type.

### Upgrade CTA Attribution

Methodology: grep `href.*pricing` across all `.tsx` files in `apps/web/`.

CTAs with correct `?from=` attribution:

| Location | Link | Status |
|---|---|---|
| `TierBadge.tsx:21` | `/pricing?from=badge` | PASS |
| `DelayCountdown.tsx:75` | `/pricing?from=delay` | PASS |
| `LockedTP.tsx:20-27` | `/pricing?from=tp<N>[-source]` | PASS |
| `DashboardClient.tsx:389` | `/pricing?from=locked-signal` | PASS |
| `signal/[id]/page.tsx:384` | `/pricing?from=signal-detail` | PASS |

CTAs missing `?from=` attribution:

| Location | Link | Context | Severity |
|---|---|---|---|
| `apps/web/app/components/tier-banner.tsx:79` | `/pricing` (bare) | Main upgrade CTA shown to all free/anonymous users — highest-traffic upgrade surface | HIGH |
| `apps/web/app/dashboard/DashboardClient.tsx:128` | `/pricing` (bare) | Telegram tooltip text on free-locked signal row | LOW |
| `apps/web/app/signin/page.tsx:222` | `/pricing` (bare) | "Upgrade to Pro" link on signin page | MEDIUM |
| `apps/web/app/contact-sales/page.tsx:85` | `/pricing` (bare) | Back-link on contact-sales page | LOW |

`apps/web/components/site-footer.tsx:19` links to `/pricing` without `?from=` but is a navigation item — tolerable, not an upgrade CTA.

**Result: 4 CTAs missing `from=`. Highest-priority fix: `tier-banner.tsx:79`.**

### Dashboard Split-Render Audit

**Question:** Does `dashboard/page.tsx` apply `filterSignalByTier` before passing `initialSignals` to `DashboardClient`, and does it run `splitDelayed` to carve locked stubs from the visible set?

`apps/web/app/dashboard/page.tsx` (lines 14-29):
```tsx
const ctx = await resolveAccessContextFromCookies();
const result = await getTrackedSignals({
  minConfidence: WATCHLIST_MIN_CONFIDENCE,
  ctx,
});
initialSignals = result.signals;
// ...
return (
  <DashboardClient
    initialSignals={initialSignals}
    initialSyntheticSymbols={initialSyntheticSymbols}
  />
);
```

`getTrackedSignals` (`apps/web/lib/tracked-signals.ts`) applies:
- Strategy-id filter (lines 265-268): drops signals where `strategyId` is not in `ctx.unlockedStrategies`
- Confidence floor (lines 272-278): drops signals below `WATCHLIST_MIN_CONFIDENCE`

`getTrackedSignals` does NOT call `filterSignalByTier`. Grep confirms zero imports of `filterSignalByTier` in `tracked-signals.ts`.

Five gating steps that are bypassed on the SSR path:

1. TP2/TP3 masking to null (`filterSignalByTier:283-284`)
2. MACD histogram/signal zeroing (`filterSignalByTier:291`)
3. BollingerBands and Stochastic zeroing (`filterSignalByTier:292-293`)
4. Symbol allowlist enforcement (`FREE_SYMBOLS` — `filterSignalByTier:271`)
5. `PRO_PREMIUM_MIN_CONFIDENCE` (≥85) band hide (`filterSignalByTier:275-277`)

`splitDelayed` (which carves locked stubs from the visible array) also does not run on the SSR path. It lives exclusively in `apps/web/app/api/signals/route.ts`.

**Current exploitability:** LATENT. In production, `SIGNAL_ENGINE_PRESET=hmm-top3` stamps all new signals with `strategy_id='hmm-top3'`. For free users, `ctx.unlockedStrategies = {classic}`. The strategy-id filter in `getTrackedSignals` therefore drops every `hmm-top3` row, making `initialSignals` coincidentally empty. The leak would activate if:
- The preset is changed back to `classic`, or
- Any `signal_history` row has `strategy_id='classic'` (e.g., via backfill or a one-off insert).

**False comment:** `apps/web/app/components/tier-banner.tsx:16` reads: `// The server has already filtered the signal payload by tier — this banner is UX signal, not a gate.` This is architecturally false for the dashboard SSR path. The server does NOT filter by tier before handing `initialSignals` to `DashboardClient`.

**`/api/signals` route is clean:** The client refetch path at `apps/web/app/api/signals/route.ts` correctly calls `filterSignalByTier` on every signal and then `splitDelayed`. Free users who trigger `fetchSignals()` in `DashboardClient` receive properly gated data.

**Result: LEAK (latent). Fix required: call `filterSignalByTier` on each signal in `getTrackedSignals` or in `dashboard/page.tsx` before passing `initialSignals` to the client, and run `splitDelayed` to carve locked stubs. Until fixed, this section is FAIL on architecture grounds even if not currently exploitable in production.**

## Section 5 — Marketing Copy Alignment

### Pricing Page Source

**Canonical pricing page:** `apps/web/app/pricing/page.tsx` + `apps/web/app/pricing/PricingCards.tsx`

**Sourcing verdict: PASS — no hardcoded copy.**

`PricingCards.tsx` (line 219-221) reads `TIER_DEFINITIONS` directly from `../../lib/stripe-tiers` and iterates `def.features` for both the Free and Pro cards. Every bullet on the pricing card is driven by the `features` array in `stripe-tiers.ts`. No JSX strings shadow the authoritative source.

`page.tsx` (the comparison table) does the same:
- `FREE_SYMBOLS.length` (line 22) is read from `../../lib/tier-client` — same `FREE_SYMBOLS` constant used in the gate.
- `TIER_HISTORY_DAYS.free` (line 13-15) is read from `../../lib/tier` — same constant used in `signal-slice.ts`.

The comparison table is built from a local `FEATURES` array (hardcoded strings in `page.tsx:17-31`), which is a separate surface from `TIER_DEFINITIONS`. This table is DISTINCT from the card bullet-list. Key strings to check for drift:

| Table row (page.tsx) | Matches TIER_DEFINITIONS copy? |
|---|---|
| "15-min delay" / "Real-time" | Matches "15-minute delayed signals" / "Real-time signal delivery" — OK |
| `${FREE_SYMBOLS.length} symbols...` | Matches "6 symbols..." dynamically — OK |
| "TP1 only" / "TP1, TP2, TP3 + SL" | Matches "TP1 target only" / "TP1, TP2, TP3 + Stop Loss" — OK |
| "RSI, EMA" / "RSI, EMA, MACD, Bollinger, Stochastic + multi-timeframe analysis" | DIVERGENCE — card says "Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)"; table says "RSI, EMA" for free and "RSI, EMA, MACD, Bollinger, Stochastic + multi-timeframe analysis" for pro. The table copy is more precise and consistent with the masking in `filterSignalByTier` (RSI/EMA unmasked = free baseline; MACD/BB/Stoch masked = pro-only). The card's free feature list omits the indicator line entirely. Not a copy mismatch per se — the table is additive — but the two surfaces are inconsistent. COPY INCONSISTENCY (low) |
| "Last 7 days" / "Full history" | Dynamic from `TIER_HISTORY_DAYS.free` — OK |

**Summary: PricingCards drives from `TIER_DEFINITIONS` (PASS). Comparison table is a separate hardcoded surface with one low-severity inconsistency vs. the card copy.**

---

### Free Feature Enforcement

Advertised free features come from `TIER_DEFINITIONS[0].features` (`apps/web/lib/stripe-tiers.ts:38-43`).

| Advertised feature | Enforced where | Every read site? | Status |
|---|---|---|---|
| 6 symbols across crypto, forex, commodities, indices | `FREE_SYMBOLS` in `tier-client.ts:7-14` → used by `filterSignalByTier` (tier.ts:271 returns null for non-free symbols), `TIER_SYMBOLS.free` (tier.ts:40), and `/api/v1/signals` inline filter | Read sites: `filterSignalByTier` (api/signals route), `getTrackedSignals` via `ctx.unlockedStrategies` (not a direct symbol gate — see Section 4 LATENT LEAK), `/api/v1/signals`, `signal-slice.ts:53` | PARTIAL — dashboard SSR path (`getTrackedSignals`) uses strategy filter not symbol allow-list directly; see Section 4 latent LEAK |
| 15-minute delayed signals | `TIER_DELAY_MS.free = 900000` in `tier.ts:56`; enforced via `splitDelayed` in `/api/signals/route.ts`; `DelayCountdown` UI renders countdown | Read site: `/api/signals/route.ts` only — SSR dashboard path does NOT run `splitDelayed`. | PARTIAL — delay applied on client-refetch path only; same latent LEAK as Section 4 |
| TP1 target only | `filterSignalByTier` in `tier.ts:283-284` nulls `takeProfit2` and `takeProfit3` for free callers | Applied in `/api/signals/route.ts` (client refetch path). NOT applied on SSR path (see Section 4). | PARTIAL — same latent SSR LEAK as above; client refetch path is correct |
| Last 7 days signal history | `TIER_HISTORY_DAYS.free = 7` in `tier.ts:47-48`; consumed in `signal-slice.ts:54-58` (cuts records older than 7 days for `scope=free`); consumed in `apps/web/app/pricing/page.tsx:13-15` (display only) | Read sites verified: `signal-slice.ts:54` applies the cutoff for `/api/signals/history` and `/api/signals/equity`; `signal-slice.ts` is also used by `/track-record` data path. `/api/signals/route.ts` does not apply a history cutoff directly — it returns live signals, not historical records. | OK — history window applied at every aggregation read site. `/api/signals` is real-time; `TIER_HISTORY_DAYS` correctly scoped to the history/track-record path. |

**Free feature enforcement summary:**
- 3 of 4 advertised limits are partially enforced: the client-refetch path (`/api/signals`) is gated correctly; the SSR path (`dashboard/page.tsx` → `getTrackedSignals`) bypasses `filterSignalByTier` and `splitDelayed`. This is the Section 4 LATENT LEAK and was already flagged. Recorded here for completeness — it is not a new finding.
- History window enforcement: OK — `TIER_HISTORY_DAYS` is consumed at every read site that touches aggregate history data (`signal-slice.ts` is the single point of truth).
- OVER-DELIVERY count (limit defined but not enforced at a read site): **0 new** — all partial enforcements trace back to the same SSR bypass already flagged in Section 4.

---

### Pro Feature Delivery

Advertised pro features come from `TIER_DEFINITIONS[1].features` (`apps/web/lib/stripe-tiers.ts:54-63`).

| Advertised feature | Enforcement / delivery verified | Status |
|---|---|---|
| All traded symbols | `TIER_SYMBOLS.pro = ALL_SYMBOLS` (tier.ts:41); `filterSignalByTier` returns signal unmodified for pro on symbol check (line 271 null-return only fires for free) | OK |
| Real-time signal delivery | `TIER_DELAY_MS.pro === 0` (tier.ts:57); `splitDelayed` in `/api/signals/route.ts` uses this value — zero delay = no locked stubs for pro | OK |
| Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic) | `filterSignalByTier` does NOT zero MACD/BB/Stoch for pro callers (lines 289-293 are inside the `if (tier === 'free')` block) | OK — Pro callers receive full indicators |
| TP1, TP2, TP3 + Stop Loss | `filterSignalByTier` does NOT null `takeProfit2`/`takeProfit3` for pro (lines 283-284 inside `if (tier === 'free')` block); `stopLoss` passes through unmasked for all tiers | OK for TP2/TP3 delivery; `stopLoss` was already flagged as a HIGH LEAK for free tier in Section 2, not a Pro delivery issue |
| Private Pro Telegram group | `sendInviteWithRetry` in `lib/telegram.ts:228-269` called by Stripe webhook `handleCheckoutCompleted` (webhook/route.ts:176-177) when `user.telegramUserId` is set; generates single-use 72h invite link via `createChatInviteLink` Telegram API; invite persisted to DB; revoked on `handleSubscriptionDeleted` (webhook/route.ts:241-250). Real-time signal broadcast to group via `broadcastSignalsToProGroup` in `lib/telegram-pro-broadcast.ts` | CONDITIONAL — invite is sent only if `user.telegramUserId` is already set at checkout time. The FAQ (`page.tsx:111-113`) correctly describes the flow: Telegram linking happens post-checkout via the Welcome screen. The webhook comment at line 173-175 acknowledges this: "If the user hasn't linked yet, they'll get the invite via /api/telegram/resend-invite". Resend path exists at `/api/telegram/resend-invite/route.ts`. FUNCTIONAL but the Telegram link step is user-initiated, not automatic at purchase. **No OVER-PROMISE — the conditional nature is documented and a self-serve resend path exists.** |
| Full signal history + CSV export | `/api/signals/history` has NO tier gate — it is intentionally public for marketing purposes (route.ts:13-17 comment: "Track record is intentionally NOT gated"). `scope=pro` parameter gives full history; `scope=free` narrows to 7-day free slice. No auth required for either scope. CSV export: **no CSV export route exists in `apps/web/app/api/`**. `data-export.ts` + `/api/export` exist but export configuration data (alerts, webhooks, portfolio), NOT signal history. No `Content-Disposition: attachment` route for signal history CSV was found across the entire `apps/web` tree. | **OVER-PROMISE** — "CSV export" is advertised in `TIER_DEFINITIONS[1].features` (stripe-tiers.ts:60) and on the Pro card. No CSV export route exists for signal history. The `/api/export` route exports user configuration data only and has no Pro gate. **This is the primary billing-trust issue found in Section 5.** |
| Every signal in a public Postgres archive — audit win rate yourself | `/api/signals/history` + `/track-record` are intentionally public with `scope=pro` returning all signals. Railway Postgres `signal_history` table is the source. No auth required for history/equity endpoints. | INTENTIONAL TRADE-OFF — as noted in the task brief. Correctly implemented. |
| 7-day free trial | `subscription_data.trial_period_days: 7` at checkout/route.ts:87. Applied unconditionally on all Stripe checkout sessions for any tier/interval. The Pro card button label reads "Start 7-Day Trial" (PricingCards.tsx:162). | OK — confirmed at code level. Verified in code; Stripe dashboard cross-check deferred per plan Step 5. |

**Pro feature delivery summary:**
- OVER-PROMISE: **1** — CSV export advertised, no route found.
- CONDITIONAL: **1** — Telegram invite is user-initiated post-checkout; resend path exists; not a delivery failure.
- Trial period: **CONFIRMED** — `trial_period_days: 7` in checkout route.

---

### Stripe Price ID Alignment

Price IDs are resolved at runtime from two `NEXT_PUBLIC_` env vars:
- `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` — monthly Pro subscription
- `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID` — annual Pro subscription

Both are referenced in `stripe-tiers.ts:81-82` via the `getClientPriceId` dispatch table and in `apps/web/lib/stripe.ts` for server-side checkout.

**Env var names logged here for manual cross-check:**
- Env var: `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` — expected to point to Stripe price `price_xxx` for $29/mo. **To be verified by hand against Railway dashboard.**
- Env var: `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID` — expected to point to Stripe price `price_xxx` for $290/yr. **To be verified by hand against Railway dashboard.**

Server-side price resolution: `apps/web/lib/stripe.ts` → `resolveStripePriceId(tier, interval)`. Unknown price IDs throw at checkout/route.ts:49 and webhook/route.ts:141-145 rather than silently downgrading. Fail-closed posture is correct.

**Railway env check: skipped per plan Step 5. Manual verification required against Railway → `tradeclaw` → `web` → Environment.**

---

### Section 5 Summary

| Finding | Count | Severity |
|---|---|---|
| OVER-PROMISE (advertised, not delivered) | 1 — CSV export of signal history | HIGH — billing trust |
| OVER-DELIVERY (limit defined, not enforced at all read sites) | 0 new | — (pre-existing SSR latent LEAK from Section 4 applies here too) |
| COPY INCONSISTENCY (card vs. table surface) | 1 — indicator row wording differs between PricingCards and comparison table | LOW |
| Trial period confirmed in code | YES — `trial_period_days: 7` | OK |
| Stripe price ID alignment | Deferred to manual Railway env check | PENDING |

## Section 6 — Runtime Probes
## Section 7 — Findings Register

| ID | Severity | Type | Location | Evidence | Recommended fix |
|---|---|---|---|---|---|
| F-001 | critical | LEAK | `apps/web/app/dashboard/page.tsx` (SSR path) | `getTrackedSignals` is called without `filterSignalByTier` or `splitDelayed`. `initialSignals` passed to `DashboardClient` contains raw `TradingSignal[]` with full TP2/TP3, MACD, BB, Stoch, stopLoss, premium-band signals. Latent: masked today by `hmm-top3` preset (free users' `ctx.unlockedStrategies={classic}` drops all rows). Activates immediately on preset change to `classic` or any `strategy_id='classic'` row in `signal_history`. False comment at `tier-banner.tsx:16` claims server already filters. | In `dashboard/page.tsx`, call `filterSignalByTier(signal, tier)` on each signal from `getTrackedSignals` and run `splitDelayed` to produce `{ signals, lockedSignals }` before passing to `DashboardClient`. Remove the false comment at `tier-banner.tsx:16`. |
| F-002 | high | LEAK | `apps/web/app/api/prices/stream/route.ts:116` | SSE stream calls `getSignals({})` with no tier context. Emitted payload (lines 325-333) includes `direction`, `entry`, `confidence`, and indicator-derived `reason` for ALL signals including premium-band (confidence ≥85). No auth required. Bypasses symbol allow-list and premium-band confidence gate. `stopLoss`/`takeProfit` not in payload, but entry + direction + confidence is sufficient to act on any signal. | Add auth gate (require valid session or API key) before opening the SSE stream. Strip premium-band signals (confidence ≥85) from SSE payload for free/anon callers using `PRO_PREMIUM_MIN_CONFIDENCE` guard. |
| F-003 | high | LEAK | `apps/web/app/api/demo/telegram/route.ts:57` | POST endpoint, no auth, no tier check. Rate-limit is in-memory only (non-persistent, cleared on deploy). Sends full signal including `entry`, `takeProfit1`, `stopLoss` to any supplied numeric Telegram chatId. Any unauthenticated caller with a valid-format chatId receives a complete Pro signal. | Require authenticated session + `tier === 'pro'` before processing. Replace in-memory rate-limit with Redis-backed or DB-backed counter. |
| F-004 | high | LEAK | `apps/web/lib/tier.ts:280` (filterSignalByTier) | `stopLoss` is never nulled for free callers. Pro copy advertises "TP1, TP2, TP3 + Stop Loss"; free copy advertises "TP1 target only". Structurally parallel to `takeProfit2`/`takeProfit3` which ARE masked at lines 283-284. Cleanest copy-vs-code gap in the field-level audit. | Add `result.stopLoss = 0` (or `null` if type permits) inside the `tier === 'free'` block in `filterSignalByTier`, alongside the existing TP2/TP3 nulls. Update free copy if SL disclosure is actually intended. |
| F-005 | high | OVER-PROMISE | `apps/web/lib/stripe-tiers.ts:60` | "Full signal history + CSV export" is listed in `TIER_DEFINITIONS[1].features` and rendered on the Pro pricing card. No CSV export route exists anywhere in `apps/web/app/api/`. `/api/export` exports user config (alerts/webhooks/portfolio), not signal history. `Content-Disposition: attachment` not found for any signal endpoint. Paying customers cannot fulfil this advertised feature. | Either implement a `/api/signals/export?format=csv` route gated to Pro, or remove "CSV export" from `TIER_DEFINITIONS[1].features` before the next billing cycle. |
| F-006 | medium | LEAK | `apps/web/app/api/signals/record/route.ts:13` | POST/GET route with zero auth guards. Any caller can trigger `recordSignalAsync` writes to `signal_history`. Write-gate leak: external actors can pollute the production signals table, corrupting win-rate stats, equity curves, and leaderboard. | Add `CRON_SECRET` bearer auth or require admin session before accepting any writes. Alternatively, scope this route to internal-only by removing it from the public router and calling `recordSignalAsync` directly from trusted code paths. |
| F-007 | medium | COPY MISMATCH | `apps/web/app/api/premium-signals/route.ts:11-13` | Free caller receives HTTP 200 + `{ signals: [], locked: true }` instead of canonical 402 + `upgradeRequiredBody`. Client receives no upgrade prompt from the API response. Breaks any API consumer that treats 2xx as "call succeeded". | Return 402 + `upgradeRequiredBody` for free callers, consistent with `/api/alert-rules`, `/api/keys`, and `/api/explain`. |
| F-008 | medium | COPY MISMATCH | `apps/web/app/api/premium-signals/chart/route.ts:20-22` | Free caller receives HTTP 403 + `{ error: 'locked' }` — custom error shape, not `upgradeRequiredBody`. Inconsistent with canonical 402 pattern used everywhere else. | Return 402 + `upgradeRequiredBody` to match the canonical upgrade-required shape. |
| F-009 | medium | COPY MISMATCH | `apps/web/app/api/v1/signals/route.ts` (error path) | Error path returns HTTP 200 + `{ ok: true, count: 0, signals: [] }` instead of a 4xx. API consumers cannot distinguish a legitimate empty result from an error or a tier-blocked response. | Return 4xx (e.g. 500 on server error, 403/402 on tier block) from the error path; reserve 200 for genuine empty result sets. |
| F-010 | medium | FUNNEL | `apps/web/app/components/tier-banner.tsx:79` | Main upgrade CTA shown to all free/anonymous users links to `/pricing` with no `?from=` attribution param. Highest-traffic upgrade surface in the product; absence breaks conversion attribution entirely for this touchpoint. | Change href to `/pricing?from=tier-banner`. |
| F-011 | low | FUNNEL | `apps/web/app/signin/page.tsx:222` | "Upgrade to Pro" link on sign-in page links to `/pricing` with no `?from=`. Medium-traffic conversion touchpoint for users who arrive unauthenticated. | Change href to `/pricing?from=signin-upgrade`. |
| F-012 | low | FUNNEL | `apps/web/app/dashboard/DashboardClient.tsx:128` | Telegram tooltip upgrade link on free-locked signal row links to `/pricing` with no `?from=`. | Change href to `/pricing?from=dashboard-telegram-tooltip`. |
| F-013 | low | FUNNEL | `apps/web/app/contact-sales/page.tsx:85` | Back-link on contact-sales page links to `/pricing` with no `?from=`. Low traffic; attribution gap is minor. | Change href to `/pricing?from=contact-sales-back`. |
| F-014 | low | DEAD CODE | `apps/web/lib/tier.ts:111-117` | JSDoc block references `./licenses` (deleted file) and a cross-check test in `tier.test.ts` that does not exist. Both claims are false. Stale comment creates false confidence in a non-existent safety net. | Delete lines 111-117 from `tier.ts`. Add a real cross-check test: `expect(PRO_STRATEGIES).toContain('hmm-top3')` etc., or at minimum assert the set size matches expected entry count. |
| F-015 | low | DEAD CODE | `apps/web/lib/signal-repo.ts` → `insertSignals()` + `live_signals` Postgres table | `insertSignals()` has 0 callers in the entire `apps/web` tree (confirmed by grep). `live_signals` table has no runtime references outside migration files and a single comment in the cron route. Workspace CLAUDE.md confirms table is empty (0 rows). Migration `021_drop_live_signals.sql` exists but has not been applied to remove the table. | Delete `apps/web/lib/signal-repo.ts` (or at minimum remove the `insertSignals` export). Apply migration `021_drop_live_signals.sql` to drop the `live_signals` table from production Railway Postgres. |
| F-016 | low | CONDITIONAL LEAK | `apps/web/app/api/v1/signals/route.ts:75,79` | `Cache-Control: public, s-maxage=60` with `Vary: Cookie` — correctly mitigates cross-tier cache poisoning for browser-session callers. However, API-key callers send the tier credential as `Authorization` header or query param, not Cookie. If a CDN is ever placed in front of Railway, two requests with different tiers but no Cookie header will share the same CDN cache slot. Not currently exploitable (no CDN on Railway bare Node). | Add `Vary: Authorization` alongside `Vary: Cookie`, or change `Cache-Control` to `private` for authenticated routes. Add a note in infra docs: "do not add a CDN to this route without reviewing Vary headers first." |
| F-017 | low | LEAK | PRO_STRATEGIES cross-check test missing | `tier.test.ts` contains zero references to `PRO_STRATEGIES` or `ALLOWED_PREMIUM_STRATEGIES`. Any developer can add or remove a strategy from `PRO_STRATEGIES` without a test failing. Silent strategy-drift risk: a newly added premium strategy could be inadvertently exposed to free users or withheld from Pro users. | Add a test in `apps/web/lib/__tests__/tier.test.ts` asserting the exact members and size of `PRO_STRATEGIES`, so drifts are caught at CI time. |
## Section 8 — Follow-up Backlog
