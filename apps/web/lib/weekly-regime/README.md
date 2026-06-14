# Weekly Regime (Layer 1)

Human-set, per-asset-class, weekly directional bias. Every Monday an admin sets a
bias and conviction for each of five asset classes; the system derives a TRENDING
or NEUTRAL regime per class and persists one machine-readable card per week. The
Telegram bot and Layer 2 read that card for the rest of the week.

Operator guide: `docs/operators/weekly-regime.md`.
Plan / contract: `docs/plans/2026-06-03-weekly-regime-engine.md`.

## `weekly_regime` vs `market_regimes` — distinct systems, one sanctioned bridge

| | `weekly_regime` (this module) | `market_regimes` / `regime-filter.ts` |
|---|---|---|
| Source | Human-set by the admin | Computed from price action |
| Granularity | Per asset class (5 classes) | Per symbol |
| Cadence | Once per week (Monday) | Continuous |
| States | TRENDING / NEUTRAL | trend / volatile / range |
| Key | `week_start` (Monday, MYT) | per-symbol |

They are conceptually and namewise separate. The only sanctioned bridge is
`lib/regime-resolution.ts` (`fetchResolvedRegimeMap`), which composes the two
systems under these rules:

- **TRENDING + conviction 3** → hard override: every universe symbol of that
  class is forced to `'trend'` in the resolved map (including symbols absent
  from the algo map). Tilt recorded with `hardOverride: true`.
- **TRENDING + conviction 1–2** → tilt recorded (`hardOverride: false`); regime
  labels left unchanged. Metadata preserved for Phase 4 strategy dispatch.
- **NEUTRAL class / null card / card-read failure** → defer to algo (fail-safe).
  No tilts recorded.

Do not import `weekly-regime/service` into the algorithmic regime path except
via `regime-resolution.ts`. The enums and interfaces here live only in
`types.ts` — do not reuse the algorithmic regime types in the weekly-regime
path.

## Module layout

Client-safe files (no `server-only`, no DB) — the admin client component imports
them for live preview and validation:

- `types.ts` — single source of truth. `ASSET_CLASSES`, `AssetClass`, `Bias`,
  `Conviction`, `Regime`, `ClassInput`, `RegimeInput`, `ClassRegime`,
  `WeeklyRegimeCard`. Import enums from here; never redefine them.
- `classifier.ts` — `classifyRegime` (bias NONE or conviction 0 means NEUTRAL, else
  TRENDING) and `deriveCard`. Pure. The regime field is always derived here,
  never hand-set.
- `discipline.ts` — MYT (Asia/Kuala_Lumpur, fixed UTC+8) week math:
  `weekStartFor`, `lockCutoffFor`, `isPastLockCutoff`, `evaluateWriteGate`,
  plus cache-TTL helpers. Pure.
- `parser.ts` — `parseAdminNote`: deterministic free-text into a `RegimeInput`, or
  one clarifying question. No LLM, no I/O. The primary mapping path.
- `validator.ts` — `validateRegimeInput`, `validateCard`. Strict schema checks;
  `validateCard` also re-derives and asserts the per-class regime.
- `mapping-prompt.ts` — `WEEKLY_REGIME_SYSTEM_PROMPT` and `mapNoteWithLLM`, an
  optional OpenRouter / Gemini-Flash layer guarded by `OPENROUTER_API_KEY` that
  falls back to `parseAdminNote` on any failure.

Server-only files (DB / cache / audit):

- `cache.ts` — Redis cache with in-memory `Map` fallback (mirrors
  `lib/leaderboard-cache.ts`). TTL runs to Sunday 23:59 MYT of the card's week.
- `service.ts` — `getCurrentWeeklyRegime`, `getWeeklyRegime`, `setWeeklyRegime`.
  Read path: cache, then Postgres. Write path: write gate, then UPSERT into
  `weekly_regime`, then best-effort cache write + admin audit log.

Bot:

- `bot-commands.ts` — `handleSetRegime`, `handleConfirmRegime`, `handleShowRegime`,
  `isAdminTelegramUser`. Pending `/setregime` previews are stashed per Telegram
  user with a 5-minute TTL (separate store from the card cache). Wired into the
  live webhook at `app/api/telegram/route.ts`.

Tests: `__tests__/` covers classifier, discipline, parser, validator, and
bot-commands.

## Wiring around this module

- DB migration: `apps/web/migrations/046_weekly_regime.sql`.
- Admin API: `apps/web/app/api/admin/weekly-regime/route.ts` (GET current, POST
  set; `assertAdminApi`).
- Admin UI: `apps/web/app/admin/weekly-regime/` (`page.tsx`,
  `WeeklyRegimeClient.tsx`, `actions.ts`). The only place a post-lock override can
  be written.
- Telegram: `apps/web/app/api/telegram/route.ts` dispatches `/setregime`,
  `/confirmregime`, `/regime` into `bot-commands.ts`.

## Audit-log note

`insertAdminAuditLog` accepts `via: 'email' | 'secret'` only. A Telegram write
(`via: 'telegram'`) is recorded as `'secret'` with the true channel preserved in
`payload.via`. The card's `set_by` is `tg:<telegramUserId>` for Telegram writes.
