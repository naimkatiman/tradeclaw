# TradeClaw Architecture: Runtime Boundaries and Self-Hosting

TradeClaw is a monorepo with several signal, research, delivery, and execution paths. They share types and some indicator primitives, but they are not one interchangeable pipeline. This document describes the current boundaries rather than a future target architecture.

## Repository shape

- `apps/web` contains the Next.js UI, API routes, scheduled-job handlers, signal history, research views, alert configuration, and execution orchestration.
- `packages/signals` contains shared indicator and market-regime primitives.
- `packages/strategies` contains historical entry modules and backtest runners with selectable geometry and cost assumptions.
- `packages/agent` contains a separately runnable agent daemon, channel adapters, and its own signal engine.
- `packages/ws-server` provides the Redis-backed websocket service used by the Compose stack.

The presence of a package or adapter does not mean it runs in the default deployment. Operators must inspect the relevant entry point, configuration, and scheduler.

## Signal generation is not one universal formula

The agent engine in `packages/agent/src/signals/engine.ts` calculates RSI, MACD, EMA, Bollinger Bands, Stochastic, and ADX through `@tradeclaw/signals`. Its input path is important: it creates a deterministic synthetic OHLC series and anchors the final value to a live price when one is available. That series is useful for deterministic development behavior, but it is not an observed historical candle feed.

The web app also has strategy-specific signal and research paths. Confidence formulas, minimum scores, regime rules, and backtest entry modules can differ. A simplified UI calculator or a shared indicator implementation is therefore not proof that two paths use identical decision rules.

Entry-like delivery and execution have an additional fail-closed boundary. A confidence score alone is insufficient: the reproducible cost-adjusted evidence gate must have enough recent, cost-covered, positive out-of-sample evidence. When that evidence is missing or fails, the relevant entry fan-out and execution paths halt.

## Historical research boundaries

TradeClaw records signal outcomes derived from OHLCV and exposes counted wins, losses, exclusions, and methodology. Those records are signal-level research outputs. They are not broker fills or a customer portfolio ledger.

Backtests in `packages/strategies` reuse some shared indicator primitives, but use strategy-specific entry modules and explicit simulation geometry. A backtest result is meaningful only with its symbol, window, entry module, sizing, cost model, and exit assumptions. It should not be described as live performance or as guaranteed parity with another signal path unless a parity test demonstrates that claim.

## Current Docker Compose topology

The default `docker-compose.yml` defines:

| Service     | Current role                   |
| ----------- | ------------------------------ |
| `db`        | TimescaleDB/PostgreSQL storage |
| `redis`     | Cache and pub/sub transport    |
| `migrate`   | One-shot SQL migration runner  |
| `app`       | Next.js web and API process    |
| `ws-server` | Redis-backed websocket service |

Prometheus and Grafana are optional under the `monitoring` profile.

There is no scanner service in the current Compose file. A previous scanner definition pointed at a non-runnable library package and was removed. The runnable interval scanner is the separate `packages/agent` daemon; an operator who needs it must build and run it explicitly. Scheduled web routes likewise need an external scheduler and the required authentication secret.

Self-hosting is not credential-free. Copy `.env.example`, set the required database and signing secrets, review optional provider credentials, and then build the stack. Market-data, alert, OAuth, payment, and broker providers can still receive outbound requests when configured.

## Runtime data and delivery flow

A typical web-app path is:

1. A configured market-data adapter or authenticated job obtains input data.
2. A strategy path calculates a candidate signal and records its provenance and state.
3. Canonical outcome jobs later derive TP, SL, or 24-hour outcomes from OHLCV.
4. The app reads PostgreSQL for history and research views; websocket features use the separately running websocket and Redis services where configured.
5. Authenticated alert dispatchers can send eligible payloads to configured destinations.

Outbound webhooks are not a promise that every generated signal is delivered. The generic dispatch endpoints require authentication, apply destination filters, and fail closed for entry-like events when the evidence gate does not clear. `signal.test` exists for explicit setup verification. Slack, Zapier, marketplace, and broker example pages include manual setup recipes; those recipes are not proof of native third-party integrations.

## Execution boundary

Execution is disabled by default. The implemented native adapter targets Binance USDT perpetuals and defaults to Binance testnet. Other broker cards and snippets are external starter examples, while the RoboForex bridge remains an interface-only scaffold. User-supplied webhook receivers that call broker APIs are outside the native execution boundary and need their own authentication, idempotency, sizing, symbol mapping, risk controls, and audit trail.

## Why Next.js

Next.js keeps UI and HTTP handlers in one TypeScript workspace and lets routes share repository types. That reduces deployment pieces for the web surface, but it does not remove the operational boundaries above: background jobs, the agent daemon, websocket service, database, Redis, and third-party providers still have separate lifecycles.

## Where to verify behavior

- `docker-compose.yml` for the processes that actually start by default.
- `packages/agent/src/signals/engine.ts` for the agent's synthetic-series signal path.
- `packages/strategies/src/run-backtest.ts` and `backtest-options.ts` for historical simulation behavior.
- `apps/web/lib/signal-history.ts` for recorded outcome semantics.
- `apps/web/lib/cost-adjusted-edge-gate.ts` for the evidence requirement.
- `apps/web/lib/execution/executor.ts` for the native execution boundary.
- `apps/web/lib/webhooks.ts` and the authenticated webhook routes for delivery behavior.

Claims about latency, profitability, broker support, or automatic delivery should be backed by those runtime paths and by reproducible production evidence, not by the existence of UI copy or an example snippet.
