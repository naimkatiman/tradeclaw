# Plan: Issue-comment enhancements (#19, #43, #37)

Date: 2026-06-01
Owner: Naim / Maulana

## Task (one sentence)
Implement the maintainer-comment enhancements on top of the already-shipped base implementations for three open issues, surgically and one concern per commit.

## Key finding
Base implementations already exist (shipped in `906e2b3`). This work is the **delta** the comments asked for, not greenfield.

- #19: `apps/web/app/api/metrics/route.ts` + `grafana/tradeclaw-dashboard.json` exist.
- #43: `apps/web/components/guided-tour.tsx` (full spotlight tour, localStorage, skip/next/resume, mobile, keyboard nav) exists.
- #37: `apps/web/components/tradingview-widget.tsx` (BINANCE mapping, RSI/MACD studies, cleanup, theme) exists; used in `apps/web/app/signal/[id]/SignalChartSection.tsx`.

## In scope (feasible, high-value, low-risk)

### #19 Prometheus / Grafana
- Add `tradeclaw_signal_outcomes_total{symbol,direction,result}` (hit/sl/open) derived from existing signal-history/`signal-metrics.ts` DB data.
- Add `tradeclaw_signal_age_seconds{symbol}` freshness gauge (now - last signal time per symbol).
- Zero-initialize counters so scrapers never see undefined series.
- Add Grafana panels: signal-freshness table (green/yellow/red staleness) + outcomes distribution. Update `grafana/tradeclaw-dashboard.json`.
- Update `grafana/README.md` with the new metrics.

### #43 Onboarding
- `Shift+?` global keyboard shortcut to restart the tour from anywhere (dispatch existing `tc:start-tour`).
- Empty-state-as-onboarding: when no signals are loaded, show a short explainer + single CTA instead of a bare "no signals" message (in `DashboardClient.tsx`, the `signal-grid` empty branch).
- (Stretch) 2-phase progressive disclosure: tag advanced steps (backtest/settings) to reveal after 3rd visit / first interaction. Only if it stays surgical.

### #37 TradingView
- Responsive widget height via `matchMedia`: 240px mobile / existing desktop height; keep `allow_symbol_change:false`.

## Deferred (logged, not built)
- #37 entry/SL/TP shape overlays + crosshair sync — require licensed `charting_library`, not the free embed widget. Native `SignalChart` already draws SL/TP lines; the TradingView tab is for raw price confirmation.
- #19 signal-gen latency histogram — needs invasive instrumentation across the signal-gen path; out of surgical scope.
- #19 webhook delivery + backtest queue + operator-memory gauges — need delivery/queue tracking plumbing; defer until those subsystems expose counters.
- #43 inline contextual `?` tooltips — already covered by existing `InfoHint.tsx`; tour copy already references the "?" icons.

## Commit plan (one concern per commit)
1. `feat(metrics): add signal-outcome + freshness series to /api/metrics`
2. `feat(grafana): add freshness + outcomes panels to dashboard`
3. `feat(onboarding): Shift+? restart shortcut + empty-state CTA`
4. `feat(chart): responsive TradingView widget height on mobile`
5. `docs: update grafana README + root README monitoring section`

## Verification per change
- Type check: `npm run build:signals` then `npm run lint --workspace=apps/web` (or `tsc --noEmit`).
- Metrics: hit `/api/metrics` locally, confirm valid Prometheus text + new series present and zero-initialized.
- Grafana JSON: validate it parses (`node -e "JSON.parse(require('fs').readFileSync('grafana/tradeclaw-dashboard.json'))"`).
- Onboarding: Shift+? restarts tour; empty state renders CTA.
- Widget: mobile viewport renders 240px height.

## Method
Workflow runs 3 parallel grounded spec agents (read-only) → I review → implement surgically in main repo, verify + commit each concern. Writes stay supervised.
