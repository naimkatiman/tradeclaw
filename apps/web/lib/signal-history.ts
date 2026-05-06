/**
 * Signal history — persistent record of every published signal + outcomes.
 * Backed by Railway PostgreSQL (signal_history table).
 * Falls back to data/signal-history.json only when DATABASE_URL is not set.
 */

import fs from 'fs';
import path from 'path';
import { query, queryOne, execute } from './db-pool';
import { getOHLCV, type OHLCV } from '../app/lib/ohlcv';

// ── Types ────────────────────────────────────────────────────

export interface SignalOutcome {
  price: number;
  pnlPct: number;
  hit: boolean;
}

// Auto-expire writes `{ pnlPct: 0, hit: false }` when a signal window elapses
// without TP/SL/close resolution. Those are not real trade outcomes and must
// be excluded from hit-rate and pnl aggregations.
export function isRealOutcome(o: SignalOutcome | null | undefined): o is SignalOutcome {
  if (!o) return false;
  if (o.pnlPct === 0 && !o.hit) return false;
  return true;
}

/**
 * Canonical filter for "this row counts in resolved P&L / win-rate / equity".
 * Excludes simulated rows, gate-blocked rows (engine refused to trade), and
 * auto-expire placeholders (no TP/SL within the window). Use this everywhere
 * a denominator is computed so /api/signals/history, /api/signals/equity,
 * /api/leaderboard, and /api/strategy-breakdown stay consistent.
 */
export function isCountedResolved(r: SignalHistoryRecord): boolean {
  if (r.isSimulated) return false;
  if (r.gateBlocked) return false;
  return isRealOutcome(r.outcomes['24h']);
}

export interface SignalHistoryRecord {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  timestamp: number; // ms epoch
  tp1?: number;
  sl?: number;
  isSimulated?: boolean;
  lastVerified?: number;
  telegramPostedAt?: number;
  telegramMessageId?: number;
  strategyId?: string;
  mode?: SignalMode;
  /** ATR at signal emission (price units). NULL on pre-migration rows. */
  entryAtr?: number;
  /** ATR multiplier used to size the stop at signal time. NULL on pre-migration rows. */
  atrMultiplier?: number;
  /** Max adverse excursion up to the resolution candle (price units, >= 0). NULL while open / on pre-migration rows. */
  maxAdverseExcursion?: number;
  /** TRUE when the full-risk gate blocked this signal at emission. Blocked rows are recorded for engine accuracy but excluded from paper-trade equity + gate lookback. */
  gateBlocked?: boolean;
  /** Human-readable gate.reason at the moment of blocking. NULL unless gateBlocked is TRUE. */
  gateReason?: string;
  outcomes: {
    '4h': SignalOutcome | null;
    '24h': SignalOutcome | null;
  };
}

export type SignalMode = 'swing' | 'scalp';

export function modeFromTimeframe(timeframe: string): SignalMode {
  return timeframe === 'M5' || timeframe === 'M15' ? 'scalp' : 'swing';
}

export interface TrackedSignalInput {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timestamp: string;
  takeProfit1?: number;
  stopLoss?: number;
  strategyId?: string;
  mode?: SignalMode;
  entryAtr?: number;
  atrMultiplier?: number;
  gateBlocked?: boolean;
  gateReason?: string;
}

export type LeaderboardPeriod = '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all';

export interface AssetStats {
  pair: string;
  totalSignals: number;
  resolved4h: number;
  resolved24h: number;
  hits4h: number;
  hits24h: number;
  hitRate4h: number;
  hitRate24h: number;
  avgConfidence: number;
  avgPnl: number;
  /** Cumulative P&L over the period — sum of pnlPct across all resolved 24h outcomes. */
  totalPnl: number;
  bestStreak: number;
  worstStreak: number;
  recentHits: boolean[];
}

export interface LeaderboardData {
  assets: AssetStats[];
  overall: {
    totalSignals: number;
    resolvedSignals: number;
    overallHitRate4h: number;
    overallHitRate24h: number;
    /** Total cumulative P&L across every pair in the period. */
    totalPnl: number;
    topPerformer: string;
    worstPerformer: string;
    lastUpdated: number;
  };
}

export interface StrategyBreakdownRow {
  strategyId: string;
  totalSignals: number;
  resolvedSignals: number;
  hitRate4h: number;
  hitRate24h: number;
  avgConfidence: number;
  avgPnl: number;
}

export function recomputeOverall(
  assets: AssetStats[],
  lastUpdated: number = Date.now(),
): LeaderboardData['overall'] {
  const totalSignals = assets.reduce((sum, a) => sum + a.totalSignals, 0);
  const resolved4h = assets.reduce((sum, a) => sum + a.resolved4h, 0);
  const resolved24h = assets.reduce((sum, a) => sum + a.resolved24h, 0);
  const hits4h = assets.reduce((sum, a) => sum + a.hits4h, 0);
  const hits24h = assets.reduce((sum, a) => sum + a.hits24h, 0);
  const totalPnl = +assets.reduce((sum, a) => sum + a.totalPnl, 0).toFixed(2);

  const byHitRate = [...assets].sort((a, b) =>
    b.hitRate24h - a.hitRate24h
    || b.totalPnl - a.totalPnl
    || b.totalSignals - a.totalSignals
    || a.pair.localeCompare(b.pair),
  );
  const byWorstHitRate = [...assets].sort((a, b) =>
    a.hitRate24h - b.hitRate24h
    || a.totalPnl - b.totalPnl
    || b.totalSignals - a.totalSignals
    || a.pair.localeCompare(b.pair),
  );

  return {
    totalSignals,
    resolvedSignals: resolved24h,
    overallHitRate4h: resolved4h > 0 ? +((hits4h / resolved4h) * 100).toFixed(1) : 0,
    overallHitRate24h: resolved24h > 0 ? +((hits24h / resolved24h) * 100).toFixed(1) : 0,
    totalPnl,
    topPerformer: byHitRate[0]?.pair ?? '—',
    worstPerformer: byWorstHitRate[0]?.pair ?? '—',
    lastUpdated,
  };
}

