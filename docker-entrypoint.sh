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
  NEXT_PUBLIC_API_URL  Public base URL the frontend calls (optional)
  DATABASE_URL         Postgres connection string (optional; SQLite by default)
  REDIS_URL            Redis connection string (optional)
  TELEGRAM_BOT_TOKEN   Token for the Telegram alert bot (optional)
  SENTRY_DSN           Sentry DSN for error reporting (optional)

QUICK START (Docker Compose)
  git clone https://github.com/naimkatiman/tradeclaw.git
  cd tradeclaw
  docker compose up

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
# Idempotent: tracks applied filenames in the _migrations table. If
# DATABASE_URL is unset (e.g. SQLite-only self-host) the runner exits
# 2 — treat that as "skip migrations and proceed".
if [ -n "${DATABASE_URL:-}" ] && [ -f /app/scripts/run-migrations.mjs ]; then
  echo "[entrypoint] Running DB migrations..."
  node /app/scripts/run-migrations.mjs || {
    echo "[entrypoint] Migrations failed. Refusing to start." >&2
    exit 1
  }
fi

exec node apps/web/server.js "$@"
