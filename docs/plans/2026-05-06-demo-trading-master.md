# Demo Trading TradeClaw Signals — Master Integration Plan

Status: planning
Owner: Zaky
Created: 2026-05-06

## Goal

Validate TradeClaw's published `hmm-top3` track record (+918% return, Sharpe 16, 46% win rate, +0.32R expectancy on 801 sized trades) by demo-trading live signals on real broker demo accounts for 30+ days. No production broker capital at risk.

## TL;DR

Four demo platforms, three real, one symbolic.

| # | Platform | Asset class | Status | Effort | Value |
|---|---|---|---|---|---|
| 1 | **Binance Futures Testnet** | crypto-USDT perps | executor 90% built; **1 blocker** | 1 day | full P&L validation |
| 2 | **RoboForex MT5 demo** (via MetaApi) | FX, indices, metals, stock CFDs | greenfield, scaffolded as Phase 3 | 3-5 days | full P&L validation across non-crypto universe |
| 3 | **IBKR Paper** | US stocks (NVDA/TSLA/AAPL/MSFT/etc) | greenfield, local Python bridge | 2-3 days | full P&L validation, real exchange semantics |
| 4 | **TradingView** | universal | API-restricted | 1 hour | visual sanity-check only, no P&L |

**Headline finding from Binance agent (verified):** the pilot executor at `apps/web/lib/execution/` cannot place a single trade today because of a symbol-format mismatch. One-line fix. **Gate zero.**

## Gate zero — Binance symbol-mapping fix