// ── Helpers ──────────────────────────────────────────────────

const isDbEnabled = () => !!process.env.DATABASE_URL;

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'signal-history.json');
const MAX_RECORDS = 10000;


// ── DB row → SignalHistoryRecord ─────────────────────────────

interface HistoryRow {
  id: string;
  pair: string;
  timeframe: string;
  direction: string;
  confidence: number;
  entry_price: number;
  tp1: number | null;
  sl: number | null;
  is_simulated: boolean;
  outcome_4h: SignalOutcome | null;
  outcome_24h: SignalOutcome | null;
  telegram_posted_at: string | null;
  telegram_message_id: string | null;
  created_at: string;
  last_verified: string | null;
  strategy_id: string | null;
  mode: string | null;
  entry_atr: string | number | null;
  atr_multiplier: string | number | null;
  max_adverse_excursion: string | number | null;
  gate_blocked: boolean | null;
  gate_reason: string | null;
}

function rowToRecord(row: HistoryRow): SignalHistoryRecord {
  return {
    id: row.id,
    pair: row.pair,
    timeframe: row.timeframe,
    direction: row.direction as 'BUY' | 'SELL',
    confidence: Number(row.confidence),
    entryPrice: Number(row.entry_price),
    timestamp: new Date(row.created_at).getTime(),
    tp1: row.tp1 != null ? Number(row.tp1) : undefined,
    sl: row.sl != null ? Number(row.sl) : undefined,
    isSimulated: row.is_simulated,
    lastVerified: row.last_verified ? new Date(row.last_verified).getTime() : undefined,
    telegramPostedAt: row.telegram_posted_at ? new Date(row.telegram_posted_at).getTime() : undefined,
    telegramMessageId: row.telegram_message_id ? Number(row.telegram_message_id) : undefined,
    strategyId: row.strategy_id ?? undefined,
    mode: (row.mode as SignalMode | null) ?? modeFromTimeframe(row.timeframe),
    entryAtr: row.entry_atr != null ? Number(row.entry_atr) : undefined,
    atrMultiplier: row.atr_multiplier != null ? Number(row.atr_multiplier) : undefined,
    maxAdverseExcursion: row.max_adverse_excursion != null ? Number(row.max_adverse_excursion) : undefined,
    gateBlocked: row.gate_blocked ?? false,
    gateReason: row.gate_reason ?? undefined,
    outcomes: {
      '4h': row.outcome_4h ?? null,
      '24h': row.outcome_24h ?? null,
    },
  };
}

// ── File fallback (dev / no DB) ──────────────────────────────

function ensureDataDir(): void {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* read-only fs */ }
}

function readHistoryFile(): SignalHistoryRecord[] {
  ensureDataDir();
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) as SignalHistoryRecord[];
    } catch { /* corrupt */ }
  }
  return [];
}

function writeHistoryFile(records: SignalHistoryRecord[]): void {
  ensureDataDir();
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(records)); } catch { /* read-only fs */ }
}

// ── Read ─────────────────────────────────────────────────────

