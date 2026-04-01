# TradeClaw Architecture: Signals, Backtesting, and Self‑Hosting (Under the Hood)

TradeClaw looks like “a dashboard that spits out BUY/SELL ideas”, but under the hood it’s a few small systems that snap together:

- **Signal engine**: candles → indicators → confluence score → `TradingSignal`
- **Backtesting**: reuse the same indicators, replay over historical candles
- **Self-hosting**: Docker Compose (Postgres/Timescale + Redis + app + scanner)
- **Next.js**: UI + API routes in one TypeScript codebase

This post is codebase-grounded—paths and behavior match what’s in this repo today.

---

## How the TA engine generates signals (RSI + MACD + EMA confluence)

TradeClaw’s TA engine is intentionally “boring”: it computes well-known indicators and only publishes a signal when multiple indicators agree (confluence).

The indicator math lives in the shared `@tradeclaw/signals` package (`packages/signals/src/indicators.ts`):

- **RSI**: Wilder’s smoothing (standard RSI)
- **MACD**: 12/26 EMA with 9‑period signal line, using the histogram for bullish/bearish bias
- **EMA**: standard exponential moving average (used for trend/structure)

### From prices → indicators

The agent-side engine (`packages/agent/src/signals/engine.ts`) produces OHLC arrays and computes an `IndicatorSummary`. For demo/development stability, it can generate a **deterministic** candle series (seeded per symbol/timeframe/hour) that’s **anchored to a live base price** when available—so signals are stable without drifting away from real market levels.

The important part is the contract: one compact `IndicatorSummary` travels everywhere (API responses, UI charts, explainers, and backtesting overlays).

### Confluence as a scoring model

Instead of a single brittle rule, TradeClaw uses a weighted score in `evaluateSignal()`:

- RSI contributes more when it’s far from neutral (e.g. deeply oversold/overbought).
- MACD histogram contributes a bullish/bearish momentum vote.
- EMA structure contributes trend/structure confirmation.

If neither side has enough evidence, the engine returns **no signal**. If one side wins, the score is mapped into a bounded **confidence** value (capped below 100 to avoid fake certainty).

---

## The backtesting approach

TradeClaw’s backtesting is built for iteration and understanding, not for “perfect execution simulation”.

Two principles keep it honest:

1. **Same indicators, same math**: backtests call the exact same `@tradeclaw/signals` functions as live signal generation.
2. **Visual first**: the result should be easy to verify on charts (EMA overlays, RSI/MACD panels, BUY/SELL markers).

At a high level a backtest run:

- builds a candle series (fixed window),
- recomputes indicators on that series,
- applies the same confluence logic to “would a signal fire here?”,
- and summarizes outcomes with a simple trade model.

That simplicity is a feature: contributors can change one thing (a threshold, a weight, a filter) and immediately see how it changes signal frequency and behavior on the chart.

---

## Self-hosting architecture (Docker Compose, services)

TradeClaw is intentionally self-hostable. The “happy path” is a single command:

```bash
docker compose up -d
```

The `docker-compose.yml` in the repo wires together four services:

### `app` (Next.js: UI + API)

This is the main container that serves:

- the dashboard and pages,
- plus the server-side API endpoints (e.g. `/api/health`, signals, backtest helpers, etc.).

The image is built from the repo’s `Dockerfile` with a production target, and it exposes port 3000 (mapped to `${APP_PORT:-3000}`).

It depends on:

- `db` (Postgres/Timescale) being healthy
- `redis` being healthy
- and `migrate` having completed successfully

There’s also a container-level healthcheck against `GET /api/health`, which is exactly the kind of end-to-end check you want in a self-hosted setup.

### `db` (TimescaleDB / Postgres)

The database service uses `timescale/timescaledb:latest-pg16`. Even if you’re not using Timescale-specific features on day one, it’s a solid default for time-series-ish apps like trading signals.

It mounts:

- persistent volume storage for the Postgres data directory
- an init script via `./scripts/init-db.sh` (so you can pre-create extensions/roles consistently)

### `redis` (cache / coordination)

Redis is included as a lightweight cache with an LRU policy. In self-hosted environments, Redis is a pragmatic way to get:

- shared caching for “expensive” computations,
- rate-limiting primitives,
- and coordination between processes (like scanners) without tying everything to the DB.

### `migrate` (SQL migrations runner)

Instead of building a bespoke migration container, TradeClaw uses the Postgres image to run `.sql` files from `apps/web/migrations/`.

On boot:

- it waits for the DB healthcheck,
- then runs each migration in order with `ON_ERROR_STOP=1`,
- and exits successfully (or fails fast).

This makes “one command deploy” reliable: you don’t have to remember a separate migration step.

### `scanner` (background worker)

TradeClaw includes a separate `scanner` service (from `Dockerfile.scanner`) for background scanning on an interval. In Compose it’s controlled by `SCAN_INTERVAL` and `SCAN_INSTRUMENTS`, and it shares `DATABASE_URL`/`REDIS_URL` with the app.

This keeps the web server responsive and makes “always-on scanning” operationally clean—no hidden cron jobs inside the request path.

---

## Why we chose Next.js for the frontend (and the API)

TradeClaw uses Next.js (`apps/web`) as both the UI and the server runtime for product APIs. The payoff is reduced surface area:

- **One deployable unit** that serves pages *and* endpoints (`/api/...`, `/api/v1/...`).
- **Monorepo TypeScript** works smoothly with shared packages like `@tradeclaw/signals` (configured via `transpilePackages`).
- **Pragmatic production story**: it runs cleanly in Docker and fits the “self-host on a small VPS” target.

---

## Why this architecture is good for beginners

TradeClaw is a friendly codebase for contributors because the core is small and layered:

- **Pure functions** for indicators (`@tradeclaw/signals`)
- A readable **pipeline** (candles → indicators → score → signal)
- Backtesting that **reuses the same primitives** (no duplicate logic)
- A deployment story that teaches real-world basics (Postgres + Redis + app + worker) without Kubernetes

---

## Putting it together: the end-to-end path

The mental model stays consistent:

1. The Next.js app serves a page.
2. An API route fetches or generates signals.
3. The engine produces `TradingSignal` objects with an `IndicatorSummary`.
4. The UI renders those summaries (cards, charts, explainers).
5. The scanner runs the same logic on a schedule, outside the request path.

---

## Publishing notes (Dev.to / Medium)

This post lives in-repo at `docs/blog/tradeclaw-architecture.md`. If you cross-post, set a canonical URL (either to GitHub or to the external post) so SEO doesn’t split, then link it from `README.md`.

---

## Final thoughts

TradeClaw’s “under the hood” story is simple on purpose: real indicator math, a readable confluence score, backtesting that reuses the same building blocks, and a Compose stack that’s easy to run locally. That simplicity is why beginners can contribute quickly—and why self-hosters can deploy it without ceremony.

