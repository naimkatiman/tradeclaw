#!/bin/sh
# TradeClaw startup script
set -e

echo "Starting TradeClaw..."
echo "PORT=${PORT:-3000}"
echo "NODE_ENV=${NODE_ENV}"
echo "Working dir: $(pwd)"

cd /app/apps/web

echo "Starting Next.js server..."
exec /app/node_modules/.bin/next start -p "${PORT:-3000}" -H "0.0.0.0"
