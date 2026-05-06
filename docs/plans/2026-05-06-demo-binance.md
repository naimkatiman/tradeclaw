# TradeClaw — Binance Demo Validation Plan (hmm-top3, 30+ days)

Status: Planning
Owner: Zaky
Created: 2026-05-06
Builds on: `docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md`

Goal: paper-trade production `hmm-top3` signals on a Binance demo account for
30+ days and reconcile realized R-multiple against the published track
record (+918%, Sharpe 16, 46% WR, +0.32R expectancy on 801 sized trades) to
validate it.

---

## 1. Current state

The pilot executor at `apps/web/lib/execution/` is **largely built**.
`executor.ts:69-298` runs a 60-second tick that pulls unexecuted `hmm-top3`
rows from `signal_history`, applies universe / concurrency / direction
(EMA-50 H1 slope) / regime (ADX-14 H1 ≥ 20) filters via `filters.ts`, sizes
with 1% risk + 1.5×ATR stop + 5x leverage cap (`sizing.ts`), and places a
MARKET entry + STOP_MARKET + TAKE_PROFIT_MARKET bracket via the thin REST
client at `binance-futures.ts:380-407`. `position-manager.ts` runs every
60s for SL-to-breakeven on TP1 fill. **Loss kill switches are implemented**
(`risk-rails.ts:70-118`, daily/weekly via `/fapi/v1/income`) — the pilot
plan's §1.x "deferred" list is stale on that point.

**Binance API surface targeted**: USDⓈ-M Futures. Trading venue resolved
from `BINANCE_BASE_URL` (`binance-futures.ts:111-116`). Testnet detection at
`binance-futures.ts:415-417` is a string match for "testnet" in the URL.
Market-data reads can be split to mainnet via `BINANCE_MARKET_DATA_URL` —
already wired (`binance-futures.ts:122-132`, signed/exchangeInfo stay on the
trading venue, klines/markPrice/24h ticker route to the override).

**Running on Railway**: the cron is self-scheduled in
`apps/web/instrumentation.ts:48-65` — pilot/execute and pilot/manage-positions
fire every 60s on Node startup, **gated by `EXECUTION_MODE !== 'disabled'`**
(`instrumentation.ts:51`). No external scheduler. No `npm run cron-execute`
script exists; deploys via `railway up --detach` from `tradeclaw/` (GitHub
auto-deploy is OFF on the `web` service per project CLAUDE.md).

**Zaky's existing key**: the executor expects a **Futures Testnet** key from
`https://testnet.binancefuture.com`. If Zaky's key was generated at
`https://testnet.binance.vision` that's **Spot Testnet** — separate
registration, separate key surface, **not interchangeable**. He must
register at `testnet.binancefuture.com` and generate a futures-scoped key
before anything trades.

---

## 2. Day-1 action checklist for Zaky

**See §5 — a symbol-mapping code change is required before any production
signal will execute. Steps below get the harness live; trades only flow
once that gap is closed.**

1. Confirm key origin: log in at `https://testnet.binancefuture.com`. If
   the key was generated at `testnet.binance.vision`, discard and create a
   new one here. Fund the testnet wallet (Faucet → 10000 USDT).
2. On Railway → `tradeclaw` → `web` → Variables, set:
   - `BINANCE_API_KEY=<futures testnet key>`
   - `BINANCE_API_SECRET=<futures testnet secret>`
   - `BINANCE_BASE_URL=https://testnet.binancefuture.com`
   - `BINANCE_MARKET_DATA_URL=https://fapi.binance.com` (mainnet liquidity
     for universe screen + ATR/EMA/ADX warmup; rationale at
     `2026-05-01-tradeclaw-pilot-binance-futures.md:269-277`)
   - `EXECUTION_MODE=disabled` (start dry-run; flip to `testnet` after
     handshake passes)
   - `EXEC_RISK_PCT=1`, `EXEC_MAX_LEVERAGE=5`, `EXEC_MAX_POSITIONS=4`
   - `EXEC_DAILY_LOSS_PCT=5`, `EXEC_WEEKLY_LOSS_PCT=12`
   - `EXEC_TELEGRAM_CHAT_ID=<Zaky private chat id>`
3. Apply migration `apps/web/migrations/018_pilot_executions.sql` against
   Railway Postgres (creates `executions`, `execution_errors`,
   `universe_snapshots`).
4. Deploy: `railway up --detach` from `tradeclaw/` repo root.
5. Handshake check: hit `/api/cron/execute` with the cron secret. Tick
   should log `EXECUTION_MODE=disabled — tick skipped`. Confirm
   `/api/cron/universe` populated `universe_snapshots` for today.