export async function readHistoryAsync(
  options: { sinceMs?: number } = {},
): Promise<SignalHistoryRecord[]> {
  if (!isDbEnabled()) {
    const all = readHistoryFile();
    return options.sinceMs !== undefined
      ? all.filter(r => r.timestamp >= options.sinceMs!)
      : all;
  }

  if (options.sinceMs !== undefined) {
    const rows = await query<HistoryRow>(
      `SELECT * FROM signal_history
       WHERE is_simulated = FALSE
         AND created_at >= $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [new Date(options.sinceMs).toISOString(), MAX_RECORDS],
    );
    return rows.map(rowToRecord);
  }

  const rows = await query<HistoryRow>(
    `SELECT * FROM signal_history
     WHERE is_simulated = FALSE
     ORDER BY created_at DESC
     LIMIT $1`,
    [MAX_RECORDS],
  );
  return rows.map(rowToRecord);
}


// ── Record single signal ─────────────────────────────────────

export async function recordSignalAsync(
  pair: string,
  timeframe: string,
  direction: 'BUY' | 'SELL',
  confidence: number,
  entryPrice: number,
  id?: string,
  tp1?: number,
  sl?: number,
  timestamp?: number,
  strategyId?: string,
  mode?: SignalMode,
  entryAtr?: number,
  atrMultiplier?: number,
  gateBlocked?: boolean,
  gateReason?: string,
): Promise<void> {
  const sigId = id ?? `${pair}-${timeframe}-${direction}-${Date.now()}`;
  const ts = timestamp ?? Date.now();
  const resolvedMode = mode ?? modeFromTimeframe(timeframe);

  if (isDbEnabled()) {
    await insertSignalHistoryRow({
      id: sigId,
      pair,
      timeframe,
      direction,
      confidence,
      entryPrice,
      tp1,
      sl,
      createdAt: new Date(ts).toISOString(),
      strategyId,
      mode: resolvedMode,
      entryAtr,
      atrMultiplier,
      gateBlocked,
      gateReason,
    });
    return;
  }

  // File fallback
  recordSignal(pair, timeframe, direction, confidence, entryPrice, sigId, tp1, sl, ts, strategyId, resolvedMode, entryAtr, atrMultiplier, gateBlocked, gateReason);
}

/**
 * Shared INSERT helper. Uses the new entry_atr + atr_multiplier columns by
 * default. If the DB raises `undefined_column` (migration 012 hasn't been
 * applied yet on this environment), falls back to the pre-012 INSERT so
 * signal recording does not break during a partial deploy.
 *
 * Returns true if a row was inserted, false on conflict.
 */
interface InsertRowArgs {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  tp1?: number;
  sl?: number;
  createdAt: string;
  strategyId?: string;
  mode: SignalMode;
  entryAtr?: number;
  atrMultiplier?: number;
  gateBlocked?: boolean;
  gateReason?: string;
}

let atrColumnsKnownMissing = false;
let gateColumnsKnownMissing = false;

async function insertSignalHistoryRow(args: InsertRowArgs): Promise<boolean> {
  // Tier 1: full schema (012 ATR + 017 gate cols).
  if (!atrColumnsKnownMissing && !gateColumnsKnownMissing) {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode, entry_atr, atr_multiplier, gate_blocked, gate_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
           WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL
         RETURNING id`,
        [args.id, args.pair, args.timeframe, args.direction, args.confidence, args.entryPrice, args.tp1 ?? null, args.sl ?? null, args.createdAt, args.strategyId ?? null, args.mode, args.entryAtr ?? null, args.atrMultiplier ?? null, args.gateBlocked ?? false, args.gateReason ?? null],
      );
      return result.length > 0;
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      const msg = err instanceof Error ? err.message : String(err);
      if (code === '42703' && /gate_blocked|gate_reason/.test(msg)) {
        console.warn('[signal-history] migration 017 not applied — falling back to pre-017 INSERT. Run psql "$DATABASE_URL" -f apps/web/migrations/017_gate_blocked.sql to persist gate decisions.');
        gateColumnsKnownMissing = true;
      } else if (code === '42703' && /entry_atr|atr_multiplier/.test(msg)) {
        console.warn('[signal-history] migration 012 not applied — falling back to pre-012 INSERT. Run psql "$DATABASE_URL" -f apps/web/migrations/012_atr_telemetry.sql to enable ATR telemetry.');
        atrColumnsKnownMissing = true;
        gateColumnsKnownMissing = true;
      } else {
        throw err;
      }
    }
  }

  // Tier 2: ATR cols present, no gate cols. Drops gateBlocked + gateReason.
  if (!atrColumnsKnownMissing) {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode, entry_atr, atr_multiplier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
           WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL
         RETURNING id`,
        [args.id, args.pair, args.timeframe, args.direction, args.confidence, args.entryPrice, args.tp1 ?? null, args.sl ?? null, args.createdAt, args.strategyId ?? null, args.mode, args.entryAtr ?? null, args.atrMultiplier ?? null],
      );
      return result.length > 0;
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      const msg = err instanceof Error ? err.message : String(err);
      if (code === '42703' || /entry_atr|atr_multiplier/.test(msg)) {
        console.warn('[signal-history] migration 012 not applied — falling back to pre-012 INSERT. Run psql "$DATABASE_URL" -f apps/web/migrations/012_atr_telemetry.sql to enable ATR telemetry.');
        atrColumnsKnownMissing = true;
      } else {
        throw err;
      }
    }
  }

  // Tier 3: pre-012 fallback. Drops ATR + gate fields on the floor.
  const result = await query<{ id: string }>(
    `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
       WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL
     RETURNING id`,
    [args.id, args.pair, args.timeframe, args.direction, args.confidence, args.entryPrice, args.tp1 ?? null, args.sl ?? null, args.createdAt, args.strategyId ?? null, args.mode],
  );
  return result.length > 0;
}

/** Sync file-only fallback — kept for backward compat with getTrackedSignals server component. */
export function recordSignal(
  pair: string,
  timeframe: string,
  direction: 'BUY' | 'SELL',
  confidence: number,
  entryPrice: number,
  id?: string,
  tp1?: number,
  sl?: number,
  timestamp?: number,
  strategyId?: string,
  mode?: SignalMode,
  entryAtr?: number,
  atrMultiplier?: number,
  gateBlocked?: boolean,
  gateReason?: string,
): void {
  const records = readHistoryFile();
  const sigId = id ?? `${pair}-${timeframe}-${direction}-${Date.now()}`;
  if (records.some(r => r.id === sigId)) return;

  records.unshift({
    id: sigId, pair, timeframe, direction, confidence, entryPrice,
    timestamp: timestamp ?? Date.now(), tp1, sl, isSimulated: false,
    strategyId,
    mode: mode ?? modeFromTimeframe(timeframe),
    entryAtr,
    atrMultiplier,
    gateBlocked: gateBlocked ?? false,
    gateReason,
    outcomes: { '4h': null, '24h': null },
  });
  if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
  writeHistoryFile(records);
}

// ── Bulk record ──────────────────────────────────────────────

export async function recordSignalsAsync(signals: TrackedSignalInput[]): Promise<number> {
  if (signals.length === 0) return 0;

  if (isDbEnabled()) {
    let inserted = 0;
    for (const s of signals) {
      if (!s.id) continue;
      const parsedTs = Date.parse(s.timestamp);
      const ts = Number.isFinite(parsedTs) ? new Date(parsedTs).toISOString() : new Date().toISOString();

      // ON CONFLICT: late-tag strategy_id when it's currently NULL. Bar
      // timestamps are deterministic so the same id can be re-inserted
      // many times — the first insert (possibly from pre-strategyId code)
      // wins for everything else, but we want to retroactively label it
      // so the per-strategy breakdown isn't mostly NULL.
      const resolvedMode = s.mode ?? modeFromTimeframe(s.timeframe);
      const result = await insertSignalHistoryRow({
        id: s.id,
        pair: s.symbol,
        timeframe: s.timeframe,
        direction: s.direction,
        confidence: s.confidence,
        entryPrice: s.entry,
        tp1: s.takeProfit1,
        sl: s.stopLoss,
        createdAt: ts,
        strategyId: s.strategyId,
        mode: resolvedMode,
        entryAtr: s.entryAtr,
        atrMultiplier: s.atrMultiplier,
        gateBlocked: s.gateBlocked,
        gateReason: s.gateReason,
      });
      if (result) inserted++;
    }
    return inserted;
  }

  return recordSignals(signals);
}

/** Sync file-only fallback. */
export function recordSignals(signals: TrackedSignalInput[]): number {
  if (signals.length === 0) return 0;
  const records = readHistoryFile();
  const existingIds = new Set(records.map(r => r.id));
  let inserted = 0;

  for (const signal of signals) {
    if (!signal.id || existingIds.has(signal.id)) continue;
    const parsedTimestamp = Date.parse(signal.timestamp);
    const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

    records.unshift({
      id: signal.id, pair: signal.symbol, timeframe: signal.timeframe,
      direction: signal.direction, confidence: signal.confidence,
      entryPrice: signal.entry, timestamp,
      tp1: signal.takeProfit1, sl: signal.stopLoss,
      isSimulated: false, strategyId: signal.strategyId,
      mode: signal.mode ?? modeFromTimeframe(signal.timeframe),
      entryAtr: signal.entryAtr,
      atrMultiplier: signal.atrMultiplier,
      gateBlocked: signal.gateBlocked ?? false,
      gateReason: signal.gateReason,
      outcomes: { '4h': null, '24h': null },
    });
    existingIds.add(signal.id);
    inserted++;
  }

  if (inserted === 0) return 0;
  if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
  writeHistoryFile(records);
  return inserted;
}

// ── Outcome resolution ───────────────────────────────────────

interface ResolvedWithMae {
  outcome: SignalOutcome;
  /** Max adverse excursion from entry up to AND including the resolution candle (price units, >= 0). */
  maxAdverseExcursion: number;
}

function resolveFromCandles(
  r: SignalHistoryRecord,
  candles: OHLCV[],
  windowComplete = false,
): ResolvedWithMae | null {
  if (!r.tp1 || !r.sl || candles.length === 0) return null;

  let mae = 0;

  for (const candle of candles) {
    // Update MAE with the worst adverse touch in this candle BEFORE checking
    // resolution — if price wicks into the stop, the MAE must include that
    // adverse move, not just the moves on prior candles.
    if (r.direction === 'BUY') {
      const adverse = r.entryPrice - candle.low;
      if (adverse > mae) mae = adverse;

      const slHit = candle.low <= r.sl;
      const tpHit = candle.high >= r.tp1;
      // SL takes priority when both could fire on the same wide-range bar.
      // Conservative bias for a public track record — without intra-bar tick
      // data we can't tell whether TP or SL was hit first, so resolve as
      // loss rather than letting wide bars systematically print as wins.
      if (slHit) {
        // Gap-through: if the bar opened past SL, real fill happens at the
        // open, not the stop price. Otherwise it's an intracandle wick to
        // SL and fills at the stop.
        const fillPrice = candle.open <= r.sl ? candle.open : r.sl;
        const pnlPct = +((fillPrice - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: fillPrice, pnlPct, hit: false }, maxAdverseExcursion: mae };
      }
      if (tpHit) {
        const pnlPct = +((r.tp1 - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.tp1, pnlPct, hit: true }, maxAdverseExcursion: mae };
      }
    } else {
      const adverse = candle.high - r.entryPrice;
      if (adverse > mae) mae = adverse;

      const slHit = candle.high >= r.sl;
      const tpHit = candle.low <= r.tp1;
      if (slHit) {
        const fillPrice = candle.open >= r.sl ? candle.open : r.sl;
        const pnlPct = +((r.entryPrice - fillPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: fillPrice, pnlPct, hit: false }, maxAdverseExcursion: mae };
      }
      if (tpHit) {
        const pnlPct = +((r.entryPrice - r.tp1) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.tp1, pnlPct, hit: true }, maxAdverseExcursion: mae };
      }
    }
  }

  // Window fully elapsed but neither TP nor SL hit — close at last candle's price
  if (windowComplete && candles.length > 0) {
    const lastClose = candles[candles.length - 1].close;
    const pnlPct = r.direction === 'BUY'
      ? +((lastClose - r.entryPrice) / r.entryPrice * 100).toFixed(2)
      : +((r.entryPrice - lastClose) / r.entryPrice * 100).toFixed(2);
    return {
      outcome: { price: lastClose, pnlPct, hit: pnlPct > 0 },
      maxAdverseExcursion: mae,
    };
  }

  return null;
}

/** Test-only export. Do not use in production code. */
export const _resolveFromCandlesForTest = resolveFromCandles;

export async function resolveRealOutcomes(): Promise<void> {
  const now = Date.now();
  const FOUR_H = 4 * 3600 * 1000;
  const TWENTY_FOUR_H = 24 * 3600 * 1000;

  if (isDbEnabled()) {
    const pending = await query<HistoryRow>(
      `SELECT * FROM signal_history
       WHERE is_simulated = FALSE
         AND (outcome_4h IS NULL OR outcome_24h IS NULL)
         AND tp1 IS NOT NULL AND sl IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 200`,
    );

    for (const row of pending) {
      const r = rowToRecord(row);
      const age = now - r.timestamp;
      const needs4h = r.outcomes['4h'] === null;
      const needs24h = r.outcomes['24h'] === null;
      if (!needs4h && !needs24h) continue;

      let candles: import('../app/lib/ohlcv').OHLCV[] = [];

      try {
        const result = await getOHLCV(r.pair, 'H1');
        candles = result.candles;
      } catch (err) {
        console.error(`[signal-history] OHLCV fetch failed for ${r.pair}: ${err instanceof Error ? err.message : String(err)}`);
      }

      let outcome4h = r.outcomes['4h'];
      let outcome24h = r.outcomes['24h'];
      let mae24h: number | null = null;

      if (needs4h) {
        const windowEnd = r.timestamp + FOUR_H;
        const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
        const resolved = resolveFromCandles(r, window, age >= FOUR_H);
        outcome4h = resolved?.outcome ?? outcome4h;
        if (!outcome4h && age >= FOUR_H * 2) {
          outcome4h = { price: r.entryPrice, pnlPct: 0, hit: false };
        }
      }
      if (needs24h) {
        const windowEnd = r.timestamp + TWENTY_FOUR_H;
        const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
        const resolved = resolveFromCandles(r, window, age >= TWENTY_FOUR_H);
        outcome24h = resolved?.outcome ?? outcome24h;
        mae24h = resolved?.maxAdverseExcursion ?? null;
        if (!outcome24h && age >= TWENTY_FOUR_H * 2) {
          outcome24h = { price: r.entryPrice, pnlPct: 0, hit: false };
        }
      }

      if ((needs4h && outcome4h) || (needs24h && outcome24h)) {
        const outcome4hJson = outcome4h ? JSON.stringify(outcome4h) : null;
        const outcome24hJson = outcome24h ? JSON.stringify(outcome24h) : null;
        const verifiedAt = new Date(now).toISOString();
        if (!atrColumnsKnownMissing) {
          try {
            await execute(
              `UPDATE signal_history
               SET outcome_4h = COALESCE($2, outcome_4h),
                   outcome_24h = COALESCE($3, outcome_24h),
                   max_adverse_excursion = COALESCE($5, max_adverse_excursion),
                   last_verified = $4
               WHERE id = $1`,
              [r.id, outcome4hJson, outcome24hJson, verifiedAt, mae24h],
            );
            continue;
          } catch (err: unknown) {
            const code = (err as { code?: string } | null)?.code;
            const msg = err instanceof Error ? err.message : String(err);
            if (code === '42703' || /max_adverse_excursion/.test(msg)) {
              atrColumnsKnownMissing = true;
            } else {
              throw err;
            }
          }
        }
        // Pre-012 fallback
        await execute(
          `UPDATE signal_history
           SET outcome_4h = COALESCE($2, outcome_4h),
               outcome_24h = COALESCE($3, outcome_24h),
               last_verified = $4
           WHERE id = $1`,
          [r.id, outcome4hJson, outcome24hJson, verifiedAt],
        );
      }
    }
    return;
  }

  // File fallback
  const records = readHistoryFile();
  let changed = false;

  for (const r of records) {
    if (r.isSimulated) continue;
    if (!r.tp1 || !r.sl) continue;
    const age = now - r.timestamp;
    const needs4h = r.outcomes['4h'] === null;
    const needs24h = r.outcomes['24h'] === null;
    if (!needs4h && !needs24h) continue;

    let candles: import('../app/lib/ohlcv').OHLCV[] = [];

    try {
      const result = await getOHLCV(r.pair, 'H1');
      candles = result.candles;
    } catch (err) {
      console.error(`[signal-history] OHLCV fetch failed for ${r.pair}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (needs4h) {
      const windowEnd = r.timestamp + FOUR_H;
      const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
      const resolved = resolveFromCandles(r, window, age >= FOUR_H);
      if (resolved) {
        r.outcomes['4h'] = resolved.outcome;
        r.lastVerified = now;
        changed = true;
      } else if (age >= FOUR_H * 2) {
        r.outcomes['4h'] = { price: r.entryPrice, pnlPct: 0, hit: false };
        r.lastVerified = now;
        changed = true;
      }
    }
    if (needs24h) {
      const windowEnd = r.timestamp + TWENTY_FOUR_H;
      const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
      const resolved = resolveFromCandles(r, window, age >= TWENTY_FOUR_H);
      if (resolved) {
        r.outcomes['24h'] = resolved.outcome;
        r.maxAdverseExcursion = resolved.maxAdverseExcursion;
        r.lastVerified = now;
        changed = true;
      } else if (age >= TWENTY_FOUR_H * 2) {
        r.outcomes['24h'] = { price: r.entryPrice, pnlPct: 0, hit: false };
        r.lastVerified = now;
        changed = true;
      }
    }
  }
  if (changed) writeHistoryFile(records);
}

