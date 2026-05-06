# Plan — Pro Feature Copy ↔ Delivery Audit

**Date:** 2026-05-05
**Owner:** engineering
**Source audit:** `docs/audits/2026-05-05-plans-free-vs-pro-coverage.md` Recommendation 3

Every bullet in `TIER_DEFINITIONS[1].features` (the Pro card) must cite a
route or component that delivers it. CSV export was the canonical billing-trust
gap (F-005); this plan locks down the full list so no future Pro bullet drifts
ahead of code.

## Audit table — `apps/web/lib/stripe-tiers.ts:54-63`

| # | Pro feature copy | Delivery citation | Status |
|---|---|---|---|
| 1 | All traded symbols | `TIER_SYMBOLS.pro` in `apps/web/lib/tier.ts` | shipped |
| 2 | Real-time signal delivery | `TIER_DELAY_MS.pro = 0` in `apps/web/lib/tier.ts`; SSE in `app/api/prices/stream/route.ts` | shipped |
| 3 | Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic) | `apps/web/app/lib/ta-engine.ts` | shipped |
| 4 | TP1, TP2, TP3 + Stop Loss | Free mask in `apps/web/lib/tier.ts` (`filterSignalByTier` sets `takeProfit2/3=null`, `stopLoss=null`); Pro returns full | shipped |
| 5 | Private Pro Telegram group | `apps/web/lib/telegram-link-token.ts`; `app/api/telegram/link/route.ts` | shipped |
| 6 | Full signal history + CSV export | `app/api/signals/history/route.ts?format=csv` (Pro-gated, `text/csv`) | shipped 2026-05-05 (F-005 close) |
| 7 | Every signal in a public Postgres archive — audit win rate yourself | `app/api/signals/history/route.ts` (open) + `signal_history` table | shipped |
| 8 | 7-day free trial | Stripe checkout `subscription_data.trial_period_days = 7` in `app/api/stripe/checkout/route.ts` | shipped |

## Drift-prevention rule

Future edits to `TIER_DEFINITIONS[1].features` MUST update this table in the
same commit. No standalone marketing copy commits to Pro features without a
delivery citation.

## Acceptance

```bash
# Each Pro feature line in TIER_DEFINITIONS has a delivery citation in this doc:
grep -A1 "id: 'pro'" -A20 apps/web/lib/stripe-tiers.ts | grep "'"
# Cross-check by reading the table above.
```

## Out of scope

- Free-tier feature audit (only 4 lines, all trivially backed by `TIER_SYMBOLS.free`,
  `TIER_DELAY_MS.free`, mask helpers, `TIER_HISTORY_DAYS.free`).
- Pricing page hero copy ("free forever" vs paid Pro) — separate decision.
- Hosted vs self-host narrative — out of scope, documented in workspace CLAUDE.md.