6. Verify universe sanity: `psql $DATABASE_URL -c "SELECT symbol FROM
   universe_snapshots WHERE included AND snapshot_date = CURRENT_DATE"`.
   Expect 8-15 USDT-margined perps.
7. **Apply the symbol-mapping fix from §5 (load-bearing, blocks all
   executions).** Smallest change: import `BINANCE_SYMBOLS` from
   `apps/web/app/lib/ohlcv.ts:21` and rewrite `sig.pair` once at the top
   of the per-signal loop in `executor.ts:135`.
8. Flip `EXECUTION_MODE=testnet` on Railway. Within 5 minutes a fresh
   `hmm-top3` signal on a USDT-eligible symbol should produce a row in
   `executions` and a Telegram fill notification.
9. Set a calendar reminder for day +30 to run §4 reconciliation.
10. **Do not** flip to `live` mainnet until the 30-day soak completes and
    the §4 acceptance bar is met.

---

## 3. Symbol coverage

**Binance Futures-eligible signals**: `signal_history.pair` rows whose
prefix maps via `BINANCE_SYMBOLS` (`apps/web/app/lib/ohlcv.ts:21-44`) to a
USDT-margined perp. Today's eligible set:

`BTCUSD, ETHUSD, XRPUSD, SOLUSD, DOGEUSD, BNBUSD, ADAUSD, DOTUSD, LINKUSD,
AVAXUSD, ATOMUSD, MATICUSD, UNIUSD, LTCUSD, BCHUSD, NEARUSD, APTUSD, ARBUSD,
OPUSD, FILUSD, INJUSD, SUIUSD, SEIUSD` (read full list from `ohlcv.ts:24+`).

**Not eligible — will be skipped or error in executor**:
- FX majors: `EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `USDCAD`, `NZDUSD`, `USDCHF`
- Metals: `XAUUSD`, `XAGUSD`
- Energy: `WTIUSD`, `BNOUSD`
- US equities: `NVDAUSD`, `TSLAUSD`, `AAPLUSD`, `MSFTUSD`, `GOOGLUSD`,
  `AMZNUSD`, `METAUSD`

These remain MetaApi/MT5 territory (Phase 3 of the pilot plan).

**SQL — last-30-day signal slice by Binance eligibility**:

```sql
WITH eligible AS (
  SELECT unnest(ARRAY[
    'BTCUSD','ETHUSD','XRPUSD','SOLUSD','DOGEUSD','BNBUSD','ADAUSD','DOTUSD',
    'LINKUSD','AVAXUSD','ATOMUSD','MATICUSD','UNIUSD','LTCUSD','BCHUSD',
    'NEARUSD','APTUSD','ARBUSD','OPUSD','FILUSD','INJUSD','SUIUSD','SEIUSD'
  ]) AS pair
)
SELECT sh.pair,
       COUNT(*) AS signals,
       SUM(CASE WHEN e.pair IS NOT NULL THEN 1 ELSE 0 END) AS binance_eligible
  FROM signal_history sh
  LEFT JOIN eligible e ON e.pair = sh.pair
 WHERE sh.created_at > NOW() - INTERVAL '30 days'
   AND sh.strategy_id = 'hmm-top3'
 GROUP BY sh.pair
 ORDER BY signals DESC;
```

Expected outcome: 50-70% of `hmm-top3` rows are Binance-eligible (crypto
dominates the production universe). Anything below ~40% means the demo will
miss too much of the strategy and Phase 3 (MetaApi) is the right call,
not Binance demo.

---

## 4. Tracking demo P&L vs published track record

**Where executions land**: `executions` table (migration 018). Row shape:
`signal_id, symbol, side, qty, entry_price, stop_price, tp1_price,
notional_usd, risk_usd, status, filled_at, closed_at, realized_pnl`.
Linked back to `signal_history.id` via `signal_id` (TEXT FK,
`018_pilot_executions.sql:17`).

**Caveat**: `executions.realized_pnl` is NULL today — the position manager
marks `status='closed'` but the PnL backfill is deferred (pilot plan §1.x).
For the 30-day reconciliation we have two options:

1. **Authoritative source** — query Binance `/fapi/v1/income` (already used
   by `risk-rails.ts:85`), bucket by `clientOrderId` prefix to attribute
   to a `signal_id`. Gives realized USD PnL per trade.
2. **Computed R-multiple** — for each closed `executions` row, compute
   `R = (exit_price - entry_price) / (entry_price - stop_price) * sign(side)`
   from fill data. This is the apples-to-apples comparison against
   `signal_history.outcome_24h.pnlPct` (which is %, not R, so we need to
   normalize both).

**Reconciliation SQL (sketch — populate `realized_pnl` first, see Risks)**:

```sql
SELECT e.signal_id,
       e.symbol,
       e.side,
       e.entry_price,
       e.stop_price,
       e.realized_pnl,
       e.realized_pnl / NULLIF(e.risk_usd, 0)            AS demo_r_multiple,
       (sh.outcome_24h->>'pnlPct')::numeric              AS recorded_pnl_pct,
       ((sh.outcome_24h->>'pnlPct')::numeric / 100.0)
         * (sh.entry_price * e.qty)                      AS recorded_pnl_usd_est
  FROM executions e
  JOIN signal_history sh ON sh.id = e.signal_id
 WHERE e.status = 'closed'
   AND e.closed_at > NOW() - INTERVAL '30 days';
