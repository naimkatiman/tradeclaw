# TradeClaw Architecture: Signals, Backtesting, and Self‑Hosting (Under the Hood)

TradeClaw looks like "a dashboard that spits out BUY/SELL ideas", but under the hood it's a few small systems that snap together:

- **Signal engine**: candles → indicators → confluence score → `TradingSignal`
- **Backtesting**: reuse the same indicators, replay over historical candles
- **Self-hosting**: Docker Compose (Postgres/Timescale + Redis + app + scanner)
- **Next.js**: UI + API routes in one TypeScript codebase

This post is codebase-grounded—paths and behavior match what's in this repo today.

---

## How the TA engine generates signals (RSI + MACD + EMA confluence)

TradeClaw's TA engine is intentionally "boring": it computes well-known indicators and only publishes a signal when multiple indicators agree (confluence).

The indicator math lives in the shared `@tradeclaw/signals` package (`packages/signals/src/indicators.ts`):

- **RSI**: Wilder's smoothing (standard RSI)
- **MACD**: 12/26 EMA with 9‑period signal line, using the histogram for bullish/bearish bias
- **EMA**: standard exponential moving average (used for trend/structure)

### From prices → indicators

The agent-side engine (`packages/agent/src/signals/engine.ts`) produces OHLC arrays and computes an `IndicatorSummary`. For demo/development stability, it can generate a **deterministic** candle series (seeded per symbol/timeframe/hour) that's **anchored to a live base price** when available—so signals are stable without drifting away from real market levels.

The important part is the contract: one compact `IndicatorSummary` travels everywhere (API responses, UI charts, explainers, and backtesting overlays).

### Confluence as a scoring model

Instead of a single brittle rule, TradeClaw uses a weighted score in `evaluateSignal()`:

- RSI contributes more when it's far from neutral (e.g. deeply oversold/overbought).
- MACD histogram contributes a bullish/bearish momentum vote.
- EMA structure contributes trend/structure confirmation.

If neither side has enough evidence, the engine returns **no signal**. If one side wins, the score is mapped into a bounded **confidence** value (capped below 100 to avoid fake certainty).

---

## The backtesting approach

TradeClaw's backtesting is built for iteration and understanding, not for "perfect execution simulation".

Two principles keep it honest:

1. **Same indicators, same math**: backtests call the exact same `@tradeclaw/signals` functions as live signal generation.
2. **Visual first**: the result should be easy to verify on charts (EMA overlays, RSI/MACD panels, BUY/SELL markers).

At a high level a backtest run:

- builds a candle series (fixed window),
- recomputes indicators on that series,
- applies the same confluence logic to "would a signal fire here?",
- and summarizes outcomes with a simple trade model.

That simplicity is a feature: contributors can change one thing (a threshold, a weight, a filter) and immediately see how it changes signal quality across the window.

### What TradeClaw does NOT do in backtesting

- No slippage model, no order-book simulation.
- No look-ahead bias—indicators are computed causally (each bar only sees past data).
- No optimization loops (no curve-fitting). The backtest is a visualization and sanity-check tool, not an auto-optimizer.

These are intentional scope limits. TradeClaw is a signal-exploration tool, not a hedge-fund backtester.

---

## Self-hosting architecture

TradeClaw is designed to run on a single machine (or a small VPS) via Docker Compose. The stack:

| Service | Role |
|---------|------|
| **Postgres (TimescaleDB)** | Candle storage, signal history, user data |
| **Redis** | Pub/sub for real-time signal updates, caching |
| **App (Next.js)** | Web UI + API routes |
| **Scanner (Agent)** | Background process that fetches prices, computes signals, writes to DB and Redis |

### Why Docker Compose?

Most TradeClaw users are individual traders or small teams. Docker Compose gives them:

- A single `docker-compose up` to start everything.
- Easy backups (dump Postgres, done).
- No vendor lock-in—runs on any Linux box, a Raspberry Pi, or a cloud VM.

Kubernetes would be overkill. If someone needs horizontal scaling, they can split the scanner into multiple instances partitioned by symbol—but that's a future concern, not a day-one requirement.

### Data flow

1. The **scanner** wakes on a schedule (or on websocket tick), fetches candles from the configured exchange API.
2. It computes indicators and evaluates confluence.
3. If a signal fires, it writes to **Postgres** and publishes to **Redis**.
4. The **Next.js app** subscribes to Redis for real-time updates and queries Postgres for history.
5. The **UI** renders charts, signal cards, and backtest overlays.

This architecture means the frontend never talks directly to an exchange—everything is mediated through the scanner and database. That separation makes it easy to swap data sources or add new exchanges without touching the UI.

---

## Why Next.js?

TradeClaw chose Next.js for a pragmatic reason: **one TypeScript codebase for UI and API**.

### Specific benefits

- **API routes**: signal endpoints, backtest triggers, and webhook handlers live next to the pages that consume them. No separate Express server to maintain.
- **Server-side rendering**: the dashboard can pre-render with fresh signal data, so the initial page load shows real content (not a loading spinner).
- **TypeScript end-to-end**: the same `TradingSignal` and `IndicatorSummary` types are shared between the signal engine, the API layer, and the React components. No serialization mismatches.
- **Ecosystem**: charting libraries (lightweight-charts, recharts), auth (NextAuth), and deployment tooling all have first-class Next.js support.

### Trade-offs acknowledged

- Next.js adds complexity compared to a pure SPA. For TradeClaw's use case (server-rendered dashboard with real-time updates), the trade-off is worth it.
- The App Router and Server Components model is still evolving. TradeClaw uses a mix of server and client components, favoring simplicity over bleeding-edge patterns.

---

## Wrapping up

TradeClaw's architecture is deliberately simple:

- A small set of well-known indicators, combined through confluence scoring.
- Backtesting that reuses the same math and prioritizes visual verification.
- A self-hosted Docker Compose stack that any developer can run locally.
- A Next.js frontend that keeps everything in one TypeScript codebase.

The goal is not to build the most sophisticated trading system—it's to build one that's transparent, easy to modify, and honest about what it does and doesn't do. Every architectural choice optimizes for contributor understanding over theoretical performance.

If you want to dig deeper, start with `packages/signals/src/indicators.ts` for the math, `packages/agent/src/signals/engine.ts` for the signal pipeline, and `docker-compose.yml` for the deployment topology.
