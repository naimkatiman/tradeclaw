# Demo-Trade hmm-top3 Signals on RoboForex MT5

> Plan only. Do not implement until confirmed. Aligns with the existing pilot
> plan `2026-05-01-tradeclaw-pilot-binance-futures.md` (Phase 3 = MetaApi MT5).
> Goal: 30+ day live-demo validation of the published track record
> (+918%, Sharpe 16, 46% WR, +0.32R, 801 sized trades) on a multi-asset
> CFD venue.

## 1. RoboForex demo account setup

1. Go to <https://roboforex.com/clients/registration/> and create a Live
   Account dashboard (no funds required for demo).
2. Inside the dashboard: `Open New Account` -> account type `Pro-Cent` or
   `ProStandard` -> mode `Demo` -> platform `MetaTrader 5` ->
   leverage `1:200` (proxy for the leverage retail/pro retail traders see).
3. Note the issued credentials: `login` (8-digit), `master password`,
   `investor password` (read-only), and `MT5 server name`
   (e.g. `RoboForex-Pro`, `RoboForex-ECN`, `RoboForex-Demo`).
4. Download MT5 desktop, connect with master credentials once to confirm
   the account boots and quotes stream. Close the terminal.
5. Keep `login`, `investor password`, and `server` in a 1Password note
   titled `tradeclaw-demo-mt5`. The investor password is what MetaApi
   will use; it cannot place trades, only the master password can — but
   MetaApi proxies trading via its own bridge, so investor password is
   sufficient for read + the MetaApi-managed trade route.

## 2. Architecture choice — MetaApi cloud (Choice 1)

Pick **Choice 1**. Reasons:
- Pilot doc already specifies `metaapi.ts` adapter under
  `apps/web/lib/execution/`. Choice 1 is the path that doc commits to.
- Choice 2 (local EA polling) requires the user's MT5 terminal to stay
  running 24/5 on a Windows VM. Reliability of a desktop on residential
  power and ISP is unacceptable for a 30-day validation.
- Free tier covers 1 demo account — exactly what we need for this run.
- Same deployment surface as production (Railway -> outbound HTTPS).
  No new infra.

```
signal_history (Postgres)                       RoboForex MT5
        |                                          ^
        v                                          | (managed
  cron/execute (60s)                               |  by MetaApi)
        |                                          |
        v                                          |
  executor.ts -> metaapi-bridge.ts --HTTPS--> metaapi.cloud
```

## 3. Symbol mapping

Pull active universe with:

```sql
SELECT pair, COUNT(*) AS n
FROM signal_history
WHERE created_at > NOW() - INTERVAL '30 days'
  AND strategy_id = 'hmm-top3'
GROUP BY pair
ORDER BY n DESC;
```

Sample mapping (covers the dominant `hmm-top3` universe — confirm vs
live query before wiring):

| TradeClaw pair | RoboForex MT5 symbol | Notes |
|---|---|---|
| BTCUSDT | BTCUSD     | CFD, no perp funding, 1:5 leverage |
| ETHUSDT | ETHUSD     | CFD |
| SOLUSDT | SOLUSD     | CFD, may be `SOLUSD.c` on cent |
| XRPUSDT | XRPUSD     | CFD |
| BNBUSDT | NOT LISTED | flag: skip on MT5 leg |
| DOGEUSDT| DOGEUSD    | CFD, low tick value |
| EURUSD  | EURUSD     | direct |
| GBPUSD  | GBPUSD     | direct |
| USDJPY  | USDJPY     | direct |
| XAUUSD  | XAUUSD     | direct (gold spot) |
| XAGUSD  | XAGUSD     | direct (silver spot) |
| US100   | NQ100      | RoboForex code differs |
| US500   | SPX500     | RoboForex code differs |
| US30    | DJI30      | RoboForex code differs |
| AAPL    | #AAPL      | stock CFD; some accounts use `AAPL.NAS` |

Mapping lives in `apps/web/lib/execution/metaapi-symbols.ts` (new file).
Unknown symbol -> log + skip; do NOT auto-fall-back to a similar pair.

## 4. Day-1 action checklist for Zaky

1. RoboForex demo signup per section 1; capture login, investor pwd,
   server name.
2. Sign up at <https://app.metaapi.cloud/sign-up>; verify email.
3. In MetaApi dashboard: `Add MetaTrader account` -> `MT5` ->
   `Cloud (G2)` -> region `new-york` (closest to Railway us-east) ->
   paste `login`, `investor password`, `server` -> `Save`.
4. Wait for account state to become `DEPLOYED` and `CONNECTED`
   (1-3 minutes).
