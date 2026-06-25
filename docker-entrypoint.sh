#!/bin/sh
# TradeClaw Docker entrypoint
# Handles --help flag and launches the Next.js standalone server.
set -e

print_help() {
  cat <<'EOF'
TradeClaw — self-hostable AI trading platform
https://tradeclaw.win

USAGE
  docker run -p 3000:3000 ghcr.io/naimkatiman/tradeclaw[:tag]
  docker run ghcr.io/naimkatiman/tradeclaw --help

ENVIRONMENT VARIABLES
  PORT                 Port to bind (default: 3000)
  NODE_ENV             Node environment (default: production)
  DATABASE_URL         PostgreSQL connection string for DB-backed routes
  REDIS_URL            Redis connection string (optional cache/relay support)
  USER_SESSION_SECRET  Required for web sessions, OAuth state, and link tokens
  AUTH_SECRET          Required by the websocket relay when using Compose
  APP_URL              Public base URL for this deploy
  NEXT_PUBLIC_WS_URL   Browser websocket relay URL (optional)
  TELEGRAM_BOT_TOKEN   Token for Telegram alerts (optional)
  TELEGRAM_FREE_CHANNEL_ID / TELEGRAM_PRO_GROUP_ID  Telegram destinations (optional)

QUICK START (Docker Compose recommended)
  git clone https://github.com/naimkatiman/tradeclaw.git
  cd tradeclaw
  cp .env.example .env
  # set DB_PASSWORD, USER_SESSION_SECRET, and AUTH_SECRET
  docker compose config --quiet
  docker compose up -d --build

VERIFY
  curl -fsS http://localhost:3000/api/health
  curl -fsS http://localhost:4000/health
  See docs/self-host-smoke-checklist.md for the full checklist.

DOCS
  https://tradeclaw.win/docs
  https://github.com/naimkatiman/tradeclaw#readme

EOF
}

# Support --help / -h before starting the server.
for arg in "$@"; do
  case "$arg" in
    --help|-h|help)
      print_help
      exit 0
      ;;
  esac
done

PORT="${PORT:-3000}"
export PORT

# Apply pending DB migrations before starting the server.
# Idempotent: tracks applied filenames in the _migrations table. When
# DATABASE_URL is unset the runner is skipped here; DB-backed app routes still
# require a PostgreSQL DATABASE_URL before use.
if [ -n "${DATABASE_URL:-}" ] && [ -f /app/scripts/run-migrations.mjs ]; then
  echo "[entrypoint] Running DB migrations..."
  node /app/scripts/run-migrations.mjs || {
    echo "[entrypoint] Migrations failed. Refusing to start." >&2
    exit 1
  }
fi

exec node apps/web/server.js "$@"