// ── Query helpers for cron pipeline ──────────────────────────

export async function getPendingRecordsAsync(): Promise<SignalHistoryRecord[]> {
  if (isDbEnabled()) {
    // Only look back 14 days — older signals lack candle data to resolve
    const rows = await query<HistoryRow>(
      `SELECT * FROM signal_history
       WHERE is_simulated = FALSE
         AND (outcome_4h IS NULL OR outcome_24h IS NULL)
         AND created_at > NOW() - INTERVAL '14 days'
       ORDER BY created_at DESC`,
    );
    return rows.map(rowToRecord);
  }
  return getPendingRecords();
}

export function getPendingRecords(): SignalHistoryRecord[] {
  return readHistoryFile().filter(
    r => !r.isSimulated && (r.outcomes['4h'] === null || r.outcomes['24h'] === null),
  );
}

export async function getRecentRecordForSymbolAsync(
  symbol: string,
  direction: 'BUY' | 'SELL',
  withinMs: number,
): Promise<SignalHistoryRecord | undefined> {
  if (isDbEnabled()) {
    const cutoff = new Date(Date.now() - withinMs).toISOString();
    const row = await queryOne<HistoryRow>(
      `SELECT * FROM signal_history
       WHERE pair = $1 AND direction = $2 AND created_at >= $3
       ORDER BY created_at DESC LIMIT 1`,
      [symbol, direction, cutoff],
    );
    return row ? rowToRecord(row) : undefined;
  }
  return getRecentRecordForSymbol(symbol, direction, withinMs);
}

