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
function isRealOutcome(o: SignalOutcome | null | undefined): o is SignalOutcome {
  if (!o) return false;
  if (o.pnlPct === 0 && !o.hit) return false;
  return true;
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
}

export type LeaderboardPeriod = '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all';

export interface AssetStats {
  pair: string;
  totalSignals: number;
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

export async function readHistoryAsync(): Promise<SignalHistoryRecord[]> {
  if (!isDbEnabled()) return readHistoryFile();

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
): Promise<void> {
  const sigId = id ?? `${pair}-${timeframe}-${direction}-${Date.now()}`;
  const ts = timestamp ?? Date.now();
  const resolvedMode = mode ?? modeFromTimeframe(timeframe);

  if (isDbEnabled()) {
    await execute(
      `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode, entry_atr, atr_multiplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
         WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL`,
      [sigId, pair, timeframe, direction, confidence, entryPrice, tp1 ?? null, sl ?? null, new Date(ts).toISOString(), strategyId ?? null, resolvedMode, entryAtr ?? null, atrMultiplier ?? null],
    );
    return;
  }

  // File fallback
  recordSignal(pair, timeframe, direction, confidence, entryPrice, sigId, tp1, sl, ts, strategyId, resolvedMode, entryAtr, atrMultiplier);
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
      const result = await query<{ id: string }>(
        `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode, entry_atr, atr_multiplier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
           WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL
         RETURNING id`,
        [s.id, s.symbol, s.timeframe, s.direction, s.confidence, s.entry, s.takeProfit1 ?? null, s.stopLoss ?? null, ts, s.strategyId ?? null, resolvedMode, s.entryAtr ?? null, s.atrMultiplier ?? null],
      );
      if (result.length > 0) inserted++;
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

      if (candle.high >= r.tp1) {
        const pnlPct = +((r.tp1 - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.tp1, pnlPct, hit: true }, maxAdverseExcursion: mae };
      }
      if (candle.low <= r.sl) {
        const pnlPct = +((r.sl - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.sl, pnlPct, hit: false }, maxAdverseExcursion: mae };
      }
    } else {
      const adverse = candle.high - r.entryPrice;
      if (adverse > mae) mae = adverse;

      if (candle.low <= r.tp1) {
        const pnlPct = +((r.entryPrice - r.tp1) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.tp1, pnlPct, hit: true }, maxAdverseExcursion: mae };
      }
      if (candle.high >= r.sl) {
        const pnlPct = +((r.entryPrice - r.sl) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.sl, pnlPct, hit: false }, maxAdverseExcursion: mae };
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
        await execute(
          `UPDATE signal_history
           SET outcome_4h = COALESCE($2, outcome_4h),
               outcome_24h = COALESCE($3, outcome_24h),
               max_adverse_excursion = COALESCE($5, max_adverse_excursion),
               last_verified = $4
           WHERE id = $1`,
          [
            r.id,
            outcome4h ? JSON.stringify(outcome4h) : null,
            outcome24h ? JSON.stringify(outcome24h) : null,
            new Date(now).toISOString(),
            mae24h,
          ],
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

/**
 * Look up the most recent direction emitted for (symbol, timeframe) strictly
 * before `beforeMs`. Used by the explainer to flag direction flips so the
 * UI can surface "why the signal changed" — a common trader concern when a
 * system quietly inverts its stance.
 *
 * Returns undefined when no prior record exists (e.g. first signal ever).
 */
export async function getPreviousDirectionAsync(
  symbol: string,
  timeframe: string,
  beforeMs: number,
): Promise<'BUY' | 'SELL' | undefined> {
  if (isDbEnabled()) {
    const row = await queryOne<{ direction: string }>(
      `SELECT direction FROM signal_history
       WHERE pair = $1 AND timeframe = $2 AND created_at < $3
       ORDER BY created_at DESC LIMIT 1`,
      [symbol, timeframe, new Date(beforeMs).toISOString()],
    );
    return (row?.direction as 'BUY' | 'SELL' | undefined) ?? undefined;
  }
  const prior = readHistoryFile().find(
    r => r.pair === symbol && r.timeframe === timeframe && r.timestamp < beforeMs,
  );
  return prior?.direction;
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

  const filtered = records.filter(
    r => r.timestamp >= cutoff
      && !r.isSimulated
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
    if (!s || r.outcomes['24h'] === null) continue;
    if (s.recentHits.length < 10) s.recentHits.push(r.outcomes['24h'].hit);
  }

  const assets: AssetStats[] = Array.from(map.entries()).map(([pair, s]) => ({
    pair,
    totalSignals: s.total,
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

  const totalSignals = filtered.length;
  const resolved4hAll = filtered.filter(r => r.outcomes['4h'] !== null).length;
  const hits4hAll = filtered.filter(r => r.outcomes['4h']?.hit).length;
  const resolved24hAll = filtered.filter(r => r.outcomes['24h'] !== null).length;
  const hits24hAll = filtered.filter(r => r.outcomes['24h']?.hit).length;

  const totalPnlAll = +assets.reduce((sum, a) => sum + a.totalPnl, 0).toFixed(2);

  return {
    assets,
    overall: {
      totalSignals,
      resolvedSignals: resolved24hAll,
      overallHitRate4h: resolved4hAll > 0 ? +((hits4hAll / resolved4hAll) * 100).toFixed(1) : 0,
      overallHitRate24h: resolved24hAll > 0 ? +((hits24hAll / resolved24hAll) * 100).toFixed(1) : 0,
      totalPnl: totalPnlAll,
      topPerformer: assets.length > 0 ? assets[0].pair : '—',
      worstPerformer: assets.length > 0 ? assets[assets.length - 1].pair : '—',
      lastUpdated: Date.now(),
    },
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

  const filtered = records.filter(r => r.timestamp >= cutoff && !r.isSimulated);
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

