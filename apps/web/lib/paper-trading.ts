import { query, queryOne, execute } from './db-pool';
import { applySlippage, getSlippageConfig } from './slippage';

// ---------------------------------------------------------------------------
// Types (public API — unchanged shape)
// ---------------------------------------------------------------------------

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  openedAt: string;
  signalId?: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  closedAt: string;
  signalId?: string;
  exitReason: 'manual' | 'stopLoss' | 'takeProfit' | 'reset';
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  balance: number;
}

export interface Stats {
  totalTrades: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface Portfolio {
  userId: string;
  balance: number;
  startingBalance: number;
  positions: Position[];
  history: Trade[];
  equityCurve: EquityPoint[];
  stats: Stats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STARTING_BALANCE = 10000;

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

function fmt(v: number, price: number): number {
  return +v.toFixed(price >= 100 ? 2 : 5);
}

function emptyStats(): Stats {
  return {
    totalTrades: 0,
    winRate: 0,
    avgPnl: 0,
    bestTrade: 0,
    worstTrade: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    profitFactor: 0,
  };
}

// ---------------------------------------------------------------------------
// Public demo user (for widgets)
// ---------------------------------------------------------------------------

/**
 * Returns the user id widgets should read when embedded on third-party sites.
 * Controlled by `PUBLIC_WIDGET_DEMO_USER_ID`. Unset → widgets have no caller.
 */
export function getDemoUserId(): string | null {
  const id = process.env.PUBLIC_WIDGET_DEMO_USER_ID?.trim();
  return id && id.length > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

interface PortfolioRow {
  user_id: string;
  balance: string;
  starting_balance: string;
  equity_curve: EquityPoint[] | null;
  stats: Partial<Stats> | null;
}

interface PositionRow {
  id: string;
  user_id: string;
  symbol: string;
  direction: string;
  entry_price: string;
  quantity: string;
  opened_at: string;
  signal_id: string | null;
  stop_loss: string | null;
  take_profit: string | null;
}

interface TradeRow {
  id: string;
  user_id: string;
  symbol: string;
  direction: string;
  entry_price: string;
  exit_price: string;
  quantity: string;
  pnl: string;
  pnl_percent: string;
  opened_at: string;
  closed_at: string;
  signal_id: string | null;
  exit_reason: string;
}

function toPosition(row: PositionRow): Position {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction as 'BUY' | 'SELL',
    entryPrice: Number(row.entry_price),
    quantity: Number(row.quantity),
    openedAt: new Date(row.opened_at).toISOString(),
    signalId: row.signal_id ?? undefined,
    stopLoss: row.stop_loss !== null ? Number(row.stop_loss) : undefined,
    takeProfit: row.take_profit !== null ? Number(row.take_profit) : undefined,
  };
}

function toTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction as 'BUY' | 'SELL',
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    quantity: Number(row.quantity),
    pnl: Number(row.pnl),
    pnlPercent: Number(row.pnl_percent),
    openedAt: new Date(row.opened_at).toISOString(),
    closedAt: new Date(row.closed_at).toISOString(),
    signalId: row.signal_id ?? undefined,
    exitReason: row.exit_reason as Trade['exitReason'],
  };
}

// ---------------------------------------------------------------------------
// Stats calculation (unchanged — pure)
// ---------------------------------------------------------------------------