/**
 * Look up a signal_history row by its primary id. Used by the /signal/[id]
 * detail page to recover symbol/timeframe/direction from legacy ids that
 * don't encode the direction (`SYMBOL-TF-TIMESTAMP` format written by
 * /api/signals/record before it was rewired to canonical SIG-* ids).
 */
export async function getRecordByIdAsync(
  id: string,
): Promise<SignalHistoryRecord | undefined> {
  if (isDbEnabled()) {
    const row = await queryOne<HistoryRow>(
      `SELECT * FROM signal_history WHERE id = $1 LIMIT 1`,
      [id],
    );
    return row ? rowToRecord(row) : undefined;
  }
  return readHistoryFile().find(r => r.id === id);
}

export function getRecentRecordForSymbol(
  symbol: string,
  direction: 'BUY' | 'SELL',
  withinMs: number,
): SignalHistoryRecord | undefined {
  const cutoff = Date.now() - withinMs;
  return readHistoryFile().find(
    r => r.pair === symbol && r.direction === direction && r.timestamp >= cutoff,
  );
}

export interface PreviousDirectionResult {
  direction: 'BUY' | 'SELL';
  /** Milliseconds between the prior signal and `beforeMs`. */
  ageMs: number;
}

/**
 * Look up the most recent signal emitted for (symbol, timeframe) strictly
 * before `beforeMs`. Used by the explainer to flag direction flips so the
 * UI can surface "why the signal changed" — a common trader concern when a
 * system quietly inverts its stance.
 *
 * Returns null when no prior record exists (e.g. first signal ever) or when
 * the most recent prior is older than `maxAgeMs` (default 3 days — beyond
 * that, calling it a "flip" is misleading).
 */
