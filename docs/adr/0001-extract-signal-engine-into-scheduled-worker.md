# ADR 0001: Extract the signal engine into a dedicated scheduled worker

- Status: Proposed
- Date: 2026-06-28
- Deciders: TradeClaw maintainers
- Source: Weekly improvement report recommendation (extract the signal engine into a dedicated scheduled worker; add feature flags; instrument the alert to retained funnel)

## Context

Signal generation today runs as scheduled GitHub Actions cron workflows that call Next.js API routes on the production web app:

- `.github/workflows/signal-alerts.yml` runs every 5 minutes and POSTs `https://tradeclaw.win/api/cron/signals`, then fans out immediate Telegram alerts.
- `.github/workflows/push-signals.yml` runs every 15 minutes and POSTs `https://tradeclaw.win/api/cron/push-signals` to trigger Expo push notifications.
- Additional schedules exist for `daily-track-record`, `signal-log`, and `telegram-broadcast`.

This couples the signal compute path to the web request lifecycle and to GitHub Actions scheduling. Consequences:

- Signal compute shares resources and failure modes with user-facing web traffic. A slow signal pass can degrade the app, and an app deploy can disrupt signal timing.
- Scheduling, retries, concurrency control, and timeouts are spread across many workflow YAML files rather than owned by one component.
- There is no first-class place to run the engine in shadow mode, compare outputs, or roll a change out gradually.
- The acquisition funnel (alert to click to signup to subscription to retained) is not instrumented end to end, so the impact of signal changes on conversion and retention is not measurable.

This is a live trading and payments product. Any migration must be reversible and must not change trading, signal math, or Stripe behaviour during cutover.

## Decision

Adopt a phased plan to move signal generation out of the in-app cron route and into a dedicated scheduled worker, gated by feature flags, with the conversion funnel instrumented before and during the migration.

1. Worker boundary. Stand up a dedicated worker (a small long-running service or a scheduled job) that owns signal generation by consuming the existing `@tradeclaw/signals` package directly, instead of going through the web API route. The web app keeps serving reads.
2. Feature-flag the cutover. Introduce environment-driven flags so the worker can run OFF by default, then in shadow mode (compute alongside the legacy path and compare, without acting), then as the source of truth. A scaffold for these flags lands with this ADR at `packages/core/src/flags/feature-flags.ts` and is intentionally unwired.
3. Funnel instrumentation. Emit a consistent event for each funnel stage (alert delivered, alert click, signup, subscription, retained) keyed by a stable identifier, so each signal-engine change can be evaluated against downstream conversion and retention. Instrumentation is gated by its own flag so it can ship dark and be enabled per environment.
4. Reversibility. The legacy GitHub Actions cron path stays in place and authoritative until the worker has run in shadow mode long enough to confirm output parity. Cutover and rollback are a flag flip, not a deploy.

## Scope guardrails

- No change to trading, signal, or Stripe logic in this ADR or its accompanying scaffold. The signal math in `@tradeclaw/signals` is reused verbatim.
- The flag module shipped alongside this ADR is additive and unwired: it is not imported by any runtime code and is not exported from `packages/core/src/index.ts`.
- Each later phase (worker bootstrap, shadow compare, instrumentation, cutover) is a separate change behind its own flag.

## Flags introduced by the scaffold

Defined in `packages/core/src/flags/feature-flags.ts`. All default to OFF.

| Flag | Env var | Purpose |
| --- | --- | --- |
| `signalWorkerEnabled` | `TRADECLAW_FF_SIGNAL_WORKER` | Route signal generation through the extracted worker instead of the in-app cron route. |
| `signalWorkerShadowMode` | `TRADECLAW_FF_SIGNAL_WORKER_SHADOW` | Run the worker alongside the legacy path to compare outputs before cutover. |
| `funnelInstrumentation` | `TRADECLAW_FF_FUNNEL_INSTRUMENTATION` | Emit the alert to retained funnel analytics events. |

## Consequences

Positive:

- Signal compute is isolated from web request load and from app deploys.
- Scheduling, retries, and concurrency are owned by one component instead of many workflow files.
- Gradual rollout and instant rollback via flags reduce migration risk on a live trading product.
- The funnel becomes measurable, so signal-engine changes can be judged on conversion and retention, not just on signal accuracy.

Negative or costs:

- One more deployable component to operate and monitor.
- A temporary period running both paths (legacy cron plus shadow worker) costs extra compute and needs an output-parity check.
- Flags add configuration surface that must be documented and kept tidy after cutover.

## Alternatives considered

- Keep the in-app cron route and only add instrumentation. Rejected as the primary fix: it leaves signal compute coupled to web traffic and to GitHub Actions scheduling, which is the root concern in the report.
- Move scheduling to an external scheduler but keep the API route as the compute path. Rejected: it changes the trigger without decoupling compute from the web lifecycle.
- Big-bang cutover with no shadow mode. Rejected: unacceptable risk for a live trading and payments product; no safe rollback.

## Follow-ups (not in this change)

- Choose the worker runtime and deployment target (the repo already runs on Railway, Fly, and Docker; pick one host for the worker).
- Wire the flag resolver at the relevant boundary and add unit tests for `resolveAllFlags`.
- Define the funnel event schema and the stable identifier that joins alert to subscription to retained.
- Add an output-parity check for the shadow phase.
