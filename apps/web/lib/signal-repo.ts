/**
 * Signal repository — reads/writes live signals from Railway PostgreSQL.
 * Single source of truth for signal storage, replacing flat JSON files.
 */
import 'server-only';

import { query, queryOne, execute } from './db-pool';
import type { LiveSignal, WinRateData, CrossValidation, ReliabilityData } from './signals-live';

// Single stale threshold: 15 minutes (consolidates old 10min and 20min values)
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

interface SignalRow {
  id: string;
  symbol: string;
  direction: string;
  confidence: number;
  timeframe: string;
  entry: number;
  stop_loss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  reasons: string[];
  agreeing_timeframes: string[] | null;
  confluence_score: number | null;
  indicators: Record<string, unknown>;
  source: string;
  data_quality: string;
  win_rate: WinRateData | null;
  cross_validation: CrossValidation | null;
  candle_status: string | null;
  engine_version: string | null;
  skill: string | null;
  created_at: string;
  expires_at: string | null;
}

function rowToLiveSignal(row: SignalRow): LiveSignal {
  return {
    id: row.id,
    symbol: row.symbol,
    signal: row.direction as 'BUY' | 'SELL',
    confidence: Number(row.confidence),
    timeframe: row.timeframe,
    entry: Number(row.entry),
    tp1: Number(row.tp1),
    tp2: Number(row.tp2 ?? row.tp1),
    sl: Number(row.stop_loss),
    reasons: row.reasons ?? [],
    candle_status: row.candle_status ?? undefined,
    indicators: {
      rsi: (row.indicators as Record<string, unknown>)?.rsi as number ?? 0,
      macd_histogram: (row.indicators as Record<string, unknown>)?.macd_histogram as number ?? undefined,
      ema_trend: ((row.indicators as Record<string, unknown>)?.ema_trend as 'up' | 'down') ?? 'up',
      stochastic_k: (row.indicators as Record<string, unknown>)?.stochastic_k as number ?? undefined,
      stoch_k: (row.indicators as Record<string, unknown>)?.stoch_k as number ?? undefined,
      volume_ratio: (row.indicators as Record<string, unknown>)?.volume_ratio as number ?? undefined,
      rsi_m5: (row.indicators as Record<string, unknown>)?.rsi_m5 as number ?? undefined,
      rsi_h1: (row.indicators as Record<string, unknown>)?.rsi_h1 as number ?? undefined,
      rsi_h4: (row.indicators as Record<string, unknown>)?.rsi_h4 as number ?? undefined,
      macd_h1: (row.indicators as Record<string, unknown>)?.macd_h1 as number ?? undefined,
    },
    win_rate: row.win_rate ?? undefined,
    cross_validation: row.cross_validation ?? undefined,
    source: row.source,
    timestamp: row.created_at,
    expires_in_minutes: 15,
  };
}

export async function insertSignals(signals: LiveSignal[], engineVersion?: string): Promise<void> {
  if (signals.length === 0) return;

  for (const s of signals) {
    await execute(
      `INSERT INTO live_signals (
        id, symbol, direction, confidence, timeframe, entry, stop_loss,
        tp1, tp2, tp3, reasons, agreeing_timeframes, confluence_score,
        indicators, source, data_quality, win_rate, cross_validation,
        candle_status, engine_version, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21
      )
      ON CONFLICT (symbol, timeframe, direction, created_at) DO UPDATE SET
        confidence = EXCLUDED.confidence,
        entry = EXCLUDED.entry,
        stop_loss = EXCLUDED.stop_loss,
        tp1 = EXCLUDED.tp1,
        tp2 = EXCLUDED.tp2,
        indicators = EXCLUDED.indicators,
        win_rate = EXCLUDED.win_rate,
        cross_validation = EXCLUDED.cross_validation`,
      [
        s.id,
        s.symbol,
        s.signal,
        s.confidence,
        s.timeframe,
        s.entry,
        s.sl,
        s.tp1,
        s.tp2 ?? null,
        null, // tp3
        s.reasons ?? [],
        null, // agreeing_timeframes
        null, // confluence_score
        JSON.stringify(s.indicators ?? {}),
        s.source ?? 'real',
        'real',
        s.win_rate ? JSON.stringify(s.win_rate) : null,
        s.cross_validation ? JSON.stringify(s.cross_validation) : null,
        s.candle_status ?? null,
        engineVersion ?? null,
        s.timestamp ?? new Date().toISOString(),
      ],
    );
  }
}

export interface GetSignalsFilters {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}

export async function getActiveSignals(filters?: GetSignalsFilters): Promise<{
  signals: LiveSignal[];
  isStale: boolean;
  generatedAt: string | null;
  engineVersion?: string;
  reliability?: ReliabilityData;
}> {
  const conditions: string[] = [
    `created_at > NOW() - INTERVAL '${STALE_THRESHOLD_MS / 1000} seconds'`,
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.symbol) {
    conditions.push(`symbol = $${paramIdx++}`);
    params.push(filters.symbol.toUpperCase());
  }
  if (filters?.timeframe) {
    conditions.push(`timeframe = $${paramIdx++}`);
    params.push(filters.timeframe.toUpperCase());
  }
  if (filters?.direction) {
    conditions.push(`direction = $${paramIdx++}`);
    params.push(filters.direction.toUpperCase());
  }
  if (filters?.minConfidence && filters.minConfidence > 0) {
    conditions.push(`confidence >= $${paramIdx++}`);
    params.push(filters.minConfidence);
  }

  const rows = await query<SignalRow>(
    `SELECT * FROM live_signals
     WHERE ${conditions.join(' AND ')}
     ORDER BY confidence DESC, created_at DESC
     LIMIT 100`,
    params,
  );

  if (rows.length === 0) {
    return { signals: [], isStale: true, generatedAt: null };
  }

  const mostRecent = new Date(rows[0].created_at);
  const age = Date.now() - mostRecent.getTime();
  const isStale = age > STALE_THRESHOLD_MS;

  return {
    signals: rows.map(rowToLiveSignal),
    isStale,
    generatedAt: rows[0].created_at,
    engineVersion: rows[0].engine_version ?? undefined,
  };
}

export async function getSignalById(id: string): Promise<LiveSignal | null> {
  const row = await queryOne<SignalRow>(
    'SELECT * FROM live_signals WHERE id = $1',
    [id],
  );
  return row ? rowToLiveSignal(row) : null;
}

export async function cleanupExpiredSignals(): Promise<number> {
  const rows = await query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM live_signals WHERE created_at < NOW() - INTERVAL '24 hours'
       RETURNING 1
     ) SELECT COUNT(*)::text as count FROM deleted`,
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}
