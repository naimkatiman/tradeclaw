#!/bin/bash
set -e

# Enable TimescaleDB extension
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    -- Signal history table (hypertable for time-series)
    CREATE TABLE IF NOT EXISTS signals (
        id BIGSERIAL,
        symbol VARCHAR(20) NOT NULL,
        direction VARCHAR(4) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
        confidence DECIMAL(5,2) NOT NULL,
        entry_price DECIMAL(20,8) NOT NULL,
        tp1 DECIMAL(20,8),
        tp2 DECIMAL(20,8),
        tp3 DECIMAL(20,8),
        sl DECIMAL(20,8),
        timeframe VARCHAR(10) NOT NULL DEFAULT '1h',
        indicators JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    SELECT create_hypertable('signals', 'created_at', if_not_exists => TRUE);

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals (symbol, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_direction ON signals (direction, created_at DESC);

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Paper trades table
    CREATE TABLE IF NOT EXISTS paper_trades (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        signal_id BIGINT,
        symbol VARCHAR(20) NOT NULL,
        direction VARCHAR(4) NOT NULL,
        entry_price DECIMAL(20,8) NOT NULL,
        exit_price DECIMAL(20,8),
        quantity DECIMAL(20,8) NOT NULL,
        pnl DECIMAL(20,8),
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ
    );

    -- Backtest results table
    CREATE TABLE IF NOT EXISTS backtests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        name VARCHAR(255),
        config JSONB NOT NULL,
        results JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
    );

EOSQL

echo "✅ TradeClaw database initialized"
