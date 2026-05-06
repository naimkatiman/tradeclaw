# Demo TradeClaw signals on TradingView

Date: 2026-05-06
Owner: Zaky
Goal: Use Zaky's paid TradingView ("TV full") account to validate the published `hmm-top3` track record (+918% return, Sharpe 16, 46% WR, +0.32R expectancy on 801 sized trades) by surfacing every production signal on TV charts.

## 1. Current state + the TV paper-trading API limitation

TradeClaw signals are written to the Railway Postgres `signal_history` table by two writers (request side-effect via `apps/web/lib/tracked-signals.ts` → `recordSignalsAsync`, and the 5-minute cron at `apps/web/app/api/cron/signals/route.ts` → `recordNewSignals`). Both call `apps/web/lib/signal-history.ts::insertSignalHistoryRow`. That table is the only source of truth.

TradingView limitations Zaky must accept up front:

- **TV paper-trading does NOT accept external orders.** The "Paper Trading" broker inside TV is internal-only. There is no public REST/WebSocket endpoint where TradeClaw can POST `entry/sl/tp` and have a paper position open. Confirmed via TV's broker integration docs — only certified broker integrations (Alpaca, OANDA, Tradovate, Tradier, etc.) can place orders programmatically through TV's UI, and even then via TV → broker, not external → TV.
- **TV webhooks are outbound-only from TV.** Pro+ tier alerts can fire `POST` to a URL (https://www.tradingview.com/support/solutions/43000529348-about-webhooks/), but this is TV pushing to your endpoint when a TV-defined alert condition triggers. There is no public inbound webhook that injects an alert from outside.
- **Pine Script runs only inside TV charts.** Pine has no network/HTTP. It cannot pull a TradeClaw signal from `signal_history`. It can only compute its own indicators on TV's bar data.
- **Only documented inbound-ish channel: chart annotation via "Custom alert" + a community trick** — none of the official methods let you draw markers from outside. Third-party plugins (e.g. `tvjs-overlay`) exist but require running TV in your own browser via screen-scrape, which is a TOS gray area.

Consequence: the naive "TradeClaw signal → TV paper trade" loop is impossible. Anything that places a trade requires a third-party broker bridge (Path C). Anything that just visualizes on TV is constrained to either (a) a chart annotation that the Zaky has to read by eye, or (b) Pine Script re-deriving the signal from indicators.

## 2. Recommended path

**Path A as primary, Path B as cross-check.** Path C is overkill for demo validation and adds broker risk.

Rationale: Zaky needs to confirm two things — (1) the entry/SL/TP placements look chartable and not optimistic, (2) the indicator stack that drives `hmm-top3` is sane on real bars. Path A gives him visual coverage of every production signal on the right TV symbol within seconds of generation, which directly attacks (1). Path B re-implements the deterministic part of `signal-generator.ts` in Pine and lets TV's strategy tester run a forward-paper-trade alongside production, which attacks (2). Path B is a sanity layer, not a P&L source — the HMM regime classifier is not pure Pine, so a perfect match is impossible. Path A is enough to demo the system; Path B is enough to defend the indicator math.

## 3. Day-1 action checklist

### Path A — Visual verification (do this first)

1. **Set up a TradingView "External webhook" inbound endpoint owned by TradeClaw.** TV cannot pull, so we flip the direction: TradeClaw POSTs into a TV-side bridge. Two flavors:
   - **3a. Easy flavor (preferred):** use a free chart-marker bot like `tvchart-marker` or a private Discord+TV combo. Zaky configures one TV alert per symbol with `webhookUrl` pointing back to TradeClaw, then TradeClaw uses TV's "drawing API" via a browser session. **Caveat:** TV does not officially expose a drawing API — this requires `tradingview-ta` style scraping or a paid third-party (e.g., chartink, TradersPost has a chart-marker mode). Document this honestly: there is no clean official way to draw external markers on a TV chart.
   - **3b. Honest flavor:** publish the signals on a Telegram channel that Zaky pins next to his TV chart. Reuses `apps/web/lib/telegram-broadcast.ts::broadcastTopSignals` which already POSTs each signal as a separate message. Zero new infra. Zaky watches Telegram + TV chart side by side. This is what production already does for the public free channel.

2. **Sketch a Next.js webhook receiver** (only needed if going with 3a or a paid TV-marker service). Do NOT implement until Zaky picks the bridge. Outline only:
   ```ts
   // apps/web/app/api/webhooks/tradingview/route.ts
   export async function POST(req: Request) {
     const secret = req.headers.get('x-tradingview-secret');
     if (secret !== process.env.TV_WEBHOOK_SECRET) return new Response('unauthorized', { status: 401 });
     const { symbol, direction, entry, sl, tp } = await req.json();
     // Forward to TV chart-marker provider here.
     return Response.json({ ok: true });
   }
   ```
   Auth: shared secret in `TV_WEBHOOK_SECRET` env var on Railway. Body schema: `{symbol, direction: 'BUY'|'SELL', entry, sl, tp1, confidence, signalId}` — same shape as `tracked-signals.ts` already produces.

3. **Recommended starting point for Day 1: skip the bridge.** Use Telegram (3b). Pin TV chart for the symbol of interest, watch the Telegram pin update, eyeball the chart. Zaky can validate ~30 signals/day this way without writing any new code. If after a week he wants automated chart markers, revisit 3a.

### Path B — Pine Script indicator cross-check

1. Open the relevant TV chart for one production symbol (e.g., `BINANCE:BTCUSDT` on H1).
2. Create a new Pine v5 strategy. Copy the indicator inputs from `apps/web/app/lib/ta-engine.ts` and `signal-generator.ts`:
   - RSI(14), MACD(12,26,9), EMA(20/50/200), Bollinger Bands(20, 2σ), Stochastic(14,3,3), ADX(14)
   - Confidence threshold: `PUBLISHED_SIGNAL_MIN_CONFIDENCE` (check current Railway env — typically 60-65)
   - Entry rule: replicate the boolean stack in `signal-generator.ts::generateSignalsFromTA`. Use Pine `strategy.entry`/`strategy.exit` with the same SL/TP percentages.
3. Skip the HMM regime classifier — Pine has no HMM. Add a manual checkbox input "HMM regime: top-3 only" and toggle by hand based on the `/api/regime` endpoint output for that day.
4. Run TV strategy tester. Compare TV's reported `Net Profit %` and `Win Rate %` to TradeClaw's `/api/strategy-breakdown?strategy=hmm-top3` for the matching symbol+window.
5. Expectation: indicator-only Pine version will under-perform `hmm-top3` because it lacks regime gating. If they diverge by >50% in win rate that's evidence of a real bug; <30% divergence is expected.

## 4. Symbol coverage

TradeClaw production tracks crypto pairs (Binance USDT) plus a handful of FX majors. TV mappings:

- Crypto: `BTCUSDT` → `BINANCE:BTCUSDT`, `ETHUSDT` → `BINANCE:ETHUSDT`, etc. Direct 1:1 — TV has the full Binance perp + spot universe.
- FX majors: `EURUSD`, `GBPUSD`, etc. → `OANDA:EURUSD` or `FX:EURUSD`. Both work; OANDA gives cleaner H1 candles for backtest comparison.
- Edge cases: any TradeClaw signal on a pair that TV doesn't mirror (e.g., a low-cap Binance perp delisted on TV) — none currently in `hmm-top3`'s tracked universe per signal-generator. If one appears, log it as `⚠️ Deferred` and skip from the demo set.

## 5. Validation method

Concrete Day-1-through-Day-7 protocol for Zaky:

1. **Pull the last 7 days of `hmm-top3` signals** from production:
   ```
   psql $DATABASE_URL -c "SELECT id, pair, timeframe, direction, entry_price, tp1, sl, created_at, outcome_24h FROM signal_history WHERE strategy_id='hmm-top3' AND created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 50"
   ```
2. **Pick 20 at random.** For each, open the matching TV chart at H1 timeframe, jump to the `created_at` bar.
3. **Check three things by eye:**
   - Was the entry price `entry_price` reachable on that bar? (i.e., between `low` and `high`, not a phantom mid-wick value)
   - Is the SL distance reasonable? (Should be ~1-2 ATR away on H1, not a 5%-fixed-width stop on a low-vol bar)
   - Did the chart resolve consistent with `outcome_24h`? (If `outcome_24h.hit=true`, TP should have been touched within 24 candles.)
4. **Tally.** Out of 20, expect ≥18 entries reachable, ≥18 SL distances sensible, and `outcome_24h` matching what the chart shows. Any deviation > 2/20 is a real bug worth digging into.
5. **Compare `/track-record` aggregates** against the TV strategy tester output from Path B for the same window. Divergence > 50% in win rate on the indicator-only version is expected (HMM gating); divergence on entries that BOTH sides took is not.

## 6. Honest limitations

TV is the weakest of the four demo platforms for *actual P&L validation*:

- **No external orders → no real paper P&L on TradeClaw signals.** TV's strategy tester only reports P&L from Pine-defined entries, not TradeClaw entries. The "918% / Sharpe 16" number cannot be reproduced inside TV — only spot-checked.
- **TV's bar data may differ from TradeClaw's source.** TradeClaw uses Twelve Data via `market-data-hub` for OHLCV resolution; TV uses its own data feeds (Binance direct, OANDA, etc.). For BTC/ETH this is essentially identical; for low-volume pairs it can drift by a few bps. Don't treat a 0.1% entry-price mismatch as a bug.
- **Pine Path B will under-state win rate.** Without the HMM regime classifier, the indicator-only strategy takes more signals during chop and prints lower hit rate. This is a feature of the demo, not a flaw.
- **Visual eyeball is subjective.** "Looks reasonable" is not a metric. Path A gives qualitative confidence; quantitative validation lives on `/track-record` and `/api/strategy-breakdown`, both already public.
- **Best-suited use is investor demo and trader sanity-check**, not a parallel paper-trade system. For a real parallel paper account, use Path C (3rd-party bridge → Alpaca paper or Binance testnet).

## Path C (deferred — document, do not build)

For completeness: if Zaky later wants real paper P&L, the bridge stack is `TradeClaw signal → POST → connector (TradersPost / 3Commas / PickMyTrade / Wundertrading) → broker paper account (Alpaca / OANDA / Binance testnet)`. Adds ~$30/mo connector cost and 1-3s latency. Re-evaluate after Path A + B run for 2 weeks. ⚠️ Deferred — not needed for Day-1 validation.

## File references

- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/migrations/003_signal_history.sql`
- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/lib/signal-history.ts`
- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/app/api/cron/signals/route.ts`
- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/lib/tracked-signals.ts`
- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/lib/telegram-broadcast.ts` (delivery pattern reuse)
- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/app/lib/signal-generator.ts` (indicator stack to port to Pine)
- `/home/naim/.openclaw/workspace/tradeclaw/apps/web/app/lib/ta-engine.ts` (indicator math)

## TV doc references

- Webhooks (Pro+ tier outbound): https://www.tradingview.com/support/solutions/43000529348-about-webhooks/
- Pine Script v5 strategy reference: https://www.tradingview.com/pine-script-reference/v5/
- Broker integration list: https://www.tradingview.com/support/solutions/43000516796-broker-integration/
