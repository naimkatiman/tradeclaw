#!/usr/bin/env bash
set -euo pipefail

# The PostgreSQL image runs this only when it creates a new data directory.
# Keep schema ownership in scripts/run-migrations.mjs; defining application
# tables here would bypass _migrations and can conflict with tracked DDL.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
	CREATE EXTENSION IF NOT EXISTS timescaledb;
	CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOSQL

echo "TradeClaw database extensions initialized"