`signal_history.pair` is stored as TwelveData-style canonical symbols (`BTCUSD`, `ETHUSD`, `SOLUSD`, …). See [apps/web/app/lib/symbol-config.ts:16-46](apps/web/app/lib/symbol-config.ts#L16-L46).

The Binance executor passes `sig.pair` raw to Binance Futures APIs at:
- [apps/web/lib/execution/executor.ts:149](apps/web/lib/execution/executor.ts#L149) (`getKlines(sig.pair, '1h', ...)`)
- [apps/web/lib/execution/executor.ts:200](apps/web/lib/execution/executor.ts#L200) (`ensureLeverageAndMargin(sig.pair, ...)`)
- [apps/web/lib/execution/executor.ts:205](apps/web/lib/execution/executor.ts#L205) (`placeOrder({ symbol: sig.pair, ... })`)
- [apps/web/lib/execution/executor.ts:213](apps/web/lib/execution/executor.ts#L213) (SL order)

Binance Futures expects `BTCUSDT`. The translation table already exists at [apps/web/app/lib/ohlcv.ts:22-51](apps/web/app/lib/ohlcv.ts#L22-L51) (`BINANCE_SYMBOLS`) but is not imported by the execution package.

**Without this fix, every signal logs `symbol_not_in_exchange_info` and is skipped.** Demo trial yields zero executions even with valid testnet keys.

Fix sketch (not applied — this is the plan doc):
```ts
// apps/web/lib/execution/executor.ts
import { BINANCE_SYMBOLS } from '../../app/lib/ohlcv'; // or move to shared module

// Within the signal loop, before any Binance call:
const binancePair = BINANCE_SYMBOLS[sig.pair];
if (!binancePair) {
  result.filtered++;
  await logError({ signalId: sig.id, stage: 'filter', errorCode: 'symbol_not_binance_eligible',
                   errorMsg: `${sig.pair} not in BINANCE_SYMBOLS` });
  continue;
}
// then use binancePair (not sig.pair) in getKlines / placeOrder / ensureLeverageAndMargin
```

This is one commit, one diff, zero new dependencies. Surface area limited to `executor.ts`. Recommend a follow-up PR. **Do not start the demo trial until this lands.**

## Recommended sequence

```
Week 1
  D0  → Fix Binance symbol mapping (gate zero). Single PR. ~1h.
  D1  → Spin up Binance Futures Testnet demo (smallest existing infra).
  D2  → Set up TV visual sanity-check (1h work, free running visualization).
  D3-5 → Land MetaApi bridge scaffolding for RoboForex (Phase 3 of pilot doc).

Week 2
  D6-8 → IBKR paper bridge (Python, runs locally on Zaky's box).
  D9-10 → Wire up unified equity-curve dashboard pulling from `executions` (Binance) +
          new metaapi_executions + new ibkr_executions.

Weeks 2-6 (passive)
  → Run all four in parallel for 30+ days.
  → Daily reconciliation cron compares each broker's realized R-multiple to
    `signal_history.outcome_24h.pnlPct` for the matching signal.
  → Weekly review: divergence > ±0.15R per trade → investigate.
```

Total active build effort: ~7-8 days. Then 30+ days of passive monitoring.

## Per-platform plan docs

Each linked doc was produced by an isolated research agent. They do not overlap.

- [2026-05-06-demo-binance.md](2026-05-06-demo-binance.md) — Futures Testnet; reuses existing executor; surfaces the gate-zero bug
- [2026-05-06-demo-tradingview.md](2026-05-06-demo-tradingview.md) — visual marker webhook only; explicit on the "no inbound API" limit
- [2026-05-06-demo-roboforex-mt5.md](2026-05-06-demo-roboforex-mt5.md) — MetaApi cloud bridge; aligns with pilot Phase 3
- [2026-05-06-demo-ibkr.md](2026-05-06-demo-ibkr.md) — ib_insync + local IB Gateway; US-stock subset

## Symbol coverage matrix

Pulled from [apps/web/app/lib/symbol-config.ts](apps/web/app/lib/symbol-config.ts). Asterisk = needs mapping.

| TradeClaw `pair` | Binance Testnet | RoboForex MT5 | IBKR Paper | TradingView |
|---|---|---|---|---|
| BTCUSD, ETHUSD, SOLUSD, DOGEUSD, BNBUSD, XRPUSD | yes (* → BTCUSDT etc) | crypto CFDs | no | display only |
| EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD, USDCHF | no | yes | no (FX is poor on IBKR retail) | display only |
| XAUUSD, XAGUSD | no | yes | no | display only |
| WTIUSD, BNOUSD | no | WTI yes; BNO no (it's a US ETF) | BNO yes | display only |
| NVDAUSD, TSLAUSD, AAPLUSD, MSFTUSD, GOOGLUSD, AMZNUSD, METAUSD | no | as #NVDA / #TSLA / etc | yes (native US-stock) | display only |
| SPYUSD, QQQUSD | no | as US500/US100 CFD | yes (native ETF) | display only |

Roughly: Binance covers ~6 pairs, RoboForex covers ~22, IBKR covers ~9. Together they cover the full universe except duplicates.

## Reconciliation (cross-platform)

All three real-execution platforms write to a per-broker executions table. Daily cron compares each closed trade's realized R-multiple to the corresponding `signal_history.outcome_24h.pnlPct`:

```sql
-- Sketch for any broker. Replace `executions` with the per-broker table.
SELECT
  e.signal_id,
  e.symbol,
  e.realized_pnl,
  (e.realized_pnl / e.risk_usd)                                  AS realized_R,
  (sh.outcome_24h->>'pnlPct')::numeric                            AS recorded_pct,
  ((sh.outcome_24h->>'pnlPct')::numeric / 100.0
     * sh.entry_price * e.qty / e.risk_usd)                       AS recorded_R_approx,
  ABS(((sh.outcome_24h->>'pnlPct')::numeric / 100.0
        * sh.entry_price * e.qty / e.risk_usd)
      - (e.realized_pnl / e.risk_usd))                            AS divergence_R
FROM executions e
JOIN signal_history sh ON sh.id = e.signal_id
WHERE e.status IN ('closed','filled')
  AND sh.outcome_24h IS NOT NULL
  AND e.closed_at > NOW() - INTERVAL '7 days'
ORDER BY divergence_R DESC;
```

**Acceptance gates** (uniform across platforms):
- ≥75% of closed trades within ±0.15R of recorded outcome
- aggregate expectancy within ±0.05R of recorded +0.32R
- aggregate win rate within ±5pp of recorded 46.1%
- max drawdown ≤ 35% (vs recorded -31.24%)

If any platform misses by a wide margin, the divergence narrows the bug location:
- All three miss → recorded numbers are wrong (calibration bug in `/track-record`)
- One platform misses → broker-specific mapping/sizing/slippage bug

## Risks called out by individual agents

1. **Binance** — Phase 2 multi-tenant isn't built; running on Zaky's testnet key is single-tenant by design. Fine for validation.
2. **RoboForex / MetaApi** — free tier is 1 demo account only. If we want a second MT5 broker (IC Markets, Pepperstone), MetaApi paid plan starts at ~$15/mo.
3. **IBKR** — TWS/Gateway daily reauth friction. Daily 23:00 ET logout unless using IB Gateway with auto-restart. Bridge crash window of up to 24h.
4. **TradingView** — cannot validate P&L. Only validates that entry/SL/TP are visually plausible on the chart.

## What this plan deliberately does NOT do

- Auto-execute on a real-money account. That is TradeClaw Pilot proper (the $99/mo product), not the validation exercise.
- Backfill the recorded track record. The +918% number stays as-is on `/track-record`. Demo P&L is independent evidence.
- Build a unified UI for cross-platform equity curves. Reconciliation runs as a daily SQL report; UI is week-3+ work if the numbers hold up.
- Touch the Pine Script ports for any premium TV strategies. Those are a separate revenue stream, not part of validation.

## Day-1 checklist (Zaky)

If you only do one thing this week:

1. Open a PR fixing the Binance executor symbol mapping (gate zero, ~1h).
2. Review `2026-05-06-demo-binance.md` and confirm your Binance demo key is from `testnet.binancefuture.com`, not `testnet.binance.vision`.
3. Apply migration `018_pilot_executions.sql` against the Railway DB (idempotent — `IF NOT EXISTS`).
4. Set Railway env: `EXECUTION_MODE=testnet`, `BINANCE_TESTNET_API_KEY=...`, `BINANCE_TESTNET_API_SECRET=...`.
5. Deploy via `railway up --detach` (GitHub auto-deploy is OFF — see workspace CLAUDE.md).
6. Watch `executions` table for 24h. Expect 1-3 entries per day from the hmm-top3 cron.
7. If the table stays empty → check `execution_errors` for `symbol_not_in_exchange_info` (gate zero not landed) or `disabled` (env var not set).

The other three platforms can wait until week 2.

## Update log

- 2026-05-06: Initial draft after parallel agent research.