export async function getPreviousDirectionAsync(
  symbol: string,
  timeframe: string,
  beforeMs: number,
  maxAgeMs: number = 3 * 24 * 3600 * 1000,
): Promise<PreviousDirectionResult | null> {
  const cutoffMs = beforeMs - maxAgeMs;

  if (isDbEnabled()) {
    const row = await queryOne<{ direction: string; created_at: string }>(
      `SELECT direction, created_at FROM signal_history
       WHERE pair = $1 AND timeframe = $2
         AND created_at < $3 AND created_at >= $4
       ORDER BY created_at DESC LIMIT 1`,
      [symbol, timeframe, new Date(beforeMs).toISOString(), new Date(cutoffMs).toISOString()],
    );
    if (!row) return null;
    return {
      direction: row.direction as 'BUY' | 'SELL',
      ageMs: beforeMs - new Date(row.created_at).getTime(),
    };
  }
  const prior = readHistoryFile().find(
    r => r.pair === symbol && r.timeframe === timeframe && r.timestamp < beforeMs && r.timestamp >= cutoffMs,
  );
  return prior ? { direction: prior.direction, ageMs: beforeMs - prior.timestamp } : null;
}

// ── Trade outcome recording (risk pipeline feedback) ────────

/**
 * Record a trade outcome directly to signal_history.
 * Called by position-monitor when a paper trade closes (TP/SL hit).
 * This provides real-time feedback to the risk pipeline without
 * waiting for the OHLCV-based resolution in the signals cron.
 */