export function calculateStats(
  history: Trade[],
  startingBalance: number,
  equityCurve: EquityPoint[],
): Stats {
  if (history.length === 0) return emptyStats();

  const wins = history.filter((t) => t.pnl > 0);
  const losses = history.filter((t) => t.pnl <= 0);
  const winRate = +(wins.length / history.length * 100).toFixed(1);
  const avgPnl = +(history.reduce((s, t) => s + t.pnl, 0) / history.length).toFixed(2);
  const bestTrade = +Math.max(...history.map((t) => t.pnl)).toFixed(2);
  const worstTrade = +Math.min(...history.map((t) => t.pnl)).toFixed(2);

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor =
    grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 999 : 0;

  let maxDrawdown = 0;
  let peak = startingBalance;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const pnls = history.map((t) => t.pnlPercent);
  const meanPnl = pnls.reduce((s, v) => s + v, 0) / pnls.length;
  const variance = pnls.reduce((s, v) => s + (v - meanPnl) ** 2, 0) / pnls.length;
  const stddev = Math.sqrt(variance);
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  const firstTs = Date.parse(history[0].closedAt);
  const lastTs = Date.parse(history[history.length - 1].closedAt);
  const spanMs = Number.isFinite(firstTs) && Number.isFinite(lastTs) ? lastTs - firstTs : 0;
  const tradesPerYear = spanMs > 0 ? (history.length / spanMs) * MS_PER_YEAR : 0;
  const sharpeRatio = stddev > 0 && tradesPerYear > 0
    ? +((meanPnl / stddev) * Math.sqrt(tradesPerYear)).toFixed(2)
    : 0;

  return {
    totalTrades: history.length,
    winRate,
    avgPnl,
    bestTrade,
    worstTrade,
    sharpeRatio,
    maxDrawdown: +maxDrawdown.toFixed(1),
    profitFactor,
  };
}

// ---------------------------------------------------------------------------
// Portfolio header (auto-create on first read)
// ---------------------------------------------------------------------------

async function getOrCreatePortfolioRow(userId: string): Promise<PortfolioRow> {
  const existing = await queryOne<PortfolioRow>(
    `SELECT user_id, balance, starting_balance, equity_curve, stats
     FROM paper_portfolios WHERE user_id = $1`,
    [userId],
  );
  if (existing) return existing;

  const initial: EquityPoint[] = [
    { timestamp: new Date().toISOString(), equity: STARTING_BALANCE, balance: STARTING_BALANCE },
  ];
  const row = await queryOne<PortfolioRow>(
    `INSERT INTO paper_portfolios (user_id, balance, starting_balance, equity_curve, stats)
     VALUES ($1, $2, $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING user_id, balance, starting_balance, equity_curve, stats`,
    [userId, STARTING_BALANCE, JSON.stringify(initial), JSON.stringify(emptyStats())],
  );
  if (!row) throw new Error('getOrCreatePortfolioRow: insert returned no row');
  return row;
}

export async function getPortfolio(userId: string): Promise<Portfolio> {
  const header = await getOrCreatePortfolioRow(userId);

  const [positionRows, tradeRows] = await Promise.all([
    query<PositionRow>(
      `SELECT id, user_id, symbol, direction, entry_price, quantity, opened_at,
              signal_id, stop_loss, take_profit
       FROM paper_positions WHERE user_id = $1 ORDER BY opened_at DESC`,
      [userId],
    ),
    query<TradeRow>(
      `SELECT id, user_id, symbol, direction, entry_price, exit_price, quantity,
              pnl, pnl_percent, opened_at, closed_at, signal_id, exit_reason
       FROM paper_trades WHERE user_id = $1 ORDER BY closed_at DESC`,
      [userId],
    ),
  ]);

  return {
    userId,
    balance: Number(header.balance),
    startingBalance: Number(header.starting_balance),
    positions: positionRows.map(toPosition),
    history: tradeRows.map(toTrade),
    equityCurve: Array.isArray(header.equity_curve) ? header.equity_curve : [],
    stats: { ...emptyStats(), ...(header.stats ?? {}) },
  };
}

