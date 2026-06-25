import { query, queryOne } from './db-pool';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeEntry {
  id: string;
  userId: string;
  symbol: string;
  direction: string;
  entryPrice: number | null;
  exitPrice: number | null;
  positionSize: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  setupType: string | null;
  notes: string | null;
  tags: string[];
  screenshotUrl: string | null;
  tradeDate: string;
  createdAt: string;
}

interface TradeRow {
  id: string;
  user_id: string;
  symbol: string;
  direction: string;
  entry_price: string | null;
  exit_price: string | null;
  position_size: string | null;
  pnl: string | null;
  pnl_percent: string | null;
  setup_type: string | null;
  notes: string | null;
  tags: string[] | null;
  screenshot_url: string | null;
  trade_date: string;
  created_at: string;
}

function toTrade(row: TradeRow): TradeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entry_price !== null ? Number(row.entry_price) : null,
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : null,
    positionSize: row.position_size !== null ? Number(row.position_size) : null,
    pnl: row.pnl !== null ? Number(row.pnl) : null,
    pnlPercent: row.pnl_percent !== null ? Number(row.pnl_percent) : null,
    setupType: row.setup_type,
    notes: row.notes,
    tags: row.tags ?? [],
    screenshotUrl: row.screenshot_url,
    tradeDate: typeof row.trade_date === 'string' ? row.trade_date.slice(0, 10) : String(row.trade_date),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const COLS = `id, user_id, symbol, direction, entry_price, exit_price, position_size,
  pnl, pnl_percent, setup_type, notes, tags, screenshot_url, trade_date, created_at`;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface AddTradeInput {
  symbol: string;
  direction: string;
  entryPrice?: number;
  exitPrice?: number;
  positionSize?: number;
  pnl?: number;
  pnlPercent?: number;
  setupType?: string;
  notes?: string;
  tags?: string[];
  screenshotUrl?: string;
  tradeDate?: string;
}

export async function addTrade(userId: string, t: AddTradeInput): Promise<TradeEntry> {
  const row = await queryOne<TradeRow>(
    `INSERT INTO trade_journal
       (user_id, symbol, direction, entry_price, exit_price, position_size,
        pnl, pnl_percent, setup_type, notes, tags, screenshot_url, trade_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13::date, CURRENT_DATE))
     RETURNING ${COLS}`,
    [
      userId, t.symbol.toUpperCase(), t.direction,
      t.entryPrice ?? null, t.exitPrice ?? null, t.positionSize ?? null,
      t.pnl ?? null, t.pnlPercent ?? null, t.setupType ?? null,
      t.notes ?? null, t.tags ?? [], t.screenshotUrl ?? null,
      t.tradeDate ?? null,
    ],
  );
  if (!row) throw new Error('addTrade: insert returned no row');
  return toTrade(row);
}

export interface ListTradesFilter {
  limit?: number;
  symbol?: string;
  startDate?: string;
  endDate?: string;
}

export async function listTrades(userId: string, f?: ListTradesFilter): Promise<TradeEntry[]> {
  const where: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];
  let i = 2;
  if (f?.symbol) {
    where.push(`symbol = $${i++}`);
    params.push(f.symbol.toUpperCase());
  }
  if (f?.startDate) {
    where.push(`trade_date >= $${i++}`);
    params.push(f.startDate);
  }
  if (f?.endDate) {
    where.push(`trade_date <= $${i++}`);
    params.push(f.endDate);
  }
  const limit = f?.limit ?? 100;
  params.push(limit);
  const rows = await query<TradeRow>(
    `SELECT ${COLS} FROM trade_journal
     WHERE ${where.join(' AND ')}
     ORDER BY trade_date DESC, created_at DESC
     LIMIT $${i}`,
    params,
  );
  return rows.map(toTrade);
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

export async function getTradeStats(userId: string): Promise<TradeStats> {
  const rows = await query<{ pnl: string | null; pnl_percent: string | null }>(
    `SELECT pnl, pnl_percent FROM trade_journal WHERE user_id = $1`,
    [userId],
  );

  if (rows.length === 0) {
    return { totalTrades: 0, winRate: 0, avgPnl: 0, bestTrade: 0, worstTrade: 0, profitFactor: 0 };
  }

  let wins = 0;
  let totalPnl = 0;
  let best = -Infinity;
  let worst = Infinity;
  let grossProfit = 0;
  let grossLoss = 0;
  let counted = 0;

  for (const r of rows) {
    const pnl = r.pnl !== null ? Number(r.pnl) : null;
    if (pnl === null) continue;
    counted++;
    totalPnl += pnl;
    if (pnl > 0) { wins++; grossProfit += pnl; }
    if (pnl < 0) { grossLoss += Math.abs(pnl); }
    if (pnl > best) best = pnl;
    if (pnl < worst) worst = pnl;
  }

  return {
    totalTrades: rows.length,
    winRate: counted > 0 ? parseFloat(((wins / counted) * 100).toFixed(1)) : 0,
    avgPnl: counted > 0 ? parseFloat((totalPnl / counted).toFixed(2)) : 0,
    bestTrade: best === -Infinity ? 0 : parseFloat(best.toFixed(2)),
    worstTrade: worst === Infinity ? 0 : parseFloat(worst.toFixed(2)),
    profitFactor: grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? Infinity : 0,
  };
}

export async function updateTrade(
  id: string,
  userId: string,
  updates: Partial<AddTradeInput>,
): Promise<TradeEntry | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (updates.symbol !== undefined) { sets.push(`symbol = $${i++}`); params.push(updates.symbol.toUpperCase()); }
  if (updates.direction !== undefined) { sets.push(`direction = $${i++}`); params.push(updates.direction); }
  if (updates.entryPrice !== undefined) { sets.push(`entry_price = $${i++}`); params.push(updates.entryPrice); }
  if (updates.exitPrice !== undefined) { sets.push(`exit_price = $${i++}`); params.push(updates.exitPrice); }
  if (updates.positionSize !== undefined) { sets.push(`position_size = $${i++}`); params.push(updates.positionSize); }
  if (updates.pnl !== undefined) { sets.push(`pnl = $${i++}`); params.push(updates.pnl); }
  if (updates.pnlPercent !== undefined) { sets.push(`pnl_percent = $${i++}`); params.push(updates.pnlPercent); }
  if (updates.setupType !== undefined) { sets.push(`setup_type = $${i++}`); params.push(updates.setupType); }
  if (updates.notes !== undefined) { sets.push(`notes = $${i++}`); params.push(updates.notes); }
  if (updates.tags !== undefined) { sets.push(`tags = $${i++}`); params.push(updates.tags); }
  if (updates.screenshotUrl !== undefined) { sets.push(`screenshot_url = $${i++}`); params.push(updates.screenshotUrl); }
  if (updates.tradeDate !== undefined) { sets.push(`trade_date = $${i++}`); params.push(updates.tradeDate); }

  if (sets.length === 0) return null;

  params.push(id, userId);
  const row = await queryOne<TradeRow>(
    `UPDATE trade_journal SET ${sets.join(', ')}
     WHERE id = $${i++} AND user_id = $${i++}
     RETURNING ${COLS}`,
    params,
  );
  return row ? toTrade(row) : null;
}

export async function deleteTrade(id: string, userId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM trade_journal WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );
  return rows.length > 0;
}