export async function recordTradeOutcomeToHistory(
  signalId: string,
  exitPrice: number,
  pnlPct: number,
  isHit: boolean,
): Promise<void> {
  if (!isDbEnabled()) return;

  const outcome: SignalOutcome = { price: exitPrice, pnlPct, hit: isHit };

  await execute(
    `UPDATE signal_history
     SET outcome_24h = COALESCE(outcome_24h, $2),
         last_verified = NOW()
     WHERE id = $1`,
    [signalId, JSON.stringify(outcome)],
  );
}

// ── Telegram sync ────────────────────────────────────────────

export async function markTelegramPosted(
  signalId: string,
  messageId: number,
): Promise<void> {
  if (!isDbEnabled()) return;
  await execute(
    `UPDATE signal_history
     SET telegram_posted_at = NOW(), telegram_message_id = $2
     WHERE id = $1`,
    [signalId, messageId],
  );
}

/**
 * Look up the Telegram message_id for a signal so we can reply to it.
 * Returns undefined if the signal was never posted to Telegram.
 */
export async function getSignalTelegramMessageId(
  signalId: string,
): Promise<number | undefined> {
  if (!isDbEnabled()) return undefined;
  const row = await queryOne<{ telegram_message_id: string | null }>(
    `SELECT telegram_message_id FROM signal_history WHERE id = $1`,
    [signalId],
  );
  return row?.telegram_message_id ? Number(row.telegram_message_id) : undefined;
}

/**
 * Pro-tier reply threading. Stores the message_id of the Pro group post
 * separately from the free public channel's message_id (different
 * chat_ids, different message_id namespaces — using the same field
 * would mis-target outcome replies).
 */
export async function markTelegramProPosted(
  signalId: string,
  messageId: number,
): Promise<void> {
  if (!isDbEnabled()) return;
  await execute(
    `UPDATE signal_history
     SET telegram_pro_message_id = $2
     WHERE id = $1`,
    [signalId, messageId],
  );
}

export async function getSignalTelegramProMessageId(
  signalId: string,
): Promise<number | undefined> {
  if (!isDbEnabled()) return undefined;
  const row = await queryOne<{ telegram_pro_message_id: string | null }>(
    `SELECT telegram_pro_message_id FROM signal_history WHERE id = $1`,
    [signalId],
  );
  return row?.telegram_pro_message_id
    ? Number(row.telegram_pro_message_id)
    : undefined;
}

// ── Bulk update (cron resolution) ────────────────────────────

export async function updateRecordsAsync(
  updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }>,
): Promise<number> {
  if (updates.length === 0) return 0;

  if (isDbEnabled()) {
    let changed = 0;
    for (const { id, patch } of updates) {
      const sets: string[] = [];
      const params: unknown[] = [id];
      let idx = 2;

      if (patch.outcomes) {
        if (patch.outcomes['4h'] !== undefined) {
          sets.push(`outcome_4h = $${idx++}`);
          params.push(patch.outcomes['4h'] ? JSON.stringify(patch.outcomes['4h']) : null);
        }
        if (patch.outcomes['24h'] !== undefined) {
          sets.push(`outcome_24h = $${idx++}`);
          params.push(patch.outcomes['24h'] ? JSON.stringify(patch.outcomes['24h']) : null);
        }
      }
      if (patch.lastVerified !== undefined) {
        sets.push(`last_verified = $${idx++}`);
        params.push(new Date(patch.lastVerified).toISOString());
      }

      if (sets.length === 0) continue;
      await execute(`UPDATE signal_history SET ${sets.join(', ')} WHERE id = $1`, params);
      changed++;
    }
    return changed;
  }

  return updateRecords(updates);
}

export function updateRecords(
  updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }>,
): number {
  if (updates.length === 0) return 0;
  const records = readHistoryFile();
  const patchMap = new Map(updates.map(u => [u.id, u.patch]));
  let changed = 0;

  for (const r of records) {
    const patch = patchMap.get(r.id);
    if (patch) { Object.assign(r, patch); changed++; }
  }
  if (changed > 0) writeHistoryFile(records);
  return changed;
}

// ── Leaderboard computation ──────────────────────────────────