5. Issue an API token in `Tokens` -> scope it to that account ID. Save
   as `METAAPI_TOKEN`. Save the account ID as `METAAPI_ACCOUNT_ID`.
6. Test bridge with a one-off curl from your laptop (ensure no order
   is placed beyond a single 0.01 lot test):
   ```
   curl -H "auth-token: $METAAPI_TOKEN" \
     https://mt-client-api-v1.new-york.agiliumtrade.ai/users/current/accounts/$METAAPI_ACCOUNT_ID/account-information
   ```
   Expect `200 OK` with `balance`, `equity`, `currency`.
7. Place a manual 0.01 lot EURUSD market order via MetaApi REST to
   confirm full write path. Cancel/close manually in MT5.
8. Add `METAAPI_TOKEN`, `METAAPI_ACCOUNT_ID`, `METAAPI_REGION=new-york`
   to Railway `web` service env (do NOT put in `.env` checked into the
   repo).
9. Sketch `apps/web/lib/execution/metaapi-bridge.ts` (interface only,
   no impl) — see section below.
10. Add `apps/web/lib/execution/metaapi-symbols.ts` with the table from
    section 3.
11. Wire `executor.ts` to dispatch by `EXECUTION_BROKER` env
    (`binance-futures` | `metaapi`). Default unset = no-op.
12. Run cron `execute` route in dry-run mode against a single live
    signal; verify request payload would have been correct, no order
    placed.
13. Flip `EXECUTION_BROKER=metaapi` and `EXECUTION_MODE=demo`. Watch
    first real signal land. Confirm fill in MT5 and row in
    `executions` table.
14. Set up a daily 09:00 MYT digest: open positions, day's PnL, equity,
    drawdown vs day 1. Send to Telegram via existing `telegram.ts`.
15. Diary entry in `DAILY_INTEL_LOG.md` for each trading day until
    day 30.

## 5. Sizing for non-crypto leverage

Existing `apps/web/lib/execution/sizing.ts` is risk-first
(`riskUsdBudget = equity * riskPct`), which is asset-class agnostic.
What changes for MT5:

- **Stop distance unit**: ATR is in price units. MT5 OHLC in price units.
  No unit fix needed. Use the same `computeATR`.
- **Min lot / lot step / contract size**: Binance `LOT_SIZE` does not
  apply. MetaApi exposes `minVolume`, `volumeStep`, `contractSize` per
  symbol. Build a `MetaApiSymbolFilters` shape parallel to
  `SymbolFilters`. Same `roundQty` algorithm, different inputs.
- **Notional cap**: Crypto perps default `EXEC_PER_TRADE_NOTIONAL_PCT=25`
  on 1:5 max. FX at 1:30 retail / 1:200 pro is far higher. Cap notional
  separately via `EXEC_FX_PER_TRADE_NOTIONAL_PCT` (suggest 100 = full
  equity ceiling) so the risk-derived size is the binding constraint,
  not the notional cap.
- **Per-unit risk for FX**: For a 0.01 lot EURUSD, 1 pip = $0.10. Stop
  distance in pips * pip value = USD risk per lot. Convert via
  `contractSize` (100 000 for FX) so `stopDistance * qty * contractSize`
  produces correct USD risk.
- **Indices/metals**: `contractSize` varies (e.g. XAUUSD = 100 oz).
  Same formula handles it as long as `contractSize` is fetched live.
- **Equity source**: `equityUsd` comes from MetaApi `account-information.equity`,
  not Binance wallet. Demo starts at $10 000 USD by default.
- **Per-trade risk stays 1%**: leverage cap is irrelevant to risk
  budget; it only affects margin headroom and rejections, not loss size.
  Keep `EXEC_RISK_PCT=1`.

## 6. Order construction differences vs Binance Futures

| Concern | Binance Futures | MT5 / MetaApi |
|---|---|---|
| Entry type | `MARKET` or `LIMIT` | Prefer `BUY_STOP` / `SELL_STOP` placed just above/below entry to avoid worst-case slippage on illiquid CFDs |
| Stop loss | Separate `STOP_MARKET` reduceOnly order | `stopLoss` field native to position; submitted with the entry |
| Take profit | Separate `TAKE_PROFIT_MARKET` order | `takeProfit` field native to position |
| Idempotency | `clientOrderId` | MetaApi `clientId` (alphanumeric, <= 32 chars) |
| Symbol rules | `exchangeInfo` -> `LOT_SIZE`, `PRICE_FILTER` | `GET /symbols/{symbol}/specification` -> `minVolume`, `volumeStep`, `tickSize`, `contractSize`, `stopsLevel` |
| Stops level | n/a | MT5 enforces `stopsLevel` minimum distance between price and SL/TP. Reject if violated. |
| Time in force | `GTC` etc. | `GTC` / `IOC` / `FOK`; default `GTC` for stop-entry |

