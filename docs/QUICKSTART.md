# TradeClaw Quickstart Guide

Get the self-hostable TradeClaw stack running locally, then verify it before sharing it with users. This guide is for the current Docker Compose + PostgreSQL path; there is no bundled SQLite fallback.

---

## Prerequisites

- Docker with the Compose plugin installed ([Get Docker](https://docs.docker.com/get-docker/)).
- 4GB RAM recommended for the web app, Timescale/PostgreSQL, Redis, and websocket relay.
- Ports available locally:
  - `3000` for the Next.js web app (`APP_PORT`).
  - `4000` for the websocket relay (`WS_SERVER_PORT`).
  - Optional monitoring: `9090` for Prometheus and `3001` for Grafana.

## Option 1: Docker Compose (recommended)

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
cp .env.example .env
```

Edit `.env` before starting the stack. Required local values:

```bash
DB_PASSWORD=<generate with: openssl rand -hex 16>
USER_SESSION_SECRET=<generate with: openssl rand -hex 32>
ADMIN_SECRET=<generate with: openssl rand -hex 32>
AUTH_SECRET=<generate with: openssl rand -hex 32>
APP_URL=http://localhost:3000
```

To grant admin access through a configured OAuth sign-in, also set
`ADMIN_EMAILS` to a comma-separated allowlist. `ADMIN_SECRET` enables the
password-based admin login and admin API authentication.

Then validate and start Compose:

```bash
docker compose config --quiet
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000). After startup, run the [self-host smoke checklist](self-host-smoke-checklist.md) before sharing the instance or debugging higher-level features.

### What's running

| Service | Default port | Description |
|---|---:|---|
| `app` | 3000 | Next.js standalone server: dashboard, pages, and REST API routes such as `/api/health`, `/api/signals`, `/api/metrics` |
| `ws-server` | 4000 | Fastify websocket / market-data relay with `/health` |
| `db` | internal 5432 | Timescale/PostgreSQL for signal history, users, telemetry, and tracked migrations |
| `redis` | internal 6379 | Cache used by the web app and websocket relay |
| `prometheus` / `grafana` | 9090 / 3001 | Optional monitoring profile started with `docker compose --profile monitoring up -d` |

On a new database, `scripts/init-db.sh` enables the required PostgreSQL
extensions only. Before serving traffic, the app entrypoint runs
`scripts/run-migrations.mjs`, which records each applied SQL filename in
`_migrations`; restarts skip files already recorded.

### Health checks

```bash
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:3000/api/v1/health
curl -fsS http://localhost:4000/health
```

Expected result:

- `/api/health` returns JSON containing `"status":"ok"` and reports both
  `checks.database.status` and `checks.migrations.status` as `"ok"`. It returns
  HTTP `503` until PostgreSQL and the required schema migration are ready.
- `/api/v1/health` returns JSON containing `"ok":true` and `"status":"healthy"`.
- `/health` on port `4000` returns websocket-relay status. It can be `degraded` when upstream providers are disconnected; that is different from the process being down.

Signal API smoke check:

```bash
curl -fsS http://localhost:3000/api/signals | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=JSON.parse(s); if(!Array.isArray(d.signals)) process.exit(1); console.log('signals=' + d.signals.length);})"
```

For the full checklist, including migrations, Redis, metrics, monitoring, troubleshooting, and safe cleanup, use:

```bash
bash scripts/test-docker.sh
# or keep containers after the run:
CLEANUP=false bash scripts/test-docker.sh
# destructive: also delete database/cache/monitoring volumes after the run:
DESTROY_VOLUMES=true bash scripts/test-docker.sh
```

## Option 2: Single Docker image

The single image is useful when you already have PostgreSQL available elsewhere. The app still needs `DATABASE_URL`; DB-backed routes fail on first access if it is missing.

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL='postgres://user:password@host:5432/tradeclaw' \
  -e USER_SESSION_SECRET='<generate with openssl rand -hex 32>' \
  -e ADMIN_SECRET='<generate with openssl rand -hex 32>' \
  ghcr.io/naimkatiman/tradeclaw:latest
```

For new self-hosters, Docker Compose is safer because it provisions Postgres, Redis, migrations, and the websocket relay together.

## Option 3: Local development from source

Use this when changing code locally rather than validating a production-style Compose stack.

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
npm install
cp .env.example .env
# set DATABASE_URL, USER_SESSION_SECRET, ADMIN_SECRET, and any optional tokens you need
npm run build:signals
npm run dev
```

Postgres is still required for DB-backed app paths. Migrations are raw SQL files under `apps/web/migrations/`; the Docker path applies them automatically, and local development can use the same database plus `node scripts/run-migrations.mjs` when needed.

Common checks:

```bash
npm run lint
npm test
npm run build
```

CI also runs `npx tsc --noEmit --project apps/web/tsconfig.json` because the Next.js build is configured separately from the TypeScript typecheck.

---

## Configuration quick map

Edit `.env` from `.env.example`. Do not paste real production secrets into issue reports, screenshots, AI prompts, or logs.

| Area | Variables |
|---|---|
| Compose database | `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Web app URL/session | `APP_PORT`, `APP_URL`, `USER_SESSION_SECRET` |
| Admin access | `ADMIN_SECRET`, optional comma-separated `ADMIN_EMAILS` |
| Websocket relay | `WS_SERVER_PORT`, `NEXT_PUBLIC_WS_URL`, `AUTH_SECRET` |
| Postgres connection | `DATABASE_URL` for non-Compose/local external DB paths |
| Redis | `REDIS_URL` |
| Cron | `CRON_SECRET` for `/api/cron/*` endpoints |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_FREE_CHANNEL_ID`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_PRO_GROUP_ID` |
| Stripe / paid tiers | `STRIPE_*`, `NEXT_PUBLIC_STRIPE_*` |
| Premium feed / brokers | `PREMIUM_SIGNAL_SOURCE_*`, `BINANCE_*`, `ROBOFOREX_RST_*` |
| Email / digest | `EMAIL_PROVIDER`, `RESEND_*`, `SENDGRID_API_KEY`, `SMTP_*`, `EMAIL_TO` |

## Telegram integration

1. Create a bot via [@BotFather](https://t.me/BotFather).
2. Add the bot to the channel/group you want to use and grant the permissions required for posting or Pro-group invites.
3. Set `TELEGRAM_BOT_TOKEN` and the relevant channel/group IDs in `.env`:
   - `TELEGRAM_FREE_CHANNEL_ID` for free/public signal broadcasts.
   - `TELEGRAM_CHANNEL_ID` for legacy/public channel paths still supported by the app.
   - `TELEGRAM_PRO_GROUP_ID` for Pro group invite and membership checks.
4. Restart the affected service:

```bash
docker compose restart app
```

## Dashboard tour

### Signal cards

Each signal can show direction, confidence, entry, stop loss, take-profit levels, indicator context, source/provenance, and tier-gated fields depending on the viewer's access level.

### Public vs Pro access

Anonymous/free users get the public signal experience with limited symbols, delayed access, and masked premium levels. Pro/Elite access depends on session/tier data and optional hosted credentials. Self-hosters can run the open-source framework and wire their own Stripe, Telegram, premium feed, or broker credentials.

### Paper trading and track record

The dashboard, paper trading, and track-record surfaces are designed around transparent signal history: wins and losses should remain visible, not cherry-picked.

## Architecture sketch

```text
Browser / API client
  -> Next.js app (:3000)
    -> signal API + dashboard + track record + billing/webhooks/Telegram routes
    -> PostgreSQL / Timescale migrations and signal history
    -> Redis cache
  -> websocket relay (:4000)
    -> provider manager + Redis-backed streaming status
```

The REST API is served by the same Next.js app on port `3000`; there is no separate API server on `3001` in the current Compose path.

---

## FAQ

**Q: Is this a trading bot? Will it execute trades?**
A: TradeClaw is primarily a signal platform. Broker execution scaffolding exists for gated Pro/testnet workflows, but self-hosters should treat execution as approval- and credential-sensitive. Paper trade first, and never wire live broker credentials without a reviewed plan and kill-switch posture.

**Q: Where does the data come from?**
A: The app prefers configured market-data/pro signal sources when available, otherwise it uses the repository's documented fallback paths such as the market-data hub, Binance/Stooq fallbacks, cached/live scanner output, and TA-engine fallback behavior. Check `README.md` and the smoke checklist for the current source-of-truth description before changing signal behavior.

**Q: Can I add my own indicators?**
A: Start with `packages/signals/src/*`, `apps/web/app/lib/ta-engine.ts`, and existing strategy/backtest tests. Trading-rule changes affect product trust and should be scoped with tests before they are merged.

**Q: Is this really free?**
A: The repository is MIT-licensed and self-hostable. Hosted convenience, paid tiers, premium feed operations, Stripe, private Telegram groups, and broker credentials depend on the environment values you configure for your deploy.

---

## Next steps

- Run the [self-host smoke checklist](self-host-smoke-checklist.md).
- Read the full [README](../README.md) for product, Free vs Pro, API, environment, and contribution details.
- Open issues or PRs at [github.com/naimkatiman/tradeclaw](https://github.com/naimkatiman/tradeclaw).
- Star the repo if TradeClaw helped you self-host faster.