export async function getEquityCurve(userId: string): Promise<EquityPoint[]> {
  const header = await queryOne<{ equity_curve: EquityPoint[] | null }>(
    `SELECT equity_curve FROM paper_portfolios WHERE user_id = $1`,
    [userId],
  );
  return Array.isArray(header?.equity_curve) ? header.equity_curve : [];
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export interface OpenPositionInput {
  userId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  quantity?: number;
  signalId?: string;
  stopLoss?: number;
  takeProfit?: number;
  entryPrice?: number;
  slippageEnabled?: boolean;
}

export async function openPosition(
  opts: OpenPositionInput,
): Promise<{ portfolio: Portfolio; position: Position }> {
  const header = await getOrCreatePortfolioRow(opts.userId);
  const balance = Number(header.balance);

  const basePrice = BASE_PRICES[opts.symbol] ?? 100;
  const rawEntry = opts.entryPrice ?? fmt(basePrice, basePrice);
  const slippageConfig = getSlippageConfig(opts.symbol);
  const useSlippage = opts.slippageEnabled !== false;
  const entryPrice = useSlippage
    ? fmt(applySlippage(rawEntry, opts.direction, 'entry', slippageConfig), basePrice)
    : rawEntry;

  const quantity = opts.quantity ?? Math.round(balance * 0.05);
  const atr = entryPrice * 0.005;

  const stopLoss = opts.stopLoss ?? (opts.direction === 'BUY'
    ? fmt(entryPrice - atr * 1.5, basePrice)
    : fmt(entryPrice + atr * 1.5, basePrice));

  const takeProfit = opts.takeProfit ?? (opts.direction === 'BUY'
    ? fmt(entryPrice + atr * 2.5, basePrice)
    : fmt(entryPrice - atr * 2.5, basePrice));

  const id = `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const row = await queryOne<PositionRow>(
    `INSERT INTO paper_positions
       (id, user_id, symbol, direction, entry_price, quantity, signal_id, stop_loss, take_profit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, symbol, direction, entry_price, quantity, opened_at,
               signal_id, stop_loss, take_profit`,
    [id, opts.userId, opts.symbol, opts.direction, entryPrice, quantity,
     opts.signalId ?? null, stopLoss, takeProfit],
  );
  if (!row) throw new Error('openPosition: insert returned no row');

  const portfolio = await getPortfolio(opts.userId);
  return { portfolio, position: toPosition(row) };
}

export async function closePosition(
  opts: { userId: string; positionId: string },
  exitPrice?: number,
  exitReason: Trade['exitReason'] = 'manual',
): Promise<{ portfolio: Portfolio; trade: Trade } | null> {
  const posRow = await queryOne<PositionRow>(
    `DELETE FROM paper_positions WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, symbol, direction, entry_price, quantity, opened_at,
               signal_id, stop_loss, take_profit`,
    [opts.positionId, opts.userId],
  );
  if (!posRow) return null;

  const position = toPosition(posRow);
  const basePrice = BASE_PRICES[position.symbol] ?? 100;
  const rawExit = exitPrice ?? fmt(position.entryPrice * (1 + (Math.random() - 0.5) * 0.003), basePrice);
  const slippageConfig = getSlippageConfig(position.symbol);
  const currentPrice = fmt(applySlippage(rawExit, position.direction, 'exit', slippageConfig), basePrice);

  const dirMult = position.direction === 'BUY' ? 1 : -1;
  const movePct = ((currentPrice - position.entryPrice) / position.entryPrice) * dirMult;
  const pnl = +(position.quantity * movePct).toFixed(2);
  const pnlPercent = +(movePct * 100).toFixed(2);

  const closedAt = new Date().toISOString();
  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const tradeRow = await queryOne<TradeRow>(
    `INSERT INTO paper_trades
       (id, user_id, symbol, direction, entry_price, exit_price, quantity,
        pnl, pnl_percent, opened_at, closed_at, signal_id, exit_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, user_id, symbol, direction, entry_price, exit_price, quantity,
               pnl, pnl_percent, opened_at, closed_at, signal_id, exit_reason`,
    [
      tradeId, opts.userId, position.symbol, position.direction,
      position.entryPrice, currentPrice, position.quantity,
      pnl, pnlPercent, position.openedAt, closedAt,
      position.signalId ?? null, exitReason,
    ],
  );
  if (!tradeRow) throw new Error('closePosition: insert trade returned no row');
  const trade = toTrade(tradeRow);

  // Update portfolio header — balance + equity curve + stats
  const header = await getOrCreatePortfolioRow(opts.userId);
  const newBalance = +(Number(header.balance) + pnl).toFixed(2);
  const equityCurve = Array.isArray(header.equity_curve) ? [...header.equity_curve] : [];
  equityCurve.push({ timestamp: closedAt, equity: newBalance, balance: newBalance });

  const allTrades = await query<TradeRow>(
    `SELECT id, user_id, symbol, direction, entry_price, exit_price, quantity,
            pnl, pnl_percent, opened_at, closed_at, signal_id, exit_reason
     FROM paper_trades WHERE user_id = $1 ORDER BY closed_at ASC`,
    [opts.userId],
  );
  const history = allTrades.map(toTrade);
  const newStats = calculateStats(history, Number(header.starting_balance), equityCurve);

  await execute(
    `UPDATE paper_portfolios
       SET balance = $1, equity_curve = $2::jsonb, stats = $3::jsonb, updated_at = NOW()
     WHERE user_id = $4`,
    [newBalance, JSON.stringify(equityCurve), JSON.stringify(newStats), opts.userId],
  );

  const portfolio = await getPortfolio(opts.userId);
  return { portfolio, trade };
}

export async function closeAllPositions(
  userId: string,
  exitReason: Trade['exitReason'] = 'manual',
): Promise<Portfolio> {
  // Close one at a time so equity curve + stats update after each
  let portfolio = await getPortfolio(userId);
  while (portfolio.positions.length > 0) {
    await closePosition({ userId, positionId: portfolio.positions[0].id }, undefined, exitReason);
    portfolio = await getPortfolio(userId);
  }
  return portfolio;
}

export async function resetPortfolio(userId: string): Promise<Portfolio> {
  const initial: EquityPoint[] = [
    { timestamp: new Date().toISOString(), equity: STARTING_BALANCE, balance: STARTING_BALANCE },
  ];
  await execute(`DELETE FROM paper_positions WHERE user_id = $1`, [userId]);
  await execute(`DELETE FROM paper_trades WHERE user_id = $1`, [userId]);
  await execute(
    `INSERT INTO paper_portfolios (user_id, balance, starting_balance, equity_curve, stats)
     VALUES ($1, $2, $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
       balance = EXCLUDED.balance,
       equity_curve = EXCLUDED.equity_curve,
       stats = EXCLUDED.stats,
       updated_at = NOW()`,
    [userId, STARTING_BALANCE, JSON.stringify(initial), JSON.stringify(emptyStats())],
  );
  return getPortfolio(userId);
}

export interface FollowSignalInput {
  userId: string;
  id?: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  positionSizePct?: number;
}

export async function autoFollowSignal(
  signal: FollowSignalInput,
): Promise<{ portfolio: Portfolio; position: Position }> {
  const header = await getOrCreatePortfolioRow(signal.userId);
  const sizePct = signal.positionSizePct ?? 0.05;
  const quantity = Math.max(1, Math.round(Number(header.balance) * sizePct));

  return openPosition({
    userId: signal.userId,
    symbol: signal.symbol,
    direction: signal.direction,
    quantity,
    signalId: signal.id,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
  });
}

// ---------------------------------------------------------------------------
// Cross-user sweep for position-monitor CRON
// ---------------------------------------------------------------------------

/**
 * Return every open position across all users. Intended only for the
 * CRON_SECRET-gated position-monitor route, which checks each position
 * against live prices and closes on SL/TP hit.
 */
export async function getAllOpenPositionsForSweep(): Promise<Position[]> {
  const rows = await query<PositionRow>(
    `SELECT id, user_id, symbol, direction, entry_price, quantity, opened_at,
            signal_id, stop_loss, take_profit
     FROM paper_positions ORDER BY opened_at ASC`,
  );
  return rows.map(toPosition);
}
