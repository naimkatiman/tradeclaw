# Layer-1 Weekly Regime Engine

Date: 2026-06-03
Branch: `worktree-weekly-regime-engine` (based on `origin/main` @ 5b035b8a)

## Goal
Every Monday the admin sets a directional bias per asset class. The system converts
that into a machine-readable **Weekly Regime Card** the Telegram bot + Layer 2 consume
for the rest of the week, classifying each class TRENDING or NEUTRAL.

## Stack reconciliation (load-bearing)
The original brief targeted Cloudflare D1 / KV / a "SprintBo admin inline-HTML" panel.
**None of that exists in this repo.** Adapted to the real stack (confirmed by the user):
- D1 table -> **Postgres** migration `apps/web/migrations/046_weekly_regime.sql`, accessed via `lib/db-pool.ts` `query()/queryOne()`.
- KV cache -> **Redis** (`lib/redis.ts`) with in-memory `Map` fallback, mirroring `lib/leaderboard-cache.ts`.
- SprintBo admin -> **Next.js App-Router** admin page under `/admin/weekly-regime`, gated by `requireAdmin()`, writing via a `'use server'` action, audited via `insertAdminAuditLog`.
- Bot commands -> wired into the **live** webhook `app/api/telegram/route.ts` (`handleTelegramUpdate`), which already dispatches on `text.startsWith('/...')`.

This is a **separate module** from the existing algorithmic `market_regimes` / `regime-filter.ts`.
Lock cutoff timezone: **Asia/Kuala_Lumpur** (Monday 12:00 MYT).

## Module layout
```
apps/web/lib/weekly-regime/
  types.ts        # CONTRACT (authored up front). enums + interfaces. No server-only/db imports.
  classifier.ts   # pure. classifyRegime, deriveCard. Client-safe (admin preview imports it).
  discipline.ts   # pure. week-start + Monday-noon-KL lock-gate math.
  cache.ts        # Redis TTL-to-Sunday-2359-KL cache, memory fallback.
  service.ts      # server-only. DB upsert/read + cache + gate + audit log.
  parser.ts       # deterministic free-text -> RegimeInput (testable, no LLM).
  validator.ts    # strict schema validation of card / input.
  mapping-prompt.ts # LLM system prompt const + optional OpenRouter mapping (Gemini Flash).
  bot-commands.ts # handleSetRegime / handleConfirmRegime / handleShowRegime.
  __tests__/      # classifier, discipline, parser, validator, bot-commands
apps/web/migrations/046_weekly_regime.sql
apps/web/app/api/admin/weekly-regime/route.ts   # GET current / POST set (assertAdminApi)
apps/web/app/admin/weekly-regime/{page.tsx,WeeklyRegimeClient.tsx,actions.ts}
```

## Contract (every agent codes to these exact signatures)

types.ts (already authored): `ASSET_CLASSES`, `AssetClass`, `Bias`('LONG'|'SHORT'|'NONE'),
`Conviction`(0|1|2|3), `Regime`('TRENDING'|'NEUTRAL'), `ClassInput`, `RegimeInput`,
`ClassRegime`, `WeeklyRegimeCard`.

classifier.ts (pure, client-safe):
- `classifyRegime(input: { bias: Bias; conviction: Conviction }): Regime`
  - NEUTRAL iff `bias === 'NONE' || conviction === 0`, else TRENDING.
- `deriveCard(input: RegimeInput, meta: { week_start: string; set_by: string; set_at: string; locked?: boolean; override_used?: boolean; override_reason?: string | null }): WeeklyRegimeCard`

discipline.ts (pure):
- `KL_TZ = 'Asia/Kuala_Lumpur'`
- `weekStartFor(date: Date): string`  // Monday YYYY-MM-DD of the KL week containing date
- `lockCutoffFor(weekStart: string): Date`  // Monday 12:00 KL instant as a Date
- `isPastLockCutoff(now: Date, weekStart: string): boolean`
- `evaluateWriteGate(now: Date, weekStart: string, opts: { override?: boolean; reason?: string }): { allowed: boolean; requiresOverride: boolean; error?: string }`
  - before cutoff: allowed.
  - at/after cutoff without override: `{ allowed:false, requiresOverride:true, error }`.
  - at/after cutoff with `override===true` and non-empty `reason`: allowed.
  - override true but missing reason: `{ allowed:false, requiresOverride:true, error }`.

cache.ts (server-only; mirror leaderboard-cache.ts redis+memory):
- `getCachedCard(weekStart: string): Promise<WeeklyRegimeCard | null>`
- `setCachedCard(card: WeeklyRegimeCard): Promise<void>`  // TTL = ms until Sunday 23:59 KL
- `invalidateCard(weekStart: string): Promise<void>`

