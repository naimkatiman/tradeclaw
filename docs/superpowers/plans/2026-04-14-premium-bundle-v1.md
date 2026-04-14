# Premium Bundle v1 — Plan

**Date:** 2026-04-14
**Scope:** Three features that turn TradeClaw from "gated signal labels" into a real paid product, anchored on Zaky's three Pine-Script repos (`trading-strategies`, `HafizSynergyFX`, `ImpulsePipHunters`).

This plan assumes Track D (TradingView webhook ingest → `premium_signals` table) is the foundation. Each feature below either consumes or extends that pipe.

## Feature set

### F1 — One strategy_id per repo, sold à la carte
Three new premium strategy ids, registered in `ALLOWED_PREMIUM_STRATEGIES`:
- `tv-zaky-classic` — signals from `trading-strategies`
- `tv-hafiz-synergy` — signals from `HafizSynergyFX`
- `tv-impulse-hunter` — signals from `ImpulsePipHunters`

Each Pine script's alert payload sets `strategy_id` to one of the above. The existing license grants table (`strategy_license_grants`) already handles per-strategy unlocks — admin picks which repos a key includes at issue time.

No schema changes needed beyond Track D's migration. Admin form in `/admin/licenses` gets 3 new checkboxes (currently the form derives options from `ALLOWED_PREMIUM_STRATEGIES` so it's automatic).

**Deliverable:** Update the set, update the TV alert template per repo, done.

### F2 — Per-strategy Telegram delivery
Premium users get invited to a private Telegram channel *per strategy they own*. One channel per `strategy_id`, invites issued automatically at license unlock.

**Reuses existing infra:**
- `telegram_invites` table (already has user_id, tier, invite_link, telegram_chat_id)
- `apps/web/app/api/admin/invites/` routes
- The agent service on Railway that runs the TG bot

**New pieces:**
- Migration 008: add `strategy_id VARCHAR(64)` column to `telegram_invites`, plus a new `telegram_strategy_channels (strategy_id PK, chat_id)` mapping table.
- In `/unlock` client, after successful verify, POST to a new `/api/licenses/telegram-invites` endpoint that:
  1. Reads the caller's license context
  2. For each unlocked premium strategy, looks up the TG channel in `telegram_strategy_channels`
  3. Calls the bot to generate a one-time invite link
  4. Returns `{ strategyId, inviteUrl }[]` to the client
- Unlock UI renders a "Join your Telegram channels" step with one button per strategy.

**When a TV webhook fires** (Track D), the ingest route also broadcasts the signal to the strategy's TG channel via the bot. Free users never see it; premium TG members get it instantly.

**Deliverable:** Migration + endpoint + unlock UI update + TV webhook broadcast hook.

### F3 — Real-time web push vs 15-min delayed free
Two tiers of "freshness" on the same signal stream:
- Premium: signals appear in the web UI and API within seconds (SSE or short-poll).
- Free: `tracked-signals.ts` strips `premium_signals` from anonymous responses entirely (already the case after Track D's license filter). Free users see *only* the built-in TA generator output, which is what they already have.

This is **not a time-delay on premium signals**. Free users don't see them at all. The "15-min delay" idea from my earlier brainstorm is a trap — it requires a second filter path and leaks signal content. Cleaner: premium-exclusive, period.

**What we actually build for F3 is just the UI/UX of freshness:**
- Server-Sent Events route: `/api/premium-signals/stream` — authed via license header, streams new `premium_signals` rows as they land (LISTEN/NOTIFY on Postgres, or simple 5s polling in v1).
- Dashboard component `<PremiumSignalFeed />` subscribes when the caller has any unlocked premium strategy, shows a live ticker above the main signal grid.

**Deliverable:** SSE route + dashboard component + small polish on unlock UX.

## Build order

1. **Track D first** (already planned separately) — migration 007, webhook route, read-path merge, admin viewer.
2. **F1** — trivial, rolls in with Track D.
3. **F2** (half day) — migration 008, `/api/licenses/telegram-invites`, unlock UI, TG broadcast hook inside the TV webhook handler.
4. **F3** (half day) — SSE route + dashboard feed component.

Total over Track D: ~1 extra day of work. Everything fits the existing license-context read path and the existing admin middleware — no new auth, no new billing.

## Out of scope for v1 (saved for v2)

- Per-strategy track record page (Feature 5 from the brainstorm)
- Backtest replay (6)
- Position sizing calculator (7)
- Custom alert filters (8)
- Copy-trade MT4/5 bridge (9) — real moat, real work, separate spec
- Strategy bundles / pricing tiers (10)
- Performance leaderboards (11)

## Open questions (must answer before building)

1. Exact Pine-script file names + TV alert JSON template per repo — needed before F1 goes live.
2. Three TG channels: do they exist yet, or does Zaky need to create them and give me the chat ids?
3. SSE vs polling for F3 — is there an infra concern running long-lived connections through Railway's proxy? (Default to 5s polling if unsure.)
4. Does Zaky have TradingView Pro? Free tier caps webhook alerts — premium strategy reliability depends on this.
