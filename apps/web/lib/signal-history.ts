import fs from 'fs';
import path from 'path';
import { getOHLCV, type OHLCV } from '../app/lib/ohlcv';

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
  lastVerified?: number; // ms epoch when outcomes were last resolved
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
  recentHits: boolean[]; // last 10 signals, true=hit
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

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'signal-history.json');
const MAX_RECORDS = 10000;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only fs (e.g. Vercel) — ignore
  }
}

export function readHistory(): SignalHistoryRecord[] {
  ensureDataDir();
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(raw) as SignalHistoryRecord[];
    } catch {
<<<<<<< HEAD
      // Corrupt file — fall through to seed
    }
  }
  const seed = generateSeedData();
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(seed));
  } catch {
    // ignore write failures
  }
  return seed;
=======
      // Corrupt file — return empty
    }
  }
  return [];
>>>>>>> origin/main
}

function writeHistory(records: SignalHistoryRecord[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(records));
  } catch {
    // ignore write failures on read-only fs
  }
}

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
  const records = readHistory();
  const sigId = id ?? `${pair}-${timeframe}-${direction}-${Date.now()}`;

  if (records.some(r => r.id === sigId)) return;

  const newRecord: SignalHistoryRecord = {
    id: sigId,
    pair,
    timeframe,
    direction,
    confidence,
    entryPrice,
    timestamp: timestamp ?? Date.now(),
    tp1,
    sl,
    isSimulated: false,
    outcomes: { '4h': null, '24h': null },
  };

  records.unshift(newRecord);
  if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);

<<<<<<< HEAD
  resolveOutcomesLazy(records);
=======
>>>>>>> origin/main
  writeHistory(records);
}

export function recordSignals(signals: TrackedSignalInput[]): number {
  if (signals.length === 0) return 0;

  const records = readHistory();
  const existingIds = new Set(records.map(r => r.id));
  let inserted = 0;

  for (const signal of signals) {
    if (!signal.id || existingIds.has(signal.id)) continue;

    const parsedTimestamp = Date.parse(signal.timestamp);
    const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

    records.unshift({
      id: signal.id,
      pair: signal.symbol,
      timeframe: signal.timeframe,
      direction: signal.direction,
      confidence: signal.confidence,
      entryPrice: signal.entry,
      timestamp,
      tp1: signal.takeProfit1,
      sl: signal.stopLoss,
      isSimulated: false,
      outcomes: { '4h': null, '24h': null },
    });
    existingIds.add(signal.id);
    inserted++;
  }

  if (inserted === 0) return 0;

  if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
<<<<<<< HEAD
  resolveOutcomesLazy(records);
=======
>>>>>>> origin/main
  writeHistory(records);
  return inserted;
}

<<<<<<< HEAD
function resolveOutcomesLazy(records: SignalHistoryRecord[]): void {
  const now = Date.now();
  for (const r of records) {
    if (!r.isSimulated) continue; // real records resolved via resolveRealOutcomes()
    if (r.outcomes['4h'] === null && now - r.timestamp >= 4 * 3600 * 1000) {
      r.outcomes['4h'] = simulateOutcome(r, '4h');
    }
    if (r.outcomes['24h'] === null && now - r.timestamp >= 24 * 3600 * 1000) {
      r.outcomes['24h'] = simulateOutcome(r, '24h');
    }
  }
}

=======
>>>>>>> origin/main
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

  return null; // still pending — neither TP1 nor SL hit yet
}

/**
 * Resolve outcomes for real (non-simulated) signals using actual OHLCV data.
 * Call this at the start of the history API route.
 */
export async function resolveRealOutcomes(): Promise<void> {
  const records = readHistory();
  let changed = false;
  const now = Date.now();

  for (const r of records) {
    if (r.isSimulated) continue;
    if (!r.tp1 || !r.sl) continue;

    const needs4h = r.outcomes['4h'] === null && now - r.timestamp >= 4 * 3600 * 1000;
    const needs24h = r.outcomes['24h'] === null && now - r.timestamp >= 24 * 3600 * 1000;
    if (!needs4h && !needs24h) continue;

    try {
      const { candles } = await getOHLCV(r.pair, 'H1');

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
    } catch {
      // Skip this record if OHLCV fetch fails
    }
  }

  if (changed) writeHistory(records);
}

<<<<<<< HEAD
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function simulateOutcome(r: SignalHistoryRecord, window: '4h' | '24h'): SignalOutcome {
  const seed = hashString(`${r.id}-${window}`);
  // Base hit rate 55%, scaled by confidence. Range ~55-75%
  const hitRate = 0.55 + (r.confidence - 50) * 0.004;
  const hit = seededRandom(seed) < Math.min(hitRate, 0.78);
  const maxMove = window === '4h' ? 1.5 : 2.5;
  const movePct = hit
    ? +(0.5 + seededRandom(seed + 1) * maxMove).toFixed(2)
    : -(0.2 + seededRandom(seed + 1) * 0.8).toFixed(2);
  const price =
    r.entryPrice > 0
      ? +(r.entryPrice * (1 + (r.direction === 'BUY' ? movePct : -movePct) / 100)).toFixed(
          r.entryPrice >= 100 ? 2 : 5,
        )
      : 0;
  return { price, pnlPct: movePct, hit };
=======
// ──────────────────────────────────────────────
// Query helpers for cron resolution pipeline
// ──────────────────────────────────────────────

/**
 * Return all records where both 4h and 24h outcomes are still null
 * (i.e. completely unresolved). Excludes simulated records.
 */
export function getPendingRecords(): SignalHistoryRecord[] {
  const records = readHistory();
  return records.filter(
    r => !r.isSimulated && (r.outcomes['4h'] === null || r.outcomes['24h'] === null),
  );
}

/**
 * Check whether a record already exists for the given symbol + direction
 * within the specified time window (milliseconds from now).
 */
export function getRecentRecordForSymbol(
  symbol: string,
  direction: 'BUY' | 'SELL',
  withinMs: number,
): SignalHistoryRecord | undefined {
  const cutoff = Date.now() - withinMs;
  const records = readHistory();
  return records.find(
    r => r.pair === symbol && r.direction === direction && r.timestamp >= cutoff,
  );
}

/**
 * Bulk-update records by id. Merges provided partial fields into each matching record.
 * Returns the number of records updated.
 */
export function updateRecords(
  updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }>,
): number {
  if (updates.length === 0) return 0;

  const records = readHistory();
  const patchMap = new Map(updates.map(u => [u.id, u.patch]));
  let changed = 0;

  for (const r of records) {
    const patch = patchMap.get(r.id);
    if (patch) {
      Object.assign(r, patch);
      changed++;
    }
  }

  if (changed > 0) writeHistory(records);
  return changed;
>>>>>>> origin/main
}

