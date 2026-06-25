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
  target?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired';
  /** Resolution provenance: wall-clock ISO timestamp when this outcome was written. Absent on legacy rows. */
  resolvedAt?: string;
  /** Resolution provenance: OHLCV provider that supplied the resolving candles (e.g. 'binance', 'stooq'), or 'force-expired'. Absent on legacy rows. */
  source?: string;
}

// Auto-expire writes `{ pnlPct: 0, hit: false, target: 'expired' }` when a signal window elapses
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
  const o = r.outcomes['24h'];
  if (!isRealOutcome(o)) return false;
  // Auto-expired closes (window elapsed with neither TP nor SL hit) are
  // recorded for transparency only. The UI captions promise it: stat-hints
  // `resolved` = "TP or SL hit … Excludes … auto-expired rows" and `winRate24h`
  // = "Excludes auto-expired and gate-blocked rows". Honor that contract in the
  // one canonical predicate so equity, win-rate, and resolved counts match the
  // stated methodology instead of folding drift-expired rows in as wins/losses.
  if (o.target === 'expired') return false;
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
  /** TRUE when the full-risk gate blocked this signal at emission. Blocked rows are recorded for engine accuracy but excluded from paper-trade equity + gate lookback. */
  gateBlocked?: boolean;
  /** Human-readable gate.reason at the moment of blocking. NULL unless gateBlocked is TRUE. */
  gateReason?: string;
  /** Market regime resolved for this symbol at emission (migration 048). Undefined on pre-048 rows. */
  regime?: string;
  /** Pro-broadcast gate decision at emission: false = approved for broadcast, true = blocked. Undefined = decision not recorded (pre-048 rows). Tri-state is load-bearing — do NOT default to false. */
  broadcastBlocked?: boolean;
  /** Why the broadcast gate blocked this row (winning-cells / risk veto). Undefined unless broadcastBlocked is true. */
  broadcastBlockReason?: string;
  /** Allocator position size (% of equity) computed at emission. Undefined on pre-048 rows or when the pipeline did not run. */
  allocationPct?: number;
  /** Wall-clock publish stamp (DB-defaulted NOW() on insert), distinct from bar-time `timestamp`. Undefined on pre-048 rows. */
  publishedAt?: number;
  // Calibration features (migration 051, Phase 4 D4). The MTF triple is only
  // populated on the TA-fallback path; scanner rows leave it undefined (NULL),
  // which is honest and expected. costEstimatePct is populated for every cron row.
  /** TA-engine confidence BEFORE the MTF confluence bonus (0-100). Undefined on pre-051 rows / scanner rows. */
  preBoostConfidence?: number;
  /**
   * Agreement count from signal-generator.ts's 4-timeframe generateMultiTFSignal
   * survey (range 0-4). Undefined on pre-051 rows / scanner rows. NOT current.ts's
   * separate 3-TF agreementCount (range 0-3) — only the 4-TF survey is persisted.
   */
  mtfAgreement?: number;
  /** Confluence bonus actually added to preBoostConfidence at emission. Undefined on pre-051 rows / scanner rows. */
  confluenceBonus?: number;
  /** Modeled round-trip cost as a PERCENT of notional: 2×(fee+slippage) per @tradeclaw/strategies costModelFor. Funding excluded. Undefined on pre-051 rows. */
  costEstimatePct?: number;
  outcomes: {
    '4h': SignalOutcome | null;
    '24h': SignalOutcome | null;
  };
}

const SUPPORTED_OHLCV_TIMEFRAMES = new Set(['M5', 'M15', 'H1', 'H4', 'D1']);

/**
 * Pick the candle timeframe to use when resolving a signal outcome.
 *
 * Prefer the signal's own timeframe when the feed supports it; fall back to
 * H1 for legacy or malformed rows so we still resolve rather than stalling.
 */
