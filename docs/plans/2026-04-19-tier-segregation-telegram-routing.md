# Spec 3/3 — Tier Segregation: Telegram Routing

**Date:** 2026-04-19
**Scope:** Public Telegram channel only broadcasts free-tier symbols. Paid groups (if wired) receive the full realtime feed.
**Depends on:** Spec 1 (backend-hardening) — consumes `FREE_SYMBOLS`.

## Goal

Plug the leak where `TELEGRAM_PUBLIC_CHANNEL_ID` cron push emits premium symbols. After this spec, the free Telegram channel sees only `BTCUSD | ETHUSD | XAUUSD`, delayed ≥15 min. Paid Telegram groups (`TELEGRAM_PRO_GROUP_ID`, `TELEGRAM_ELITE_GROUP_ID`) are unchanged for now — invite flow via Stripe webhook remains the source of truth for access.

## Current state (verified)

- `apps/web/app/api/cron/telegram/route.ts` L36–82: public push selects `FROM signal_history WHERE telegram_posted_at IS NULL … created_at <= NOW() - INTERVAL '15 minutes'` — **no symbol filter**. Premium symbols leak to the public channel.
- `apps/web/lib/telegram-broadcast.ts` `broadcastTopSignals` → posts to `TELEGRAM_CHANNEL_ID` (main channel, already conceptually public per its comment). Picks top 3 by confidence regardless of symbol. Same leak risk.
- `apps/web/lib/telegram.ts` `sendInvite` → Stripe webhook flow, unchanged.

## Changes

### 1. `apps/web/app/api/cron/telegram/route.ts`

- Import `FREE_SYMBOLS` from `../../../../lib/tier`.
- Add `AND pair = ANY($1)` to the public-push SELECT, param `[...FREE_SYMBOLS]`.
- Keep the `15-minute` delay.

### 2. `apps/web/lib/telegram-broadcast.ts` — `broadcastTopSignals`

- After `filterSignalsByRegime`, add `filtered = filtered.filter((s) => isFreeSymbol(s.symbol))` **only when the target channel is the public one**.
- Simplest wiring: add optional `opts: { freeOnly?: boolean }` argument. Callers that post to `TELEGRAM_CHANNEL_ID` (public main) pass `freeOnly: true`. Pro/elite callers (future) pass `freeOnly: false`.
- Update existing callers at `/api/telegram/broadcast` and `/api/cron/telegram` to pass `freeOnly: true`.

### 3. Env var semantics (documented, not enforced)

Update workspace `CLAUDE.md` or a comment in telegram-broadcast.ts to pin:

| Env | Audience | Symbols | Delay |
|---|---|---|---|
| `TELEGRAM_CHANNEL_ID` | Public main | FREE_SYMBOLS only | realtime-ish (cron) |
| `TELEGRAM_PUBLIC_CHANNEL_ID` | Public mirror | FREE_SYMBOLS only | ≥15 min |
| `TELEGRAM_PRO_GROUP_ID` | Paid Pro | all | realtime (invite-only) |
| `TELEGRAM_ELITE_GROUP_ID` | Paid Elite | all | realtime (invite-only) |

## Out of scope (follow-up)

- New cron route that broadcasts realtime full-symbol feed to `TELEGRAM_PRO_GROUP_ID` / `TELEGRAM_ELITE_GROUP_ID`. Today the paid groups are invite-only with no automated broadcaster — explicit design decision, not a bug.
- Per-user DM routing (already handled by `lib/telegram.ts`).

## Verification

- Query recent `signal_history` rows: `SELECT pair, telegram_posted_at FROM signal_history WHERE telegram_posted_at IS NOT NULL ORDER BY telegram_posted_at DESC LIMIT 20;` → all `pair ∈ FREE_SYMBOLS` after deploy.
- Manually POST `/api/telegram/broadcast` with a `signal_history` row for `EURUSD` staged → message NOT sent, skipped with log.
- Unit-ish: add a focused Vitest (if Vitest exists) that calls `broadcastTopSignals` with `freeOnly: true` and a mock signal set, asserts only free symbols passed to `sendToChannel`. If no Vitest infra, skip — the DB filter is the primary gate.

## Rollback

Revert the two route/lib files. No state to undo.
