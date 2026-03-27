# Good First Issues — TradeClaw

Ready-to-post issue templates for new contributors. Copy a template, open a new issue, and add the label `good first issue`.

---

## Issue #1 — Signal Indicator Plugin System

**Title:** Build signal indicator plugin system (pluggable architecture)

**Labels:** `good first issue` `enhancement` `plugin`
**Difficulty:** Easy · **Estimate:** ~4h

### Problem
TradeClaw's indicators are hard-coded in `ta-engine.ts`. Contributors who want to add a custom indicator (e.g. Supertrend, Ichimoku) must edit core files, creating merge conflicts.

### Goal
Create a `plugins/` directory with a minimal plugin interface that allows drop-in indicator plugins without touching core files.

### Acceptance criteria
- [ ] Define `IndicatorPlugin` interface in `lib/plugins/types.ts`
- [ ] Auto-register plugins found in `plugins/indicators/`
- [ ] At least one example plugin (`plugins/indicators/supertrend.ts`)
- [ ] Unit test for plugin registration
- [ ] Update `CONTRIBUTING.md` with plugin authoring guide

### Resources
- `apps/web/lib/ta-engine.ts` — current indicator implementation
- `CONTRIBUTING.md` — contribution guide

---

## Issue #2 — Mobile Touch Gestures for Charts

**Title:** Add mobile touch gestures to chart (pinch-zoom, swipe)

**Labels:** `good first issue` `mobile` `ui`
**Difficulty:** Easy · **Estimate:** ~3h

### Problem
The canvas-based price chart (`ChartCanvas`) does not respond to touch events. On mobile, users cannot zoom in or pan the chart.

### Goal
Add `touchstart`, `touchmove`, and `touchend` handlers to the chart canvas that map to the existing zoom/pan functions.

### Acceptance criteria
- [ ] Pinch-to-zoom adjusts the visible candle range
- [ ] Swipe left/right pans the chart
- [ ] No regression on desktop mouse events
- [ ] Tested on iOS Safari and Chrome Android (screenshots in PR)

### Resources
- `apps/web/app/dashboard/ChartCanvas.tsx` — chart component

---

## Issue #3 — Fix Dark Mode Flash on Initial Load

**Title:** Fix dark mode flash on initial page load

**Labels:** `good first issue` `bug` `dark-mode`
**Difficulty:** Easy · **Estimate:** ~2h

### Problem
When the page loads in dark mode, there is a brief white flash before Tailwind applies the dark theme class. This is a common FOUC (flash of unstyled content) issue caused by loading order.

### Goal
Inject a small inline script in `<head>` that reads `localStorage` and applies the theme class before the page renders, eliminating the flash.

### Acceptance criteria
- [ ] No white flash on dark mode reload (verify with Lighthouse / video)
- [ ] Works when no theme preference is stored (defaults to system)
- [ ] No impact on LCP score

### Resources
- `apps/web/app/layout.tsx` — root layout
- Prior art: https://github.com/pacocoursey/next-themes

---

## Issue #4 — Translate Docs to Bahasa Malaysia / Indonesian

**Title:** Translate docs to Bahasa Malaysia / Indonesian

**Labels:** `good first issue` `docs` `translation`
**Difficulty:** Easy · **Estimate:** ~5h

### Problem
TradeClaw has a large Southeast Asian user base but all documentation is in English only.

### Goal
Translate the Getting Started guide and FAQ into Bahasa Malaysia (or Indonesian).

### Acceptance criteria
- [ ] `docs/ms/getting-started.md` — full translation of the EN version
- [ ] `docs/ms/faq.md` — full translation of the EN version
- [ ] Language switcher stub in sidebar (can be a simple link for now)
- [ ] No machine-translation-only content — must be human-reviewed

---

## Issue #5 — Unit Tests for ta-engine.ts

**Title:** Add unit tests for ta-engine.ts (RSI, MACD, Bollinger Bands)

**Labels:** `good first issue` `testing` `ta-engine`
**Difficulty:** Medium · **Estimate:** ~6h

### Problem
`apps/web/lib/ta-engine.ts` contains all technical analysis calculations (RSI, MACD, Bollinger Bands, ATR, etc.) but has zero unit tests. A bug in any of these functions silently produces wrong signals.

### Goal
Achieve ≥80% branch coverage on `ta-engine.ts` using Vitest.

### Acceptance criteria
- [ ] Tests in `apps/web/lib/__tests__/ta-engine.test.ts`
- [ ] RSI: test overbought (>70), oversold (<30), and mid-range values
- [ ] MACD: test crossover detection
- [ ] Bollinger Bands: test squeeze condition
- [ ] All tests pass in CI (`npm run test`)
- [ ] Coverage report shows ≥80%