export function computeLeaderboard(
  records: SignalHistoryRecord[],
  period: LeaderboardPeriod,
  sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence' = 'hitRate',
  strategyId?: string,
): LeaderboardData {
  const periodMs: Record<string, number> = {
    '7d': 7, '30d': 30, '90d': 90, '180d': 180, '1y': 365, '5y': 1825,
  };
  const cutoff = period in periodMs ? Date.now() - periodMs[period] * 86400000 : 0;

  // Exclude gate-blocked rows from the leaderboard pool. The full-risk gate
  // refused to execute them; counting them in `totalSignals` per pair makes
  // this surface disagree with the equity curve (which uses isCountedResolved).
  const filtered = records.filter(
    r => r.timestamp >= cutoff
      && !r.isSimulated
      && !r.gateBlocked
      && (strategyId ? r.strategyId === strategyId : true),
  );

  const map = new Map<string, {
    total: number; hits4h: number; resolved4h: number;
    hits24h: number; resolved24h: number;
    confSum: number; pnlSum: number; pnlCount: number;
    streak: number; bestStreak: number; worstStreak: number;
    recentHits: boolean[];
  }>();

  for (const r of [...filtered].sort((a, b) => a.timestamp - b.timestamp)) {
    if (!map.has(r.pair)) {
      map.set(r.pair, {
        total: 0, hits4h: 0, resolved4h: 0, hits24h: 0, resolved24h: 0,
        confSum: 0, pnlSum: 0, pnlCount: 0, streak: 0, bestStreak: 0, worstStreak: 0, recentHits: [],
      });
    }
    const s = map.get(r.pair)!;
    s.total++;
    s.confSum += r.confidence;

    if (isRealOutcome(r.outcomes['4h'])) {
      s.resolved4h++;
      if (r.outcomes['4h']!.hit) s.hits4h++;
    }
    const o24 = r.outcomes['24h'];
    if (isRealOutcome(o24)) {
      s.resolved24h++;
      s.pnlSum += o24!.pnlPct;
      s.pnlCount++;
      if (o24!.hit) {
        s.hits24h++;
        s.streak = s.streak >= 0 ? s.streak + 1 : 1;
      } else {
        s.streak = s.streak <= 0 ? s.streak - 1 : -1;
      }
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.worstStreak = Math.min(s.worstStreak, s.streak);
    }
  }

  for (const r of [...filtered].sort((a, b) => b.timestamp - a.timestamp)) {
    const s = map.get(r.pair);
    if (!s || !isRealOutcome(r.outcomes['24h'])) continue;
    if (s.recentHits.length < 10) s.recentHits.push(r.outcomes['24h'].hit);
  }

  const assets: AssetStats[] = Array.from(map.entries()).map(([pair, s]) => ({
    pair,
    totalSignals: s.total,
    resolved4h: s.resolved4h,
    resolved24h: s.resolved24h,
    hits4h: s.hits4h,
    hits24h: s.hits24h,
    hitRate4h: s.resolved4h > 0 ? +((s.hits4h / s.resolved4h) * 100).toFixed(1) : 0,
    hitRate24h: s.resolved24h > 0 ? +((s.hits24h / s.resolved24h) * 100).toFixed(1) : 0,
    avgConfidence: s.total > 0 ? Math.round(s.confSum / s.total) : 0,
    avgPnl: s.pnlCount > 0 ? +(s.pnlSum / s.pnlCount).toFixed(2) : 0,
    totalPnl: +s.pnlSum.toFixed(2),
    bestStreak: s.bestStreak,
    worstStreak: s.worstStreak,
    recentHits: s.recentHits,
  }));

  assets.sort((a, b) => {
    if (sortBy === 'totalSignals') return b.totalSignals - a.totalSignals;
    if (sortBy === 'avgConfidence') return b.avgConfidence - a.avgConfidence;
    return b.hitRate24h - a.hitRate24h;
  });

  return {
    assets,
    overall: recomputeOverall(assets),
  };
}

export function computeStrategyBreakdown(
  records: SignalHistoryRecord[],
  period: LeaderboardPeriod,
): StrategyBreakdownRow[] {
  const periodMs: Record<string, number> = {
    '7d': 7, '30d': 30, '90d': 90, '180d': 180, '1y': 365, '5y': 1825,
  };
  const cutoff = period in periodMs ? Date.now() - periodMs[period] * 86400000 : 0;

  // Exclude gate-blocked rows so the strategy breakdown stays aligned with
  // the equity curve and leaderboard. A signal the gate refused to execute
  // shouldn't increment a strategy's `totalSignals`.
  const filtered = records.filter(r => r.timestamp >= cutoff && !r.isSimulated && !r.gateBlocked);
  const groups = new Map<string, {
    total: number;
    resolved4h: number; hits4h: number;
    resolved24h: number; hits24h: number;
    confSum: number;
    pnlSum: number; pnlCount: number;
  }>();

  for (const r of filtered) {
    const key = r.strategyId ?? 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        total: 0, resolved4h: 0, hits4h: 0, resolved24h: 0, hits24h: 0,
        confSum: 0, pnlSum: 0, pnlCount: 0,
      });
    }
    const g = groups.get(key)!;
    g.total++;
    g.confSum += r.confidence;
    if (isRealOutcome(r.outcomes['4h'])) {
      g.resolved4h++;
      if (r.outcomes['4h']!.hit) g.hits4h++;
    }
    if (isRealOutcome(r.outcomes['24h'])) {
      g.resolved24h++;
      if (r.outcomes['24h']!.hit) g.hits24h++;
      g.pnlSum += r.outcomes['24h']!.pnlPct;
      g.pnlCount++;
    }
  }

  return Array.from(groups.entries())
    .map(([strategyId, g]): StrategyBreakdownRow => ({
      strategyId,
      totalSignals: g.total,
      resolvedSignals: g.resolved24h,
      hitRate4h: g.resolved4h > 0 ? +((g.hits4h / g.resolved4h) * 100).toFixed(1) : 0,
      hitRate24h: g.resolved24h > 0 ? +((g.hits24h / g.resolved24h) * 100).toFixed(1) : 0,
      avgConfidence: g.total > 0 ? Math.round(g.confSum / g.total) : 0,
      avgPnl: g.pnlCount > 0 ? +(g.pnlSum / g.pnlCount).toFixed(2) : 0,
    }))
    .sort((a, b) => b.totalSignals - a.totalSignals);
}