// ──────────────────────────────────────────────
// Leaderboard computation
// ──────────────────────────────────────────────

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
    total: number;
    hits4h: number;
    resolved4h: number;
    hits24h: number;
    resolved24h: number;
    confSum: number;
    pnlSum: number;
    pnlCount: number;
    streak: number;
    bestStreak: number;
    worstStreak: number;
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

  // Collect recent hits (last 10 resolved 24h signals per pair, newest first)
  for (const r of [...filtered].sort((a, b) => b.timestamp - a.timestamp)) {
    const s = map.get(r.pair);
    if (!s || r.outcomes['24h'] === null) continue;
    if (s.recentHits.length < 10) {
      s.recentHits.push(r.outcomes['24h'].hit);
    }
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

  // Sort
  assets.sort((a, b) => {
    if (sortBy === 'totalSignals') return b.totalSignals - a.totalSignals;
    if (sortBy === 'avgConfidence') return b.avgConfidence - a.avgConfidence;
    return b.hitRate24h - a.hitRate24h; // default: hitRate
  });

  const totalSignals = filtered.length;
  const resolved4hAll = filtered.filter(r => r.outcomes['4h'] !== null).length;
  const hits4hAll = filtered.filter(r => r.outcomes['4h']?.hit).length;
  const resolved24hAll = filtered.filter(r => r.outcomes['24h'] !== null).length;
  const hits24hAll = filtered.filter(r => r.outcomes['24h']?.hit).length;

  const topPerformer = assets.length > 0 ? assets[0].pair : '—';
  const worstPerformer = assets.length > 0 ? assets[assets.length - 1].pair : '—';

  return {
    assets,
    overall: {
      totalSignals,
      resolvedSignals: resolved24hAll,
      overallHitRate4h: resolved4hAll > 0 ? +((hits4hAll / resolved4hAll) * 100).toFixed(1) : 0,
      overallHitRate24h: resolved24hAll > 0 ? +((hits24hAll / resolved24hAll) * 100).toFixed(1) : 0,
      topPerformer,
      worstPerformer,
      lastUpdated: Date.now(),
    },
  };
}

<<<<<<< HEAD
// ──────────────────────────────────────────────
// Seed data
// ──────────────────────────────────────────────

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD', 'USDCAD'];
const TIMEFRAMES = ['H1', 'H4', 'D1', 'M15'];
const BASE_PRICES: Record<string, number> = {
  BTCUSD: 84000, ETHUSD: 3200, XAUUSD: 2340, EURUSD: 1.085,
  GBPUSD: 1.27, USDJPY: 149.5, XAGUSD: 27.5, AUDUSD: 0.645,
  XRPUSD: 0.615, USDCAD: 1.365,
};

function generateSeedData(): SignalHistoryRecord[] {
  const records: SignalHistoryRecord[] = [];
  const now = Date.now();

  for (let i = 0; i < 100; i++) {
    const r1 = seededRandom(i * 17);
    const r2 = seededRandom(i * 17 + 1);
    const r3 = seededRandom(i * 17 + 2);
    const r4 = seededRandom(i * 17 + 3);
    const r5 = seededRandom(i * 17 + 4);

    const pair = PAIRS[Math.floor(r1 * PAIRS.length)];
    const timeframe = TIMEFRAMES[Math.floor(r2 * TIMEFRAMES.length)];
    const direction: 'BUY' | 'SELL' = r3 > 0.5 ? 'BUY' : 'SELL';
    const daysAgo = 1 + Math.floor(r4 * 29);
    const timestamp = now - daysAgo * 86400000 - Math.floor(r5 * 86400000);
    const confidence = Math.round(55 + seededRandom(i * 17 + 5) * 35);
    const basePrice = BASE_PRICES[pair] ?? 100;
    const variance = (seededRandom(i * 17 + 6) - 0.5) * 0.02;
    const entryPrice = +(basePrice * (1 + variance)).toFixed(basePrice >= 100 ? 2 : 5);

    const rec: SignalHistoryRecord = {
      id: `seed-${i}`,
      pair,
      timeframe,
      direction,
      confidence,
      entryPrice,
      timestamp,
      isSimulated: true,
      outcomes: { '4h': null, '24h': null },
    };
    rec.outcomes['4h'] = simulateOutcome(rec, '4h');
    rec.outcomes['24h'] = simulateOutcome(rec, '24h');
    records.push(rec);
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}
=======
>>>>>>> origin/main