### Resources
- `apps/web/lib/ta-engine.ts`
- Vitest docs: https://vitest.dev

---

## Issue #6 — Webhook Retry UI with Exponential Backoff Status

**Title:** Add webhook retry UI with exponential backoff status

**Labels:** `good first issue` `ui` `webhooks`
**Difficulty:** Medium · **Estimate:** ~4h

### Problem
When a TradingView webhook fails (e.g. server timeout), the user has no visibility into retry status. They must check server logs manually.

### Goal
Add a retry status indicator to the Webhooks settings page that shows the current backoff state and next retry time.

### Acceptance criteria
- [ ] `RetryStatus` component shows: attempt count, last error, next retry countdown
- [ ] Pulls status from `/api/webhooks/status` endpoint (mock OK)
- [ ] Exponential backoff: 5s → 10s → 20s → 40s → max 5min
- [ ] Manual "Retry now" button that resets the backoff
- [ ] Loading/error states handled

---

## Issue #7 — Export Screener Results to CSV

**Title:** Export screener results to CSV

**Labels:** `good first issue` `enhancement` `screener`
**Difficulty:** Easy · **Estimate:** ~3h

### Problem
Users want to export screener results (symbol, signal, score, timeframe) to a spreadsheet for further analysis. There is currently no export option.

### Goal
Add an "Export CSV" button to the screener results table that downloads all current results as a `.csv` file.

### Acceptance criteria
- [ ] Button visible in screener toolbar
- [ ] CSV includes: Symbol, Signal, Score, Timeframe, Timestamp
- [ ] File name format: `tradeclaw-screener-YYYY-MM-DD.csv`
- [ ] No external library required — use native `Blob` + `URL.createObjectURL`
- [ ] Works with filtered results (exports only what's shown)

### Resources
- `apps/web/app/screener/` — screener page

---

## Issue #8 — Embed Theme Presets

**Title:** Add embed theme presets (dark / light / custom color)

**Labels:** `good first issue` `embed` `theming`
**Difficulty:** Easy · **Estimate:** ~3h

### Problem
The embeddable widget (`/embed`) only supports the default dark theme. Users who want to embed it in a light-themed site have no option.

### Goal
Add `?theme=dark|light|custom&accent=#00d97e` URL params to the embed route that override the default theme.

### Acceptance criteria
- [ ] `?theme=light` renders the widget with light background
- [ ] `?theme=dark` (default) keeps current behavior
- [ ] `?accent=<hex>` overrides the accent color CSS variable
- [ ] Embed builder page (`/embed`) includes a theme picker UI
- [ ] No flash of wrong theme on load

### Resources
- `apps/web/app/embed/` — embed route

---

## Issue #9 — Backtest Comparison Mode

**Title:** Backtest comparison mode (side-by-side strategy results)

**Labels:** `good first issue` `backtest` `feature`
**Difficulty:** Medium · **Estimate:** ~8h

### Problem
Users can run backtests for individual strategies but cannot compare two strategies side by side. They must manually note down results from separate runs.

### Goal
Add a "Compare" mode to the backtest page that runs two strategies simultaneously and shows results side by side.

### Acceptance criteria
- [ ] "Add comparison" button adds a second strategy selector
- [ ] Both strategies run in parallel and results display in two columns
- [ ] Comparison table: Win Rate, Sharpe Ratio, Max Drawdown, Total Return
- [ ] Equity curve chart overlays both strategies with different colors
- [ ] URL encodes both strategy configs for sharing (e.g. `?a=rsi&b=macd`)

### Resources
- `apps/web/app/backtest/` — backtest page

---

## Issue #10 — Full Multi-Language i18n Support

**Title:** Full multi-language i18n support (EN / MY / ZH / AR)

**Labels:** `good first issue` `i18n` `enhancement`
**Difficulty:** Hard · **Estimate:** ~20h

### Problem
TradeClaw targets global traders but has no i18n infrastructure. All strings are hard-coded in English.

### Goal
Implement `next-intl` (or similar) so the app can be fully localized. Ship with EN and MY as the first two locales.

### Acceptance criteria
- [ ] i18n library configured with locale detection and routing (`/my/`, `/en/`)
- [ ] All UI strings extracted into `messages/en.json` and `messages/my.json`
- [ ] Language switcher in the navbar
- [ ] RTL layout support stubbed for future AR locale
- [ ] `npm run build` passes with no type errors
- [ ] CI check prevents hardcoded user-facing strings in new PRs

### Resources
- next-intl: https://next-intl-docs.vercel.app
- `apps/web/app/components/navbar.tsx`
