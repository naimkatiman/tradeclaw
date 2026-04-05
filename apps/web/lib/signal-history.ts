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
  outcomes: {
    '4h': SignalOutcome | null;
    '24h': SignalOutcome | null;
  };
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
}

export interface AssetStats {
  pair: string;
  totalSignals: number;
  hitRate4h: number;
  hitRate24h: number;
  avgConfidence: number;
  avgPnl: number;
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
    topPerformer: string;
    worstPerformer: string;
    lastUpdated: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────

const useDb = () => !!process.env.DATABASE_URL;

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'signal-history.json');
const MAX_RECORDS = 10000;

export function getOutcomeResolutionTimeframe(timeframe: string): string {
  switch (timeframe.toUpperCase()) {
    case 'M15': return 'M15';
    case 'H1':  return 'H1';
    case 'H4':  return 'H1';
    case 'D1':  return 'H4';
    default:    return 'H1';
  }
}

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
  if (!useDb()) return readHistoryFile();

  const rows = await query<HistoryRow>(
    `SELECT * FROM signal_history
     WHERE is_simulated = FALSE
     ORDER BY created_at DESC
     LIMIT $1`,
    [MAX_RECORDS],
  );
  return rows.map(rowToRecord);
}

/** Sync read — file only. Used by leaderboard/history routes that need sync access. */
export function readHistory(): SignalHistoryRecord[] {
  // DB path: we cache in-memory after first async load
  return readHistoryFile();
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
): Promise<void> {
  const sigId = id ?? `${pair}-${timeframe}-${direction}-${Date.now()}`;
  const ts = timestamp ?? Date.now();

  if (useDb()) {
    await execute(
      `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [sigId, pair, timeframe, direction, confidence, entryPrice, tp1 ?? null, sl ?? null, new Date(ts).toISOString()],
    );
    return;
  }

  // File fallback
  recordSignal(pair, timeframe, direction, confidence, entryPrice, sigId, tp1, sl, ts);
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
): void {
  const records = readHistoryFile();
  const sigId = id ?? `${pair}-${timeframe}-${direction}-${Date.now()}`;
  if (records.some(r => r.id === sigId)) return;

  records.unshift({
    id: sigId, pair, timeframe, direction, confidence, entryPrice,
    timestamp: timestamp ?? Date.now(), tp1, sl, isSimulated: false,
    outcomes: { '4h': null, '24h': null },
  });
  if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
  writeHistoryFile(records);
}

// ── Bulk record ──────────────────────────────────────────────

export async function recordSignalsAsync(signals: TrackedSignalInput[]): Promise<number> {
  if (signals.length === 0) return 0;

  if (useDb()) {
    let inserted = 0;
    for (const s of signals) {
      if (!s.id) continue;
      const parsedTs = Date.parse(s.timestamp);
      const ts = Number.isFinite(parsedTs) ? new Date(parsedTs).toISOString() : new Date().toISOString();

      const result = await query<{ id: string }>(
        `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [s.id, s.symbol, s.timeframe, s.direction, s.confidence, s.entry, s.takeProfit1 ?? null, s.stopLoss ?? null, ts],
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
      isSimulated: false, outcomes: { '4h': null, '24h': null },
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

function resolveFromCandles(r: SignalHistoryRecord, candles: OHLCV[]): SignalOutcome | null {
  if (!r.tp1 || !r.sl || candles.length === 0) return null;

  for (const candle of candles) {
    if (r.direction === 'BUY') {
      if (candle.high >= r.tp1) {
        const pnlPct = +((r.tp1 - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { price: r.tp1, pnlPct, hit: true };
      }
      if (candle.low <= r.sl) {
        const pnlPct = +((r.sl - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { price: r.sl, pnlPct, hit: false };
      }
    } else {
      if (candle.low <= r.tp1) {
        const pnlPct = +((r.entryPrice - r.tp1) / r.entryPrice * 100).toFixed(2);
        return { price: r.tp1, pnlPct, hit: true };
      }
      if (candle.high >= r.sl) {
        const pnlPct = +((r.entryPrice - r.sl) / r.entryPrice * 100).toFixed(2);
        return { price: r.sl, pnlPct, hit: false };
      }
    }
  }
  return null;
}

export async function resolveRealOutcomes(): Promise<void> {
  const now = Date.now();

  if (useDb()) {
    // Fetch pending records from DB
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
      const needs4h = r.outcomes['4h'] === null && age >= 4 * 3600 * 1000;
      const needs24h = r.outcomes['24h'] === null && age >= 24 * 3600 * 1000;
      if (!needs4h && !needs24h) continue;

      try {
        const { candles } = await getOHLCV(r.pair, getOutcomeResolutionTimeframe(r.timeframe));
        let outcome4h = r.outcomes['4h'];
        let outcome24h = r.outcomes['24h'];

        if (needs4h) {
          const windowEnd = r.timestamp + 4 * 3600 * 1000;
          const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
          outcome4h = resolveFromCandles(r, window);
        }
        if (needs24h) {
          const windowEnd = r.timestamp + 24 * 3600 * 1000;
          const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
          outcome24h = resolveFromCandles(r, window);
        }

        if ((needs4h && outcome4h) || (needs24h && outcome24h)) {
          await execute(
            `UPDATE signal_history
             SET outcome_4h = COALESCE($2, outcome_4h),
                 outcome_24h = COALESCE($3, outcome_24h),
                 last_verified = $4
             WHERE id = $1`,
            [
              r.id,
              outcome4h ? JSON.stringify(outcome4h) : null,
              outcome24h ? JSON.stringify(outcome24h) : null,
              new Date(now).toISOString(),
            ],
          );
        }
      } catch { /* skip if OHLCV fails */ }
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
    const needs4h = r.outcomes['4h'] === null && age >= 4 * 3600 * 1000;
    const needs24h = r.outcomes['24h'] === null && age >= 24 * 3600 * 1000;
    if (!needs4h && !needs24h) continue;

    try {
      const { candles } = await getOHLCV(r.pair, getOutcomeResolutionTimeframe(r.timeframe));
      if (needs4h) {
        const windowEnd = r.timestamp + 4 * 3600 * 1000;
        const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
        r.outcomes['4h'] = resolveFromCandles(r, window);
        r.lastVerified = now;
        changed = true;
      }
      if (needs24h) {
        const windowEnd = r.timestamp + 24 * 3600 * 1000;
        const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
        r.outcomes['24h'] = resolveFromCandles(r, window);
        r.lastVerified = now;
        changed = true;
      }
    } catch { /* skip */ }
  }
  if (changed) writeHistoryFile(records);
}

// ── Query helpers for cron pipeline ──────────────────────────

export async function getPendingRecordsAsync(): Promise<SignalHistoryRecord[]> {
  if (useDb()) {
    const rows = await query<HistoryRow>(
      `SELECT * FROM signal_history
       WHERE is_simulated = FALSE
         AND (outcome_4h IS NULL OR outcome_24h IS NULL)
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
  if (useDb()) {
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

// ── Telegram sync ────────────────────────────────────────────

export async function markTelegramPosted(
  signalId: string,
  messageId: number,
): Promise<void> {
  if (!useDb()) return;
  await execute(
    `UPDATE signal_history
     SET telegram_posted_at = NOW(), telegram_message_id = $2
     WHERE id = $1`,
    [signalId, messageId],
  );
}

// ── Bulk update (cron resolution) ────────────────────────────

export async function updateRecordsAsync(
  updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }>,
): Promise<number> {
  if (updates.length === 0) return 0;

  if (useDb()) {
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
  period: '7d' | '30d' | 'all',
  sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence' = 'hitRate',
): LeaderboardData {
  const cutoff =
    period === '7d' ? Date.now() - 7 * 86400000
    : period === '30d' ? Date.now() - 30 * 86400000
    : 0;

  const filtered = records.filter(r => r.timestamp >= cutoff && !r.isSimulated);

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

    if (r.outcomes['4h'] !== null) {
      s.resolved4h++;
      if (r.outcomes['4h'].hit) s.hits4h++;
    }
    if (r.outcomes['24h'] !== null) {
      s.resolved24h++;
      if (r.outcomes['24h'].hit) {
        s.hits24h++;
        s.pnlSum += r.outcomes['24h'].pnlPct;
        s.pnlCount++;
        s.streak = s.streak >= 0 ? s.streak + 1 : 1;
      } else {
        s.pnlSum += r.outcomes['24h'].pnlPct;
        s.pnlCount++;
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

  return {
    assets,
    overall: {
      totalSignals,
      resolvedSignals: resolved24hAll,
      overallHitRate4h: resolved4hAll > 0 ? +((hits4hAll / resolved4hAll) * 100).toFixed(1) : 0,
      overallHitRate24h: resolved24hAll > 0 ? +((hits24hAll / resolved24hAll) * 100).toFixed(1) : 0,
      topPerformer: assets.length > 0 ? assets[0].pair : '—',
      worstPerformer: assets.length > 0 ? assets[assets.length - 1].pair : '—',
      lastUpdated: Date.now(),
    },
  };
}
