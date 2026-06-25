# Regime Engine — Operator Guide (Phase 3)

The Phase 3 regime engine classifies each tracked crypto symbol hourly into one of
three structural states — **trend**, **volatile**, **range** — and persists the
result to the `market_regimes` table. Every signal pipeline consumer (regime-filter,
allocator, breakers, broadcast-decision) reads from this table via
`fetchResolvedRegimeMap()`, which layers the weekly-card operator override on top.

This guide covers deployment, environment requirements, post-deploy verification,
the weekly-card override behaviour, and retraining. It does not replace the
[weekly-regime operator guide](./weekly-regime.md), which covers the Monday ritual
and Telegram/admin-panel commands.

## Deploy

Migration `050_market_regimes_vocab.sql` swaps the `market_regimes` CHECK
constraint from the legacy crash/bear/neutral/bull/euphoria vocabulary to
trend/volatile/range. It runs automatically via `scripts/run-migrations.mjs` on
deploy. The table is empty in prod, so the constraint swap touches zero rows and
is safe to apply without a rollback window.

Review the migration before merging the PR. Once the migration lands and the first
hourly cron slot fires, the table will receive rows.

## Environment

The following variables must be set in prod for the regime engine to work fully:

- `OPS_TELEGRAM_ADMIN_IDS` — comma-separated numeric Telegram user IDs. Required
  for the empty-regime-map alert to fire. If unset, the alert silently no-ops;
  the cron still writes regimes, but you lose the failure notification.
- `TELEGRAM_BOT_TOKEN` — required for any Telegram send path (same token used by
  the signal bot). The ops alert shares this token.

Both must be present or the empty-regime-map alert cannot fire.

## Post-deploy verification

Within roughly one day of the deploy (one hourly cron slot is enough):

- `GET /api/v1/regime` should return a regime map with non-range diversity across
  the tracked crypto symbols. If every symbol resolves to `range`, either the cron
  has not fired yet, or the market is genuinely range-bound — check
  `latestDetectedAt` in the ops-digest to distinguish.
- The daily ops-digest (ops Telegram, 23:00 UTC / 07:00 MYT next day) includes a
  regime-health section: `rows`, `latestDetectedAt` (rendered as `latest:`),
  `distinctSymbols`, `stale>2h`, `allOneLabel`. All-one-label
  with `allOneLabel: true` or `stale>2h > 0` signals a problem.
- If 0 rows were written on the first cron run, an immediate alert fires to
  `OPS_TELEGRAM_ADMIN_IDS`. That alert fires once per cron run that produced
  no rows — it is not rate-limited.

## Weekly-card operator override

`fetchResolvedRegimeMap()` (`apps/web/lib/regime-resolution.ts`) merges the
current week's card onto the algo map before handing the result to consumers.
Mapping rules:

- Asset class TRENDING + conviction 3 → hard `trend` override for every symbol in
  that class. The underlying algo state is superseded; the weekly bias and
  conviction are carried alongside for Phase 4 use, not collapsed.
- Asset class TRENDING + conviction 1 or 2 → tilt recorded only. The algo state
  is not overridden; downstream code can read the tilt for soft adjustments.
- Asset class NEUTRAL, or no card set for the week → algo state passes through
  unchanged. This is the fail-safe: a missing or expired card never defaults to
  an aggressive regime.

Symbol-to-class assignment: `getSymbolCategory` from `@tradeclaw/signals`
(`packages/signals/src/symbols.ts`) returns `crypto`, `metals`, or `forex`;
`regime-resolution.ts` only adds the `metals` → `commodities` AssetClass mapping.

For the full Monday ritual, Telegram commands, and admin-panel override procedure,
see [weekly-regime.md](./weekly-regime.md). For the weekly-regime module types and
the "distinct systems, one sanctioned bridge" guidance on how `weekly_regime` and
`market_regimes` relate, see `apps/web/lib/weekly-regime/README.md`.

## Retrain

Prerequisites: `pip install -r scripts/hmm-regime/requirements.txt` (numpy only)
and `npm run build:signals` (the feature exporter resolves `@tradeclaw/signals`
by name).

See `scripts/hmm-regime/README.md` for the exact backfill → export → train
commands.

The trainer is deterministic: the same input data and seed (42) produce a
byte-identical model JSON and validation report. Use `--self-test` to verify the
fitter recovers known parameters from a synthetic 3-state HMM before running on
real data.
