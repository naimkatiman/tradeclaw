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
## Section 5 — Marketing Copy Alignment
## Section 6 — Runtime Probes
## Section 7 — Findings Register
## Section 8 — Follow-up Backlog