```

**Acceptance bar**: demo realized R-multiple matches recorded R-multiple
within ±0.1R for ≥80% of trades, AND demo aggregate expectancy is within
±0.05R of published +0.32R. If yes → track record is validated, ship Phase
2 (paid Pilot tier). If no → diagnose divergence (slippage, missed fills,
gate divergence) before any public claim.

**Sample size**: at ~25 hmm-top3 signals/day across the eligible universe,
30 days yields ~750 signals. After universe + EMA-50 + ADX gates, expect
30-50% pass-through → 230-380 demo trades. Enough for ±0.05R aggregate
expectancy at ~95% confidence given the published 0.32R/trade.

---

## 5. Known gaps / risks

**Symbol-format mismatch — BLOCKING**. `signal_history.pair` is `BTCUSD`,
`ETHUSD`, `XAUUSD`, `EURUSD`, etc. The executor passes `sig.pair` directly
to Binance (`executor.ts:149,205,213`) and rejects anything not in the
USDT-quoted exchangeInfo map (`executor.ts:348`: `quoteAsset === 'USDT'`).
A `BTCUSD` signal will fail with `symbol_not_in_exchange_info` — every
crypto signal, not just FX/metals/equities. The mapping table exists at
`apps/web/app/lib/ohlcv.ts:21-44` (`BINANCE_SYMBOLS`) but is **not imported
by the execution path**. Fix: import + rewrite `sig.pair` once at the top
of the executor's per-signal loop, skip rows with no mapping. Out of
scope for this plan doc per task constraint — flagged here, not patched.

**PnL backfill is also not implemented**. `executions.closed_at` gets set
but `executions.realized_pnl` stays NULL (pilot plan §1.x). The §4 SQL
will return mostly NULLs until either `position-manager.ts` is extended
to diff entry/exit fills, or a separate cron pulls `/fapi/v1/income` and
attributes by `clientOrderId`. Reconciliation cannot run until one of
these lands.

**Phase 2 multi-tenant requirement — not blocking for solo demo**. The
pilot plan flags Phase 2 as "user-facing surface, per-user keys". For
Zaky's solo Binance-demo soak the executor runs single-tenant against
house keys (`user_id` is nullable in migration 018). No code change
needed for him personally; only relevant when external users connect
their own keys (Phase 2 of the pilot plan).

**Testnet liquidity / slippage realism**. The market-data split
(`BINANCE_MARKET_DATA_URL=mainnet`) gives the universe screen + ATR/EMA
realistic numbers, but **order fills still happen on testnet's thin order
books**. Expected divergence direction: testnet slippage on MARKET entries
is typically *worse* than mainnet for low-volume pairs, *better* than
mainnet for BTC/ETH (testnet has anchor liquidity from Binance's own
seeders). Net effect on R-multiple: noisy but symmetric — not a
systematic bias against the published track record.

**Testnet rate limits & per-IP caps**. Futures testnet enforces the same
1200 weight/min /fapi/* limit as mainnet but with stricter per-IP banning
on burst. Universe-runner pulls 30 daily klines × ~15 candidates = 450
weight at 00:05 UTC; safe. Per-tick: `getAccount` (5) + 1× `getKlines`
per pending signal (1 each) + place orders (1 each). At 50 pending
signals/tick (executor cap, `executor.ts:322`) the worst case is ~150
weight — well under the cap. No action required.

**Signal-engine preset stability**. `strategy_id='hmm-top3'` is the
filter. If the production preset rotates mid-soak (e.g., to `hmm-top5`),
the executor goes idle and the soak ends silently. Mitigation: monitor
`processed` count from `/api/cron/execute` responses; alert on 24h zero.
