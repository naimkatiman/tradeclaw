# TradeClaw Self-Host Smoke Checklist

Use this after cloning TradeClaw or changing `docker-compose.yml`, `.env.example`, `Dockerfile`, migrations, or runtime health endpoints. It is a verification checklist for the Docker Compose self-host path; it does not change deployment targets, secrets, database schema, trading behavior, billing, or auth.

## What this checks

A healthy self-host stack should have:

- `db` — Timescale/PostgreSQL with the configured `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- `redis` — cache used by the web app and websocket relay.
- `migrate` — one-shot SQL migration service that applies `apps/web/migrations/*.sql` in filename order.
- `app` — Next.js standalone server on `${APP_PORT:-3000}`, with `/api/health` and `/api/metrics` reachable.
- `ws-server` — Fastify websocket/market-data relay on `${WS_SERVER_PORT:-4000}`, with `/health` reachable.
- Optional `monitoring` profile — Prometheus on `${PROMETHEUS_PORT:-9090}` and Grafana on `${GRAFANA_PORT:-3001}`.

## 0. Prepare `.env` safely

```bash
cp .env.example .env
```

Before starting Compose, set these required values in `.env`:

- `DB_PASSWORD` — generate a fresh local database password.
- `USER_SESSION_SECRET` — web app session/OAuth/link-token signing secret.
- `AUTH_SECRET` — websocket-server auth secret.
- `APP_URL` — keep `http://localhost:3000` locally; set your public HTTPS URL in production.

Do **not** paste real production secrets into issue reports, screenshots, AI prompts, or logs. For hosted/pro features, set only the optional Telegram, Stripe, premium-signal, email, broker, and monitoring values you actually use.

## 1. Static Compose validation

Run from the repository root:

```bash
docker compose config --quiet
```

Expected result: exit code `0` with no output.

If you have not filled the required variables yet, Compose should fail fast and name the missing variable. Fill the real local value in `.env` rather than weakening the requirement in `docker-compose.yml`.

## 2. Start the stack

```bash
docker compose up -d --build
```

Check service state:

```bash
docker compose ps
```

Expected result:

- `db`, `redis`, `app`, and `ws-server` are `running` / `healthy` after their healthcheck windows.
- `migrate` exits successfully after printing `Migrations complete`.

Helpful logs:

```bash
docker compose logs --tail=80 migrate
docker compose logs --tail=80 app
docker compose logs --tail=80 ws-server
```

## 3. Verify migrations and storage

The one-shot `migrate` container applies raw SQL files, while the app entrypoint also runs `scripts/run-migrations.mjs` idempotently before starting the Next.js server. Verify both paths stayed healthy:

```bash
docker compose logs migrate | tail -40
docker compose logs app | tail -80
```

Expected result:

- `migrate` shows SQL files being applied and finishes with `Migrations complete`.
- `app` either reports no pending migrations or applies the remaining idempotent queue without failure.

Optional direct database check:

```bash
docker compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as applied_migrations from _migrations;"'
```

Expected result: the query succeeds. The exact count can change as new migration files are added.

Redis check:

```bash
docker compose exec -T redis redis-cli ping
```

Expected result: `PONG`.

## 4. Verify web app endpoints

Set the local URL once:

```bash
export TRADECLAW_URL="http://localhost:${APP_PORT:-3000}"
```

Health endpoints:

```bash
curl -fsS "$TRADECLAW_URL/api/health"
curl -fsS "$TRADECLAW_URL/api/v1/health"
```

Expected result: both return JSON. `/api/health` should include `"status":"ok"`; `/api/v1/health` should include `"ok":true` and `"status":"healthy"`.

Public pages:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' "$TRADECLAW_URL/"
curl -fsS -o /dev/null -w '%{http_code}\n' "$TRADECLAW_URL/dashboard"
```

Expected result: `200` for both.

Signal API smoke check:

```bash
curl -fsS "$TRADECLAW_URL/api/signals" | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=JSON.parse(s); if(!Array.isArray(d.signals)) process.exit(1); console.log('signals=' + d.signals.length);})"
```

Expected result: prints `signals=<number>`. A zero count is still useful diagnostic information, but invalid JSON or a missing `signals` array needs investigation.

Prometheus metrics:

```bash
curl -fsS "$TRADECLAW_URL/api/metrics" | grep -E 'tradeclaw_(signal|symbols|scrape|up)'
```

Expected result: Prometheus text exposition with `tradeclaw_...` series. If the signal generator is degraded, the endpoint should still return text and expose failure information instead of crashing the scrape.

## 5. Verify websocket relay

```bash
export TRADECLAW_WS_URL="http://localhost:${WS_SERVER_PORT:-4000}"
curl -fsS "$TRADECLAW_WS_URL/health"
```

Expected result: JSON with `status`, `uptime`, `providers`, `redis`, and `timestamp`.

Notes:

- `status` can be `degraded` when upstream providers are disconnected; that is different from the process being down.
- In the default Compose stack, Redis should report `connected` because `REDIS_URL` is wired to the `redis` service.

## 6. Optional monitoring profile

Start monitoring only when you want Prometheus/Grafana locally:

```bash
docker compose --profile monitoring up -d
```

Checks:

```bash
curl -fsS http://localhost:${PROMETHEUS_PORT:-9090}/-/healthy
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:${GRAFANA_PORT:-3001}/login
```

Expected result:

- Prometheus returns healthy.
- Grafana login returns `200`.
- Grafana can use Prometheus at `http://prometheus:9090`; import `grafana/tradeclaw-dashboard.json` for the included dashboard.

## 7. Scripted smoke test helper

For a full local smoke run, the repository also ships:

```bash
bash scripts/test-docker.sh
```

Important: by default this script cleans up containers and volumes at the end. Use `CLEANUP=false` if you want to keep the stack running after a successful smoke test:

```bash
CLEANUP=false bash scripts/test-docker.sh
```

The script verifies Docker availability, starts Compose, polls `/api/health`, checks `/api/signals`, checks `/api/v1/health`, and confirms the homepage/dashboard return HTTP 200.

## 8. Troubleshooting quick map

| Symptom | Likely cause | First safe check |
|---|---|---|
| `docker compose config --quiet` fails | Missing required `.env` value | Fill `DB_PASSWORD`, `USER_SESSION_SECRET`, and `AUTH_SECRET` in `.env` |
| `db` is unhealthy | Postgres init/password/volume issue | `docker compose logs --tail=100 db` |
| `migrate` exits non-zero | SQL migration failed | `docker compose logs migrate`; do not edit migrations without a plan and approval |
| `app` refuses to start | Required env missing or migrations failed | `docker compose logs --tail=120 app` |
| `/api/health` works but `/api/signals` fails | DB, market data, or signal generation path degraded | `docker compose logs --tail=120 app` and check `DATABASE_URL` |
| `ws-server` health is degraded | Provider connection or Redis issue | `curl http://localhost:${WS_SERVER_PORT:-4000}/health` and `docker compose logs --tail=120 ws-server` |
| Prometheus has no data | Monitoring profile not started or scrape URL mismatch | `docker compose --profile monitoring ps`; check `grafana/prometheus.yml` |
| Port already in use | Local process already using 3000/4000/9090/3001 | Change `APP_PORT`, `WS_SERVER_PORT`, `PROMETHEUS_PORT`, or `GRAFANA_PORT` in `.env` |

## 9. Stop safely

Stop containers without deleting volumes:

```bash
docker compose down
```

Delete local database/cache/monitoring volumes only when you intentionally want a clean slate:

```bash
docker compose down --volumes --remove-orphans
```

That second command destroys local self-host data. Never run it against a production host unless you have backups and explicit approval.
