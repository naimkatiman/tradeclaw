import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Position {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number; // dollar amount committed
  openedAt: string;
  signalId?: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Trade {
  id: string;
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

const DATA_DIR = path.join(process.cwd(), 'data');
const PT_FILE = path.join(DATA_DIR, 'paper-trading.json');
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

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only fs (e.g. Vercel) — ignore
  }
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

export function getPortfolio(): Portfolio {
  ensureDataDir();
  if (fs.existsSync(PT_FILE)) {
    try {
      const raw = fs.readFileSync(PT_FILE, 'utf-8');
      return JSON.parse(raw) as Portfolio;
    } catch {
      // Corrupt — fall through to empty portfolio
    }
  }
  const portfolio = emptyPortfolio();
  writePortfolio(portfolio);
  return portfolio;
}

function writePortfolio(portfolio: Portfolio): void {
  ensureDataDir();
  try {
    fs.writeFileSync(PT_FILE, JSON.stringify(portfolio, null, 2), 'utf-8');
  } catch {
    // Ignore write failures on read-only fs
  }
}

// ---------------------------------------------------------------------------
// Empty portfolio — clean slate for new users
// ---------------------------------------------------------------------------

function fmt(v: number, price: number): number {
  return +v.toFixed(price >= 100 ? 2 : 5);
}

function emptyPortfolio(): Portfolio {
  return {
    balance: STARTING_BALANCE,
    startingBalance: STARTING_BALANCE,
    positions: [],
    history: [],
    equityCurve: [
      { timestamp: new Date().toISOString(), equity: STARTING_BALANCE, balance: STARTING_BALANCE },
    ],
    stats: emptyStats(),
  };
}

// ---------------------------------------------------------------------------
// Stats calculation
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

  // Max drawdown from equity curve
  let maxDrawdown = 0;
  let peak = startingBalance;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe ratio (simplified annualised)
  const pnls = history.map((t) => t.pnlPercent);
  const meanPnl = pnls.reduce((s, v) => s + v, 0) / pnls.length;
  const variance = pnls.reduce((s, v) => s + (v - meanPnl) ** 2, 0) / pnls.length;
  const stddev = Math.sqrt(variance);
  const sharpeRatio = stddev > 0 ? +(meanPnl / stddev * Math.sqrt(252)).toFixed(2) : 0;

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
// Operations
// ---------------------------------------------------------------------------

export function openPosition(opts: {
  symbol: string;
  direction: 'BUY' | 'SELL';
  quantity?: number;
  signalId?: string;
  stopLoss?: number;
  takeProfit?: number;
  entryPrice?: number;
}): { portfolio: Portfolio; position: Position } {
  const portfolio = getPortfolio();
  const basePrice = BASE_PRICES[opts.symbol] ?? 100;
  const entryPrice = opts.entryPrice ?? fmt(basePrice, basePrice);
  const quantity = opts.quantity ?? Math.round(portfolio.balance * 0.05);
  const atr = entryPrice * 0.005;

  const stopLoss =
    opts.stopLoss ??
    (opts.direction === 'BUY'
      ? fmt(entryPrice - atr * 1.5, basePrice)
      : fmt(entryPrice + atr * 1.5, basePrice));

  const takeProfit =
    opts.takeProfit ??
    (opts.direction === 'BUY'
      ? fmt(entryPrice + atr * 2.5, basePrice)
      : fmt(entryPrice - atr * 2.5, basePrice));

  const position: Position = {
    id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    symbol: opts.symbol,
    direction: opts.direction,
    entryPrice,
    quantity,
    openedAt: new Date().toISOString(),
    signalId: opts.signalId,
    stopLoss,
    takeProfit,
  };

  portfolio.positions.push(position);
  writePortfolio(portfolio);
  return { portfolio, position };
}

export function closePosition(
  positionId: string,
  exitPrice?: number,
  exitReason: Trade['exitReason'] = 'manual',
): { portfolio: Portfolio; trade: Trade } | null {
  const portfolio = getPortfolio();
  const posIdx = portfolio.positions.findIndex((p) => p.id === positionId);
  if (posIdx === -1) return null;

  const position = portfolio.positions[posIdx];
  const basePrice = BASE_PRICES[position.symbol] ?? 100;
  const currentPrice =
    exitPrice ??
    fmt(position.entryPrice * (1 + (Math.random() - 0.5) * 0.003), basePrice);

  const dirMult = position.direction === 'BUY' ? 1 : -1;
  const movePct = ((currentPrice - position.entryPrice) / position.entryPrice) * dirMult;
  const pnl = +(position.quantity * movePct).toFixed(2);

  const trade: Trade = {
    id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    symbol: position.symbol,
    direction: position.direction,
    entryPrice: position.entryPrice,
    exitPrice: currentPrice,
    quantity: position.quantity,
    pnl,
    pnlPercent: +(movePct * 100).toFixed(2),
    openedAt: position.openedAt,
    closedAt: new Date().toISOString(),
    signalId: position.signalId,
    exitReason,
  };

  portfolio.positions.splice(posIdx, 1);
  portfolio.balance = +(portfolio.balance + pnl).toFixed(2);
  portfolio.history.unshift(trade);
  portfolio.equityCurve.push({
    timestamp: trade.closedAt,
    equity: portfolio.balance,
    balance: portfolio.balance,
  });
  portfolio.stats = calculateStats(portfolio.history, portfolio.startingBalance, portfolio.equityCurve);
  writePortfolio(portfolio);
  return { portfolio, trade };
}

export function closeAllPositions(
  exitReason: Trade['exitReason'] = 'manual',
): Portfolio {
  // Re-read each time to pick up writes from previous closes
  let portfolio = getPortfolio();
  while (portfolio.positions.length > 0) {
    closePosition(portfolio.positions[0].id, undefined, exitReason);
    portfolio = getPortfolio();
  }
  return getPortfolio();
}

export function resetPortfolio(): Portfolio {
  const fresh: Portfolio = {
    balance: STARTING_BALANCE,
    startingBalance: STARTING_BALANCE,
    positions: [],
    history: [],
    equityCurve: [
      { timestamp: new Date().toISOString(), equity: STARTING_BALANCE, balance: STARTING_BALANCE },
    ],
    stats: emptyStats(),
  };
  writePortfolio(fresh);
  return fresh;
}

export function autoFollowSignal(signal: {
  id?: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  positionSizePct?: number;
}): { portfolio: Portfolio; position: Position } {
  const portfolio = getPortfolio();
  const sizePct = signal.positionSizePct ?? 0.05;
  const quantity = Math.max(1, Math.round(portfolio.balance * sizePct));

  return openPosition({
    symbol: signal.symbol,
    direction: signal.direction,
    quantity,
    signalId: signal.id,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
  });
}

export function getEquityCurve(): EquityPoint[] {
  return getPortfolio().equityCurve;
}