export function getOutcomeResolutionTimeframe(record: Pick<SignalHistoryRecord, 'timeframe' | 'mode'>): string {
  if (SUPPORTED_OHLCV_TIMEFRAMES.has(record.timeframe)) {
    return record.timeframe;
  }

  // Legacy rows occasionally have empty/unknown timeframes. H1 is the safest
  // general-purpose fallback because all of our historical providers can serve it.
  return 'H1';
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
  avgRiskReward: number;
  sharpeRatio: number;
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
  regime?: string | null;
  broadcast_blocked?: boolean | null;
  broadcast_block_reason?: string | null;
  allocation_pct?: string | number | null;
  published_at?: string | null;
  pre_boost_confidence?: string | number | null;
  mtf_agreement?: string | number | null;
  confluence_bonus?: string | number | null;
  cost_estimate_pct?: string | number | null;
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
    regime: row.regime ?? undefined,
    // Tri-state: NULL (pre-048 / decision not recorded) maps to undefined,
    // NOT false — the broadcast scope must only include rows whose decision
    // actually ran and approved.
    broadcastBlocked: row.broadcast_blocked ?? undefined,
    broadcastBlockReason: row.broadcast_block_reason ?? undefined,
    allocationPct: row.allocation_pct != null ? Number(row.allocation_pct) : undefined,
    publishedAt: row.published_at ? new Date(row.published_at).getTime() : undefined,
    // Calibration features (051). NULL → undefined, same as the 048 fields.
    preBoostConfidence: row.pre_boost_confidence != null ? Number(row.pre_boost_confidence) : undefined,
    mtfAgreement: row.mtf_agreement != null ? Number(row.mtf_agreement) : undefined,
    confluenceBonus: row.confluence_bonus != null ? Number(row.confluence_bonus) : undefined,
    costEstimatePct: row.cost_estimate_pct != null ? Number(row.cost_estimate_pct) : undefined,
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

/**
 * Pro-broadcast gate decision computed at emission (migration 048). Recorded
 * alongside the row so the broadcast-filtered subset is measurable.
 */
export interface BroadcastDecisionFields {
  regime?: string;
  blocked: boolean;
  blockReason?: string;
  allocationPct?: number;
}

/**
 * Calibration features captured at emission (migration 051, Phase 4 D4). The
 * MTF triple (preBoostConfidence / mtfAgreement / confluenceBonus) is only
 * available on the TA-fallback path — scanner rows leave it undefined, which
 * is recorded as NULL (honest: the scanner does not run the MTF survey).
 * costEstimatePct is the modeled round-trip cost as a PERCENT of notional —
 * 2×(feePctPerSide + slippagePctPerSide) from @tradeclaw/strategies
 * costModelFor(symbol); funding excluded (hold duration unknown at emission).
 * The cron populates it for every recorded row.
 *
 * Persisted via the Tier-0 INSERT only. Lower insert tiers (older schemas)
 * predate the 051 columns and silently ignore these fields.
 */
export interface CalibrationFeatures {
  preBoostConfidence?: number;
  /**
   * 4-timeframe agreement count (range 0-4) from signal-generator.ts's
   * generateMultiTFSignal survey. NOT current.ts's separate 3-TF count.
   */
  mtfAgreement?: number;
  confluenceBonus?: number;
  costEstimatePct?: number;
}

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
  broadcast?: BroadcastDecisionFields,
  calibration?: CalibrationFeatures,
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
      regime: broadcast?.regime,
      broadcastBlocked: broadcast?.blocked,
      broadcastBlockReason: broadcast?.blockReason,
      allocationPct: broadcast?.allocationPct,
      preBoostConfidence: calibration?.preBoostConfidence,
      mtfAgreement: calibration?.mtfAgreement,
      confluenceBonus: calibration?.confluenceBonus,
      costEstimatePct: calibration?.costEstimatePct,
    });
    return;
  }

  // File fallback
  recordSignal(pair, timeframe, direction, confidence, entryPrice, sigId, tp1, sl, ts, strategyId, resolvedMode, entryAtr, atrMultiplier, gateBlocked, gateReason, broadcast, calibration);
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
  regime?: string;
  broadcastBlocked?: boolean;
  broadcastBlockReason?: string;
  allocationPct?: number;
  preBoostConfidence?: number;
  mtfAgreement?: number;
  confluenceBonus?: number;
  costEstimatePct?: number;
}

