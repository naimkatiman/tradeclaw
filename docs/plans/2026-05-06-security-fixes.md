# 2026-05-06 — Security Fix Sprint

Source: `/security-review` + `/security-scan` run on `main` at `f7f8aaf` (2026-05-06).
Total findings: 7 CRITICAL · 9 HIGH · 9 MEDIUM · 4 LOW.

Branch: `fix/security-2026-05-06` (worktree `../tradeclaw-security`).

## Commit plan (each ≤15 files)

### Commit 1 — Cron auth + Telegram/TV gating
Fixes: C1, C2, C3, C4, C5, C6, H3, H4, H8.

Changes:
- New `apps/web/lib/cron-auth.ts` — `requireCronAuth(request)` returns `Response | null`.
  Behavior: if `CRON_SECRET` unset → 503 (`{ error: 'cron_not_configured' }`). Compares Bearer with `crypto.timingSafeEqual`. Length-mismatch returns 401 without timing leak.
- Apply `requireCronAuth` to: `cron/execute`, `cron/manage-positions`, `cron/position-monitor`, `cron/sync`, `cron/signals`, `cron/telegram`, `cron/universe`, `alert-rules/dispatch`. Removes 7 copies of the broken `isAuthorized` (C1–C3, H4, H8).
- New `apps/web/lib/telegram-webhook-auth.ts` — `verifyTelegramWebhookSecret(request)`.
  Reads `TELEGRAM_WEBHOOK_SECRET`, requires `X-Telegram-Bot-Api-Secret-Token` header, timing-safe compare. Applied at `app/api/telegram/route.ts` POST before `update_id` dispatch (C5).
- `app/api/telegram/broadcast/route.ts` — POST and GET both require admin OR cron-secret (C4).
- `app/api/webhooks/tradingview/route.ts:86` — replace `secret !== expected` with `timingSafeEqual` (C6).
- `.env.example` — add `TELEGRAM_WEBHOOK_SECRET`.
- Tests:
  - `apps/web/lib/__tests__/cron-auth.test.ts` (RED first).
  - `apps/web/lib/__tests__/telegram-webhook-auth.test.ts`.
  - Extend `apps/web/app/api/telegram/broadcast/__tests__/route.test.ts` (new).

### Commit 2 — Auth hardening
Fixes: C7, H1, H2, M3, L1, L3.

Changes:
- `apps/web/lib/admin-emails.ts` — remove `DEFAULT_ADMIN_EMAILS` and `DEFAULT_PRO_EMAILS` fallback when `NODE_ENV === 'production'`. Throw at module load if env missing in prod (H1).
- `apps/web/lib/admin-gate.ts:29` — replace `===` with `crypto.timingSafeEqual` (H3). Verify `tc_admin` cookie issue path sets `Secure; HttpOnly; SameSite=Strict` (L3).
- `apps/web/app/api/auth/magic-link/start/route.ts` — replace in-process `Map` with DB-backed rate limit (`magic_link_rate_limits` table). Set rate-limit row BEFORE issuing token (C7, H2). Drop `console.info(token)` even in dev (L1).
- `apps/web/lib/magic-link.ts:38-49` — collapse SELECT+UPDATE into single `UPDATE … WHERE consumed_at IS NULL RETURNING email, expires_at` (M3).
- New migration: `apps/web/migrations/023_magic_link_rate_limits.sql`.
- Tests: extend `lib/__tests__/magic-link.test.ts` for race + new `magic-link/start/__tests__/route.test.ts`.

### Commit 3 — Execution kill-switch + lock + log
Fixes: H5, H6, M6, M9, L4.

Changes:
- `apps/web/lib/execution/risk-rails.ts:77-79` — `equityUsd <= 0 → halted: true` with reason `zero_equity` (H5).
- `apps/web/lib/execution/executor.ts` — wrap tick in PG advisory lock (`pg_try_advisory_lock(hashtext('tradeclaw:executor'))`); skip with `{ skipped: 'locked' }` if not acquired (H6).
- `apps/web/lib/execution/binance-futures.ts:358` — DRY-RUN log redacts to `{ symbol, side, action }` only (M6).
- `docs/plans/2026-05-06-security-fixes.md` (this doc) — append "Trading firewall" section pointing at `executor.ts:36` `strategy_id = 'hmm-top3'` filter (M9).
- New tests: `lib/execution/__tests__/risk-rails.test.ts` covering halt path (L4 + H5).

### Commit 4 — SSRF + tier leak + EE webhook
Fixes: H7, H9, M4, M5, L2.

Changes:
- `apps/web/lib/alert-channels.ts` — new `assertSafeOutboundUrl(u)` helper (HTTPS-only; reject localhost, RFC-1918, link-local, multicast, AWS IMDS, IPv6-private). Called from Discord (line 127) and generic webhook (line 154) before `fetch`. Same gate at the upsert path in `app/api/alert-channels/route.ts` POST.
- `apps/web/app/api/v1/signals/route.ts` — drop `X-TradeClaw-Tier` header (H9). Switch authenticated paths to `Cache-Control: private, no-store`; keep public path on `s-maxage=60`.
- `apps/web/lib/earningsedge/stripe.ts:74` — drop `|| process.env.STRIPE_WEBHOOK_SECRET` fallback; throw when `EE_STRIPE_WEBHOOK_SECRET` unset (M4).
- `apps/web/lib/earningsedge/stripe.ts:84` — explicit `pro` ↔ `basic` price-id map; throw on unknown (L2).
- `apps/web/app/api/earningsedge/webhook/route.ts` — call `tryClaimStripeEvent` before tier mutation (M5).
- Tests: `lib/__tests__/alert-channels.test.ts` extends with SSRF cases.

### Commit 5 — OAuth + session
Fixes: M1, M2.

Changes:
- `apps/web/app/api/auth/google/callback/route.ts:119` — re-run `safeNext()` before constructing redirect URL (M1).
- `apps/web/lib/user-session.ts:87` — default `secure: true`; allow `process.env.ALLOW_INSECURE_COOKIE === '1'` only as a local-dev escape hatch (M2).

### Commit 6 — Error scrub + link-token body
Fixes: M7, M8.

Changes:
- `apps/web/app/api/webhooks/tradingview/route.ts:127` — log full err server-side, return `{ error: 'db_error' }` only (M8).
- `apps/web/app/api/telegram/link-token/route.ts:24-28` — drop `token` from response body, keep only `deepLink` and `expiresInSeconds` (M7). Update `__tests__/route.test.ts`.

## Trading firewall (M9)

The live executor at [apps/web/lib/execution/executor.ts] reads only signals
where `strategy_id = 'hmm-top3'` (constant `STRATEGY_ID` at the top of the
file, applied via the SQL filter at the `fetchPendingSignals` query).
TradingView webhook strategies (`tv-zaky-classic`, `tv-hafiz-synergy`,
`tv-impulse-hunter`) land in the **separate** `premium_signals` table via
[apps/web/app/api/webhooks/tradingview/route.ts] and are never read by the
executor.

This is the firewall that keeps third-party webhook input out of live
order placement. Do not loosen the `STRATEGY_ID` filter, do not add a
`UNION` over `premium_signals`, and do not introduce a "signal source
abstraction" that lets a TV alert flow into the executor without an
explicit risk review. The block comment above `STRATEGY_ID` enforces the
same warning at the source-code level.

## Out of scope
- Harness `/security-scan` — denied by sandbox (npx auto-install + scope outside project). User to grant `Bash(npx -y ecc-agentshield:*)` permission and re-run.
