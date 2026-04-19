import { query, queryOne } from './db-pool';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  direction: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  percentMove?: number;
  timeWindow?: string;
  status: 'active' | 'triggered' | 'expired';
  triggeredAt?: string;
  createdAt: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Constants (kept so callers that import them don't need to change)
// ---------------------------------------------------------------------------

export const SUPPORTED_SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD',
  'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD', 'USDCAD',
];

export const BASE_PRICES: Record<string, number> = {
  BTCUSD: 87500,
  ETHUSD: 3400,
  XAUUSD: 2180,
  EURUSD: 1.083,
  GBPUSD: 1.264,
  USDJPY: 151.2,
  XAGUSD: 24.8,
  AUDUSD: 0.654,
  XRPUSD: 0.615,
  USDCAD: 1.365,
};

// ---------------------------------------------------------------------------
// Row ↔ Record
// ---------------------------------------------------------------------------

interface PriceAlertRow {
  id: string;
  user_id: string;
  symbol: string;
  direction: string;
  target_price: string;
  current_price: string;
  percent_move: string | null;
  time_window: string | null;
  status: string;
  triggered_at: string | null;
  note: string | null;
  created_at: string;
}

function toAlert(row: PriceAlertRow): PriceAlert {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction as 'above' | 'below',
    targetPrice: Number(row.target_price),
    currentPrice: Number(row.current_price),
    percentMove: row.percent_move !== null ? Number(row.percent_move) : undefined,
    timeWindow: row.time_window ?? undefined,
    status: row.status as PriceAlert['status'],
    triggeredAt: row.triggered_at ? new Date(row.triggered_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    note: row.note ?? undefined,
  };
}

const SELECT_COLS = `id, user_id, symbol, direction, target_price, current_price,
                     percent_move, time_window, status, triggered_at, note, created_at`;

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Read (scoped to user)
// ---------------------------------------------------------------------------

/**
 * Read all price alerts for a user. Ordered most-recent first.
 * `filters.status`/`filters.symbol` are optional refinements.
 */
export async function readAlerts(
  userId: string,
  filters?: { status?: PriceAlert['status']; symbol?: string },
): Promise<PriceAlert[]> {
  const where: string[] = [`user_id = $1`];
  const params: unknown[] = [userId];
  let i = 2;
  if (filters?.status) {
    where.push(`status = $${i++}`);
    params.push(filters.status);
  }
  if (filters?.symbol) {
    where.push(`symbol = $${i++}`);
    params.push(filters.symbol.toUpperCase());
  }
  const rows = await query<PriceAlertRow>(
    `SELECT ${SELECT_COLS} FROM price_alerts
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC`,
    params,
  );
  return rows.map(toAlert);
}

/** Alias preserved for data-export.ts compatibility. */
export const getAlerts = readAlerts;

export async function getAlert(opts: { userId: string; id: string }): Promise<PriceAlert | null> {
  const row = await queryOne<PriceAlertRow>(
    `SELECT ${SELECT_COLS} FROM price_alerts WHERE id = $1 AND user_id = $2`,
    [opts.id, opts.userId],
  );
  return row ? toAlert(row) : null;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface CreateAlertInput {
  userId: string;
  symbol: string;
  direction: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  percentMove?: number;
  timeWindow?: string;
  note?: string;
}

export async function createAlert(input: CreateAlertInput): Promise<PriceAlert> {
  const id = generateId();
  const row = await queryOne<PriceAlertRow>(
    `INSERT INTO price_alerts
       (id, user_id, symbol, direction, target_price, current_price,
        percent_move, time_window, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${SELECT_COLS}`,
    [
      id,
      input.userId,
      input.symbol.toUpperCase(),
      input.direction,
      input.targetPrice,
      input.currentPrice,
      input.percentMove ?? null,
      input.timeWindow ?? null,
      input.note ?? null,
    ],
  );
  if (!row) throw new Error('createAlert: insert returned no row');
  return toAlert(row);
}

export type AlertPatch = Partial<Pick<
  PriceAlert,
  'targetPrice' | 'direction' | 'status' | 'note' | 'percentMove' | 'timeWindow'
>>;

export async function updateAlert(
  opts: { userId: string; id: string },
  patch: AlertPatch,
): Promise<PriceAlert | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (patch.targetPrice !== undefined) { sets.push(`target_price = $${i++}`); params.push(patch.targetPrice); }
  if (patch.direction !== undefined) { sets.push(`direction = $${i++}`); params.push(patch.direction); }
  if (patch.status !== undefined) { sets.push(`status = $${i++}`); params.push(patch.status); }
  if (patch.note !== undefined) { sets.push(`note = $${i++}`); params.push(patch.note ?? null); }
  if (patch.percentMove !== undefined) { sets.push(`percent_move = $${i++}`); params.push(patch.percentMove ?? null); }
  if (patch.timeWindow !== undefined) { sets.push(`time_window = $${i++}`); params.push(patch.timeWindow ?? null); }

  if (sets.length === 0) {
    return getAlert(opts);
  }

  params.push(opts.id, opts.userId);
  const row = await queryOne<PriceAlertRow>(
    `UPDATE price_alerts SET ${sets.join(', ')}
     WHERE id = $${i++} AND user_id = $${i++}
     RETURNING ${SELECT_COLS}`,
    params,
  );
  return row ? toAlert(row) : null;
}

