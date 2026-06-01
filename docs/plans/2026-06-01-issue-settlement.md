# Issue Settlement Plan — 2026-06-01

Triage of all 17 open GitHub issues against the live codebase. Verdict per issue,
delivery = one branch + PR per issue. Triage ran read-only via 17 parallel agents;
all close-as-done evidence was file-verified before closing.

## Recurring finding
Most issue bodies reference `packages/core/*` paths that do not exist. Real code lives in
`apps/web/app/lib/`, `packages/signals`, `packages/agent`, `packages/strategies`. Much of the
work already landed (notably commit `906e2b3`). Issue file-maps are stale, not the code.

## Bucket A — Already done, close as done (9)
| # | Title | Proof |
|---|-------|-------|
| 7 | CSV export | `apps/web/app/screener/ScreenerClient.tsx:388` exportCSV, button `:580` |
| 14 | PWA | `apps/web/public/manifest.json`, `public/sw.js`, `components/pwa-install.tsx`, `app/offline/page.tsx` |
| 37 | TradingView widget | `components/tradingview-widget.tsx` + `app/signal/[id]/SignalChartSection.tsx`; app is dark-only so theme-switching is N/A |
| 40 | GH Actions backtest report | `.github/workflows/backtest-pr-comment.yml` + `.github/scripts/summarize-backtest.js` + `docs/baseline-backtest.json` |
| 41 | Docker one-liner | `Dockerfile` + `.github/workflows/docker-publish.yml` + `release.yml` + `docker-entrypoint.sh` + README quick-start |
| 43 | Onboarding tour | `apps/web/components/guided-tour.tsx` 6-step spotlight + TakeTourButton |
| 45 | Hacktoberfest docs | `CONTRIBUTING.md` + `.github/ISSUE_TEMPLATE/*` + `.github/PULL_REQUEST_TEMPLATE.md` |
| 46 | Live demo | `packages/core/src/mock/index.ts` + `app/api/demo/route.ts` + `components/demo-banner.tsx` |
| 53 | ATR stop-loss | `packages/signals/src/atr-calibration.ts` + cache + cron + `__tests__/atr-calibration.test.ts` |

## Bucket B — Partial, small finishing PRs (3)
- **#15 Webhook guide** — docs + 6 scripts exist; add a README link only. Files: `README.md`.
- **#42 Stock support** — 20 symbols + data providers + market-hours + signal flow all exist; add a STOCKS dashboard tab. Files: `apps/web/app/dashboard/DashboardClient.tsx`.
- **#19 Grafana/Prometheus** — `/api/metrics` + dashboard.json + prometheus.yml exist; add compose profile + README section. Files: `docker-compose.yml`, `README.md`, `grafana/tradeclaw-dashboard.json`.
- **#20 Email alerts** — instant SMTP/SendGrid/Resend alerts fully wired; add email path to daily-digest cron + README. Files: `app/api/cron/daily-digest/route.ts`, `lib/email-digest.ts`, `README.md`.

## Bucket C — Partial, medium PRs (3)
- **#17 Engine tests** — indicator math tested; engine aggregator (`packages/agent/src/signals/engine.ts`) untested + private. Export `evaluateSignal`/`computeIndicators` (no behavior change), add `__tests__/engine.test.ts`, wire `@tradeclaw/agent` into `jest.config.js`, add a `test` job to `.github/workflows/ci.yml`.
- **#38 Discord broadcaster** — embed plumbing exists (`lib/alert-channels.ts`); add env-keyed (`DISCORD_WEBHOOK_URL`) broadcaster for TradeClaw's own signals + per-asset/timeframe throttle. Files: `lib/alert-channels.ts`, signals path, `.env.example`, tests.
- **#16 Full-app i18n (ar/ms)** — dictionaries + RTL + `/ms` `/ar` routes exist. Decision: FULL app coverage. Needs a runtime locale context on top of the current per-route static pattern, navbar switcher, localStorage persistence, and translated dashboard/signals/settings/backtest/compare strings. Largest item; likely spans sessions.

## Bucket D — Owner action, no code (1)
- **#11 Awesome-list tracker** — all 4 PR templates ready in `community/awesome-submissions/`. Owner opens upstream PRs. Pre-gate: confirm live demo + MIT license hold.

## Execution order
1. Close Bucket A (9) with evidence comments.
2. Bucket B PRs (small, low risk): #15 → #42 → #19 → #20.
3. Bucket C PRs: #17 → #38 → #16 (largest, last).
4. #11 left for owner.