service.ts (server-only):
- `getCurrentWeeklyRegime(now?: Date): Promise<WeeklyRegimeCard | null>`  // cache -> DB, week = weekStartFor(now)
- `getWeeklyRegime(weekStart: string): Promise<WeeklyRegimeCard | null>`
- `setWeeklyRegime(input: RegimeInput, opts: { setBy: string; via?: 'email' | 'secret' | 'telegram'; override?: boolean; reason?: string; now?: Date }): Promise<{ ok: boolean; card?: WeeklyRegimeCard; error?: string; requiresOverride?: boolean }>`
  - week = weekStartFor(opts.now ?? now); run `evaluateWriteGate`; if blocked return `{ok:false,...}`.
  - derive card (locked = isPastLockCutoff, override_used = !!override); UPSERT into `weekly_regime`; write cache; `insertAdminAuditLog({actor:setBy, via, action:'weekly_regime_set', target:weekStart, payload:{override, reason, classes}})` (best-effort).

parser.ts (deterministic, no LLM, no I/O):
- `parseAdminNote(text: string): { ok: true; input: RegimeInput } | { ok: false; clarify: string }`
  - class keywords: crypto|btc|bitcoin -> crypto; gold|oil|commodity|commodities -> commodities; stocks|equities|equity -> stocks; forex|fx|eurusd|gbpusd|usd|currency -> forex; indices|spx|nasdaq|index|sp500 -> indices.
  - bias: long|bull|bullish|up|buy -> LONG; short|bear|bearish|down|sell -> SHORT; flat|neutral|range|sideways|chop|none|no edge -> NONE.
  - conviction: strong|high|max|conviction|aggressive -> 3; medium|moderate -> 2; weak|slight|small|low -> 1; if a directional bias is present with no qualifier -> 2; NONE bias -> 0.
  - classes not mentioned -> { bias:'NONE', conviction:0, thesis:'' } (=> NEUTRAL).
  - ambiguous (conflicting bias words for one class, or a mention with no parseable bias) -> `{ ok:false, clarify }` with ONE specific question.

validator.ts:
- `validateRegimeInput(obj: unknown): { ok: true; input: RegimeInput } | { ok: false; errors: string[] }`
- `validateCard(obj: unknown): { ok: true; card: WeeklyRegimeCard } | { ok: false; errors: string[] }`

mapping-prompt.ts:
- `WEEKLY_REGIME_SYSTEM_PROMPT: string`  // instructs an LLM to emit exact card JSON or ask one clarifying question
- `mapNoteWithLLM(text: string): Promise<{ ok:true; input: RegimeInput } | { ok:false; clarify:string }>`  // OpenRouter/Gemini Flash, falls back to parseAdminNote on failure

bot-commands.ts:
- `isAdminTelegramUser(id: number): boolean`  // env `ADMIN_TELEGRAM_IDS` (comma-separated) allowlist
- `handleSetRegime(args: { text: string; telegramUserId: number; now?: Date }): Promise<{ reply: string }>`  // admin-only; parse note; clarify or stash pending in cache (5-min TTL keyed by user) + preview asking to send /confirmregime
- `handleConfirmRegime(args: { telegramUserId: number; now?: Date }): Promise<{ reply: string }>`  // read pending, setWeeklyRegime(via:'telegram'), report result (incl. override hint)
- `handleShowRegime(): Promise<{ reply: string }>`  // getCurrentWeeklyRegime, formatted (TRENDING/NEUTRAL per class)

## DB migration 046_weekly_regime.sql
```sql
CREATE TABLE IF NOT EXISTS weekly_regime (
  week_start      DATE PRIMARY KEY,
  classes         JSONB NOT NULL,
  locked          BOOLEAN NOT NULL DEFAULT false,
  override_used   BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  set_by          TEXT NOT NULL,
  set_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Phases / commits (one per layer; explicit staging; never `git add -A`)
1. **schema**  — migration 046 + types.ts
2. **service** — classifier, discipline, cache, service + tests
3. **api**     — parser, validator, mapping-prompt + tests + app/api/admin/weekly-regime/route.ts
4. **bot**     — bot-commands.ts + telegram route.ts wiring + tests
5. **admin UI**— /admin/weekly-regime page/client/actions (lucide icons, no emoji)
6. **copy**    — operator docs + bot help text + this plan finalized

## Verification
- TDD: classifier, discipline, parser tests RED-first then GREEN.
- Per commit: relevant jest green + `tsc --noEmit`.
- Final: full new-test suite green + `npm run build -w apps/web`.
- Manual: `/setregime` sample note -> preview -> `/confirmregime` -> `/regime` returns it; admin panel writes the same card; post-Monday-noon write without override rejected.