export async function deleteAlert(opts: { userId: string; id: string }): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM price_alerts WHERE id = $1 AND user_id = $2 RETURNING id`,
    [opts.id, opts.userId],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Cross-user trigger sweep (internal — called by CRON_SECRET-gated endpoint)
// ---------------------------------------------------------------------------

export interface CheckResult {
  triggered: PriceAlert[];
  checkedAt: string;
}

/**
 * Flip every active alert whose target is satisfied by `currentPrices`.
 * Sweeps across ALL users — callers are responsible for auth (CRON_SECRET).
 */
export async function checkAlertsAcrossUsers(
  currentPrices: Record<string, number>,
): Promise<CheckResult> {
  const symbols = Object.keys(currentPrices).map((s) => s.toUpperCase());
  if (symbols.length === 0) return { triggered: [], checkedAt: new Date().toISOString() };

  const active = await query<PriceAlertRow>(
    `SELECT ${SELECT_COLS} FROM price_alerts
     WHERE status = 'active' AND symbol = ANY($1::text[])`,
    [symbols],
  );

  const nowIso = new Date().toISOString();
  const toFlip: string[] = [];
  const triggered: PriceAlert[] = [];

  for (const row of active) {
    const a = toAlert(row);
    const price = currentPrices[a.symbol];
    if (price === undefined) continue;
    const hit = a.direction === 'above' ? price >= a.targetPrice : price <= a.targetPrice;
    if (hit) {
      toFlip.push(a.id);
      triggered.push({ ...a, status: 'triggered', triggeredAt: nowIso });
    }
  }

  if (toFlip.length > 0) {
    await query(
      `UPDATE price_alerts
         SET status = 'triggered', triggered_at = $2
       WHERE id = ANY($1::text[])`,
      [toFlip, nowIso],
    );
  }

  return { triggered, checkedAt: nowIso };
}

// ---------------------------------------------------------------------------
// Stats (scoped to user)
// ---------------------------------------------------------------------------

export interface AlertStats {
  totalActive: number;
  totalTriggered: number;
  totalExpired: number;
  triggeredToday: number;
  mostWatchedSymbol: string | null;
  bySymbol: Record<string, number>;
}

export async function getAlertStats(userId: string): Promise<AlertStats> {
  const rows = await query<{
    status: string;
    symbol: string;
    triggered_at: string | null;
  }>(
    `SELECT status, symbol, triggered_at FROM price_alerts WHERE user_id = $1`,
    [userId],
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const bySymbol: Record<string, number> = {};
  let totalActive = 0;
  let totalTriggered = 0;
  let totalExpired = 0;
  let triggeredToday = 0;

  for (const r of rows) {
    if (r.status === 'active') totalActive++;
    if (r.status === 'triggered') totalTriggered++;
    if (r.status === 'expired') totalExpired++;
    if (r.status === 'triggered' && r.triggered_at && new Date(r.triggered_at) >= todayStart) {
      triggeredToday++;
    }
    bySymbol[r.symbol] = (bySymbol[r.symbol] ?? 0) + 1;
  }

  const mostWatchedSymbol =
    Object.keys(bySymbol).sort((a, b) => bySymbol[b] - bySymbol[a])[0] ?? null;

  return {
    totalActive,
    totalTriggered,
    totalExpired,
    triggeredToday,
    mostWatchedSymbol,
    bySymbol,
  };
}