Symbol spec fetch (per symbol, cache 1h):
```
GET https://mt-client-api-v1.{region}.agiliumtrade.ai/users/current/
    accounts/{accountId}/symbols/{symbol}/specification
```

## 7. Cost & friction

- **MetaApi free tier**: 1 account, demo OK, full REST + streaming.
  Sufficient for a single Zaky demo run. Source: metaapi.cloud pricing.
- **Paid tier (when scaling to multi-user)**: ~$15/account/month for
  cloud-G2. Already noted in pilot Phase 3 cost section.
- **Latency**: cron-pull cadence is 60s; MetaApi cloud round-trip from
  Railway us-east -> `new-york` region MT5 broker is ~150-400ms. Total
  fill latency under 2s for stop-entry, well within H1 timeframe
  tolerance. Would be marginal for M5; out of scope here.
- **Data quirks**: MT5 weekend gap (Sat-Sun closed for FX/equities;
  crypto CFDs continue but with widened spread). Existing weekend gating
  in `tracked-signals.ts` already handles this — confirm no double-filter.

## 8. Sketch — `apps/web/lib/execution/metaapi-bridge.ts` (interface only)

```ts
// DO NOT IMPLEMENT IN THIS PR. Interface sketch only.

export interface MetaApiSymbolSpec {
  symbol: string;
  minVolume: number;
  volumeStep: number;
  contractSize: number;
  tickSize: number;
  stopsLevel: number;       // min distance between price and SL/TP
  digits: number;
}

export interface MetaApiPlaceInput {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'BUY_STOP' | 'SELL_STOP' | 'MARKET';
  volume: number;           // lots
  price?: number;           // required for STOP types
  stopLoss: number;
  takeProfit: number;
  clientId: string;         // <=32 chars, idempotent
  comment?: string;         // shows in MT5 terminal
}

export interface MetaApiBridge {
  getAccountInfo(): Promise<{ equity: number; balance: number; currency: string }>;
  getSymbolSpec(symbol: string): Promise<MetaApiSymbolSpec>;
  placeOrder(input: MetaApiPlaceInput): Promise<{ orderId: string }>;
  closePosition(positionId: string): Promise<void>;
  listOpenPositions(): Promise<Array<{ id: string; symbol: string; volume: number; openPrice: number; unrealizedProfit: number }>>;
}

export function createMetaApiBridge(env: {
  token: string;
  accountId: string;
  region: 'new-york' | 'london' | 'singapore';
}): MetaApiBridge;
```

This matches the `BrokerAdapter` interface implied by pilot doc section
"Module layout" so `executor.ts` can dispatch by `EXECUTION_BROKER` env
without branching.

## 9. Acceptance criteria (day 30)

Pass conditions, all required:
- Realized R per trade >= +0.20R (vs published +0.32R)
- Win rate >= 42% (vs published 46%)
- Max drawdown <= 35%
- >= 60 sized trades placed (sanity check vs hmm-top3 historical cadence
  of ~5-7/day after gating)
- < 3 rejected-by-broker errors not caught by sizing module
- Equity curve correlation with `signal_history.outcome_24h`-derived
  paper equity curve >= 0.85 (Pearson)

If any miss: do NOT change live signals or production gates. Open an
investigation note under `docs/audits/2026-06-XX-demo-vs-track-record.md`
covering: symbol mapping coverage gaps, slippage per symbol, MT5-specific
rejections (stopsLevel, market closed, requote), and divergence vs the
recorded paper outcomes.

## 10. Out of scope

- Auto-deploy this bridge to per-user paying customers (that's Phase 3
  proper, gated on this demo passing).
- Multi-account MetaApi (paid tier).
- Position-manager port to MT5 (chandelier trail) — Phase 3.
- Encryption-at-rest for user MT5 credentials — Phase 3.
- M5 timeframe support — out of scope for this 30-day demo.

## 11. References

- Pilot plan: `docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md`
  sections "Module layout" and "Phase 3 — MetaApi MT5 bridge"
- Sizing: `apps/web/lib/execution/sizing.ts`
- Existing broker client surface: `apps/web/lib/execution/binance-futures.ts`
- Signal table: `apps/web/migrations/003_signal_history.sql`
- MetaApi REST docs: <https://metaapi.cloud/docs/client/restApi/>
- RoboForex MT5 server list: <https://roboforex.com/beginners/services/metatrader-servers/>