let atrColumnsKnownMissing = false;
let gateColumnsKnownMissing = false;
let broadcastColumnsKnownMissing = false;
// Tracked SEPARATELY from broadcastColumnsKnownMissing: a DB can have migration
// 048 applied but 051 not yet (the tiered-insert fallback exists for exactly
// this ordering gap). A missing-051 error must downgrade ONLY the calibration
// columns — never the 048 broadcast columns — so broadcast decisions keep
// persisting while the 051 deploy catches up.
let calibrationColumnsKnownMissing = false;

/** Column-name fragments that identify each tier's optional column set in a 42703 message. */
const CALIBRATION_COLUMN_RE = /pre_boost_confidence|mtf_agreement|confluence_bonus|cost_estimate_pct/;
const BROADCAST_COLUMN_RE = /regime|broadcast_blocked|broadcast_block_reason|allocation_pct/;

async function insertSignalHistoryRow(args: InsertRowArgs): Promise<boolean> {
  // Whether this row carries anything beyond the Tier-1 schema. Tier 0/0b are
  // only attempted when there's a broadcast decision OR calibration features to
  // persist — otherwise the Tier 1 INSERT is identical in effect and skips a
  // failure probe. costEstimatePct is universal on the cron path, so it keeps
  // the Tier-0 family firing even on the rare broadcast-outage fallback.
  const hasTier0Payload =
    args.broadcastBlocked !== undefined ||
    args.preBoostConfidence !== undefined ||
    args.mtfAgreement !== undefined ||
    args.confluenceBonus !== undefined ||
    args.costEstimatePct !== undefined;

  // Tier 0: full schema incl. 048 broadcast-scope + 051 calibration cols.
  // A 42703 on a 051 column downgrades ONLY calibration (sets
  // calibrationColumnsKnownMissing) and falls through to Tier 0b, which still
  // persists the 048 broadcast decision. A 42703 on a 048 column downgrades
  // broadcast and falls through to Tier 1. The two flags are independent so a
  // 051-only deploy gap never disables 048 persistence.
  if (
    !broadcastColumnsKnownMissing && !calibrationColumnsKnownMissing &&
    !atrColumnsKnownMissing && !gateColumnsKnownMissing &&
    hasTier0Payload
  ) {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode, entry_atr, atr_multiplier, gate_blocked, gate_reason, regime, broadcast_blocked, broadcast_block_reason, allocation_pct, pre_boost_confidence, mtf_agreement, confluence_bonus, cost_estimate_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
           WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL
         RETURNING id`,
        [args.id, args.pair, args.timeframe, args.direction, args.confidence, args.entryPrice, args.tp1 ?? null, args.sl ?? null, args.createdAt, args.strategyId ?? null, args.mode, args.entryAtr ?? null, args.atrMultiplier ?? null, args.gateBlocked ?? false, args.gateReason ?? null, args.regime ?? null, args.broadcastBlocked ?? null, args.broadcastBlockReason ?? null, args.allocationPct ?? null, args.preBoostConfidence ?? null, args.mtfAgreement ?? null, args.confluenceBonus ?? null, args.costEstimatePct ?? null],
      );
      return result.length > 0;
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      const msg = err instanceof Error ? err.message : String(err);
      // Order matters: a 051-only gap (048 present) must set ONLY the
      // calibration flag and retry via Tier 0b. Only treat it as a broadcast
      // gap when a 048 column is the one missing.
      if (code === '42703' && BROADCAST_COLUMN_RE.test(msg)) {
        console.warn('[signal-history] migration 048 not applied — falling back to pre-048 INSERT (broadcast decision dropped). Run psql "$DATABASE_URL" -f apps/web/migrations/048_broadcast_scope.sql THEN RESTART the service — this flag sticks for the process lifetime.');
        broadcastColumnsKnownMissing = true;
      } else if (code === '42703' && CALIBRATION_COLUMN_RE.test(msg)) {
        console.warn('[signal-history] migration 051 not applied — falling back to the 048-only INSERT (calibration features dropped, broadcast decision still persisted). Run psql "$DATABASE_URL" -f apps/web/migrations/051_calibration_features.sql THEN RESTART the service — this flag sticks for the process lifetime.');
        calibrationColumnsKnownMissing = true;
      } else if (code === '42703') {
        // Older migration missing too — let the existing tiers diagnose.
        broadcastColumnsKnownMissing = true;
      } else {
        throw err;
      }
    }
  }

  // Tier 0b: 048 broadcast-scope cols present, 051 calibration cols missing.
  // Persists the broadcast decision (the whole point of the split) and drops
  // only the calibration fields. Reached when Tier 0 hit a 051-column 42703.
  if (
    calibrationColumnsKnownMissing && !broadcastColumnsKnownMissing &&
    !atrColumnsKnownMissing && !gateColumnsKnownMissing &&
    args.broadcastBlocked !== undefined
  ) {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO signal_history (id, pair, timeframe, direction, confidence, entry_price, tp1, sl, created_at, strategy_id, mode, entry_atr, atr_multiplier, gate_blocked, gate_reason, regime, broadcast_blocked, broadcast_block_reason, allocation_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO UPDATE SET strategy_id = EXCLUDED.strategy_id
           WHERE signal_history.strategy_id IS NULL AND EXCLUDED.strategy_id IS NOT NULL
         RETURNING id`,
        [args.id, args.pair, args.timeframe, args.direction, args.confidence, args.entryPrice, args.tp1 ?? null, args.sl ?? null, args.createdAt, args.strategyId ?? null, args.mode, args.entryAtr ?? null, args.atrMultiplier ?? null, args.gateBlocked ?? false, args.gateReason ?? null, args.regime ?? null, args.broadcastBlocked, args.broadcastBlockReason ?? null, args.allocationPct ?? null],
      );
      return result.length > 0;
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      const msg = err instanceof Error ? err.message : String(err);
      if (code === '42703' && BROADCAST_COLUMN_RE.test(msg)) {
        console.warn('[signal-history] migration 048 not applied — falling back to pre-048 INSERT (broadcast decision dropped). Run psql "$DATABASE_URL" -f apps/web/migrations/048_broadcast_scope.sql THEN RESTART the service — this flag sticks for the process lifetime.');
        broadcastColumnsKnownMissing = true;
      } else if (code === '42703') {
        broadcastColumnsKnownMissing = true;
      } else {
        throw err;
      }
    }
  }

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
  broadcast?: BroadcastDecisionFields,
  calibration?: CalibrationFeatures,
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
    regime: broadcast?.regime,
    broadcastBlocked: broadcast?.blocked,
    broadcastBlockReason: broadcast?.blockReason,
    allocationPct: broadcast?.allocationPct,
    publishedAt: broadcast !== undefined ? Date.now() : undefined,
    preBoostConfidence: calibration?.preBoostConfidence,
    mtfAgreement: calibration?.mtfAgreement,
    confluenceBonus: calibration?.confluenceBonus,
    costEstimatePct: calibration?.costEstimatePct,
    outcomes: { '4h': null, '24h': null },
  });
  if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
  writeHistoryFile(records);
}

// ── Broadcast decision late-stamp (catch-up rows) ────────────

/**
 * Stamps the Pro-broadcast gate decision onto rows that were recorded by the
 * request-path writer BEFORE the cron's broadcast tick evaluated them (the
 * catch-up set). Only fills rows whose decision is still NULL — a decision
 * recorded at emission is never overwritten.
 *
 * Semantics: broadcast_blocked is the FIRST RECORDED gate decision, not the
 * delivery outcome. A row stamped blocked=TRUE can still be re-evaluated and
 * broadcast on a later tick while it remains in the catch-up window (the
 * stamp no-ops), and a row stamped FALSE can fail its fire-and-forget send.
 * Join against telegram_pro_message_id for actual-delivery analytics.
 */
export async function updateBroadcastDecisionAsync(
  decisions: Array<{ id: string } & BroadcastDecisionFields>,
): Promise<number> {
  if (decisions.length === 0) return 0;

  if (isDbEnabled()) {
    if (broadcastColumnsKnownMissing) return 0;
    let stamped = 0;
    for (const d of decisions) {
      try {
        const result = await query<{ id: string }>(
          `UPDATE signal_history
              SET regime = COALESCE($2, regime),
                  broadcast_blocked = $3,
                  broadcast_block_reason = $4,
                  allocation_pct = $5
            WHERE id = $1 AND broadcast_blocked IS NULL
            RETURNING id`,
          [d.id, d.regime ?? null, d.blocked, d.blockReason ?? null, d.allocationPct ?? null],
        );
        stamped += result.length;
      } catch (err: unknown) {
        const code = (err as { code?: string } | null)?.code;
        if (code === '42703') {
          console.warn('[signal-history] migration 048 not applied — broadcast decisions not stamped. Run psql "$DATABASE_URL" -f apps/web/migrations/048_broadcast_scope.sql THEN RESTART the service — this flag sticks for the process lifetime.');
          broadcastColumnsKnownMissing = true;
          return stamped;
        }
        throw err;
      }
    }
    return stamped;
  }

  // File fallback
  const records = readHistoryFile();
  const byId = new Map(decisions.map(d => [d.id, d]));
  let stamped = 0;
  for (const r of records) {
    const d = byId.get(r.id);
    if (!d || r.broadcastBlocked !== undefined) continue;
    r.regime = d.regime ?? r.regime;
    r.broadcastBlocked = d.blocked;
    r.broadcastBlockReason = d.blockReason;
    r.allocationPct = d.allocationPct;
    stamped++;
  }
  if (stamped > 0) writeHistoryFile(records);
  return stamped;
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

export interface ResolvedWithMae {
  outcome: SignalOutcome;
  /** Max adverse excursion from entry up to AND including the resolution candle (price units, >= 0). */
  maxAdverseExcursion: number;
}

/**
 * Single source of truth for outcome resolution. Both the request side-effect
 * writer (this file's resolveRealOutcomes) and the cron writer (api/cron/signals)
 * delegate here so the math stays in lockstep — they write to the same
 * signal_history table, and divergence between them produced the wick-priority
 * bug fixed in commit d0bb6845.
 */
export function resolveFromCandles(
  r: { direction: 'BUY' | 'SELL'; entryPrice: number; tp1?: number | null; sl?: number | null },
  candles: OHLCV[],
  windowComplete = false,
): ResolvedWithMae | null {
  if (r.tp1 == null || r.sl == null || candles.length === 0) return null;

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
        // Gap-through fill, bounded at -1.5R worst case. If the bar opens
        // past SL, real fills slip to candle.open. But signals are emitted
        // mid-H1-bar, so the "first candle's open" is already up to ~60min
        // of post-entry drift — without a slippage cap, that drift produces
        // -3R to -8R artifacts on what are otherwise normal stops. Audit's
        // expected average loss was -1.0 to -1.3R; the -1.5R floor gives
        // headroom for genuine gap events without runaway drift artifacts.
        const riskDistance = r.entryPrice - r.sl;
        const minFillPrice = r.entryPrice - 1.5 * riskDistance;
        const rawFill = candle.open <= r.sl ? candle.open : r.sl;
        const fillPrice = Math.max(rawFill, minFillPrice);
        const pnlPct = +((fillPrice - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: fillPrice, pnlPct, hit: false, target: 'SL' }, maxAdverseExcursion: mae };
      }
      if (tpHit) {
        const pnlPct = +((r.tp1 - r.entryPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.tp1, pnlPct, hit: true, target: 'TP1' }, maxAdverseExcursion: mae };
      }
    } else {
      const adverse = candle.high - r.entryPrice;
      if (adverse > mae) mae = adverse;

      const slHit = candle.high >= r.sl;
      const tpHit = candle.low <= r.tp1;
      if (slHit) {
        // Gap-through fill bounded at -1.5R — see BUY branch comment above.
        const riskDistance = r.sl - r.entryPrice;
        const maxFillPrice = r.entryPrice + 1.5 * riskDistance;
        const rawFill = candle.open >= r.sl ? candle.open : r.sl;
        const fillPrice = Math.min(rawFill, maxFillPrice);
        const pnlPct = +((r.entryPrice - fillPrice) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: fillPrice, pnlPct, hit: false, target: 'SL' }, maxAdverseExcursion: mae };
      }
      if (tpHit) {
        const pnlPct = +((r.entryPrice - r.tp1) / r.entryPrice * 100).toFixed(2);
        return { outcome: { price: r.tp1, pnlPct, hit: true, target: 'TP1' }, maxAdverseExcursion: mae };
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
      outcome: { price: lastClose, pnlPct, hit: pnlPct > 0, target: 'expired' },
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
      let candleSource = 'unknown';

      try {
        const result = await getOHLCV(r.pair, getOutcomeResolutionTimeframe(r));
        candles = result.candles;
        candleSource = result.source;
      } catch (err) {
        console.error(`[signal-history] OHLCV fetch failed for ${r.pair}: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Resolution provenance — both writers (this request-path resolver and
      // the cron) must stamp it or the detection property doesn't hold:
      // whichever writer wins the race owns the row.
      const resolvedAt = new Date(now).toISOString();
      let outcome4h = r.outcomes['4h'];
      let outcome24h = r.outcomes['24h'];
      let mae24h: number | null = null;

      if (needs4h) {
        const windowEnd = r.timestamp + FOUR_H;
        const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
        const resolved = resolveFromCandles(r, window, age >= FOUR_H);
        outcome4h = resolved ? { ...resolved.outcome, resolvedAt, source: candleSource } : outcome4h;
        if (!outcome4h && age >= FOUR_H * 2) {
          outcome4h = { price: r.entryPrice, pnlPct: 0, hit: false, target: 'expired', resolvedAt, source: 'force-expired' };
        }
      }
      if (needs24h) {
        const windowEnd = r.timestamp + TWENTY_FOUR_H;
        const window = candles.filter(c => c.timestamp > r.timestamp && c.timestamp <= windowEnd);
        const resolved = resolveFromCandles(r, window, age >= TWENTY_FOUR_H);
        outcome24h = resolved ? { ...resolved.outcome, resolvedAt, source: candleSource } : outcome24h;
        mae24h = resolved?.maxAdverseExcursion ?? null;
        if (!outcome24h && age >= TWENTY_FOUR_H * 2) {
          outcome24h = { price: r.entryPrice, pnlPct: 0, hit: false, target: 'expired', resolvedAt, source: 'force-expired' };
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
      const result = await getOHLCV(r.pair, getOutcomeResolutionTimeframe(r));
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
        r.outcomes['4h'] = { price: r.entryPrice, pnlPct: 0, hit: false, target: 'expired' };
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
        r.outcomes['24h'] = { price: r.entryPrice, pnlPct: 0, hit: false, target: 'expired' };
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
    // Look back 30 days — matches the public /track-record window. The
    // previous 14-day cap stranded 1,000+ rows after methodology backfills
    // because cron and POST /api/signals/resolve both filter through here.
    // OHLCV providers (TwelveData via market-data-hub) typically have ≥200
    // days of H1 history, so 30-day re-resolution is safe; rows that fail
    // OHLCV lookup gracefully force-expire after 2× window.
    const rows = await query<HistoryRow>(
      `SELECT * FROM signal_history
       WHERE is_simulated = FALSE
         AND (outcome_4h IS NULL OR outcome_24h IS NULL)
         AND tp1 IS NOT NULL
         AND sl IS NOT NULL
         AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC
       LIMIT 500`,
    );
    return rows.map(rowToRecord);
  }
  return getPendingRecords();
}

export function getPendingRecords(): SignalHistoryRecord[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return readHistoryFile()
    .filter(
      r =>
        !r.isSimulated &&
        (r.outcomes['4h'] === null || r.outcomes['24h'] === null) &&
        r.tp1 != null &&
        r.sl != null &&
        r.timestamp > cutoff,
    )
    .sort((a, b) => b.timestamp - a.timestamp);
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

  const outcome: SignalOutcome = {
    price: exitPrice,
    pnlPct,
    hit: isHit,
    resolvedAt: new Date().toISOString(),
    source: 'trade-close',
  };

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

/**
 * Tradable signals from the last `withinMs` window that have not yet been
 * posted to the Pro Telegram group. Powers the cron's catch-up broadcast
 * for rows the request-side writer recorded but never broadcast (because
 * `callerIsPaid` was false on a free-tier hit to /api/signals).
 *
 * The broadcaster has its own dedup gate keyed on `telegram_pro_message_id`,
 * so re-passing rows here is idempotent — at most one Telegram round-trip
 * per signal id over the lifetime of the row.
 *
 * Returns ascending by `created_at` so older catch-up rows broadcast first.
 */
export async function getUnpostedProSignalsAsync(
  withinMs: number,
): Promise<SignalHistoryRecord[]> {
  if (!isDbEnabled()) return [];
  const cutoff = new Date(Date.now() - withinMs).toISOString();
  const rows = await query<HistoryRow>(
    `SELECT * FROM signal_history
     WHERE telegram_pro_message_id IS NULL
       AND COALESCE(gate_blocked, false) = false
       AND tp1 IS NOT NULL
       AND sl IS NOT NULL
       AND created_at >= $1
     ORDER BY created_at ASC`,
    [cutoff],
  );
  return rows.map(rowToRecord);
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
      // MAE rides along with outcome resolution (cron path). COALESCE keeps
      // the first-written value; skip entirely when migration 012 is absent.
      // INVARIANT: this MUST stay the LAST pushed SET — the 42703 retry below
      // splices it off the end, which only preserves $-placeholder numbering
      // for a trailing element.
      if (patch.maxAdverseExcursion !== undefined && !atrColumnsKnownMissing) {
        sets.push(`max_adverse_excursion = COALESCE(max_adverse_excursion, $${idx++})`);
        params.push(patch.maxAdverseExcursion);
      }

      if (sets.length === 0) continue;
      try {
        await execute(`UPDATE signal_history SET ${sets.join(', ')} WHERE id = $1`, params);
      } catch (err: unknown) {
        const code = (err as { code?: string } | null)?.code;
        const msg = err instanceof Error ? err.message : String(err);
        if (code === '42703' && /max_adverse_excursion/.test(msg)) {
          atrColumnsKnownMissing = true;
          const maeIdx = sets.findIndex(s => s.includes('max_adverse_excursion'));
          if (maeIdx >= 0) {
            sets.splice(maeIdx, 1);
            params.splice(maeIdx + 1, 1);
          }
          if (sets.length === 0) continue;
          await execute(`UPDATE signal_history SET ${sets.join(', ')} WHERE id = $1`, params);
        } else {
          throw err;
        }
      }
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
    rrValues: number[];
    pnlValues: number[];
  }>();

  for (const r of filtered) {
    const key = r.strategyId ?? 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        total: 0, resolved4h: 0, hits4h: 0, resolved24h: 0, hits24h: 0,
        confSum: 0, pnlSum: 0, pnlCount: 0, rrValues: [], pnlValues: [],
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
      g.pnlValues.push(r.outcomes['24h']!.pnlPct);
    }
    // Risk:Reward — requires valid entry, TP1, and SL
    if (r.entryPrice > 0 && r.tp1 && r.tp1 > 0 && r.sl && r.sl > 0) {
      const risk = r.direction === 'BUY'
        ? r.entryPrice - r.sl
        : r.sl - r.entryPrice;
      const reward = r.direction === 'BUY'
        ? r.tp1 - r.entryPrice
        : r.entryPrice - r.tp1;
      if (risk > 0) {
        g.rrValues.push(reward / risk);
      }
    }
  }

  function sharpe(pnls: number[]): number {
    if (pnls.length < 2) return 0;
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((sum, x) => sum + (x - mean) ** 2, 0) / pnls.length;
    const std = Math.sqrt(variance);
    return std > 0 ? +(mean / std).toFixed(2) : 0;
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
      avgRiskReward: g.rrValues.length > 0
        ? +(g.rrValues.reduce((a, b) => a + b, 0) / g.rrValues.length).toFixed(2)
        : 0,
      sharpeRatio: sharpe(g.pnlValues),
    }))
    .sort((a, b) => b.totalSignals - a.totalSignals);
}
